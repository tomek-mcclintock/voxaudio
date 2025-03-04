// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Function to generate a random password if needed
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
    const { email, role, password: providedPassword, companyId } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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
        { error: 'Only admin users can create new users' },
        { status: 403 }
      );
    }

    // Use provided company ID or get from current user
    const targetCompanyId = companyId || currentUserData.company_id;

    // Check if user already exists in this company
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('company_id', targetCompanyId)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this company' },
        { status: 400 }
      );
    }

    // Generate password if not provided
    const password = providedPassword || generatePassword();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account: ' + authError.message },
        { status: 500 }
      );
    }

    // Create user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id, // Use the auth user ID
        email,
        company_id: targetCompanyId,
        role: role || 'standard'
      }])
      .select()
      .single();

    if (userError) {
      console.error('User record creation error:', userError);
      // Try to delete the auth user if user record creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Failed to create user record: ' + userError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role
      },
      credentials: {
        email,
        password
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to process user creation: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user's session
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('email', currentUser.email)
      .single();

    if (userError) {
      throw userError;
    }

    // Get all users for this company
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false });

    if (usersError) {
      throw usersError;
    }

    return NextResponse.json({ users: users || [] });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    // Role must be admin or standard
    if (role !== 'admin' && role !== 'standard') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "standard"' },
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
        { error: 'Only admin users can update user roles' },
        { status: 403 }
      );
    }

    // Make sure the user being updated is in the same company
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
        { error: 'Cannot update users from another company' },
        { status: 403 }
      );
    }

    // Don't allow changing your own role (to prevent locking yourself out)
    if (targetUser.email === currentUser.email) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Update the user role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('id');

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
        { error: 'Only admin users can delete users' },
        { status: 403 }
      );
    }

    // Make sure the user being deleted is in the same company
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
        { error: 'Cannot delete users from another company' },
        { status: 403 }
      );
    }

    // Don't allow deleting yourself
    if (targetUser.email === currentUser.email) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete the user record
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteUserError) {
      throw deleteUserError;
    }

    // Delete auth user
    // Note: This requires Supabase service role key to work properly
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.warn('Could not delete auth user:', deleteAuthError);
      // Continue anyway, as we've already removed the user from the company
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user: ' + (error as Error).message },
      { status: 500 }
    );
  }
}