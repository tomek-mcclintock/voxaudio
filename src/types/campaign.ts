// src/types/campaign.ts
export type QuestionType = 'nps' | 'text' | 'rating' | 'multiple_choice' | 'yes_no' | 'voice_text';

interface Scale {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface CampaignQuestion {
  id: string;
  type: QuestionType;
  text: string;
  formattedText?: string; // For rich text content
  required: boolean;
  options?: string[]; // For multiple choice questions
  scale?: Scale; // For rating questions
  allowVoice?: boolean; // Flag to indicate if voice responses are allowed
  allowText?: boolean; // Flag to indicate if text responses are allowed
}

export interface Campaign {
  id: string;
  name: string;
  company_id: string;
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  include_nps: boolean;
  nps_question: string | null;
  include_additional_questions: boolean;
  questions: CampaignQuestion[];
  settings: {
    allowVoice: boolean;
    allowText: boolean;
  };
  created_at: string;
  language?: string;
  introText?: string; // New field for introductory text
}