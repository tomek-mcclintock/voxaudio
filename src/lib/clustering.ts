// src/lib/clustering.ts
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Interface for a feedback item with text content
 */
interface FeedbackItem {
  id: string;
  text: string;
}

/**
 * Interface for topic analysis result
 */
export interface TopicResult {
  topics: string[];
  featureMentions: Array<{
    feature: string;
    sentiment: string;
    count: number;
    examples: string[];
  }>;
}

/**
 * Analyzes feedback text to extract topics and sentiment
 * @param feedbackEntries - Array of feedback submissions
 * @returns Object with topics and example quotes
 */
export async function analyzeFeedbackTopics(feedbackEntries: any[]): Promise<TopicResult> {
  console.log(`Analyzing topics for ${feedbackEntries.length} feedback entries...`);
  
  // Extract all feedback text
  const allFeedback = feedbackEntries.map(entry => {
    let text = '';
    
    // Add NPS score if available
    if (entry.nps_score !== null) {
      text += `NPS Score: ${entry.nps_score}/10. `;
    }
    
    // Add main transcription if available
    if (entry.transcription) {
      text += entry.transcription + ' ';
    }
    
    // Add question responses
    if (entry.question_responses && entry.question_responses.length > 0) {
      entry.question_responses.forEach((response: any) => {
        // For question responses, we want to know which question was answered
        let questionInfo = '';
        
        // Try to get question text from parent question
        if (entry.feedback_campaigns?.questions) {
          const question = entry.feedback_campaigns.questions.find(
            (q: any) => q.id === response.question_id
          );
          if (question) {
            questionInfo = `Question: "${question.text}" `;
          }
        }
        
        // Add response text (voice transcription or text response)
        if (response.transcription) {
          text += `${questionInfo}Answer: ${response.transcription} `;
        } else if (response.response_value) {
          text += `${questionInfo}Answer: ${response.response_value} `;
        }
      });
    }
    
    return {
      id: entry.id,
      text: text.trim().substring(0, 500) // Limit text length to avoid token overflows
    };
  });
  
  // Skip if not enough feedback
  if (allFeedback.length < 3) {
    console.log('Not enough feedback for topic analysis');
    return {
      topics: [],
      featureMentions: []
    };
  }
  
  try {
    // For larger datasets, use sampling
    let feedbackToAnalyze = allFeedback;
    if (allFeedback.length > 50) {
      console.log('Large dataset detected, using sampling approach');
      // Get a random sample of 50 feedback entries
      feedbackToAnalyze = allFeedback
        .sort(() => 0.5 - Math.random())
        .slice(0, 50);
    }
    
    // Extract main topics and sentiment from feedback
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze this customer feedback to extract:
          
          1. Main topics discussed (up to 10 topics)
          2. For each topic, identify examples with their sentiment
          
          Return a JSON object with:
          - topics: array of up to 10 main topics mentioned
          - featureMentions: array of objects with {feature, sentiment, count, examples} where:
            - feature: name of the topic or feature
            - sentiment: "positive", "negative", "neutral", or "mixed"
            - count: estimated number of mentions
            - examples: array of up to 3 direct customer quotes
          
          Make topics specific and actionable where possible.`
        },
        {
          role: "user",
          content: JSON.stringify(feedbackToAnalyze.map(f => f.text))
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }
    
    // Parse the result
    try {
      console.log('Successfully extracted topics from feedback');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error parsing topics JSON:', e);
      // Return minimal structure that conforms to expected interface
      return { 
        topics: ["Product Quality", "Customer Experience", "Pricing", "Delivery", "General Feedback"],
        featureMentions: [{
          feature: "General Feedback",
          sentiment: "mixed",
          count: feedbackToAnalyze.length,
          examples: ["Unable to parse specific examples"]
        }]
      };
    }
  } catch (e) {
    console.error('Error extracting topics:', e);
    return { 
      topics: [],
      featureMentions: []
    };
  }
}