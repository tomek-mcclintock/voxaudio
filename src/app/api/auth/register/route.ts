// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting registration process...');
    const { companyName, email, password, domain } = await request.json();
    console.log('Received registration data for:', email);

    // Create company first
    console.log('Step 1: Creating company record...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: companyName,
        domain: domain || null,
      }])
      .select()
      .single();

    if (companyError) {
      console.error('Company creation failed:', companyError);
      return NextResponse.json(
        { error: 'Failed to create company: ' + companyError.message },
        { status: 500 }
      );
    }
    console.log('Company created successfully:', company.id);

    // Then create auth user
    console.log('Step 2: Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_id: company.id,
          company_name: companyName
        }
      }
    });

    if (authError) {
      console.error('Auth creation failed:', authError);
      // Rollback company creation
      await supabase.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: 'Failed to create user account: ' + authError.message },
        { status: 500 }
      );
    }
    console.log('Auth user created successfully');

    // Finally create user profile
    console.log('Step 3: Creating user profile...');
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        company_id: company.id,
        email: email,
        role: 'admin'
      }]);

    if (userError) {
      console.error('User profile creation failed:', userError);
      // Rollback previous creations
      await supabase.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + userError.message },
        { status: 500 }
      );
    }

    console.log('Registration completed successfully');
    return NextResponse.json({
      success: true,
      company: company,
      user: authData.user
    });

  } catch (error) {
    console.error('Registration process failed:', error);
    return NextResponse.json(
      { error: 'Failed to process registration: ' + (error as Error).message },
      { status: 500 }
    );
  }
}