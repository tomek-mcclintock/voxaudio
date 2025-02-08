// src/lib/googleSheets.ts
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

export async function appendToSheet(refreshToken: string, spreadsheetId: string, sheetName: string, values: any[][]) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values
      },
    });

    return true;
  } catch (error) {
    console.error('Error appending to Google Sheet:', error);
    return false;
  }
}

// Function to format feedback data for sheets
export function formatFeedbackForSheets(feedback: any) {
  return [[
    new Date(feedback.created_at).toISOString(),
    feedback.order_id,
    feedback.nps_score,
    feedback.transcription || '',
    feedback.sentiment || '',
  ]];
}