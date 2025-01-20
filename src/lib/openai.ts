import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const response = await openai.audio.transcriptions.create({
    file: audioBuffer,
    model: "whisper-1",
  });

  return response.text;
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
    ]
  });

  const analysis = JSON.parse(response.choices[0].message.content || '{}');
  return analysis;
}