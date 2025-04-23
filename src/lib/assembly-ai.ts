// src/lib/assembly-ai.ts
export async function transcribeWithAssemblyAI(audioBuffer: Buffer): Promise<string> {
    const transcriptionId = `asm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${transcriptionId}] Starting Assembly AI transcription, buffer size: ${audioBuffer.length} bytes`);
    
    try {
      // First, upload the audio file
      console.log(`[${transcriptionId}] Uploading audio to Assembly AI`);
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': process.env.ASSEMBLY_AI_API_KEY || '',
          'content-type': 'application/octet-stream',
        },
        body: audioBuffer
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const audioUrl = uploadResult.upload_url;
      console.log(`[${transcriptionId}] Upload successful, URL: ${audioUrl}`);
      
      // Then, submit the transcription job
      console.log(`[${transcriptionId}] Submitting transcription request`);
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': process.env.ASSEMBLY_AI_API_KEY || '',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_detection: true
        })
      });
      
      if (!transcriptResponse.ok) {
        throw new Error(`Transcription request failed: ${transcriptResponse.status} ${await transcriptResponse.text()}`);
      }
      
      const transcriptResult = await transcriptResponse.json();
      const transcriptId = transcriptResult.id;
      console.log(`[${transcriptionId}] Transcription job submitted, ID: ${transcriptId}`);
      
      // Poll for the transcription result
      let transcript = null;
      let attempts = 0;
      const maxAttempts = 30; // Maximum 30 attempts (30 seconds)
      
      while (!transcript || (transcript.status !== 'completed' && transcript.status !== 'error')) {
        // Wait 1 second between polling
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        attempts++;
        console.log(`[${transcriptionId}] Polling attempt ${attempts}/${maxAttempts}`);
        
        if (attempts >= maxAttempts) {
          throw new Error(`Transcription timed out after ${maxAttempts} seconds`);
        }
        
        const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'authorization': process.env.ASSEMBLY_AI_API_KEY || '',
          }
        });
        
        if (!pollingResponse.ok) {
          throw new Error(`Polling failed: ${pollingResponse.status} ${await pollingResponse.text()}`);
        }
        
        transcript = await pollingResponse.json();
        console.log(`[${transcriptionId}] Current status: ${transcript.status}`);
        
        if (transcript.status === 'error') {
          throw new Error(`Transcription failed: ${transcript.error}`);
        }
      }
      
      console.log(`[${transcriptionId}] Transcription completed: "${transcript.text.substring(0, 100)}..."`);
      return transcript.text;
    } catch (error) {
      console.error(`[${transcriptionId}] Assembly AI transcription error:`, error);
      throw error;
    }
  }