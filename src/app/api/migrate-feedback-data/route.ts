// src/app/api/migrate-feedback-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client to bypass RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Define a type for the error objects
interface MigrationError {
  submissionId: string;
  error: string;
}

// Define a type for the results object
interface MigrationResults {
  total: number;
  processed: number;
  transcriptionsMigrated: number;
  npsScoresMigrated: number;
  errors: MigrationError[];
}

export async function GET(request: NextRequest) {
  try {
    console.log('Starting feedback data migration...');
    
    // Get all feedback submissions with transcriptions or voice files
    const { data: submissions, error: fetchError } = await serviceRoleClient
      .from('feedback_submissions')
      .select('id, company_id, campaign_id, transcription, voice_file_url, nps_score')
      .or('transcription.neq.null,voice_file_url.neq.null,nps_score.neq.null')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      throw new Error(`Failed to fetch submissions: ${fetchError.message}`);
    }
    
    console.log(`Found ${submissions?.length || 0} submissions to migrate`);
    
    // Initialize results with proper typing
    const results: MigrationResults = {
      total: submissions?.length || 0,
      processed: 0,
      transcriptionsMigrated: 0,
      npsScoresMigrated: 0,
      errors: []
    };
    
    // Process each submission
    for (const submission of submissions || []) {
      try {
        // Check if we already have an 'nps_score' entry for this submission
        const { data: existingNpsResponse, error: checkError } = await serviceRoleClient
          .from('question_responses')
          .select('id')
          .eq('feedback_submission_id', submission.id)
          .eq('question_id', 'nps_score')
          .maybeSingle();
          
        if (checkError) {
          throw new Error(`Error checking existing NPS response: ${checkError.message}`);
        }
        
        // If NPS entry exists, update it
        if (existingNpsResponse) {
          console.log(`Updating existing NPS response for submission ${submission.id}`);
          
          const updates: any = {};
          
          // Add NPS score if available
          if (submission.nps_score !== null) {
            updates.response_value = submission.nps_score.toString();
          }
          
          // Add transcription if available
          if (submission.transcription) {
            updates.transcription = submission.transcription;
            updates.transcription_status = 'completed';
            results.transcriptionsMigrated++;
          }
          
          // Add voice file URL if available
          if (submission.voice_file_url) {
            updates.voice_file_url = submission.voice_file_url;
          }
          
          const { error: updateError } = await serviceRoleClient
            .from('question_responses')
            .update(updates)
            .eq('id', existingNpsResponse.id);
            
          if (updateError) {
            throw new Error(`Failed to update NPS response: ${updateError.message}`);
          }
        } else {
          // Create new consolidated NPS entry
          const newNpsResponse: any = {
            feedback_submission_id: submission.id,
            question_id: 'nps_score',
            response_value: submission.nps_score !== null ? submission.nps_score.toString() : null
          };
          
          // Add transcription if available
          if (submission.transcription) {
            newNpsResponse.transcription = submission.transcription;
            newNpsResponse.transcription_status = 'completed';
            results.transcriptionsMigrated++;
          }
          
          // Add voice file URL if available
          if (submission.voice_file_url) {
            newNpsResponse.voice_file_url = submission.voice_file_url;
          }
          
          const { error: insertError } = await serviceRoleClient
            .from('question_responses')
            .insert([newNpsResponse]);
            
          if (insertError) {
            throw new Error(`Failed to insert NPS response: ${insertError.message}`);
          }
          
          results.npsScoresMigrated++;
        }
        
        results.processed++;
        
        // Log progress every 10 submissions
        if (results.processed % 10 === 0) {
          console.log(`Processed ${results.processed}/${results.total} submissions`);
        }
      } catch (submissionError) {
        console.error(`Error processing submission ${submission.id}:`, submissionError);
        results.errors.push({
          submissionId: submission.id,
          error: submissionError instanceof Error ? submissionError.message : String(submissionError)
        });
      }
    }
    
    console.log('Migration completed with results:', results);
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}