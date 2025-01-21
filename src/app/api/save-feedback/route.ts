export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadVoiceRecording } from '@/lib/s3';
import { transcribeAudio, analyzeFeedback } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const orderId = formData.get('orderId') as string;
    const npsScore = parseInt(formData.get('npsScore') as string);
    const audioFile = formData.get('audio') as Blob | null;

    if (!orderId || !npsScore) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let voiceFileUrl = null;
    let transcription = null;
    let sentiment = null;

    if (audioFile) {
      const arrayBuffer = await audioFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      voiceFileUrl = await uploadVoiceRecording(buffer, orderId);
      transcription = await transcribeAudio(buffer);

      if (transcription) {
        const analysis = await analyzeFeedback(transcription);
        sentiment = analysis.sentiment;
      }
    }

    const { error: dbError } = await supabase
      .from('feedback_submissions')
      .insert({
        order_id: orderId,
        nps_score: npsScore,
        voice_file_url: voiceFileUrl,
        transcription,
        sentiment,
        processed: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}