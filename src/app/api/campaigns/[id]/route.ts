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

    // Check if user has permission (admin or owns the campaign through company)
    const { data: campaign, error: campaignError } = await supabase
      .from('feedback_campaigns')
      .select('id, company_id')
      .eq('id', campaignId)
      .eq('company_id', userData.company_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // First, delete related feedback submissions and question responses
    // This prevents foreign key constraint errors
    
    // Get all feedback submissions for this campaign
    const { data: feedbackSubmissions } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('campaign_id', campaignId);
    
    if (feedbackSubmissions && feedbackSubmissions.length > 0) {
      // Delete question responses for all feedback submissions
      const submissionIds = feedbackSubmissions.map(sub => sub.id);
      
      await supabase
        .from('question_responses')
        .delete()
        .in('feedback_submission_id', submissionIds);
      
      // Delete the feedback submissions
      await supabase
        .from('feedback_submissions')
        .delete()
        .eq('campaign_id', campaignId);
    }
    
    // Delete Google Sheets connections for this campaign
    await supabase
      .from('google_sheets_connections')
      .delete()
      .eq('campaign_id', campaignId);

    // Finally, delete the campaign
    const { error: deleteError } = await supabase
      .from('feedback_campaigns')
      .delete()
      .eq('id', campaignId);

    if (deleteError) {
      console.error('Error deleting campaign:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in delete campaign API:', error);
    return NextResponse.json(
      { error: 'Failed to process delete request' },
      { status: 500 }
    );
  }
}