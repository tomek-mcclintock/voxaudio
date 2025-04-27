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
 * Interface for clustered feedback
 */
export interface ClusterResult {
  themes: string[];
  clusters: {
    [theme: string]: FeedbackItem[];
  };
  summary: string;
}

/**
 * Creates clusters of similar feedback items
 * @param feedbackEntries - Array of feedback submissions
 * @returns Object with themes and assigned feedback
 */
export async function createClusterMap(feedbackEntries: any[]): Promise<ClusterResult> {
  console.log(`Creating cluster map for ${feedbackEntries.length} feedback entries...`);
  
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
      text: text.trim()
    };
  });
  
  // Skip if not enough feedback
  if (allFeedback.length < 3) {
    console.log('Not enough feedback for clustering');
    return {
      themes: [],
      clusters: {},
      summary: 'Not enough feedback for meaningful clustering'
    };
  }
  
  try {
    console.log('Sending feedback to OpenAI for clustering...');
    
    // Use OpenAI to identify clusters
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing customer feedback for a product. Your task is to:
          
          1. Identify 3-8 key themes or topics in these feedback entries
          2. Assign each feedback to its most relevant theme
          3. Create a short summary of what each theme represents
          
          Format your answer as a JSON object with:
          {
            "themes": ["Theme 1", "Theme 2", ...],
            "assignments": {0: "Theme 1", 1: "Theme 2", ...},
            "themeSummaries": {"Theme 1": "Summary of theme 1", ...}
          }
          
          Where:
          - themes: Array of theme names you've identified
          - assignments: Object mapping feedback index to theme name
          - themeSummaries: Object mapping theme name to short description
          
          Be specific with theme names and focus on actual product features, issues, or customer experiences.`
        },
        {
          role: "user",
          content: JSON.stringify(allFeedback.map(f => f.text))
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    console.log('Received clustering response from OpenAI');
    
    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Restructure into a more usable format
    const clusters: {[theme: string]: FeedbackItem[]} = {};
    
    // Initialize empty arrays for each theme
    result.themes.forEach((theme: string) => {
      clusters[theme] = [];
    });
    
    // Assign feedback to themes
    Object.entries(result.assignments).forEach(([indexStr, theme]) => {
      const index = parseInt(indexStr);
      const themeString = theme as string;
      
      if (allFeedback[index] && clusters[themeString]) {
        clusters[themeString].push(allFeedback[index]);
      }
    });
    
    // Generate a summary of the clusters
    let summary = 'Feedback Themes:\n\n';
    
    Object.entries(result.themeSummaries || {}).forEach(([theme, description]) => {
      const count = clusters[theme]?.length || 0;
      summary += `- ${theme} (${count} items): ${description}\n`;
    });
    
    console.log(`Created ${result.themes.length} feedback clusters`);
    
    return {
      themes: result.themes,
      clusters: clusters,
      summary: summary
    };
  } catch (e) {
    console.error('Error creating clusters:', e);
    return {
      themes: [],
      clusters: {},
      summary: 'Error creating clusters'
    };
  }
}

/**
 * Extracts key topics and terms from feedback
 * @param feedbackTexts - Array of feedback text strings
 * @returns Object with topics and related information
 */
export async function extractTopics(feedbackTexts: string[]): Promise<{
  topics: string[];
  keyPhrases: string[];
  featureMentions: Array<{
    feature: string;
    sentiment: string;
    count: number;
    examples: string[];
  }>;
}> {
  try {
    console.log(`Extracting topics from ${feedbackTexts.length} feedback entries...`);
    
    const combinedText = feedbackTexts.join('\n\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze this customer feedback to extract:
          1. Main topics discussed
          2. Key phrases used by customers
          3. Specific product features mentioned and their associated sentiment
          
          Return a JSON object with:
          - topics: array of main topics
          - keyPhrases: array of representative customer phrases
          - featureMentions: array of objects with {feature, sentiment, count, examples} where examples are direct customer quotes`
        },
        {
          role: "user",
          content: combinedText
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }
    
    console.log('Successfully extracted topics from feedback');
    return JSON.parse(content);
  } catch (e) {
    console.error('Error extracting topics:', e);
    return { 
      topics: [], 
      keyPhrases: [], 
      featureMentions: [] 
    };
  }
}

/**
 * Creates a word cloud data object based on feedback text
 * @param feedbackTexts - Array of feedback text strings
 * @returns Array of word objects with text and value properties
 */
export function generateWordCloudData(feedbackTexts: string[]): Array<{text: string, value: number}> {
  // Combine all texts
  const allText = feedbackTexts.join(' ').toLowerCase();
  
  // Remove common stop words
  const stopWords = ['the', 'and', 'is', 'in', 'to', 'i', 'a', 'it', 'that', 'was', 'for', 
                     'of', 'on', 'with', 'as', 'this', 'my', 'at', 'by', 'but', 'not', 'you', 
                     'from', 'have', 'are', 'be', 'or', 'an', 'they', 'we', 'their', 'been'];
  
  // Split into words
  const words = allText.split(/\s+/)
    .filter(word => word.length > 2) // Only words longer than 2 chars
    .filter(word => !stopWords.includes(word)) // Filter out stop words
    .filter(word => !/^\d+$/.test(word)); // Filter out numbers
  
  // Count word frequencies
  const wordCounts: {[key: string]: number} = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Format for visualization
  return Object.entries(wordCounts)
    .filter(([_, count]) => count > 1) // Only include words that appear multiple times
    .map(([word, count]) => ({
      text: word,
      value: count
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 100); // Limit to top 100 words
}