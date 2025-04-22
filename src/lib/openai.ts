import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const transcriptionId = `transcribe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[${transcriptionId}] Starting audio transcription, buffer size: ${audioBuffer.length} bytes`);
  
  try {
    // Use mp3 as a more reliable format
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
    console.log(`[${transcriptionId}] Created Blob object: type=${audioBlob.type}, size=${audioBlob.size} bytes`);
    
    // Note: changing the file extension from webm to mp3
    const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mp3' });
    console.log(`[${transcriptionId}] Created File object: name=${audioFile.name}, type=${audioFile.type}, size=${audioFile.size} bytes`);

    console.log(`[${transcriptionId}] Sending to OpenAI Whisper API...`);
    
    // Additional validation for audio file
    if (audioFile.size === 0) {
      throw new Error('Audio file is empty');
    }
    
    if (audioFile.size > 25 * 1024 * 1024) {
      throw new Error('Audio file exceeds 25MB limit');
    }
    
    console.log(`[${transcriptionId}] API Key prefix: ${process.env.OPENAI_API_KEY?.substring(0, 3)}...`);
    
    try {
      // Specify an explicit response format and model
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "text", // Explicitly request text format
        temperature: 0, // Lower temperature for more accurate transcription
      });
      
      // When response_format is "text", the response itself is a string
      const transcriptionText = response as string;
      
      console.log(`[${transcriptionId}] Transcription successful, length: ${transcriptionText.length} characters`);
      if (transcriptionText.length > 0) {
        console.log(`[${transcriptionId}] Transcription sample: "${transcriptionText.substring(0, 100)}..."`);
      } else {
        console.log(`[${transcriptionId}] Warning: Empty transcription received`);
      }

      return transcriptionText;
    } catch (openaiError) {
      console.error(`[${transcriptionId}] OpenAI API error:`, openaiError);
      
      // Try one more time with a different format if the first attempt failed
      console.log(`[${transcriptionId}] Retrying with wav format...`);
      
      // Try again with WAV format
      const wavBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const wavFile = new File([wavBlob], 'audio.wav', { type: 'audio/wav' });
      
      console.log(`[${transcriptionId}] Created WAV file: size=${wavFile.size} bytes`);
      
      try {
        const secondResponse = await openai.audio.transcriptions.create({
          file: wavFile,
          model: "whisper-1",
          response_format: "text",
        });
        
        // Again, handle string response
        const secondTranscriptionText = secondResponse as string;
        
        console.log(`[${transcriptionId}] Second attempt successful, length: ${secondTranscriptionText.length} characters`);
        return secondTranscriptionText;
      } catch (secondError) {
        console.error(`[${transcriptionId}] Second attempt also failed:`, secondError);
        throw secondError;
      }
    }
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