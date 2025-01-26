// src/components/questions/QuestionTypes.tsx
'use client';

import React from 'react';
import type { CampaignQuestion } from '@/types/campaign';

// Ruggable's brand colors
const BRAND = {
  primary: '#657567',
  cta: '#934b32',
  ctaHover: '#833f2a',
} as const;

interface QuestionProps {
  question: CampaignQuestion;
  value: any;
  onChange: (value: any) => void;
}

export function TextQuestion({ question, value, onChange }: QuestionProps) {
  return (
    <textarea
      className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope
                focus:ring-2 focus:ring-[#657567] focus:border-[#657567] 
                resize-none h-32 transition-colors duration-200
                placeholder-gray-400"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer here..."
      required={question.required}
    />
  );
}

export function RatingQuestion({ question, value, onChange }: QuestionProps) {
  const { min = 1, max = 5, minLabel, maxLabel } = question.scale || {};
  const buttons = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2">
        {buttons.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`w-12 h-12 rounded-lg font-manrope font-semibold transition-all duration-200
              ${value === score 
                ? `bg-[${BRAND.primary}] text-white ring-2 ring-[${BRAND.primary}] ring-offset-2` 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-gray-500 font-manrope">
        <span>{minLabel || 'Poor'}</span>
        <span>{maxLabel || 'Excellent'}</span>
      </div>
    </div>
  );
}

export function MultipleChoiceQuestion({ question, value, onChange }: QuestionProps) {
  return (
    <div className="space-y-3">
      {question.options?.map((option, index) => (
        <label key={index} className="flex items-center p-3 border rounded-lg cursor-pointer
                                    transition-colors duration-200 hover:bg-gray-50
                                    font-manrope">
          <input
            type="radio"
            name={question.id}
            value={option}
            checked={value === option}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
            className={`h-4 w-4 border-gray-300 text-[${BRAND.primary}] 
                       focus:ring-[${BRAND.primary}] transition-colors duration-200`}
          />
          <span className="ml-3 text-gray-700">{option}</span>
        </label>
      ))}
    </div>
  );
}

export function YesNoQuestion({ question, value, onChange }: QuestionProps) {
  return (
    <div className="flex gap-4">
      {['Yes', 'No'].map((option) => (
        <label key={option} className="flex-1">
          <div className={`flex items-center justify-center p-4 border rounded-lg cursor-pointer
                          transition-all duration-200 font-manrope font-semibold
                          ${value === option.toLowerCase() 
                            ? `bg-[${BRAND.primary}] text-white border-[${BRAND.primary}]`
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            <input
              type="radio"
              name={question.id}
              value={option.toLowerCase()}
              checked={value === option.toLowerCase()}
              onChange={(e) => onChange(e.target.value)}
              required={question.required}
              className="sr-only" // Hidden but accessible
            />
            {option}
          </div>
        </label>
      ))}
    </div>
  );
}