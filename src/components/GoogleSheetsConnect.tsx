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
    try {
      // Start OAuth flow
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      
      // Store campaign ID in localStorage for after OAuth
      localStorage.setItem('pendingCampaignId', campaignId);
      
      // Redirect to Google OAuth
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
    } finally {
      setLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
      >
        {loading ? 'Connecting...' : 'Connect Google Sheets'}
      </button>
    );
  }

  return (
    <div className="space-y-4 bg-white rounded-lg shadow p-6">
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