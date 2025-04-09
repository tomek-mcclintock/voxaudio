// src/app/api/auth/google/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

export async function GET(request: NextRequest) {
  // Safer logging
  console.log('Google OAuth callback triggered');
  console.log('OAuth credentials configured:', !!CLIENT_ID && !!CLIENT_SECRET);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Google OAuth credentials are missing');
    return NextResponse.redirect('/dashboard?error=Google OAuth configuration is missing');
  }


  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect('/dashboard?error=No authorization code received');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received');
    }

    // Get user's email to verify company
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', user.email)
      .single();

    if (!userData?.company_id) {
      throw new Error('Company not found');
    }

    // Store connection details
    const campaignId = request.cookies.get('pendingCampaignId')?.value;
    
    if (campaignId) {
      await supabase.from('google_sheets_connections').upsert({
        company_id: userData.company_id,
        campaign_id: campaignId,
        refresh_token: tokens.refresh_token,
      });
    }

    return NextResponse.redirect('/dashboard/campaigns');
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect('/dashboard?error=Failed to connect to Google Sheets');
  }
}