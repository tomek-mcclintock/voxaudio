import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const transcriptionId = `transcribe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${transcriptionId}] Starting audio transcription, buffer size: ${audioBuffer.length} bytes`);
  
  try {
    // Convert Buffer to File object that OpenAI can handle
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    console.log(`[${transcriptionId}] Created Blob object: type=${audioBlob.type}, size=${audioBlob.size} bytes`);
    
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
    console.log(`[${transcriptionId}] Created File object: name=${audioFile.name}, type=${audioFile.type}, size=${audioFile.size} bytes`);

    console.log(`[${transcriptionId}] Sending to OpenAI Whisper API...`);
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    console.log(`[${transcriptionId}] Transcription successful, length: ${response.text.length} characters`);
    // Log a sample of the transcription (first 100 chars)
    if (response.text.length > 0) {
      console.log(`[${transcriptionId}] Transcription sample: "${response.text.substring(0, 100)}..."`);
    } else {
      console.log(`[${transcriptionId}] Warning: Empty transcription received`);
    }

    return response.text;
  } catch (error) {
    console.error(`[${transcriptionId}] Transcription failed:`, error);
    if (error instanceof Error) {
      console.error(`[${transcriptionId}] Error name: ${error.name}, message: ${error.message}`);
      console.error(`[${transcriptionId}] Error stack:`, error.stack);
    }
    throw error; // Re-throw to be handled by the caller
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