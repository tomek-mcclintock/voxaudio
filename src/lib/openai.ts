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

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const transcriptionId = `transcribe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${transcriptionId}] Starting audio transcription, buffer size: ${audioBuffer.length} bytes`);
  
  try {
    // First, try a proper conversion using FFmpeg
    try {
      console.log(`[${transcriptionId}] Converting WebM to MP3 using FFmpeg`);
      
      // Get FFmpeg instance
      const ffmpeg = await getFFmpeg();
      
      // Write input file to memory
      await ffmpeg.writeFile('input.webm', new Uint8Array(audioBuffer));
      
      // Run FFmpeg command to convert WebM to MP3
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vn', // No video
        '-ar', '44100', // Audio sample rate
        '-ac', '2', // Stereo
        '-b:a', '128k', // Bitrate
        'output.mp3'
      ]);
      
      // Read the output file
      const outputData = await ffmpeg.readFile('output.mp3');
      
      // Check what type of data we received and handle accordingly
      let dataArray: Uint8Array;
      if (typeof outputData === 'string') {
        // If it's a string, convert to Uint8Array
        console.log(`[${transcriptionId}] Conversion returned string data, converting to Uint8Array`);
        dataArray = new TextEncoder().encode(outputData);
      } else {
        // It's already a Uint8Array
        dataArray = outputData;
      }
      
      console.log(`[${transcriptionId}] Conversion complete, MP3 size: ${dataArray.length} bytes`);
      
      // Create a proper MP3 file object
      const mp3File = new File([dataArray], 'audio.mp3', { type: 'audio/mpeg' });
      
      // Send to OpenAI
      const response = await openai.audio.transcriptions.create({
        file: mp3File,
        model: "whisper-1",
        language: "auto",
        response_format: "text"
      });
      
      // Handle string response
      const transcriptionText = response as string;
      
      console.log(`[${transcriptionId}] Transcription successful: "${transcriptionText.substring(0, 100)}..."`);
      return transcriptionText;
    } catch (ffmpegError) {
      console.error(`[${transcriptionId}] FFmpeg conversion failed:`, ffmpegError);
      
      // Fall back to a simpler approach if FFmpeg fails
      console.log(`[${transcriptionId}] Falling back to alternative approach`);
      
      // Export the WebM buffer directly as a .webm file
      const webmBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      const webmFile = new File([webmBlob], 'audio.webm', { type: 'audio/webm' });
      
      // Send to OpenAI with explicit webm format
      const response = await openai.audio.transcriptions.create({
        file: webmFile,
        model: "whisper-1",
        language: "auto",
        response_format: "text"
      });
      
      const transcriptionText = response as string;
      
      console.log(`[${transcriptionId}] Fallback transcription successful: "${transcriptionText.substring(0, 100)}..."`);
      return transcriptionText;
    }
  } catch (error) {
    console.error(`[${transcriptionId}] Transcription failed:`, error);
    if (error instanceof Error) {
      console.error(`[${transcriptionId}] Error name: ${error.name}, message: ${error.message}`);
    }
    throw error;
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
