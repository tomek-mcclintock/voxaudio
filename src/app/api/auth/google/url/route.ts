// src/app/api/auth/google/url/route.ts
import { NextResponse } from 'next/server';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

export async function GET() {
  // Log the environment variables to help debug
  console.log('Environment variables check:');
  console.log('CLIENT_ID:', CLIENT_ID);
  console.log('REDIRECT_URI:', REDIRECT_URI);
  
  if (!CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID is undefined');
    return NextResponse.json({ error: 'Google OAuth configuration is missing' }, { status: 500 });
  }

  const url = new URL(GOOGLE_OAUTH_URL);
  url.searchParams.append('client_id', CLIENT_ID);
  url.searchParams.append('redirect_uri', REDIRECT_URI);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', 'https://www.googleapis.com/auth/spreadsheets');
  url.searchParams.append('access_type', 'offline');
  url.searchParams.append('prompt', 'consent');

  return NextResponse.json({ url: url.toString() });
}