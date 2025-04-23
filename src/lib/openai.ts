// src/lib/openai.ts
import OpenAI from 'openai';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load FFmpeg
let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  
  ffmpegInstance = new FFmpeg();
  
  // Load FFmpeg
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
  });
  
  return ffmpegInstance;
}

// Alternative simpler approach without FFmpeg
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const transcriptionId = `transcribe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${transcriptionId}] Starting audio transcription, buffer size: ${audioBuffer.length} bytes`);
  
  try {
    // Create a proper WebM file instead of an "MP3"
    const webmBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    console.log(`[${transcriptionId}] Created WebM Blob: type=${webmBlob.type}, size=${webmBlob.size} bytes`);
    
    // Use correct filename and MIME type
    const webmFile = new File([webmBlob], 'audio.webm', { type: 'audio/webm' });
    console.log(`[${transcriptionId}] Created WebM File: name=${webmFile.name}, type=${webmFile.type}, size=${webmFile.size} bytes`);

    // Send to OpenAI
    const response = await openai.audio.transcriptions.create({
      file: webmFile,
      model: "whisper-1",
      response_format: "text"
    });
    
    const transcriptionText = response as string;
    
    console.log(`[${transcriptionId}] Transcription successful: "${transcriptionText.substring(0, 100)}..."`);
    return transcriptionText;
  } catch (error) {
    console.error(`[${transcriptionId}] Transcription failed:`, error);
    
    // If sending as WebM fails, try explicitly sending as WAV
    try {
      console.log(`[${transcriptionId}] Attempting with WAV format`);
      const wavBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const wavFile = new File([wavBlob], 'audio.wav', { type: 'audio/wav' });
      
      const response = await openai.audio.transcriptions.create({
        file: wavFile,
        model: "whisper-1",
        response_format: "text"
      });
      
      const transcriptionText = response as string;
      console.log(`[${transcriptionId}] WAV transcription successful: "${transcriptionText.substring(0, 100)}..."`);
      return transcriptionText;
    } catch (wavError) {
      console.error(`[${transcriptionId}] WAV attempt also failed:`, wavError);
      throw error; // Throw the original error
    }
  }
}

export async function analyzeFeedback(text: string): Promise<{
  sentiment: string;
  summary: string;
  themes: string[];
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are analyzing customer feedback for Ruggable UK. You will respond with JSON containing a 'sentiment' (positive/negative/neutral), a brief 'summary', and key 'themes' identified as an array."
      },
      {
        role: "user",
        content: text
      }
    ]
  });

  try {
    // Parse the response from the text format
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }
    return JSON.parse(content);
  } catch (error) {
    // If parsing fails, return a structured response
    return {
      sentiment: 'neutral',
      summary: response.choices[0].message.content || 'No summary available',
      themes: []
    };
  }
}
