// src/components/FeedbackClustering.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FeedbackItem {
  id: string;
  text: string;
}

interface ClusterResult {
  themes: string[];
  clusters: {
    [theme: string]: FeedbackItem[];
  };
  summary: string;
}

interface TopicResult {
  topics: string[];
  keyPhrases: string[];
  featureMentions: Array<{
    feature: string;
    sentiment: string;
    count: number;
    examples: string[];
  }>;
}

interface FeedbackClusteringProps {
  campaignId: string;
  feedback: any[];
}

export default function FeedbackClustering({ campaignId, feedback }: FeedbackClusteringProps) {
  const [clusterData, setClusterData] = useState<ClusterResult | null>(null);
  const [topicData, setTopicData] = useState<TopicResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  
  // Colors for the themes
  const themeColors = [
    'bg-blue-100 border-blue-300 text-blue-800',
    'bg-green-100 border-green-300 text-green-800',
    'bg-purple-100 border-purple-300 text-purple-800',
    'bg-yellow-100 border-yellow-300 text-yellow-800',
    'bg-red-100 border-red-300 text-red-800',
    'bg-indigo-100 border-indigo-300 text-indigo-800',
    'bg-pink-100 border-pink-300 text-pink-800',
    'bg-teal-100 border-teal-300 text-teal-800'
  ];
  
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
      setClusterData(data.clusters);
      setTopicData(data.topics);
    } catch (err) {
      console.error('Error analyzing feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze feedback');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle expansion of a theme
  const toggleTheme = (theme: string) => {
    if (expandedTheme === theme) {
      setExpandedTheme(null);
    } else {
      setExpandedTheme(theme);
    }
  };
  
  // Toggle expansion of a feature
  const toggleFeature = (feature: string) => {
    if (expandedFeature === feature) {
      setExpandedFeature(null);
    } else {
      setExpandedFeature(feature);
    }
  };
  
  // Get a color for a theme based on its index
  const getThemeColor = (theme: string): string => {
    const index = clusterData?.themes.indexOf(theme) || 0;
    return themeColors[index % themeColors.length];
  };
  
  // Get a color for a sentiment
  const getSentimentColor = (sentiment: string): string => {
    return sentimentColors[sentiment as keyof typeof sentimentColors] || sentimentColors.neutral;
  };
  
  // Generate a simple word cloud visualization
  const renderWordCloud = () => {
    if (!topicData?.keyPhrases || topicData.keyPhrases.length === 0) {
      return <p className="text-gray-500 italic">No key phrases identified</p>;
    }
    
    return (
      <div className="flex flex-wrap gap-2 max-w-2xl">
        {topicData.keyPhrases.map((phrase, index) => {
          // Use a simple algorithm to determine size based on position in the array
          // Assuming phrases are already sorted by importance
          const size = 100 - Math.min(70, index * 5); // From 100% to 30%
          
          return (
            <div 
              key={index}
              className="px-3 py-1 rounded-full border"
              style={{ 
                fontSize: `${size}%`,
                opacity: size / 100,
                backgroundColor: `rgba(${100 + index * 5}, ${150 - index * 3}, ${200 - index * 5}, 0.2)`,
                borderColor: `rgba(${100 + index * 5}, ${150 - index * 3}, ${200 - index * 5}, 0.4)`
              }}
            >
              {phrase}
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Feedback Clustering & Topic Analysis</h2>
        
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
          <p>At least 3 feedback submissions are required for meaningful clustering analysis.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {clusterData && topicData && (
        <div className="space-y-8">
          {/* Topic Visualization */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Key Phrases & Topics</h3>
            <div className="space-y-6">
              {renderWordCloud()}
              
              <div>
                <h4 className="font-medium mb-2">Main Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {topicData.topics.map((topic, index) => (
                    <div 
                      key={index} 
                      className={`px-3 py-1 rounded-full ${themeColors[index % themeColors.length]}`}
                    >
                      {topic}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Feature Mentions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Product Feature Analysis</h3>
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
          
          {/* Feedback Clusters */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Feedback Clusters</h3>
            <p className="mb-4 text-gray-600">{clusterData.summary}</p>
            
            <div className="space-y-4">
              {clusterData.themes.map((theme, index) => {
                const items = clusterData.clusters[theme] || [];
                return (
                  <div key={index} className={`border rounded-lg overflow-hidden`}>
                    <div 
                      className={`flex justify-between items-center p-4 cursor-pointer hover:bg-opacity-80 ${getThemeColor(theme)}`}
                      onClick={() => toggleTheme(theme)}
                    >
                      <div>
                        <span className="font-medium">{theme}</span>
                        <span className="ml-2 text-sm">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {expandedTheme === theme ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                    
                    {expandedTheme === theme && (
                      <div className="p-4 bg-white">
                        <ul className="space-y-4">
                          {items.map((item, i) => (
                            <li key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                              {item.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}