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

  console.log('Middleware session check:', session ? 'Found session' : 'No session');
  if (error) console.error('Session error:', error);

  // Handle protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const redirectUrl = new URL('/login', req.url);
      console.log('No session, redirecting to:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Handle auth routes when already logged in
  if (req.nextUrl.pathname === '/login' && session) {
    const redirectUrl = new URL('/dashboard', req.url);
    console.log('Session exists, redirecting to:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
};