// src/components/questions/QuestionTypes.tsx
'use client';

import React from 'react';
import type { CampaignQuestion } from '@/types/campaign';

interface QuestionProps {
  question: CampaignQuestion;
  value: any;
  onChange: (value: any) => void;
}

export function TextQuestion({ question, value, onChange }: QuestionProps) {
  return (
    <textarea
      className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Your answer..."
      required={question.required}
    />
  );
}

export function RatingQuestion({ question, value, onChange }: QuestionProps) {
  const { min = 1, max = 5, minLabel, maxLabel } = question.scale || {};
  const buttons = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-1">
        {buttons.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`w-10 h-10 rounded-full font-semibold transition-all duration-200 ${
              value === score
                ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-2'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-gray-500">
        <span>{minLabel || 'Low'}</span>
        <span>{maxLabel || 'High'}</span>
      </div>
    </div>
  );
}

export function MultipleChoiceQuestion({ question, value, onChange }: QuestionProps) {
  return (
    <div className="space-y-2">
      {question.options?.map((option, index) => (
        <label key={index} className="flex items-center space-x-3">
          <input
            type="radio"
            name={question.id}
            value={option}
            checked={value === option}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
            className="h-4 w-4 text-blue-600 border-gray-300"
          />
          <span className="text-gray-700">{option}</span>
        </label>
      ))}
    </div>
  );
}

export function YesNoQuestion({ question, value, onChange }: QuestionProps) {
  return (
    <div className="flex gap-4">
      <label className="flex items-center space-x-3">
        <input
          type="radio"
          name={question.id}
          value="yes"
          checked={value === 'yes'}
          onChange={(e) => onChange(e.target.value)}
          required={question.required}
          className="h-4 w-4 text-blue-600 border-gray-300"
        />
        <span className="text-gray-700">Yes</span>
      </label>
      <label className="flex items-center space-x-3">
        <input
          type="radio"
          name={question.id}
          value="no"
          checked={value === 'no'}
          onChange={(e) => onChange(e.target.value)}
          required={question.required}
          className="h-4 w-4 text-blue-600 border-gray-300"
        />
        <span className="text-gray-700">No</span>
      </label>
    </div>
  );
}