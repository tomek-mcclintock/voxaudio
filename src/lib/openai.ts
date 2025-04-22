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
    
    try {
      // Try multiple languages to get the best transcription
      const languages = ["en", "de"]; // English and German
      let bestTranscription = "";
      let bestLength = 0;
      
      for (const language of languages) {
        console.log(`[${transcriptionId}] Attempting transcription with language: ${language}`);
        
        try {
          const response = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            response_format: "text",
            temperature: 0,
            language: language,
            prompt: "This is customer feedback that may be in English or German about product quality."
          });
          
          // When response_format is "text", the response itself is a string
          const transcriptionText = response as string;
          
          console.log(`[${transcriptionId}] ${language} transcription: "${transcriptionText.substring(0, 100)}..."`);
          
          // Keep the longest, most meaningful transcription
          if (transcriptionText.length > bestLength && 
              !transcriptionText.includes("MBC 뉴스") && // Filter out Korean TV station markers
              !transcriptionText.match(/^Let'?s get /i)) { // Filter out common misrecognitions
            bestTranscription = transcriptionText;
            bestLength = transcriptionText.length;
          }
        } catch (langError) {
          console.error(`[${transcriptionId}] Error with ${language} transcription:`, langError);
        }
      }
      
      if (bestTranscription) {
        console.log(`[${transcriptionId}] Best transcription (${bestLength} chars): "${bestTranscription.substring(0, 100)}..."`);
        return bestTranscription;
      }
      
      // If no good transcription was found, try one more format
      console.log(`[${transcriptionId}] No good transcription found, trying with WAV format...`);
      
    } catch (openaiError) {
      console.error(`[${transcriptionId}] OpenAI API error:`, openaiError);
    }
    
    // Try again with WAV format if we're here
    console.log(`[${transcriptionId}] Trying with WAV format...`);
    
    const wavBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    const wavFile = new File([wavBlob], 'audio.wav', { type: 'audio/wav' });
    
    console.log(`[${transcriptionId}] Created WAV file: size=${wavFile.size} bytes`);
    
    try {
      const response = await openai.audio.transcriptions.create({
        file: wavFile,
        model: "whisper-1",
        response_format: "text",
        temperature: 0,
        language: "auto" // Let Whisper detect the language
      });
      
      const transcriptionText = response as string;
      
      console.log(`[${transcriptionId}] WAV transcription: "${transcriptionText.substring(0, 100)}..."`);
      return transcriptionText;
    } catch (wavError) {
      console.error(`[${transcriptionId}] WAV transcription failed:`, wavError);
      throw wavError;
    }
  } catch (error) {
    console.error(`[${transcriptionId}] Transcription failed:`, error);
    if (error instanceof Error) {
      console.error(`[${transcriptionId}] Error name: ${error.name}, message: ${error.message}`);
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