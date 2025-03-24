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

  // Create a system prompt tailored to theme extraction with language awareness
  const systemPrompt = `
You are analyzing customer feedback for ${companyName}'s campaign "${campaignName}".

The feedback is primarily in ${language === 'de' ? 'German' : 'English'}.

Extract the main recurring themes from the feedback and provide the following as a JSON object:
{
  "mainThemes": [
    {
      "theme": "Clear theme name",
      "count": number of occurrences,
      "percentage": percentage of feedback mentioning this theme,
      "examples": ["brief quote 1", "brief quote 2"],
      "category": "product quality | sizing | delivery | customer service | price | other"
    }
  ],
  "categories": {
    "product quality": {"count": number, "percentage": percentage},
    "sizing": {"count": number, "percentage": percentage},
    "delivery": {"count": number, "percentage": percentage},
    "customer service": {"count": number, "percentage": percentage},
    "price": {"count": number, "percentage": percentage},
    "other": {"count": number, "percentage": percentage}
  },
  "totalFeedbackCount": total number of feedback items,
  "actionableInsights": [
    "Actionable insight 1",
    "Actionable insight 2"
  ]
}

Important guidelines:
1. Only include themes that actually appear in the feedback
2. Calculate accurate percentages based on actual occurrences
3. Limit to the top 5-8 most significant themes
4. Categorize each theme into one of the predefined categories
5. For examples, use short direct quotes from the actual feedback
6. Provide 3-5 specific actionable insights based on the feedback
7. Format the response ONLY as a valid JSON object
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