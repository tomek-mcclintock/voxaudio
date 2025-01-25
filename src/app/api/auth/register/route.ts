import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { companyName, email, password, domain } = await request.json();
    console.log('Registration attempt for:', email);

    // Validate inputs
    if (!companyName || !email || !password) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth
    console.log('Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    console.log('Auth user created:', authData.user?.id);

    // Wait a moment for auth to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create company record
    console.log('Creating company record...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: companyName,
        domain: domain || null,
      }])
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      return NextResponse.json(
        { error: 'Failed to create company: ' + companyError.message },
        { status: 500 }
      );
    }

    console.log('Company created:', company.id);

    // Create user profile linking to company
    console.log('Creating user profile...');
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        company_id: company.id,
        email: email,
        role: 'admin'
      }]);

    if (userError) {
      console.error('User profile error:', userError);
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + userError.message },
        { status: 500 }
      );
    }

    console.log('Registration complete for:', email);
    return NextResponse.json({
      success: true,
      company: company,
      user: authData.user
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to process registration: ' + (error as Error).message },
      { status: 500 }
    );
  }
}