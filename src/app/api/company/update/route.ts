// src/app/api/company/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's company and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    // Check if user is an admin
    if (userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin users can update company profile' },
        { status: 403 }
      );
    }

    // Get request data
    const { primary_color, logo_url } = await request.json();

    // Update the company profile
    const { data: company, error: updateError } = await supabase
      .from('companies')
      .update({
        primary_color: primary_color,
        logo_url: logo_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.company_id)
      .select('id, name, primary_color, logo_url')
      .single();

    if (updateError) {
      console.error('Error updating company:', updateError);
      return NextResponse.json(
        { error: 'Failed to update company profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      company
    });

  } catch (error) {
    console.error('Error in company update API:', error);
    return NextResponse.json(
      { error: 'Failed to process company update: ' + (error as Error).message },
      { status: 500 }
    );
  }
}