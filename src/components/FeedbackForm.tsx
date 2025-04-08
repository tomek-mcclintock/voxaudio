// src/components/FeedbackForm.tsx
'use client';

import React, { useState, useRef } from 'react';
import AudioRecorder, { AudioRecorderRef } from './AudioRecorder';
import { Mic, MessageSquare } from 'lucide-react';
import type { CompanyContextType } from '@/lib/contexts/CompanyContext';
import type { Campaign, CampaignQuestion } from '@/types/campaign';
import { TextQuestion, RatingQuestion, MultipleChoiceQuestion, YesNoQuestion } from './questions/QuestionTypes';
import { translate } from '@/lib/translations';
import VoiceTextQuestion from './questions/VoiceTextQuestion';

interface FeedbackFormProps {
  orderId: string;
  companyId: string;
  campaignId?: string;
  companyData: CompanyContextType | null;
  campaignData: Campaign | null;
  npsScore?: number | null;
  additionalParams?: Record<string, string>;
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
  campaignData,
  npsScore: initialNpsScore,
  additionalParams = {}
}: FeedbackFormProps) {
  // Get language from campaign or default to English
  const language = campaignData?.language || 'en';
  
  // Helper function for translations
  const t = (key: string, replacements: Record<string, string> = {}) => {
    return translate(language, key, replacements);
  };
  
  const [npsScore, setNpsScore] = useState<number | null>(initialNpsScore || null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [textFeedback, setTextFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'voice' | 'text'>(
    campaignData?.settings?.allowVoice ? 'voice' : 'text'
  );
  const [questionResponses, setQuestionResponses] = useState<Record<string, any>>({});
  // New state for voice recordings per question
  const [questionVoiceRecordings, setQuestionVoiceRecordings] = useState<Record<string, Blob | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const audioRecorderRef = useRef<AudioRecorderRef>(null);
  const [localOrderId] = useState(orderId); // No setState function, making it read-only

  // Check if gamification is enabled in campaign settings
  const isGamificationEnabled = campaignData?.settings?.enableGamification !== undefined ? 
    campaignData.settings.enableGamification : true; // Default to true if not specified

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

  const handleQuestionVoiceRecording = (questionId: string, audioBlob: Blob | null) => {
    console.log(`Setting voice recording for question ${questionId}`);
    setQuestionVoiceRecordings(prev => ({
      ...prev,
      [questionId]: audioBlob
    }));
  };
  
  const handleSubmit = async () => {
    console.log("Starting submission with orderID:", localOrderId);
    console.log("Starting submission with questionResponses:", questionResponses);
    console.log("Starting submission with questionVoiceRecordings:", questionVoiceRecordings);
    console.log("Campaign Data:", campaignData);  
    if (!consent) {
      setError(t('form.consentRequired'));
      return;
    }
  
    if (campaignData?.include_nps && !npsScore) {
      setError(t('form.npsRequired'));
      return;
    }
  
    if (campaignData?.include_additional_questions) {
      const missingRequired = campaignData.questions.some(
        q => q.required && !questionResponses[q.id] && !questionVoiceRecordings[q.id]
      );
  
      if (missingRequired) {
        setError(t('form.requiredQuestions'));
        return;
      }
    }
  
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Stop any ongoing recordings
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stopRecording();
      }
    
      const formData = new FormData();
      
      // Handle NPS additional feedback
      if (campaignData?.include_nps) {
        if (feedbackType === 'voice' && audioBlob) {
          formData.append('audio', audioBlob);
        } else if (feedbackType === 'text' && textFeedback) {
          formData.append('textFeedback', textFeedback);
        }
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
    
      // Add text question responses
      const textResponses: Record<string, any> = {};
      Object.entries(questionResponses).forEach(([questionId, value]) => {
        textResponses[questionId] = value;
      });
      
      // Add info about voice recordings for questions
      const voiceQuestionIds = Object.keys(questionVoiceRecordings);
      if (voiceQuestionIds.length > 0) {
        formData.append('hasVoiceQuestions', 'true');
        formData.append('voiceQuestionIds', JSON.stringify(voiceQuestionIds));
        
        // Append each voice recording with a unique key
        voiceQuestionIds.forEach(questionId => {
          const blob = questionVoiceRecordings[questionId];
          if (blob) {
            formData.append(`question_audio_${questionId}`, blob);
          }
        });
      }
    
      // Log question responses before submission
      console.log('Text responses before submission:', textResponses);
      
      if (Object.keys(textResponses).length > 0) {
        const responsesJson = JSON.stringify(textResponses);
        console.log('Stringified responses:', responsesJson);
        formData.append('questionResponses', responsesJson);
      }
      
      // Add additional parameters if present
      if (additionalParams && Object.keys(additionalParams).length > 0) {
        formData.append('additionalParams', JSON.stringify(additionalParams));
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
      setError(t('form.submissionError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-8">
        <h2 className="font-lora text-2xl text-gray-800 mb-4">
          {t('form.thankYouTitle')}
        </h2>
        <p className="font-manrope text-gray-600">
          {t('form.thankYouText')}
        </p>
      </div>
    );
  }

  // Function to determine button color based on NPS score
  const getScoreColor = (score: number) => {
    const primaryColor = companyData?.primary_color || '#657567';
    
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
        {companyData?.name ? 
          t('form.title').replace('With Us', `With ${companyData.name}`) : 
          t('form.title')}
      </h1>

      {campaignData?.introText && (
  <div className="mb-8">
    <div 
      className="font-manrope text-gray-700 rich-text-content"
      dangerouslySetInnerHTML={{ __html: campaignData.introText }}
    />
  </div>
)}

{/* NPS Question */}
{campaignData?.include_nps && (
  <div className="mb-8">
    <div 
      className="font-manrope font-semibold text-gray-700 mb-4 rich-text-content"
      dangerouslySetInnerHTML={{ __html: campaignData.nps_question || t('form.npsQuestion') }}
    />
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
          >
            {score}
          </button>
        );
      })}
    </div>
    <div className="flex justify-between mt-2">
      <span className="text-sm text-gray-500 font-manrope">{t('form.notLikely')}</span>
      <span className="text-sm text-gray-500 font-manrope">{t('form.veryLikely')}</span>
    </div>
  </div>
)}

      {/* Additional Questions Section */}
      {campaignData?.include_additional_questions && campaignData.questions && campaignData.questions.length > 0 && (
  <div className="space-y-6 mb-8">
    {campaignData.questions.map((question: CampaignQuestion) => (
      <div key={question.id} className="space-y-2">
        <div className="block font-manrope text-gray-700 rich-text-content">
          <div dangerouslySetInnerHTML={{ __html: question.formattedText || question.text }} />
          {question.required && <span className="text-red-500 ml-1 inline-block">*</span>}
          {!question.required && (
            <div className="text-sm text-gray-400 mt-1">
              {t('form.optional')}
            </div>
          )}
        </div>
        
        {question.type === 'text' && (
  <TextQuestion
    question={{...question, language}}
    value={questionResponses[question.id] || ''}
    onChange={(value) => handleQuestionResponse(question.id, value)}
  />
)}

{question.type === 'rating' && (
  <RatingQuestion
    question={{...question, language}}
    value={questionResponses[question.id] || null}
    onChange={(value) => handleQuestionResponse(question.id, value)}
  />
)}

{question.type === 'multiple_choice' && (
  <MultipleChoiceQuestion
    question={{...question, language}}
    value={questionResponses[question.id] || ''}
    onChange={(value) => handleQuestionResponse(question.id, value)}
  />
)}

{question.type === 'yes_no' && (
  <YesNoQuestion
    question={{...question, language}}
    value={questionResponses[question.id] || ''}
    onChange={(value) => handleQuestionResponse(question.id, value)}
  />
)}

        {question.type === 'voice_text' && (
          <VoiceTextQuestion
            question={question}
            textValue={questionResponses[question.id] || ''}
            onTextChange={(value) => handleQuestionResponse(question.id, value)}
            onVoiceRecording={(blob) => handleQuestionVoiceRecording(question.id, blob)}
            companyColor={companyData?.primary_color || '#657567'}
            language={language}
            enableGamification={isGamificationEnabled}
          />
        )}
      </div>
    ))}
  </div>
)}

      {/* Voice/Text Feedback Section - Only shown if NPS is included */}
      {campaignData?.include_nps && (
  <div className="space-y-4 mb-8">
    <p className="font-manrope font-semibold text-gray-700">
      {/* Use the custom text if available, or fall back to translation */}
      {campaignData.additionalFeedbackText ? (
        <div dangerouslySetInnerHTML={{ __html: campaignData.additionalFeedbackText }} />
      ) : (
        t('form.additionalFeedback')
      )}
    </p>
          
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
                {t('form.voiceFeedback')}
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
                {t('form.textFeedback')}
              </button>
            </div>
          )}

        {feedbackType === 'voice' && campaignData?.settings.allowVoice ? (
          <div>
            <p className="text-gray-600 mb-4 font-manrope">
              {t('form.recordLabel')}
            </p>
            <AudioRecorder 
              onRecordingComplete={setAudioBlob}
              ref={audioRecorderRef}
              companyColor={companyData?.primary_color || '#657567'}
              language={language}
              enableGamification={isGamificationEnabled}
            />
          </div>
        ) : campaignData?.settings.allowText ? (
          <div>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope h-32 focus:outline-none"
              value={textFeedback}
              onChange={(e) => setTextFeedback(e.target.value)}
              placeholder={t('form.textareaPlaceholder')}
              style={{
                borderColor: 'rgb(209, 213, 219)'
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
      )}

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
            {t('form.consentText', { 
              companyName: companyData?.name || t('form.theCompany'),
              voiceConsent: (feedbackType === 'voice' || Object.keys(questionVoiceRecordings).length > 0) 
                ? t('form.andVoiceRecording') 
                : ''
            })}{' '}
            <a 
              href={language === 'de' ? "/privacy?lang=de" : "/privacy?lang=en"} 
              style={{ color: companyData?.primary_color || '#657567' }} 
              className="hover:underline"
            >
              {t('form.privacyPolicy')}
            </a>.
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
          {isSubmitting ? t('form.submitting') : t('form.submitButton')}
        </button>
      </div>
    </div>
  );
}