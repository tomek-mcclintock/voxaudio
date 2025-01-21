import OpenAI from 'openai';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // Create a temporary file
  const tempFilePath = join('/tmp', `${Date.now()}.webm`);
  writeFileSync(tempFilePath, audioBuffer);

  try {
    const response = await openai.audio.transcriptions.create({
      file: await import('fs').then(fs => fs.createReadStream(tempFilePath)),
      model: "whisper-1",
    });

    return response.text;
  } finally {
    // Clean up temporary file
    try {
      unlinkSync(tempFilePath);
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
    }
  }
}

export async function analyzeFeedback(text: string): Promise<{
  sentiment: string;
  summary: string;
  themes: string[];
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are analyzing customer feedback for Ruggable UK. Provide a sentiment (positive/negative/neutral), a brief summary, and key themes identified."
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: { type: "json_object" }
  });

  const analysis = JSON.parse(response.choices[0].message.content || '{}');
  return analysis;
}