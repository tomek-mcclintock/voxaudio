import { NextResponse } from 'next/server';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

export async function GET() {
  const url = new URL(GOOGLE_OAUTH_URL);
  url.searchParams.append('client_id', CLIENT_ID!);
  url.searchParams.append('redirect_uri', REDIRECT_URI);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', 'https://www.googleapis.com/auth/spreadsheets');
  url.searchParams.append('access_type', 'offline');
  url.searchParams.append('prompt', 'consent');

  return NextResponse.json({ url: url.toString() });
}