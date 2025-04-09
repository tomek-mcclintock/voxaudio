// src/components/GoogleSheetsConnect.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface GoogleSheetsConnectProps {
  campaignId: string;
  onConnect?: () => void;
}

export default function GoogleSheetsConnect({ campaignId, onConnect }: GoogleSheetsConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkConnection();
  }, [campaignId]);

  const checkConnection = async () => {
    const { data } = await supabase
      .from('google_sheets_connections')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (data) {
      setIsConnected(true);
      setSpreadsheetId(data.spreadsheet_id || '');
      setSheetName(data.sheet_name || '');
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      // Store campaign ID first
      document.cookie = `pendingCampaignId=${campaignId}; max-age=${60 * 30}; path=/`; // 30 minutes expiry
      
      // Start OAuth flow
      const response = await fetch('/api/auth/google/url');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.url) {
        throw new Error('No OAuth URL received');
      }
      
      // Instead of printing the URL, actually redirect to it
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Google Sheets');
      setLoading(false);
    }
    // Note: We don't set loading to false here because we're redirecting the page
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await supabase
        .from('google_sheets_connections')
        .delete()
        .eq('campaign_id', campaignId);
      
      setIsConnected(false);
      setSpreadsheetId('');
      setSheetName('');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      setError(error instanceof Error ? error.message : 'Failed to disconnect from Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSheet = async () => {
    if (!spreadsheetId || !sheetName) return;
    
    setLoading(true);
    try {
      await supabase
        .from('google_sheets_connections')
        .update({
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName
        })
        .eq('campaign_id', campaignId);

      if (onConnect) onConnect();
    } catch (error) {
      console.error('Failed to update sheet details:', error);
      setError(error instanceof Error ? error.message : 'Failed to update sheet details');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <button
          onClick={handleConnect}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Connecting...' : 'Connect Google Sheets'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white rounded-lg shadow p-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Spreadsheet ID
        </label>
        <input
          type="text"
          value={spreadsheetId}
          onChange={(e) => setSpreadsheetId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          placeholder="Enter spreadsheet ID from URL"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Sheet Name
        </label>
        <input
          type="text"
          value={sheetName}
          onChange={(e) => setSheetName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          placeholder="e.g., Sheet1"
        />
      </div>

      <div className="flex justify-between">
        <button
          onClick={handleUpdateSheet}
          disabled={loading || !spreadsheetId || !sheetName}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Updating...' : 'Update Sheet Details'}
        </button>
        
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-red-600 hover:text-red-800"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}