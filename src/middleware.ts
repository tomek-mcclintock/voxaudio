// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Handle protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Additional check for admin-only routes
    if (req.nextUrl.pathname.startsWith('/dashboard/settings')) {
      try {
        // Get the user's role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('email', session.user.email)
          .single();

        if (userError || !userData) {
          throw new Error('Failed to get user role');
        }

        // If the user is not an admin, redirect to dashboard home
        if (userData.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        // In case of error, redirect to dashboard home to be safe
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
  }

  // Handle auth routes when already logged in
  if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register') && session) {
    const redirectUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register']
};