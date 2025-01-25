import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  if (!token || type !== 'signup') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'signup'
  });

  if (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${error.message}`, request.url)
    );
  }

  return NextResponse.redirect(new URL('/login?verified=true', request.url));
}