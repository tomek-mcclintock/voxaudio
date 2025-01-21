import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // Convert Buffer to File object that OpenAI can handle
  const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
  const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

  const response = await openai.audio.transcriptions.create({
    file: audioFile,
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
    ],
    response_format: { type: "json_object" }
  });

  const analysis = JSON.parse(response.choices[0].message.content || '{}');
  return analysis;
}