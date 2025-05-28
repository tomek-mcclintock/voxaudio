// src/components/FeedbackForm.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  npsScore: initialNpsScore = null,
  additionalParams = {}
}: FeedbackFormProps) {
  // Get language from campaign or default to English
  const language = campaignData?.language || 'en';
  
  // Helper function for translations
  const t = (key: string, replacements: Record<string, string> = {}) => {
    return translate(language, key, replacements);
  };

  const [clientId, setClientId] = useState<string>('');

  // Add a new state to track if we've saved the initial NPS score
  const [initialNpsSaved, setInitialNpsSaved] = useState(false);

  useEffect(() => {
    // Generate a session-based identifier
    const existingClientId = sessionStorage.getItem('voxaudio_client_id');
    
    if (existingClientId) {
      setClientId(existingClientId);
    } else {
      // Generate a simple random ID - could be more sophisticated in production
      const newClientId = Math.random().toString(36).substring(2) + 
                          Date.now().toString(36);
      sessionStorage.setItem('voxaudio_client_id', newClientId);
      setClientId(newClientId);
    }
  }, []);

  // Add a new useEffect to save the initial NPS score once we have the clientId
  useEffect(() => {
    // Only run this once when we have both the clientId and an initialNpsScore
    // and we haven't saved it yet
    if (clientId && initialNpsScore !== null && !initialNpsSaved && companyId && campaignId) {
      const saveInitialNpsScore = async () => {
        try {
          console.log(`Saving initial NPS score: ${initialNpsScore} with clientId: ${clientId}`);
          const updateData = new FormData();
          updateData.append('companyId', companyId);
          updateData.append('campaignId', campaignId);
          updateData.append('npsScore', initialNpsScore.toString());
          updateData.append('orderId', orderId || '');
          updateData.append('clientId', clientId);
          
          // Include additional parameters if present
          if (Object.keys(additionalParams).length > 0) {
            updateData.append('additionalParams', JSON.stringify(additionalParams));
          }
          
          const response = await fetch('/api/update-nps-score', {
            method: 'POST',
            body: updateData,
          });
          
          if (!response.ok) {
            console.error('Failed to update initial NPS score: Server returned', response.status);
          } else {
            console.log('Initial NPS score saved successfully');
            setInitialNpsSaved(true);
          }
        } catch (error) {
          console.error('Error saving initial NPS score:', error);
        }
      };
      
      saveInitialNpsScore();
    }
  }, [clientId, initialNpsScore, companyId, campaignId, orderId, additionalParams, initialNpsSaved]);
  
  const [npsScore, setNpsScore] = useState<number | null>(initialNpsScore ?? null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [textFeedback, setTextFeedback] = useState('');
  const [questionResponses, setQuestionResponses] = useState<Record<string, any>>({});
  // State for voice recordings per question
  const [questionVoiceRecordings, setQuestionVoiceRecordings] = useState<Record<string, Blob | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const audioRecorderRef = useRef<AudioRecorderRef>(null);
  const [localOrderId] = useState(orderId); // No setState function, making it read-only
  const [feedbackMode, setFeedbackMode] = useState<'voice' | 'text'>('voice'); // Default to voice feedback

  // Check if gamification is enabled in campaign settings
  const isGamificationEnabled = campaignData?.settings?.enableGamification !== undefined ? 
    campaignData.settings.enableGamification : true; // Default to true if not specified

  const updateNpsScore = async (newScore: number) => {
    // First update the local state
    setNpsScore(newScore);
    
    // Then send an update to the server to record this change
    try {
      console.log(`Updating NPS score to ${newScore}`);
      const updateData = new FormData();
      updateData.append('companyId', companyId);
      updateData.append('campaignId', campaignId || '');
      updateData.append('npsScore', newScore.toString());
      updateData.append('orderId', localOrderId || '');
      
      // If we have additional parameters, include them
      if (Object.keys(additionalParams).length > 0) {
        updateData.append('additionalParams', JSON.stringify(additionalParams));
      }
      
      // Include client ID if available
      if (clientId) {
        updateData.append('clientId', clientId);
      }
      
      // Send to a new API endpoint specifically for updating NPS scores
      const response = await fetch('/api/update-nps-score', {
        method: 'POST',
        body: updateData,
      });
      
      if (!response.ok) {
        console.error('Failed to update NPS score: Server returned', response.status);
      }
    } catch (error) {
      console.error('Error updating NPS score:', error);
      // Don't display an error to the user or disrupt the form
    }
  };  
  
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
    const clientSubmissionId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    console.log(`[${clientSubmissionId}] Starting client-side submission process with orderID:`, localOrderId);
    console.log(`[${clientSubmissionId}] Client-side questionResponses:`, questionResponses);
    console.log(`[${clientSubmissionId}] Client-side questionVoiceRecordings:`, 
      Object.keys(questionVoiceRecordings).map(key => ({
        questionId: key, 
        hasBlob: !!questionVoiceRecordings[key],
        blobSize: questionVoiceRecordings[key]?.size || 0,
        blobType: questionVoiceRecordings[key]?.type || 'none'
      }))
    );
    
    if (!consent) {
      setError(t('form.consentRequired'));
      console.log(`[${clientSubmissionId}] Submission blocked: consent required`);
      return;
    }
  
    if (campaignData?.include_nps && npsScore === null) {
      setError(t('form.npsRequired'));
      console.log(`[${clientSubmissionId}] Submission blocked: NPS score required`);
      return;
    }
  
    if (campaignData?.include_additional_questions) {
      const missingRequired = campaignData.questions.some(
        q => q.required && !questionResponses[q.id] && !questionVoiceRecordings[q.id]
      );
  
      if (missingRequired) {
        setError(t('form.requiredQuestions'));
        console.log(`[${clientSubmissionId}] Submission blocked: required questions missing`);
        return;
      }
    }
  
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Stop any ongoing recordings
      if (audioRecorderRef.current) {
        console.log(`[${clientSubmissionId}] Stopping any active recordings`);
        audioRecorderRef.current.stopRecording();
      }
  
      console.log(`[${clientSubmissionId}] Preparing form data for submission`);
      const formData = new FormData();
      
      // Handle NPS score and feedback as a single question response
      if (campaignData?.include_nps && (npsScore !== null || textFeedback || audioBlob)) {
        // Create or update the text responses
        const textResponses = {...questionResponses};
        
        // Add NPS score to question responses
        if (npsScore !== null) {
          textResponses['nps_score'] = npsScore.toString();
        }
        
        // Add NPS text feedback to question responses
        if (textFeedback) {
          textResponses['nps_feedback'] = textFeedback;
        }
        
        // If we have a voice recording for NPS feedback
        if (audioBlob) {
          console.log(`[${clientSubmissionId}] Adding NPS audio as question voice recording`);
          const npsQuestionId = 'nps_score'; // Use a single consistent ID
          formData.append(`question_audio_${npsQuestionId}`, audioBlob);
          formData.append('hasVoiceQuestions', 'true');
          
          // Add NPS question ID to voice question IDs
          const voiceQuestionIds = [...Object.keys(questionVoiceRecordings), npsQuestionId];
          formData.append('voiceQuestionIds', JSON.stringify(voiceQuestionIds));
        }
        
        // Update the form data with all text responses
        formData.append('questionResponses', JSON.stringify(textResponses));
      }
      
      // Explicitly log the order ID we're adding to the form
      console.log('Adding orderId to form:', localOrderId);
      formData.append('orderId', localOrderId || '');
      
      formData.append('companyId', companyId);
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }
      
      // Include clientId if available
      if (clientId) {
        formData.append('clientId', clientId);
      }
    
      // Add voice recordings for additional questions
      const voiceQuestionIds = Object.keys(questionVoiceRecordings);
      if (voiceQuestionIds.length > 0) {
        // Only append if not already set from NPS feedback
        if (!formData.get('hasVoiceQuestions')) {
          formData.append('hasVoiceQuestions', 'true');
          formData.append('voiceQuestionIds', JSON.stringify(voiceQuestionIds));
        } else {
          // If we already have voice questions from NPS, merge the IDs
          const existingIds = JSON.parse(formData.get('voiceQuestionIds') as string);
          const allIds = [...new Set([...existingIds, ...voiceQuestionIds])];
          formData.set('voiceQuestionIds', JSON.stringify(allIds));
        }
        // Append each voice recording with a unique key
        voiceQuestionIds.forEach(questionId => {
          const blob = questionVoiceRecordings[questionId];
          if (blob) {
            formData.append(`question_audio_${questionId}`, blob);
          }
        });
      }
    
      // Add additional question responses if not already included
      if (Object.keys(questionResponses).length > 0) {
        // Check if we already added question responses for NPS
        if (!formData.has('questionResponses')) {
          const textResponsesJson = JSON.stringify(questionResponses);
          console.log('Adding question responses:', textResponsesJson);
          formData.append('questionResponses', textResponsesJson);
        }
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

  // Helper function to determine which thank you content to show based on NPS score
  const getThankYouContent = () => {
    // If custom thank you pages are enabled and we have an NPS score
    if (campaignData?.useCustomThankYouPages && npsScore !== null) {
      if (npsScore >= 9) {
        // Promoter (9-10)
        return campaignData.thankYouPagePromoters || t('form.thankYouText');
      } else if (npsScore >= 7) {
        // Passive (7-8)
        return campaignData.thankYouPagePassives || t('form.thankYouText');
      } else {
        // Detractor (0-6)
        return campaignData.thankYouPageDetractors || t('form.thankYouText');
      }
    }
    
    // Default thank you message
    return t('form.thankYouText');
  };

  if (submitted) {
    const thankYouContent = getThankYouContent();
    
    return (
      <div className="text-center p-8">
        <h2 className="font-lora text-2xl text-gray-800 mb-4">
          {t('form.thankYouTitle')}
        </h2>
        
        {/* Render thank you content with HTML support */}
        <div 
          className="font-manrope text-gray-600 rich-text-content"
          dangerouslySetInnerHTML={{ __html: thankYouContent }}
        />
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

      {campaignData?.include_nps && (
        <div className="mb-8">
          <div 
            className="font-manrope text-gray-700 mb-4 rich-text-content"
            dangerouslySetInnerHTML={{ __html: campaignData.nps_question || t('form.npsQuestion') }}
          />
          <div className="flex justify-between gap-2 mb-2">
            {[...Array(11)].map((_, i) => {
              const score = i;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => updateNpsScore(score)}
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
              <p className="font-manrope text-gray-700">
                {/* Use the custom text if available, or fall back to translation */}
                {campaignData.additionalFeedbackText ? (
                  <div dangerouslySetInnerHTML={{ __html: campaignData.additionalFeedbackText }} />
                ) : (
                  t('form.additionalFeedback')
                )}
              </p>
              
              {/* Voice Feedback Section - Default */}
              {feedbackMode === 'voice' && campaignData.settings.allowVoice && (
                <>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <AudioRecorder
                      onRecordingComplete={setAudioBlob}
                      ref={audioRecorderRef}
                      companyColor={companyData?.primary_color || '#657567'}
                      language={language}
                      enableGamification={isGamificationEnabled}
                    />
                  </div>
                  
                  {/* Switch to Text Option - Only show when in voice mode and text is allowed */}
                  {campaignData.settings.allowText && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setFeedbackMode('text')}
                        className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 transition-colors"
                        style={{ color: companyData?.primary_color || '#657567' }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {t('form.switchToTextInstead')}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Text Feedback Section */}
              {feedbackMode === 'text' && campaignData.settings.allowText && (
                <>
                  <textarea
                    value={textFeedback}
                    onChange={(e) => setTextFeedback(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope h-24 focus:outline-none"
                    placeholder={t('form.typeAnswerHere')}
                  />
                  
                  {/* Switch to Voice Option - Only show when in text mode and voice is allowed */}
                  {campaignData.settings.allowVoice && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setFeedbackMode('voice')}
                        className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 transition-colors"
                        style={{ color: companyData?.primary_color || '#657567' }}
                      >
                        <Mic className="w-4 h-4" />
                        {t('form.switchToVoiceInstead')}
                      </button>
                    </div>
                  )}
                </>
              )}
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
              voiceConsent: (audioBlob || Object.keys(questionVoiceRecordings).length > 0) 
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