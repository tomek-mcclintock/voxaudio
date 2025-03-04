// src/app/api/users/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Function to generate a random password
function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get current user's session
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if current user is an admin
    const { data: currentUserData, error: userRoleError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('email', currentUser.email)
      .single();

    if (userRoleError || !currentUserData) {
      return NextResponse.json(
        { error: 'Failed to validate user permissions' },
        { status: 403 }
      );
    }

    if (currentUserData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admin users can reset passwords' },
        { status: 403 }
      );
    }

    // Make sure the user is in the same company
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('email, company_id')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.company_id !== currentUserData.company_id) {
      return NextResponse.json(
        { error: 'Cannot reset password for users from another company' },
        { status: 403 }
      );
    }

    // Generate a new password
    const newPassword = generatePassword();

    // Update the user's password
    // Note: This requires Supabase service role key to work properly
    const { error: resetError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (resetError) {
      throw resetError;
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      credentials: {
        email: targetUser.email,
        password: newPassword
      }
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password: ' + (error as Error).message },
      { status: 500 }
    );
  }
}