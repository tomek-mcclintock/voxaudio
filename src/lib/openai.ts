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

// src/lib/openai.ts - Simplified version
export async function analyzeFeedback(text: string): Promise<{
  sentiment: string;
}> {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input for sentiment analysis');
    }

    const trimmedText = text.trim();
    
    const systemPrompt = `You are analyzing customer feedback sentiment. Return only the sentiment: 'positive', 'negative', or 'neutral/mixed'.
    
    Rules:
    - Choose 'positive' if the customer expresses satisfaction, happiness, or praise
    - Choose 'negative' if the customer expresses dissatisfaction, frustration, or complaint
    - Choose 'neutral/mixed' for any combination of the above OR purely factual statements
    
    Return ONLY one phrase: positive, negative, or neutral/mixed`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: trimmedText
        }
      ],
      temperature: 0,
      max_tokens: 15 // Slightly more tokens for "neutral/mixed"
    });

    const content = response.choices[0].message.content?.trim().toLowerCase();
    
    // Validate response
    const validSentiments = ['positive', 'negative', 'neutral/mixed'];
    if (content && validSentiments.includes(content)) {
      return { sentiment: content };
    } else {
      console.warn(`Invalid sentiment response: "${content}". Defaulting to neutral/mixed.`);
      return { sentiment: 'neutral/mixed' };
    }
    
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    return { sentiment: 'neutral/mixed' };
  }
}