import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
    const { name, start_date, end_date } = await request.json();

    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Create new campaign
    const { data: campaign, error: createError } = await supabase
      .from('feedback_campaigns')
      .insert([
        {
          company_id: userData.company_id,
          name,
          start_date: start_date || null,
          end_date: end_date || null,
          active: true
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating campaign:', createError);
      throw createError;
    }

    return NextResponse.json({ campaign });

  } catch (error) {
    console.error('Error in campaign creation:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}