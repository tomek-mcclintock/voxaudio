// src/lib/themeAnalysis.ts
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ThemeCount {
  theme: string;
  count: number;
  percentage: number;
  examples: string[];
  category: string;
}

interface ThemeAnalysisResult {
  mainThemes: ThemeCount[];
  categories: {
    [category: string]: {
      count: number;
      percentage: number;
    }
  };
  totalFeedbackCount: number;
  actionableInsights: string[];
  language: string;
}

/**
 * Analyzes feedback to extract recurring themes, their frequency, and actionable insights
 * Uses dynamic category detection based on the actual feedback content
 */
export async function analyzeFeedbackThemes(
  feedbackItems: { 
    text: string; // transcription or text feedback
    id: string; // unique identifier for this feedback
  }[],
  campaignName: string,
  companyName: string,
  language: string = 'en'
): Promise<ThemeAnalysisResult> {
  // Early return if no feedback
  if (!feedbackItems.length) {
    return {
      mainThemes: [],
      categories: {},
      totalFeedbackCount: 0,
      actionableInsights: [],
      language
    };
  }

  // Prepare the feedback for analysis
  const feedbackTexts = feedbackItems.map(item => 
    `Feedback ID: ${item.id}\n${item.text}`
  ).join('\n\n');

  // Create a system prompt for dynamic category detection and theme analysis
  const systemPrompt = `
You are analyzing customer feedback for ${companyName}'s campaign "${campaignName}".

The feedback is primarily in ${language === 'de' ? 'German' : 'English'}.

Your task is to:
1. First, identify 3-6 main categories that best represent the topics in the feedback
2. Then extract the specific themes within each category
3. Calculate accurate frequencies and provide examples

Provide your analysis as a JSON object with this structure:
{
  "mainThemes": [
    {
      "theme": "Clear theme name",
      "count": number of occurrences,
      "percentage": percentage of feedback mentioning this theme,
      "examples": ["brief quote 1", "brief quote 2"],
      "category": "Name of the category this theme belongs to"
    }
  ],
  "categories": {
    "Category Name 1": {"count": number, "percentage": percentage},
    "Category Name 2": {"count": number, "percentage": percentage},
    etc.
  },
  "totalFeedbackCount": total number of feedback items,
  "actionableInsights": [
    "Actionable insight 1",
    "Actionable insight 2"
  ]
}

Important guidelines:
1. Dynamically create categories based on the actual feedback content - do NOT use predefined categories
2. Categories should be descriptive and relevant to the specific feedback (e.g., "Delivery Issues", "Product Quality", "Customer Service")
3. Only include themes that actually appear in the feedback
4. Calculate accurate percentages based on actual occurrences
5. Limit to the top 5-8 most significant themes
6. For examples, use short direct quotes from the actual feedback
7. Provide 3-5 specific actionable insights based on the feedback
8. Format the response ONLY as a valid JSON object
`;

  try {
    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: feedbackTexts
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(content) as ThemeAnalysisResult;
    result.language = language; // Add language to the result
    
    return result;
  } catch (error) {
    console.error('Error analyzing feedback themes:', error);
    // Return a basic structure in case of error
    return {
      mainThemes: [],
      categories: {},
      totalFeedbackCount: feedbackItems.length,
      actionableInsights: ['Error analyzing feedback themes.'],
      language
    };
  }
}