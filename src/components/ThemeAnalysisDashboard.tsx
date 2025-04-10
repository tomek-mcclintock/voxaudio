// src/components/ThemeAnalysisDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ThemeCount {
  theme: string;
  count: number;
  percentage: number;
  examples: string[];
  category: string;
}

interface CategoryData {
  count: number;
  percentage: number;
}

interface ThemeAnalysisResult {
  mainThemes: ThemeCount[];
  categories: {
    [category: string]: CategoryData;
  };
  totalFeedbackCount: number;
  actionableInsights: string[];
  language: string;
}

interface ThemeAnalysisDashboardProps {
  campaignId: string;
}

// Consistent color palette for dynamic assignment
const COLOR_PALETTE = [
  '#3498db', // blue
  '#9b59b6', // purple
  '#e67e22', // orange
  '#2ecc71', // green
  '#f1c40f', // yellow
  '#e74c3c', // red
  '#1abc9c', // teal
  '#34495e', // dark blue
  '#7f8c8d', // gray
  '#d35400', // dark orange
  '#27ae60', // dark green
  '#8e44ad'  // dark purple
];

export default function ThemeAnalysisDashboard({ campaignId }: ThemeAnalysisDashboardProps) {
  const [themeAnalysis, setThemeAnalysis] = useState<ThemeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  // Fetch existing theme analysis when component mounts
  useEffect(() => {
    fetchExistingAnalysis();
  }, [campaignId]);

  // Assign colors to categories when theme analysis changes
  useEffect(() => {
    if (themeAnalysis) {
      const categories = Object.keys(themeAnalysis.categories);
      const newCategoryColors: Record<string, string> = {};
      
      categories.forEach((category, index) => {
        newCategoryColors[category] = COLOR_PALETTE[index % COLOR_PALETTE.length];
      });
      
      setCategoryColors(newCategoryColors);
    }
  }, [themeAnalysis]);

  const fetchExistingAnalysis = async () => {
    try {
      setInitialLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaign data');
      }
      
      const data = await response.json();
      
      // Check if campaign has existing theme analysis
      if (data.theme_analysis && Object.keys(data.theme_analysis).length > 0) {
        setThemeAnalysis(data.theme_analysis);
        setLastAnalyzed(data.last_analyzed || null);
      }
    } catch (error) {
      console.error('Error fetching existing theme analysis:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const analyzeThemes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/themes`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze themes');
      }
      
      const data = await response.json();
      setThemeAnalysis(data.themeAnalysis);
      
      // Update last analyzed timestamp
      if (data.timestamp) {
        setLastAnalyzed(data.timestamp);
      } else {
        setLastAnalyzed(new Date().toISOString());
      }
    } catch (err) {
      console.error('Error analyzing themes:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while analyzing themes');
    } finally {
      setLoading(false);
    }
  };

  // Format category data for chart - filter out any 0% categories
  const formatCategoryData = () => {
    if (!themeAnalysis?.categories) return [];
    
    return Object.entries(themeAnalysis.categories)
      .filter(([_, data]) => data.percentage > 0) // Filter out 0% categories
      .map(([name, data]) => ({
        name,
        count: data.count,
        percentage: data.percentage
      }));
  };

  // Format the last analyzed date
  const formatLastAnalyzed = () => {
    if (!lastAnalyzed) return null;
    
    try {
      const date = new Date(lastAnalyzed);
      return date.toLocaleString();
    } catch (e) {
      return lastAnalyzed;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Theme Analysis</h2>
          {lastAnalyzed && (
            <p className="text-sm text-gray-500">Last analyzed: {formatLastAnalyzed()}</p>
          )}
        </div>
        <button
          onClick={analyzeThemes}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Analyzing...' : 'Analyze Themes'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">Error analyzing themes. Please try again later.</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {themeAnalysis && (
        <div className="space-y-8">
          {/* Category Distribution - only shows categories with > 0% */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Feedback Categories</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatCategoryData()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {formatCategoryData().map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={categoryColors[entry.name] || COLOR_PALETTE[index % COLOR_PALETTE.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => {
                      const entry = formatCategoryData().find(item => item.name === name);
                      return [`${value} (${entry?.percentage.toFixed(1)}%)`, name];
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Theme Frequency - percentage only, no legend, y-axis up to 100% */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Theme Frequency</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={themeAnalysis.mainThemes}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 100,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="theme" 
                    angle={-45} 
                    textAnchor="end"
                    height={80} 
                    interval={0}
                  />
                  <YAxis 
                    label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]} // Fixed y-axis from 0 to 100%
                    ticks={[0, 50, 100]} // Only show grid lines/ticks at 0%, 50%, and 100%
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                  />
                  {/* No Legend */}
                  <Bar dataKey="percentage" name="Percentage" fill="#2ecc71" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Actionable Insights */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Actionable Insights</h3>
            <ul className="list-disc pl-6 space-y-2">
              {themeAnalysis.actionableInsights.map((insight, index) => (
                <li key={index} className="text-gray-700">{insight}</li>
              ))}
            </ul>
          </div>

          {/* Theme Details Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Theme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Examples
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {themeAnalysis.mainThemes.map((theme, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: categoryColors[theme.category] || COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                        ></div>
                        <div className="text-sm font-medium text-gray-900">{theme.theme}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{theme.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{theme.percentage.toFixed(1)}%</div>
                    </td>
                    <td className="px-6 py-4">
                      <ul className="text-sm text-gray-500 list-disc pl-5">
                        {theme.examples.map((example, i) => (
                          <li key={i} className="truncate max-w-md">{example}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!themeAnalysis && !loading && !initialLoading && !error && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            Click "Analyze Themes" to discover recurring themes in your feedback.
          </p>
        </div>
      )}

      {(loading || initialLoading) && !themeAnalysis && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-500">Loading analysis data...</p>
        </div>
      )}
    </div>
  );
}