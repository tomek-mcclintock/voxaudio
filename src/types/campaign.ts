// src/types/campaign.ts
export type QuestionType = 'nps' | 'text' | 'rating' | 'multiple_choice' | 'yes_no';

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
  required: boolean;
  options?: string[]; // For multiple choice questions
  scale?: Scale; // For rating questions
}

export interface Campaign {
  id: string;
  name: string;
  company_id: string;
  active: boolean;
  start_date?: string;
  end_date?: string;
  questions: CampaignQuestion[];
  settings: {
    allowVoice: boolean;
    allowText: boolean;
    requireOrderId: boolean;
  };
  created_at: string;
}