'use client';

import React, { useState } from 'react';
import AudioRecorder from './AudioRecorder';
import Link from 'next/link';

interface FeedbackFormProps {
  orderId: string;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ orderId }) => {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consents, setConsents] = useState({
    dataProcessing: false,
    voiceRecording: false
  });

  const handleSubmit = async () => {
    if (!npsScore) {
      setError('Please provide a score');
      return;
    }

    if (audioBlob && !consents.voiceRecording) {
      setError('Please accept voice recording consent to submit voice feedback');
      return;
    }

    if (!consents.dataProcessing) {
      setError('Please accept data processing consent to submit feedback');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append('audio', audioBlob);
      }
      formData.append('orderId', orderId);
      formData.append('npsScore', npsScore.toString());

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Thank You!</h2>
          <p className="text-gray-600 mb-4">Your feedback has been recorded and will help us improve our products and services.</p>
          <a 
            href="https://ruggable.co.uk" 
            className="text-blue-500 hover:text-blue-600"
          >
            Return to Ruggable
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-500">Order ID: {orderId}</h2>
          <div className="flex items-center">
            <svg className="h-4 w-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm text-gray-500">Secure feedback</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">
          Share Your Ruggable Experience
        </h1>
      </div>

      <div className="mb-8">
        <p className="text-gray-600 mb-4">
          How likely are you to recommend Ruggable to friends and family?
        </p>
        <div className="flex justify-between gap-1">
          {[...Array(10)].map((_, i) => {
            const score = i + 1;
            const getScoreColor = (score: number) => {
              if (score <= 6) return 'bg-red-500 hover:bg-red-600';
              if (score <= 8) return 'bg-yellow-500 hover:bg-yellow-600';
              return 'bg-green-500 hover:bg-green-600';
            };

            return (
              <button
                key={score}
                onClick={() => setNpsScore(score)}
                className={`w-8 h-8 rounded-full text-white font-semibold transition-colors
                  ${npsScore === score ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  ${getScoreColor(score)}`}
              >
                {score}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-sm text-gray-500">Not likely</span>
          <span className="text-sm text-gray-500">Very likely</span>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-gray-600 mb-4">
          Tell us about your experience (max 5 minutes):
        </p>
        <AudioRecorder onRecordingComplete={setAudioBlob} disabled={!consents.voiceRecording} />
      </div>

      {/* Consent Checkboxes */}
      <div className="mb-6 space-y-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="dataProcessing"
              type="checkbox"
              checked={consents.dataProcessing}
              onChange={(e) => setConsents(prev => ({
                ...prev,
                dataProcessing: e.target.checked
              }))}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="dataProcessing" className="text-sm text-gray-600">
              I consent to Ruggable processing my feedback data as described in the{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                Privacy Notice
              </Link>
            </label>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="voiceRecording"
              type="checkbox"
              checked={consents.voiceRecording}
              onChange={(e) => setConsents(prev => ({
                ...prev,
                voiceRecording: e.target.checked
              }))}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="voiceRecording" className="text-sm text-gray-600">
              I consent to Ruggable recording and processing my voice feedback
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || (!npsScore && !audioBlob) || !consents.dataProcessing}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                 disabled:cursor-not-allowed text-white font-semibold py-3 
                 px-4 rounded-lg flex items-center justify-center gap-2"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>

      <p className="mt-4 text-sm text-gray-500 text-center">
        By submitting, you agree to our{' '}
        <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
          Privacy Notice
        </Link>
      </p>
    </div>
  );
};

export default FeedbackForm;