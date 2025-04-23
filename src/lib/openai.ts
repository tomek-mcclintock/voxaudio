import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In src/lib/openai.ts
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const transcriptionId = `transcribe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${transcriptionId}] Starting audio transcription, buffer size: ${audioBuffer.length} bytes`);
  
  try {
    // Create a temporary file with the audio data
    const tempFilePath = `/tmp/audio-${transcriptionId}.mp3`;
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    console.log(`[${transcriptionId}] Wrote audio to temp file: ${tempFilePath}`);
    
    // Create a file object from the path
    const audioFile = fs.createReadStream(tempFilePath);
    
    try {
      // Attempt transcription with auto language detection
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "auto",
        response_format: "verbose_json", // Get more details about the transcription
      });
      
      // Clean up the temp file
      fs.unlinkSync(tempFilePath);
      
      if (response.text) {
        console.log(`[${transcriptionId}] Transcription successful (${response.language}): "${response.text.substring(0, 100)}..."`);
        return response.text;
      } else {
        throw new Error("No transcription returned");
      }
    } catch (error) {
      // Clean up the temp file
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
      throw error;
    }
  } catch (error) {
    console.error(`[${transcriptionId}] Transcription failed:`, error);
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
        content: "You are analyzing customer feedback. You will respond with JSON containing a 'sentiment' (positive/negative/neutral), a brief 'summary', and key 'themes' identified as an array."
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
