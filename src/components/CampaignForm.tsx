// src/components/CampaignForm.tsx
'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { CampaignQuestion, QuestionType } from '@/types/campaign';
import { v4 as uuidv4 } from 'uuid';

interface CampaignFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
  companyName?: string;
}

export default function CampaignForm({ onSubmit, initialData, companyName = 'us' }: CampaignFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [startDate, setStartDate] = useState(initialData?.start_date || '');
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [includeNps, setIncludeNps] = useState(initialData?.includeNps ?? true);
  const [npsQuestion, setNpsQuestion] = useState(
    initialData?.npsQuestion || `How likely are you to recommend ${companyName} to friends and family?`
  );
  const [questions, setQuestions] = useState<CampaignQuestion[]>(initialData?.questions || []);
  const [includeAdditionalQuestions, setIncludeAdditionalQuestions] = useState(initialData?.includeAdditionalQuestions ?? false);
  const [settings, setSettings] = useState({
    allowVoice: true,
    allowText: true,
    requireOrderId: true,
    ...initialData?.settings
  });

  const addQuestion = (type: QuestionType) => {
    const newQuestion: CampaignQuestion = {
      id: uuidv4(),
      type,
      text: '',
      required: false
    };

    if (type === 'multiple_choice') {
      newQuestion.options = ['Option 1'];
    }
    if (type === 'rating') {
      newQuestion.scale = {
        min: 1,
        max: 5,
        minLabel: 'Poor',
        maxLabel: 'Excellent'
      };
    }

    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<CampaignQuestion>) => {
    setQuestions(questions.map(q => {
      if (q.id !== id) return q;
      
      // For scale updates, ensure we maintain required min/max values
      if (updates.scale && q.scale) {
        updates.scale = {
          min: updates.scale.min ?? q.scale.min,
          max: updates.scale.max ?? q.scale.max,
          minLabel: updates.scale.minLabel ?? q.scale.minLabel,
          maxLabel: updates.scale.maxLabel ?? q.scale.maxLabel
        };
      }
      
      return { ...q, ...updates };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      name,
      start_date: startDate || null,
      end_date: endDate || null,
      include_nps: includeNps,
      nps_question: npsQuestion,
      questions: includeAdditionalQuestions ? questions : [],
      settings: {
        ...settings,
        allowText: settings.allowText || !settings.allowVoice,
      },
      include_additional_questions: includeAdditionalQuestions
    };
    
    console.log('Client side - about to submit:', submitData);
    console.log('NPS Question value:', npsQuestion);  // Check the specific value
    onSubmit(submitData);
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Campaign Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* NPS Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">NPS Question</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeNps}
              onChange={(e) => setIncludeNps(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Include NPS question</span>
          </label>
        </div>
        
        {includeNps && (
          <div>
            <label className="block text-sm font-medium text-gray-700">NPS Question Text</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={npsQuestion}
              onChange={(e) => setNpsQuestion(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Feedback Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Feedback Settings</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.allowVoice}
              onChange={(e) => setSettings({...settings, allowVoice: e.target.checked})}
            />
            <span>Allow voice feedback</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.allowText}
              onChange={(e) => setSettings({...settings, allowText: e.target.checked})}
            />
            <span>Allow text feedback</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.requireOrderId}
              onChange={(e) => setSettings({...settings, requireOrderId: e.target.checked})}
            />
            <span>Require order ID</span>
          </label>
        </div>
      </div>

      {/* Additional Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Additional Questions</h3>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeAdditionalQuestions}
              onChange={(e) => setIncludeAdditionalQuestions(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Include additional questions</span>
          </label>
        </div>

        {includeAdditionalQuestions && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => addQuestion('text')}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                Add Text Question
              </button>
              <button
                type="button"
                onClick={() => addQuestion('rating')}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                Add Rating
              </button>
              <button
                type="button"
                onClick={() => addQuestion('multiple_choice')}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                Add Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => addQuestion('yes_no')}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                Add Yes/No
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start gap-4">
                    <GripVertical className="w-5 h-5 text-gray-400 mt-2" />
                    <div className="flex-grow space-y-4">
                      <input
                        type="text"
                        placeholder="Question text"
                        className="w-full rounded-md border-gray-300 shadow-sm"
                        value={question.text}
                        onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                      />

                      {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                className="flex-grow rounded-md border-gray-300 shadow-sm"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options!];
                                  newOptions[optionIndex] = e.target.value;
                                  updateQuestion(question.id, { options: newOptions });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = question.options!.filter((_, i) => i !== optionIndex);
                                  updateQuestion(question.id, { options: newOptions });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = [...question.options!, `Option ${question.options!.length + 1}`];
                              updateQuestion(question.id, { options: newOptions });
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Add Option
                          </button>
                        </div>
                      )}

                      {question.type === 'rating' && question.scale && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600">Min Label</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                              value={question.scale.minLabel || ''}
                              onChange={(e) => updateQuestion(question.id, {
                                scale: {
                                  ...question.scale!,
                                  minLabel: e.target.value
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600">Max Label</label>
                            <input
                              type="text"
                              className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                              value={question.scale.maxLabel || ''}
                              onChange={(e) => updateQuestion(question.id, {
                                scale: {
                                  ...question.scale!,
                                  maxLabel: e.target.value
                                }
                              })}
                            />
                          </div>
                        </div>
                      )}

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                        />
                        <span className="text-sm text-gray-600">Required</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setQuestions(questions.filter(q => q.id !== question.id));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Save Campaign
        </button>
      </div>
    </form>
  );
}
