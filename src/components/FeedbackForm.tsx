// src/components/FeedbackForm.tsx
'use client';

import React, { useState, useRef } from 'react';
import AudioRecorder, { AudioRecorderRef } from './AudioRecorder';
import { Mic, MessageSquare } from 'lucide-react';
import type { CompanyContextType } from '@/lib/contexts/CompanyContext';
import type { Campaign, CampaignQuestion } from '@/types/campaign';
import { TextQuestion, RatingQuestion, MultipleChoiceQuestion, YesNoQuestion } from './questions/QuestionTypes';

interface FeedbackFormProps {
  orderId: string;
  companyId: string;
  campaignId?: string;
  companyData: CompanyContextType | null;
  campaignData: Campaign | null;
}

// Button component types
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
  className?: string;
}

// Branded Button Component
const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary',
  disabled = false,
  className = '',
  onClick,
  ...props 
}) => {
  const baseStyles = 'px-4 py-3 rounded-lg font-manrope font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#657567] hover:bg-[#4d594d] text-white',
    secondary: 'bg-[#657567] hover:bg-[#4d594d] text-white',
    outline: 'border-2 border-[#657567] text-[#657567] hover:bg-gray-50',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default function FeedbackForm({ 
  orderId, 
  companyId, 
  campaignId,
  companyData,
  campaignData 
}: FeedbackFormProps) {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [textFeedback, setTextFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'voice' | 'text'>(
    campaignData?.settings?.allowVoice ? 'voice' : 'text'
  );
  const [questionResponses, setQuestionResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const audioRecorderRef = useRef<AudioRecorderRef>(null);
  const [showOrderInput, setShowOrderInput] = useState(!orderId);
  const [localOrderId, setLocalOrderId] = useState(orderId);

  const handleQuestionResponse = (questionId: string, value: any) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!consent) {
      setError('Please accept the consent notice to submit feedback');
      return;
    }

    if (campaignData?.include_nps && !npsScore) {
      setError('Please provide an NPS score');
      return;
    }
    
    if (!localOrderId && showOrderInput && campaignData?.settings.requireOrderId) {
      setError('Please provide an order ID');
      return;
    }

    if (campaignData?.include_additional_questions) {
      const missingRequired = campaignData.questions.some(
        q => q.required && !questionResponses[q.id]
      );

      if (missingRequired) {
        setError('Please answer all required questions');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stopRecording();
      }

      const formData = new FormData();
      if (feedbackType === 'voice' && audioBlob) {
        formData.append('audio', audioBlob);
      } else if (feedbackType === 'text' && textFeedback) {
        formData.append('textFeedback', textFeedback);
      }
      
      formData.append('orderId', localOrderId);
      formData.append('companyId', companyId);
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      if (campaignData?.include_nps && npsScore) {
        formData.append('npsScore', npsScore.toString());
      }
      if (Object.keys(questionResponses).length > 0) {
        formData.append('questionResponses', JSON.stringify(questionResponses));
      }

      const response = await fetch('/api/save-feedback', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-8">
        <h2 className="font-lora text-2xl text-gray-800 mb-4">Thank You!</h2>
        <p className="font-manrope text-gray-600">Your feedback has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h1 className="font-lora text-3xl text-gray-800 mb-8">
        Share Your {companyData?.name || 'Experience'}
      </h1>

      {showOrderInput && campaignData?.settings.requireOrderId && (
        <div className="mb-8">
          <label className="block font-manrope font-semibold text-gray-700 mb-2">
            Order ID
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#657567] focus:border-[#657567] font-manrope"
            value={localOrderId}
            onChange={(e) => setLocalOrderId(e.target.value)}
          />
        </div>
      )}

      {/* NPS Question */}
      {campaignData?.include_nps && (
        <div className="mb-8">
          <p className="font-manrope text-gray-700 mb-4">
            {campaignData.nps_question || 'How likely are you to recommend us to friends and family?'}
          </p>
          <div className="flex justify-between gap-2 mb-2">
            {[...Array(10)].map((_, i) => {
              const score = i + 1;
              const getScoreColor = (score: number) => {
                if (score <= 6) return npsScore === null
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : npsScore === score
                  ? 'bg-red-500 text-white ring-2 ring-red-500 ring-offset-2'
                  : 'bg-red-200 text-red-700 opacity-75';
                if (score <= 8) return npsScore === null
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : npsScore === score
                  ? 'bg-yellow-500 text-white ring-2 ring-yellow-500 ring-offset-2'
                  : 'bg-yellow-200 text-yellow-700 opacity-75';
                return npsScore === null
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : npsScore === score
                  ? 'bg-green-500 text-white ring-2 ring-green-500 ring-offset-2'
                  : 'bg-green-200 text-green-700 opacity-75';
              };
              

              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => setNpsScore(score)}
                  className={`w-12 h-12 rounded-lg font-manrope font-semibold transition-all duration-200 
                    ${getScoreColor(score)}`}
                >
                  {score}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-gray-500 font-manrope">Not likely</span>
            <span className="text-sm text-gray-500 font-manrope">Very likely</span>
          </div>
        </div>
      )}

      {/* Voice/Text Feedback Section */}
      <div className="space-y-4 mb-8">
        <p className="font-manrope font-semibold text-gray-700">Additional feedback:</p>
        
        {campaignData?.settings.allowVoice && campaignData?.settings.allowText && (
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={() => setFeedbackType('voice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 
                ${feedbackType === 'voice'
                  ? 'bg-[#657567] text-white'
                  : 'border-2 border-[#657567] text-[#657567] hover:bg-gray-50'
                }`}
            >
              <Mic className="w-5 h-5" />
              Voice Feedback
            </button>
            <button
              onClick={() => setFeedbackType('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200
                ${feedbackType === 'text'
                  ? 'bg-[#657567] text-white'
                  : 'border-2 border-[#657567] text-[#657567] hover:bg-gray-50'
                }`}
            >
              <MessageSquare className="w-5 h-5" />
              Text Feedback
            </button>
          </div>
        )}

        {feedbackType === 'voice' && campaignData?.settings.allowVoice ? (
          <div>
            <p className="text-gray-600 mb-4 font-manrope">
              Record your feedback (max 5 minutes):
            </p>
            <AudioRecorder 
              onRecordingComplete={setAudioBlob}
              ref={audioRecorderRef}
            />
          </div>
        ) : campaignData?.settings.allowText ? (
          <div>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#657567] focus:border-[#657567] font-manrope h-32"
              value={textFeedback}
              onChange={(e) => setTextFeedback(e.target.value)}
              placeholder="Please share your thoughts..."
            />
          </div>
        ) : null}
      </div>

      {/* Consent and Submit */}
      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1.5 h-4 w-4 rounded border-gray-300 text-[#657567] focus:ring-[#657567]"
          />
          <span className="text-sm text-gray-600 font-manrope">
            I consent to {companyData?.name || 'the company'} collecting and processing my feedback
            {feedbackType === 'voice' && ' and voice recording'}, 
            including processing on US-based servers. I understand this data will be used to improve products and services. 
            View our full <a href="/privacy" className="text-[#657567] hover:underline">Privacy Policy</a>.
          </span>
        </label>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg font-manrope">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-[#657567] hover:bg-[#4d594d] disabled:bg-gray-300 disabled:cursor-not-allowed 
                   text-white font-manrope font-semibold py-3 px-4 rounded-lg 
                   flex items-center justify-center gap-2 transition-colors duration-200"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}