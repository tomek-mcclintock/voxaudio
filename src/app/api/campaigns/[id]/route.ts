// src/app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Create a service role client that bypasses RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    console.log(`Starting deletion of campaign: ${campaignId}`);
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's company
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('email', user?.email)
      .single();

    if (userError) throw userError;

    // Check if user has permission (owns the campaign through company)
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('id, company_id')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign permission check failed:', campaignError);
      return NextResponse.json(
        { error: 'Campaign not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // From this point on, use the service role client for all deletion operations
    
    // Find all feedback submissions for this campaign
    const { data: feedbackSubmissions, error: feedbackError } = await serviceRoleClient
      .from('feedback_submissions')
      .select('id')
      .eq('campaign_id', campaignId);
    
    if (feedbackError) {
      console.error('Error fetching related submissions:', feedbackError);
      return NextResponse.json(
        { error: 'Failed to fetch related feedback submissions' },
        { status: 500 }
      );
    }
    
    if (feedbackSubmissions && feedbackSubmissions.length > 0) {
      console.log(`Found ${feedbackSubmissions.length} related feedback submissions`);
      
      // Delete all question responses for all submissions at once
      const submissionIds = feedbackSubmissions.map(sub => sub.id);
      console.log(`Deleting question responses for ${submissionIds.length} submissions`);
      
      // First attempt to check if there are any question responses
      const { count, error: countError } = await serviceRoleClient
        .from('question_responses')
        .select('*', { count: 'exact', head: true })
        .in('feedback_submission_id', submissionIds);
        
      if (countError) {
        console.error('Error checking question responses:', countError);
      } else {
        console.log(`Found ${count || 0} question responses to delete`);
      }
      
      // Delete all question responses
      const { error: responsesError } = await serviceRoleClient
        .from('question_responses')
        .delete()
        .in('feedback_submission_id', submissionIds);
      
      if (responsesError) {
        console.error('Error deleting question responses:', responsesError);
        return NextResponse.json(
          { error: `Failed to delete question responses: ${responsesError.message}` },
          { status: 500 }
        );
      }
      
      console.log('Successfully deleted all question responses');
      
      // Now delete all feedback submissions at once
      console.log('Deleting all feedback submissions');
      const { error: submissionsError } = await serviceRoleClient
        .from('feedback_submissions')
        .delete()
        .eq('campaign_id', campaignId);
      
      if (submissionsError) {
        console.error('Error deleting feedback submissions:', submissionsError);
        return NextResponse.json(
          { error: `Failed to delete feedback submissions: ${submissionsError.message}` },
          { status: 500 }
        );
      }
      
      console.log('Successfully deleted all feedback submissions');
    } else {
      console.log('No related feedback submissions found');
    }
    
    console.log('Deleting Google Sheets connections');
    
    // Delete any Google Sheets connections for this campaign
    const { error: sheetsError } = await serviceRoleClient
      .from('google_sheets_connections')
      .delete()
      .eq('campaign_id', campaignId);
    
    if (sheetsError) {
      console.error('Error deleting Google Sheets connections:', sheetsError);
      // Continue with deletion even if there's an error here
    }
    
    console.log('Deleting the campaign');
    
    // Finally, delete the campaign
    const { error: deleteError } = await serviceRoleClient
      .from('feedback_campaigns')
      .delete()
      .eq('id', campaignId);

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete campaign: ' + deleteError.message },
        { status: 500 }
      );
    }

    console.log('Campaign deleted successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete campaign API:', error);
    return NextResponse.json(
      { error: 'Failed to process delete request: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}