// src/app/dashboard/campaigns/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCompany } from '@/lib/contexts/CompanyContext';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import TopicAnalysis from '@/components/TopicAnalysis';

interface CampaignData {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
  include_nps: boolean;
  questions?: any[];
  summary?: string | null;
  language?: string;
}

interface FeedbackData {
  created_at: string;
  order_id?: string | null;
  nps_score: number | null;
  transcription: string | null;
  sentiment: string | null;
  question_responses: Array<{
    question_id: string;
    response_value: string;
    voice_file_url?: string | null;
    transcription?: string | null;
    transcription_status?: string | null;
  }> | null;
}

interface CampaignStats {
  totalResponses: number;
  averageNPS: number | null;
  responsesWithVoice: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

interface DailyNpsData {
  promoters: number;
  detractors: number;
  total: number;
}

interface ChartDataPoint {
  date: string;
  nps: number;
}

// Helper function to get question text by ID
function getQuestionTextById(questions: any[] | undefined, questionId: string): string {
  if (!questions) return `Question ${questionId}`;
  
  const question = questions.find(q => q.id === questionId);
  return question ? question.text : `Question ${questionId}`;
}

// Helper function to process question response value
function formatResponseValue(value: string, voiceTranscription?: string | null): string {
  // If there's a voice transcription, show it
  if (voiceTranscription) {
    return `[Voice] ${voiceTranscription}`;
  }
  
  // Try to parse as JSON in case it's a complex value
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object') {
      return JSON.stringify(parsed);
    }
    return parsed.toString();
  } catch (e) {
    // If not JSON, return as is
    return value;
  }
}

// Helper function to display transcription status
function getTranscriptionStatus(status?: string | null) {
  switch(status) {
    case 'pending':
      return <span className="text-yellow-500 text-xs font-medium">Processing...</span>;
    case 'processing':
      return <span className="text-blue-500 text-xs font-medium">Transcribing...</span>;
    case 'completed':
      return <span className="text-green-500 text-xs font-medium">Completed</span>;
    case 'failed':
      return <span className="text-red-500 text-xs font-medium">Failed</span>;
    case 'file_error':
      return <span className="text-red-500 text-xs font-medium">File Error</span>;
    default:
      return null;
  }
}

export default function CampaignDetails({ params }: { params: { id: string } }) {
  const company = useCompany();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [hasPendingTranscriptions, setHasPendingTranscriptions] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'topics'>('overview');

  useEffect(() => {
    // Check if there are pending transcriptions
    const pendingExists = feedback.some(item => 
      item.question_responses?.some(r => 
        r.transcription_status === 'pending' || r.transcription_status === 'processing'
      )
    );
    setHasPendingTranscriptions(pendingExists);
  }, [feedback]);

  // Then use this state in your main effect:
  useEffect(() => {
    fetchCampaignData();
    
    // Set up refresh interval only if needed
    let interval: NodeJS.Timeout | null = null;
    if (hasPendingTranscriptions) {
      interval = setInterval(() => {
        fetchCampaignData();
      }, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [params.id, hasPendingTranscriptions]); // Remove feedback from dependencies

  const fetchCampaignData = async () => {
    try {
      const response = await fetch(`/api/campaigns/details/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setCampaign(data.campaign);
        setFeedback(data.feedback);
        setSummary(data.campaign.summary || null);
        
        // Calculate stats
        const totalResponses = data.feedback.length;
        
        // Only calculate NPS if the campaign includes NPS questions
        let averageNPS = null;
        if (data.campaign.include_nps) {
          // Extract NPS scores
          const npsScores = data.feedback
            .map((f: FeedbackData) => f.nps_score)
            .filter((score: number | null) => score !== null);
          
          // Calculate proper NPS (-100 to 100 scale)
          if (npsScores.length > 0) {
            const promoters = npsScores.filter((score: number) => score >= 9).length;
            const detractors = npsScores.filter((score: number) => score <= 6).length;
            const promoterPercentage = (promoters / npsScores.length) * 100;
            const detractorPercentage = (detractors / npsScores.length) * 100;
            averageNPS = promoterPercentage - detractorPercentage;
          }
        }
        
        const stats: CampaignStats = {
          totalResponses,
          averageNPS,
          responsesWithVoice: data.feedback.filter((f: FeedbackData) => {
            // Check for transcription from NPS feedback or question_responses
            const npsResponse = f.question_responses?.find(r => r.question_id === 'nps_score');
            return npsResponse?.transcription || f.transcription;
          }).length,
          positiveCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'positive').length,
          negativeCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'negative').length,
          neutralCount: data.feedback.filter((f: FeedbackData) => f.sentiment === 'neutral').length,
        };
        
        setStats(stats);
        
        // Prepare chart data if campaign includes NPS
        if (data.campaign.include_nps) {
          const npsDataByDate: Record<string, DailyNpsData> = {};
          
          // Group feedback by date and count promoters/detractors
          data.feedback.forEach((item: FeedbackData) => {
            if (item.nps_score === null) return;
            
            const date = new Date(item.created_at).toLocaleDateString();
            if (!npsDataByDate[date]) {
              npsDataByDate[date] = { promoters: 0, detractors: 0, total: 0 };
            }
            
            if (item.nps_score >= 9) npsDataByDate[date].promoters++;
            if (item.nps_score <= 6) npsDataByDate[date].detractors++;
            npsDataByDate[date].total++;
          });
          
          // Convert to array for the chart
          const chartPoints: ChartDataPoint[] = Object.entries(npsDataByDate)
            .map(([dateStr, data]) => {
              const promoterPct = (data.promoters / data.total) * 100;
              const detractorPct = (data.detractors / data.total) * 100;
              const npsScore = promoterPct - detractorPct;
              return {
                date: dateStr,
                nps: npsScore
              };
            })
            .sort((a: ChartDataPoint, b: ChartDataPoint) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
          
          setChartData(chartPoints);
        }
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!campaign) return;
    
    setIsGeneratingSummary(true);
    try {
      const response = await fetch(`/api/campaigns/${params.id}/summary`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const exportToExcel = () => {
    if (!campaign || !feedback) return;
  
    // Format the current date for the filename
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Prepare column headers
    const headers = ['Date', 'Time', 'Order ID'];
    
    // Add NPS score header if campaign includes NPS
    if (campaign.include_nps) {
      headers.push('NPS Score');
      headers.push('Voice Feedback');
      headers.push('Sentiment');
    }
    
    // Add question headers (getting text from questions array)
    if (campaign.questions && campaign.questions.length > 0) {
      campaign.questions.forEach(question => {
        // Use a shorter version of the question text if it's too long
        const questionText = question.text.length > 30 
          ? question.text.substring(0, 30) + '...' 
          : question.text;
        headers.push(questionText);
      });
    }
    
    // Prepare feedback data rows
    const rows = feedback.map(item => {
      // Parse the date and time
      const dateObj = new Date(item.created_at);
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString();
      
      // Start with base data
      const row = [date, time, item.order_id || ''];
      
      // Add NPS data if included
      if (campaign.include_nps) {
        row.push(item.nps_score !== null ? item.nps_score.toString() : 'N/A');
        
        // Use NPS transcription from question_responses
        const npsResponse = item.question_responses?.find(r => r.question_id === 'nps_score');
        const npsTranscription = npsResponse?.transcription || item.transcription || '';
        row.push(npsTranscription);
        
        row.push(item.sentiment || '');
      }
      
      // Add question responses
      if (campaign.questions && campaign.questions.length > 0) {
        campaign.questions.forEach(question => {
          // Find the response for this question
          const response = item.question_responses?.find(r => r.question_id === question.id);
          
          let responseValue = 'No response';
          
          if (response) {
            // Check if it's a voice response with transcription
            if (response.transcription) {
              responseValue = `[Voice] ${response.transcription}`;
            } else if (response.voice_file_url && response.transcription_status) {
              // For pending transcriptions
              responseValue = `[Voice - ${response.transcription_status}]`;
            } else if (response.response_value) {
              // Format text response
              try {
                // Try to parse as JSON for multiple choice, etc.
                const parsed = JSON.parse(response.response_value);
                responseValue = typeof parsed === 'object' ? JSON.stringify(parsed) : parsed.toString();
              } catch (e) {
                // Just use text as is if not JSON
                responseValue = response.response_value;
              }
            }
          }
          
          row.push(responseValue);
        });
      }
      
      return row;
    });
    
    // Create worksheet with headers and data
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    
    // Excel has a 31 character limit for sheet names
    // Truncate the campaign name if it's too long
    const sheetName = campaign.name ? 
      (campaign.name.length > 31 ? campaign.name.substring(0, 28) + '...' : campaign.name) :
      'Feedback';
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Auto-size columns for better readability
    const colWidths = headers.map(h => ({
      wch: Math.max(h.length, 15) // Set minimum width of 15 characters
    }));
    worksheet['!cols'] = colWidths;
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `${campaign.name}-feedback-export-${dateStr}.xlsx`);
  };

  if (loading) {
    return <div className="p-8">Loading campaign data...</div>;
  }

  if (!campaign) {
    return <div className="p-8">Campaign not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link 
          href="/dashboard/campaigns"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">
              {campaign.start_date && campaign.end_date 
                ? `${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`
                : 'No date range set'
              }
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            campaign.active 
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {campaign.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-1 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`px-1 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'topics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Topic Analysis
          </button>
        </nav>
      </div>


      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={exportToExcel}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Export to Excel
        </button>
        
        {activeTab === 'overview' && (
          <button
            onClick={generateSummary}
            disabled={isGeneratingSummary}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
          >
            {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
          </button>
        )}
      </div>

      {activeTab === 'overview' ? (
        // Overview Tab Content
        <div>
        {/* Summary Section */}
        {summary && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Feedback Summary</h2>
            <div 
              className="text-gray-700 rich-text-content"
              dangerouslySetInnerHTML={{ __html: summary }}
            />
          </div>
        )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Total Responses</h3>
                <p className="text-3xl font-semibold">{stats.totalResponses}</p>
              </div>
              {campaign.include_nps && stats.averageNPS !== null && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500">NPS Score</h3>
                  <p className="text-3xl font-semibold">{stats.averageNPS.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">Range: -100 to 100</p>
                </div>
              )}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Voice Responses</h3>
                <p className="text-3xl font-semibold">{stats.responsesWithVoice}</p>
              </div>
            </div>
          )}

          {/* NPS Trend Chart - Only show if campaign includes NPS */}
          {campaign.include_nps && chartData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">NPS Score Trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      domain={[-100, 100]} 
                      ticks={[-100, -50, 0, 50, 100]} 
                      label={{ value: 'NPS Score', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="nps" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sentiment Analysis - Only show if campaign includes NPS */}
          {campaign.include_nps && stats && (stats.positiveCount > 0 || stats.negativeCount > 0 || stats.neutralCount > 0) && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Sentiment Analysis</h2>
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 p-4 rounded-lg">
                  <div className="text-green-700 font-semibold mb-2">Positive</div>
                  <div className="text-3xl font-bold text-green-600">{stats.positiveCount}</div>
                </div>
                <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                  <div className="text-gray-700 font-semibold mb-2">Neutral</div>
                  <div className="text-3xl font-bold text-gray-600">{stats.neutralCount}</div>
                </div>
                <div className="flex-1 bg-red-50 p-4 rounded-lg">
                  <div className="text-red-700 font-semibold mb-2">Negative</div>
                  <div className="text-3xl font-bold text-red-600">{stats.negativeCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Feedback Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Recent Feedback</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    {campaign.include_nps && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NPS Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sentiment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feedback</th>
                      </>
                    )}
                    {/* Dynamically create columns for custom questions */}
                    {campaign.questions && campaign.questions.length > 0 && campaign.questions.map((question) => (
                      <th key={question.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {question.text.length > 30 ? question.text.substring(0, 30) + '...' : question.text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedback.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      
                      {/* NPS related columns - only if campaign includes NPS */}
                      {campaign.include_nps && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.nps_score !== null ? (
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                item.nps_score >= 9 ? 'bg-green-100 text-green-800' :
                                item.nps_score >= 7 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.nps_score}
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.sentiment || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {(() => {
                              // Look for transcription in question_responses for nps_score
                              const npsResponse = item.question_responses?.find(r => r.question_id === 'nps_score');
                              const transcription = npsResponse?.transcription || item.transcription;
                              
                              if (transcription) {
                                return (
                                  <div className="max-w-xl break-words whitespace-pre-wrap">
                                    {transcription}
                                  </div>
                                );
                              } else {
                                return 'No voice feedback';
                              }
                            })()}
                          </td>
                        </>
                      )}
                      
                      {/* Question response columns - for all campaigns */}
                      {campaign.questions && campaign.questions.length > 0 && campaign.questions.map((question) => {
                        // Find the response for this question
                        const response = item.question_responses?.find(r => r.question_id === question.id);
                        
                        return (
                          <td key={question.id} className="px-6 py-4 text-sm text-gray-500">
                            {response ? (
                              <div className="space-y-1">
                                {/* If there's a voice response with transcription */}
                                {response.transcription && (
                                  <div className="max-w-xl break-words whitespace-pre-wrap">
                                    <span className="text-blue-500 font-medium">[Voice]</span> {response.transcription}
                                  </div>
                                )}
                                
                                {/* For voice response pending transcription */}
                                {response.voice_file_url && !response.transcription && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-blue-500 font-medium">[Voice]</span>
                                    {getTranscriptionStatus(response.transcription_status)}
                                  </div>
                                )}
                                
                                {/* For text response */}
                                {response.response_value && !response.transcription && (
                                  <div className="max-w-xl break-words whitespace-pre-wrap">
                                    {formatResponseValue(response.response_value)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">No response</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // Topic Analysis Tab Content
        <div>
          <TopicAnalysis campaignId={params.id} feedback={feedback} />
        </div>
      )}
    </div>
  );
}