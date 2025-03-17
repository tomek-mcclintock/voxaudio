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
  const [localOrderId] = useState(orderId); // No setState function, making it read-only

  const handleQuestionResponse = (questionId: string, value: any) => {
    console.log(`Setting response for question ${questionId}:`, value);
    setQuestionResponses(prev => {
      const updated = {
        ...prev,
        [questionId]: value
      };
      console.log("Updated questionResponses:", updated);
      return updated;
    });
  };
  
  const handleSubmit = async () => {
    console.log("Starting submission with orderID:", localOrderId);
    console.log("Starting submission with questionResponses:", questionResponses);
    console.log("Campaign Data:", campaignData);  
    if (!consent) {
      setError('Please accept the consent notice to submit feedback');
      return;
    }
  
    if (campaignData?.include_nps && !npsScore) {
      setError('Please provide an NPS score');
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
      
      // Explicitly log the order ID we're adding to the form
      console.log('Adding orderId to form:', localOrderId);
      formData.append('orderId', localOrderId || '');
      
      formData.append('companyId', companyId);
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      if (campaignData?.include_nps && npsScore) {
        formData.append('npsScore', npsScore.toString());
      }
    
      // Log question responses before submission
      console.log('Question responses before submission:', questionResponses);
      
      if (Object.keys(questionResponses).length > 0) {
        const responsesJson = JSON.stringify(questionResponses);
        console.log('Stringified responses:', responsesJson);
        formData.append('questionResponses', responsesJson);
      }
    
      // Log entire FormData
      console.log('Form data entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0], ':', pair[1]);
      }
    
      const response = await fetch('/api/save-feedback', {
        method: 'POST',
        body: formData,
      });
    
      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }
    
      const result = await response.json();
      console.log('Submission response:', result);
    
      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit feedback. Please try again.');
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

  // Function to determine button color based on NPS score
  const getScoreColor = (score: number) => {
    const primaryColor = companyData?.primary_color || '#657567';
    const scoreLightColor = `${primaryColor}33`; // Add 33 (20% opacity) to the hex color
    
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
    
      if (npsScore === null) {
        return 'bg-green-500 text-white hover:bg-green-600';
      } else if (npsScore === score) {
        return 'bg-green-500 text-white ring-2 ring-green-500 ring-offset-2';
      } else {
        return 'bg-green-200 text-green-700 opacity-75';
      }
    };
    

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h1 className="font-lora text-3xl text-gray-800 mb-8">
        Share Your {companyData?.name || 'Experience With Us'} Experience
      </h1>

      {/* NPS Question */}
      {campaignData?.include_nps && (
        <div className="mb-8">
          <p className="font-manrope text-gray-700 mb-4">
            {campaignData.nps_question || 'How likely are you to recommend us to friends and family?'}
          </p>
          <div className="flex justify-between gap-2 mb-2">
            {[...Array(10)].map((_, i) => {
              const score = i + 1;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => setNpsScore(score)}
                  className={`w-12 h-12 rounded-lg font-manrope font-semibold transition-all duration-200 
                    ${getScoreColor(score)}`}
                    style={{}} // Remove the conditional style for scores 9 and 10
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

      {/* Additional Questions Section */}
      {campaignData?.include_additional_questions && campaignData.questions && campaignData.questions.length > 0 && (
        <div className="space-y-6 mb-8">
          <h3 className="font-manrope font-semibold text-gray-700">Additional Questions</h3>
          {campaignData.questions.map((question: CampaignQuestion) => (
            <div key={question.id} className="space-y-2">
              <label className="block font-manrope text-gray-700">
                {question.text}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {question.type === 'text' && (
                <TextQuestion
                  question={question}
                  value={questionResponses[question.id] || ''}
                  onChange={(value) => handleQuestionResponse(question.id, value)}
                />
              )}
              
              {question.type === 'rating' && (
                <RatingQuestion
                  question={question}
                  value={questionResponses[question.id] || null}
                  onChange={(value) => handleQuestionResponse(question.id, value)}
                />
              )}
              
              {question.type === 'multiple_choice' && (
                <MultipleChoiceQuestion
                  question={question}
                  value={questionResponses[question.id] || ''}
                  onChange={(value) => handleQuestionResponse(question.id, value)}
                />
              )}
              
              {question.type === 'yes_no' && (
                <YesNoQuestion
                  question={question}
                  value={questionResponses[question.id] || ''}
                  onChange={(value) => handleQuestionResponse(question.id, value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Voice/Text Feedback Section */}
      <div className="space-y-4 mb-8">
        <p className="font-manrope font-semibold text-gray-700">Additional feedback:</p>
        
        {campaignData?.settings.allowVoice && campaignData?.settings.allowText && (
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={() => setFeedbackType('voice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200`}
              style={{
                backgroundColor: feedbackType === 'voice' ? companyData?.primary_color || '#657567' : 'transparent',
                color: feedbackType === 'voice' ? 'white' : companyData?.primary_color || '#657567',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: companyData?.primary_color || '#657567'
              }}
            >
              <Mic className="w-5 h-5" />
              Voice Feedback
            </button>
            <button
              onClick={() => setFeedbackType('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200`}
              style={{
                backgroundColor: feedbackType === 'text' ? companyData?.primary_color || '#657567' : 'transparent',
                color: feedbackType === 'text' ? 'white' : companyData?.primary_color || '#657567',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: companyData?.primary_color || '#657567'
              }}
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
              companyColor={companyData?.primary_color || '#657567'}
            />
          </div>
        ) : campaignData?.settings.allowText ? (
          <div>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope h-32 focus:outline-none"
              value={textFeedback}
              onChange={(e) => setTextFeedback(e.target.value)}
              placeholder="Please share your thoughts..."
              style={{
                borderColor: 'rgb(209, 213, 219)' // Default gray-300
              }}
              onFocus={(e) => {
                const color = companyData?.primary_color || '#657567';
                e.target.style.borderColor = color;
                e.target.style.boxShadow = `0 0 0 2px ${color}33`;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
                e.target.style.borderColor = 'rgb(209, 213, 219)';
              }}
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
            className="mt-1.5 h-4 w-4 rounded border-gray-300 focus:ring-2 focus:outline-none"
            style={{
              borderColor: 'rgb(209, 213, 219)',
              accentColor: companyData?.primary_color || '#657567'
            }}
          />
          <span className="text-sm text-gray-600 font-manrope">
            I consent to {companyData?.name || 'the company'} collecting and processing my feedback
            {feedbackType === 'voice' && ' and voice recording'}, 
            including processing on US-based servers. I understand this data will be used to improve products and services. 
            View our full <a href="/privacy" style={{ color: companyData?.primary_color || '#657567' }} className="hover:underline">Privacy Policy</a>.
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
          className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed 
                   text-white font-manrope font-semibold py-3 px-4 rounded-lg 
                   flex items-center justify-center gap-2 transition-colors duration-200"
          style={{ backgroundColor: isSubmitting ? undefined : companyData?.primary_color || '#657567' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}