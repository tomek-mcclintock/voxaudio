// src/app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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

    console.log('Step 1: Deleting question responses related to this campaign');
    
    // Find all feedback submissions for this campaign
    const { data: feedbackSubmissions, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('campaign_id', campaignId);
    
    if (feedbackError) {
      console.error('Error fetching related submissions:', feedbackError);
    }
    
    if (feedbackSubmissions && feedbackSubmissions.length > 0) {
      console.log(`Found ${feedbackSubmissions.length} related feedback submissions`);
      const submissionIds = feedbackSubmissions.map(sub => sub.id);
      
      // Delete question responses for all related feedback submissions
      const { error: responsesError } = await supabase
        .from('question_responses')
        .delete()
        .in('feedback_submission_id', submissionIds);
      
      if (responsesError) {
        console.error('Error deleting question responses:', responsesError);
        return NextResponse.json(
          { error: 'Failed to delete related question responses' },
          { status: 500 }
        );
      }
      
      console.log('Step 2: Deleting feedback submissions');
      
      // Delete the feedback submissions themselves
      const { error: deleteSubmissionsError } = await supabase
        .from('feedback_submissions')
        .delete()
        .eq('campaign_id', campaignId);
      
      if (deleteSubmissionsError) {
        console.error('Error deleting feedback submissions:', deleteSubmissionsError);
        return NextResponse.json(
          { error: 'Failed to delete related feedback submissions' },
          { status: 500 }
        );
      }
    } else {
      console.log('No related feedback submissions found');
    }
    
    console.log('Step 3: Deleting Google Sheets connections');
    
    // Delete any Google Sheets connections for this campaign
    const { error: sheetsError } = await supabase
      .from('google_sheets_connections')
      .delete()
      .eq('campaign_id', campaignId);
    
    if (sheetsError) {
      console.error('Error deleting Google Sheets connections:', sheetsError);
      // Continue with deletion even if there's an error here
    }
    
    console.log('Step 4: Deleting the campaign');
    
    // Finally, delete the campaign
    const { error: deleteError } = await supabase
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
      { error: 'Failed to process delete request: ' + (error as Error).message },
      { status: 500 }
    );
  }
}