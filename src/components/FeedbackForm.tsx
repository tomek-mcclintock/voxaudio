'use client';

import React, { useState } from 'react';
import AudioRecorder from './AudioRecorder';
import { Send } from 'lucide-react';

interface FeedbackFormProps {
  orderId: string;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ orderId }) => {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  const handleSubmit = async () => {
    if (!privacyConsent) {
      setError('Please accept the privacy notice to continue');
      return;
    }

    if (!npsScore) {
      setError('Please provide a score');
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
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Thank You!</h2>
        <p className="text-gray-600">Your feedback has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Share Your Ruggable Experience
      </h1>

      {/* NPS Score Section */}
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

      {/* Voice Recording Section */}
      <div className="mb-8">
        <p className="text-gray-600 mb-4">
          Tell us about your experience (max 5 minutes):
        </p>
        <AudioRecorder onRecordingComplete={setAudioBlob} />
      </div>

      {/* Privacy Notice Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start mb-4">
          <input
            type="checkbox"
            id="privacyConsent"
            checked={privacyConsent}
            onChange={(e) => setPrivacyConsent(e.target.checked)}
            className="mt-1 mr-2"
          />
          <label htmlFor="privacyConsent" className="text-sm text-gray-600">
            I consent to the processing of my feedback, including voice recording, and understand that my data will be transferred to and processed in the United States.
          </label>
        </div>
        
        <button
          onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
          className="text-blue-600 text-sm hover:underline focus:outline-none"
        >
          {showPrivacyDetails ? 'Hide Privacy Details' : 'View Privacy Details'}
        </button>

        {showPrivacyDetails && (
          <div className="mt-2 text-sm text-gray-600 bg-white p-3 rounded">
            <h3 className="font-semibold mb-2">Privacy Notice</h3>
            <p className="mb-2">We collect and process your feedback, including:</p>
            <ul className="list-disc pl-5 mb-2">
              <li>Your NPS score</li>
              <li>Voice recordings (if provided)</li>
              <li>Order ID</li>
            </ul>
            <p className="mb-2">Your data will be:</p>
            <ul className="list-disc pl-5 mb-2">
              <li>Transferred to and processed in the United States</li>
              <li>Used to improve our products and services</li>
              <li>Processed using AI services for transcription and analysis</li>
              <li>Stored securely and retained according to our retention policy</li>
            </ul>
            <p>For more information about how we process your data, please see our full <a href="https://ruggable.co.uk/policies/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !privacyConsent || (!npsScore && !audioBlob)}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                 disabled:cursor-not-allowed text-white font-semibold py-3 
                 px-4 rounded-lg flex items-center justify-center gap-2"
      >
        <Send className="w-5 h-5" />
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  );
};

export default FeedbackForm;