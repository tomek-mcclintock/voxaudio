// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Create a service role client that bypasses RLS
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    console.log('Starting registration process...');
    const { companyName, email, password, domain } = await request.json();
    console.log('Received registration data for:', email);

    // Create company first using service role client (bypasses RLS)
    console.log('Step 1: Creating company record...');
    const { data: company, error: companyError } = await serviceRoleClient
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

    // Then create auth user using service role client
    console.log('Step 2: Creating auth user...');
    const { data: authData, error: authError } = await serviceRoleClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        company_id: company.id,
        company_name: companyName
      }
    });

    if (authError) {
      console.error('Auth creation failed:', authError);
      // Rollback company creation
      await serviceRoleClient.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: 'Failed to create user account: ' + authError.message },
        { status: 500 }
      );
    }
    console.log('Auth user created successfully');

    // Finally create user profile using service role client
    console.log('Step 3: Creating user profile...');
    const { error: userError } = await serviceRoleClient
      .from('users')
      .insert([{
        id: authData.user.id,
        company_id: company.id,
        email: email,
        role: 'admin'
      }]);

    if (userError) {
      console.error('User profile creation failed:', userError);
      // Rollback previous creations
      await serviceRoleClient.auth.admin.deleteUser(authData.user.id);
      await serviceRoleClient.from('companies').delete().eq('id', company.id);
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