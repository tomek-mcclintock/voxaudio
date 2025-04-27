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
 * Uses chunking to handle large datasets more effectively
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
      text: text.trim().substring(0, 500) // Limit text length to avoid token overflows
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
    // For larger datasets, use chunking
    if (allFeedback.length > 25) {
      return await processLargeDataset(allFeedback);
    } else {
      return await processSmallDataset(allFeedback);
    }
  } catch (e) {
    console.error('Error creating clusters:', e);
    return {
      themes: [],
      clusters: {},
      summary: `Error creating clusters: ${e instanceof Error ? e.message : 'Unknown error'}`
    };
  }
}

/**
 * Process a small dataset of feedback (25 items or fewer)
 */
async function processSmallDataset(allFeedback: FeedbackItem[]): Promise<ClusterResult> {
  console.log('Processing small dataset with standard clustering');
  
  // Use OpenAI to identify clusters
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are analyzing customer feedback for a product. Your task is to:
        
        1. Identify 3-5 key themes or topics in these feedback entries
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
    response_format: { type: "json_object" },
  });
  
  // Parse the response
  try {
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return formatClusterResult(result, allFeedback);
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    console.error('Response content:', response.choices[0].message.content);
    throw new Error('Failed to parse clustering results');
  }
}

/**
 * Process a large dataset by chunking into smaller batches
 */
async function processLargeDataset(allFeedback: FeedbackItem[]): Promise<ClusterResult> {
  console.log('Processing large dataset with chunking approach');
  
  // First, extract common themes from a sample of feedback
  const sampleSize = Math.min(50, allFeedback.length);
  const feedbackSample = allFeedback
    .sort(() => 0.5 - Math.random()) // Shuffle to get a random sample
    .slice(0, sampleSize);
  
  console.log(`Extracting themes from sample of ${sampleSize} entries`);
  
  // Get themes from sample
  const themeResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Analyze this sample of customer feedback and identify 5-7 key themes or topics that best categorize the feedback.
        Return ONLY a JSON array of theme names, nothing else.`
      },
      {
        role: "user",
        content: JSON.stringify(feedbackSample.map(f => f.text))
      }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  
  let themes: string[] = [];
  try {
    // The response should be a JSON object with a themes array
    const themeResult = JSON.parse(themeResponse.choices[0].message.content || '{}');
    themes = Array.isArray(themeResult) ? themeResult : (themeResult.themes || []);
    console.log(`Extracted ${themes.length} themes: ${themes.join(', ')}`);
  } catch (error) {
    console.error('Error parsing themes:', error);
    console.error('Theme response:', themeResponse.choices[0].message.content);
    throw new Error('Failed to parse themes');
  }
  
  if (themes.length === 0) {
    console.log('No themes identified, falling back to default themes');
    themes = ['Product Quality', 'Customer Service', 'Delivery Experience', 'Price & Value', 'General Feedback'];
  }
  
  // Now, classify each feedback item into one of the themes
  // Process in chunks of 20 items
  const chunkSize = 20;
  const chunks = [];
  
  for (let i = 0; i < allFeedback.length; i += chunkSize) {
    chunks.push(allFeedback.slice(i, i + chunkSize));
  }
  
  console.log(`Processing ${chunks.length} chunks of feedback`);
  
  // Process each chunk
  const classifications: Record<number, string> = {};
  const themeSummaries: Record<string, string> = {};
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const startIndex = i * chunkSize;
    
    console.log(`Processing chunk ${i+1}/${chunks.length} (items ${startIndex}-${startIndex + chunk.length - 1})`);
    
    try {
      // Classify this chunk
      const classifyResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using a faster model for classification
        messages: [
          {
            role: "system",
            content: `You are classifying customer feedback into predefined themes. 
            The available themes are: ${themes.join(', ')}
            
            For each feedback item, assign the most appropriate theme.
            
            Format your response as a JSON object where the keys are the indices of the feedback items
            and the values are the assigned themes. For example: {"0": "Product Quality", "1": "Customer Service"}
            
            ONLY include the JSON object in your response, nothing else.`
          },
          {
            role: "user",
            content: JSON.stringify(chunk.map(f => f.text))
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      // Parse the results
      const chunkResults = JSON.parse(classifyResponse.choices[0].message.content || '{}');
      
      // Add to overall classifications, adjusting for the chunk offset
      Object.entries(chunkResults).forEach(([indexStr, theme]) => {
        const globalIndex = parseInt(indexStr) + startIndex;
        classifications[globalIndex] = theme as string;
      });
    } catch (error) {
      console.error(`Error processing chunk ${i+1}:`, error);
      // Continue with other chunks instead of failing completely
    }
  }
  
  // Generate summaries for each theme
  try {
    console.log('Generating theme summaries');
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `For each of these feedback themes, create a short 1-2 sentence summary of what the theme represents:
          ${themes.join(', ')}
          
          Format your response as a JSON object where keys are theme names and values are summaries.
          For example: {"Product Quality": "Feedback related to the physical attributes and durability of products."}
          
          ONLY include the JSON object in your response, nothing else.`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    // Parse theme summaries
    const summaryResults = JSON.parse(summaryResponse.choices[0].message.content || '{}');
    Object.assign(themeSummaries, summaryResults);
  } catch (error) {
    console.error('Error generating theme summaries:', error);
    // Create basic summaries if API call fails
    themes.forEach(theme => {
      themeSummaries[theme] = `Feedback related to ${theme.toLowerCase()}`;
    });
  }
  
  // Format the result in the expected structure
  const result = {
    themes,
    assignments: classifications,
    themeSummaries
  };
  
  return formatClusterResult(result, allFeedback);
}

/**
 * Format the cluster results into the expected return structure
 */
function formatClusterResult(result: any, allFeedback: FeedbackItem[]): ClusterResult {
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
    
    // For large datasets, use a sampling approach
    let textsToAnalyze = feedbackTexts;
    if (feedbackTexts.length > 50) {
      console.log(`Sampling 50 feedback entries for topic extraction (from ${feedbackTexts.length} total)`);
      // Get a random sample of 50 feedback entries
      textsToAnalyze = feedbackTexts
        .sort(() => 0.5 - Math.random())
        .slice(0, 50);
    }
    
    // Join texts with a clear separator
    const combinedText = textsToAnalyze.join('\n---\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use a faster model for topics extraction
      messages: [
        {
          role: "system",
          content: `Analyze this customer feedback to extract:
          1. Main topics discussed (max 5-7)
          2. Key phrases used by customers (max 10-15)
          3. Specific product features mentioned and their associated sentiment (max 5-7)
          
          Return a JSON object with:
          - topics: array of main topics
          - keyPhrases: array of representative customer phrases
          - featureMentions: array of objects with {feature, sentiment, count, examples} where examples are 1-2 direct customer quotes`
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
    
    // Safe parsing with fallback structure
    try {
      console.log('Successfully extracted topics from feedback');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error parsing topics JSON:', e);
      // Return minimal structure that conforms to expected interface
      return { 
        topics: ["Product Quality", "Customer Experience", "Pricing", "Delivery", "General Feedback"], 
        keyPhrases: ["great product", "good quality", "excellent service"], 
        featureMentions: [{
          feature: "General Product",
          sentiment: "mixed",
          count: 1,
          examples: ["Unable to parse specific examples"]
        }]
      };
    }
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
  // Combine all texts, but limit to first 50 for performance
  const textsToProcess = feedbackTexts.slice(0, 50);
  const allText = textsToProcess.join(' ').toLowerCase();
  
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