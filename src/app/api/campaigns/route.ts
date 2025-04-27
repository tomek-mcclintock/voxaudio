// src/app/api/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's company
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();

    if (userError) throw userError;

    // Get campaign data from request
    const campaignData = await request.json();
    console.log('Server received campaign data:', campaignData);

    // Create new campaign with added fields for custom thank you pages
    const { data: campaign, error: createError } = await supabase
    .from('feedback_campaigns')
    .insert([
      {
        company_id: userData.company_id,
        name: campaignData.name,
        start_date: campaignData.start_date || null,
        end_date: campaignData.end_date || null,
        include_nps: campaignData.include_nps ?? true,
        nps_question: campaignData.nps_question || null,
        additionalFeedbackText: campaignData.additionalFeedbackText || null,
        include_additional_questions: campaignData.include_additional_questions ?? false,
        questions: campaignData.include_additional_questions ? campaignData.questions : [],
        settings: campaignData.settings || {
          allowVoice: true,
          allowText: true
        },
        language: campaignData.language || 'en',
        introText: campaignData.introText || null,
        active: true,
        // Added fields for custom thank you pages
        useCustomThankYouPages: campaignData.useCustomThankYouPages || false,
        thankYouPagePromoters: campaignData.thankYouPagePromoters || null,
        thankYouPagePassives: campaignData.thankYouPagePassives || null,
        thankYouPageDetractors: campaignData.thankYouPageDetractors || null
      }
    ])
    .select()
    .single();  

    if (createError) {
      console.error('Error creating campaign:', createError);
      throw createError;
    }

    console.log('Created campaign:', campaign);
    return NextResponse.json({ campaign });

  } catch (error) {
    console.error('Error in campaign creation:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's company
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user?.email)
      .single();

    if (userError) throw userError;

    // Get campaigns for this company
    const { data: campaigns, error: campaignsError } = await supabase
      .from('feedback_campaigns')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    return NextResponse.json({ campaigns: campaigns || [] });

  } catch (error) {
    console.error('Error in campaigns API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}