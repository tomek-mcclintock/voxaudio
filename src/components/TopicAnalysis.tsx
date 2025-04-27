// src/components/TopicAnalysis.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FeedbackItem {
  id: string;
  text: string;
}

interface TopicResult {
  topics: string[];
  featureMentions: Array<{
    feature: string;
    sentiment: string;
    count: number;
    examples: string[];
  }>;
}

interface TopicAnalysisProps {
  campaignId: string;
  feedback: any[];
}

export default function TopicAnalysis({ campaignId, feedback }: TopicAnalysisProps) {
  const [topicData, setTopicData] = useState<TopicResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  
  // Colors for sentiment badges
  const sentimentColors = {
    positive: 'bg-green-100 text-green-800',
    negative: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-800',
    mixed: 'bg-yellow-100 text-yellow-800'
  };
  
  // Function to analyze feedback
  const analyzeFeedback = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedbackIds: feedback.map(f => f.id)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to analyze feedback: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTopicData(data.topics);
      
      // Save the analysis to the campaign
      await fetch(`/api/campaigns/${campaignId}/save-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topicAnalysis: data.topics
        })
      });
    } catch (err) {
      console.error('Error analyzing feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze feedback');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load saved analysis when component mounts
  useEffect(() => {
    const loadSavedAnalysis = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/analysis`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.topicAnalysis) {
            setTopicData(data.topicAnalysis);
          }
        }
      } catch (error) {
        console.error('Error loading saved analysis:', error);
      }
    };
    
    loadSavedAnalysis();
  }, [campaignId]);
  
  // Toggle expansion of a feature
  const toggleFeature = (feature: string) => {
    if (expandedFeature === feature) {
      setExpandedFeature(null);
    } else {
      setExpandedFeature(feature);
    }
  };
  
  // Get a color for a sentiment
  const getSentimentColor = (sentiment: string): string => {
    return sentimentColors[sentiment as keyof typeof sentimentColors] || sentimentColors.neutral;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Topic Analysis</h2>
        
        <button
          onClick={analyzeFeedback}
          disabled={isLoading || feedback.length < 3}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Feedback'
          )}
        </button>
      </div>
      
      {feedback.length < 3 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <HelpCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>At least 3 feedback submissions are required for meaningful topic analysis.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {topicData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Main Topics with Example Feedback</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {topicData.topics.slice(0, 10).map((topic, index) => (
              <div key={index} className="px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                {topic}
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            {topicData.featureMentions.map((feature, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div 
                  className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleFeature(feature.feature)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{feature.feature}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSentimentColor(feature.sentiment)}`}>
                      {feature.sentiment}
                    </span>
                    <span className="text-sm text-gray-500">
                      Mentioned {feature.count} times
                    </span>
                  </div>
                  {expandedFeature === feature.feature ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                {expandedFeature === feature.feature && feature.examples.length > 0 && (
                  <div className="p-4 bg-gray-50 border-t">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Example Mentions:</h4>
                    <ul className="space-y-2">
                      {feature.examples.map((example, i) => (
                        <li key={i} className="text-sm bg-white p-3 rounded border">
                          "{example}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}