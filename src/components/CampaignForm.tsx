// src/components/CampaignForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Mic, Type, ChevronDown, ChevronUp } from 'lucide-react';
import type { CampaignQuestion, QuestionType } from '@/types/campaign';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import '@/styles/quill.css';
import { translate } from '@/lib/translations';


// Dynamically import React Quill with no SSR to avoid hydration issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

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
    enableGamification: initialData?.settings?.enableGamification ?? true,
    ...initialData?.settings
  });
  const [language, setLanguage] = useState(initialData?.language || 'en');
  const [introText, setIntroText] = useState(initialData?.introText || '');
  const [additionalFeedbackText, setAdditionalFeedbackText] = useState(
    initialData?.additionalFeedbackText || translate(language, 'form.additionalFeedbackPlaceholder')
  );

  // New states for custom thank you pages
  const [useCustomThankYouPages, setUseCustomThankYouPages] = useState(initialData?.useCustomThankYouPages ?? false);
  const [thankYouPagePromoters, setThankYouPagePromoters] = useState(initialData?.thankYouPagePromoters || '');
  const [thankYouPagePassives, setThankYouPagePassives] = useState(initialData?.thankYouPagePassives || '');
  const [thankYouPageDetractors, setThankYouPageDetractors] = useState(initialData?.thankYouPageDetractors || '');

  // State for expanded/collapsed sections of thank you pages
  const [expandedThankYouPages, setExpandedThankYouPages] = useState({
    promoters: false,
    passives: false,
    detractors: false
  });

  // Toggle function for expanding/collapsing thank you page sections
  const toggleThankYouPageSection = (section: 'promoters' | 'passives' | 'detractors') => {
    setExpandedThankYouPages(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    // Only update if it's still the default text (not user-modified)
    if (!initialData?.additionalFeedbackText && 
        (additionalFeedbackText === translate('en', 'form.additionalFeedbackPlaceholder') ||
         additionalFeedbackText === translate('de', 'form.additionalFeedbackPlaceholder'))) {
      setAdditionalFeedbackText(translate(language, 'form.additionalFeedbackPlaceholder'));
    }
  }, [language]);  
  
  // Quill editor modules configuration
  const quillModules = {
    toolbar: [
      ['bold', 'italic'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'], // Added link formatting
      ['clean']
    ]
  };
  
  // Quill editor formats
  const quillFormats = [
    'bold', 'italic', 'list', 'bullet', 'link'
  ];

  const addQuestion = (type: QuestionType) => {
    const newQuestion: CampaignQuestion = {
      id: uuidv4(),
      type,
      text: '',
      formattedText: '',
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
    if (type === 'voice_text') {
      newQuestion.allowVoice = true;
      newQuestion.allowText = true;
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
      additionalFeedbackText: additionalFeedbackText,
      questions: includeAdditionalQuestions ? questions : [],
      settings: {
        ...settings,
        allowText: settings.allowText || !settings.allowVoice,
      },
      include_additional_questions: includeAdditionalQuestions,
      language,
      introText,
      // Include the new custom thank you page fields
      useCustomThankYouPages,
      thankYouPagePromoters: useCustomThankYouPages ? thankYouPagePromoters : null,
      thankYouPagePassives: useCustomThankYouPages ? thankYouPagePassives : null,
      thankYouPageDetractors: useCustomThankYouPages ? thankYouPageDetractors : null
    };
    
    console.log('Client side - about to submit:', submitData);
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

      {/* Language Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Language Settings</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Feedback Page Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="en">English</option>
            <option value="de">German (Deutsch)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            This sets the language for the customer feedback page.
          </p>
        </div>
      </div>

      {/* Introductory Text */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Introductory Text</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Text to display at the top of the feedback form (optional)
          </label>
          <div className="mt-1">
            <ReactQuill
              value={introText}
              onChange={setIntroText}
              modules={quillModules}
              formats={quillFormats}
              theme="snow"
              className="bg-white"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This text will appear at the beginning of your feedback form, before any questions.
          </p>
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
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">NPS Question Text</label>
              <div className="mt-1">
                <ReactQuill
                  value={npsQuestion}
                  onChange={setNpsQuestion}
                  modules={quillModules}
                  formats={quillFormats}
                  theme="snow"
                  className="bg-white"
                />
              </div>
            </div>
            
            {/* New field for Additional Feedback Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Feedback Text</label>
              <div className="mt-1">
                <ReactQuill
                  value={additionalFeedbackText}
                  onChange={setAdditionalFeedbackText}
                  modules={quillModules}
                  formats={quillFormats}
                  theme="snow"
                  className="bg-white"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This text will appear above the voice/text feedback section.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Custom Thank You Pages - New Section */}
      {includeNps && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Custom Thank You Pages</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useCustomThankYouPages}
                onChange={(e) => setUseCustomThankYouPages(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Use custom thank you pages</span>
            </label>
          </div>
          
          {useCustomThankYouPages && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Create custom thank you pages for different NPS score ranges. 
                These pages will be shown after the user submits their feedback.
              </p>
              
              {/* Promoters (9-10) Thank You Page */}
              <div className="border rounded-lg p-4 bg-green-50">
                <button 
                  type="button"
                  onClick={() => toggleThankYouPageSection('promoters')}
                  className="flex justify-between items-center w-full text-left"
                >
                  <div className="font-medium text-green-700">Promoters (Scores 9-10)</div>
                  {expandedThankYouPages.promoters ? 
                    <ChevronUp className="w-5 h-5 text-green-700" /> : 
                    <ChevronDown className="w-5 h-5 text-green-700" />}
                </button>
                
                {expandedThankYouPages.promoters && (
                  <div className="mt-4">
                    <div className="mt-1">
                      <ReactQuill
                        value={thankYouPagePromoters}
                        onChange={setThankYouPagePromoters}
                        modules={quillModules}
                        formats={quillFormats}
                        theme="snow"
                        className="bg-white"
                        placeholder="Enter thank you content for promoters (scores 9-10)..."
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This content will be shown to customers who give a score of 9 or 10 (promoters).
                      Consider adding links to review sites.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Passives (7-8) Thank You Page */}
              <div className="border rounded-lg p-4 bg-yellow-50">
                <button 
                  type="button"
                  onClick={() => toggleThankYouPageSection('passives')}
                  className="flex justify-between items-center w-full text-left"
                >
                  <div className="font-medium text-yellow-700">Passives (Scores 7-8)</div>
                  {expandedThankYouPages.passives ? 
                    <ChevronUp className="w-5 h-5 text-yellow-700" /> : 
                    <ChevronDown className="w-5 h-5 text-yellow-700" />}
                </button>
                
                {expandedThankYouPages.passives && (
                  <div className="mt-4">
                    <div className="mt-1">
                      <ReactQuill
                        value={thankYouPagePassives}
                        onChange={setThankYouPagePassives}
                        modules={quillModules}
                        formats={quillFormats}
                        theme="snow"
                        className="bg-white"
                        placeholder="Enter thank you content for passives (scores 7-8)..."
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This content will be shown to customers who give a score of 7 or 8 (passives).
                      Consider asking for specific improvement suggestions.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Detractors (0-6) Thank You Page */}
              <div className="border rounded-lg p-4 bg-red-50">
                <button 
                  type="button"
                  onClick={() => toggleThankYouPageSection('detractors')}
                  className="flex justify-between items-center w-full text-left"
                >
                  <div className="font-medium text-red-700">Detractors (Scores 0-6)</div>
                  {expandedThankYouPages.detractors ? 
                    <ChevronUp className="w-5 h-5 text-red-700" /> : 
                    <ChevronDown className="w-5 h-5 text-red-700" />}
                </button>
                
                {expandedThankYouPages.detractors && (
                  <div className="mt-4">
                    <div className="mt-1">
                      <ReactQuill
                        value={thankYouPageDetractors}
                        onChange={setThankYouPageDetractors}
                        modules={quillModules}
                        formats={quillFormats}
                        theme="snow"
                        className="bg-white"
                        placeholder="Enter thank you content for detractors (scores 0-6)..."
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This content will be shown to customers who give a score of 0 to 6 (detractors).
                      Consider providing support resources or contact information.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">General Feedback Settings</h3>
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
          
          {/* Gamification toggle */}
          {settings.allowVoice && (
            <div className="pt-2 border-t mt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.enableGamification}
                  onChange={(e) => setSettings({...settings, enableGamification: e.target.checked})}
                />
                <span className="font-medium">Enable voice feedback gamification</span>
              </label>
              <p className="text-sm text-gray-500 ml-6 mt-1">
                Shows colored progress bars and encouraging messages to motivate users to provide longer voice feedback.
              </p>
            </div>
          )}
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
              <button
                type="button"
                onClick={() => addQuestion('voice_text')}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                Add Voice/Text Question
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start gap-4">
                    <GripVertical className="w-5 h-5 text-gray-400 mt-2" />
                    <div className="flex-grow space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                        <ReactQuill
                          value={question.formattedText || question.text}
                          onChange={(content) => {
                            // Extract plain text from HTML (simple approach)
                            const div = document.createElement('div');
                            div.innerHTML = content;
                            const plainText = div.textContent || div.innerText || '';
                            
                            updateQuestion(question.id, { 
                              text: plainText, 
                              formattedText: content 
                            });
                          }}
                          modules={quillModules}
                          formats={quillFormats}
                          theme="snow"
                          className="bg-white"
                        />
                      </div>

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

                      {question.type === 'voice_text' && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">Response Options:</p>
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={question.allowVoice ?? true}
                                onChange={(e) => updateQuestion(question.id, { allowVoice: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="inline-flex items-center text-sm">
                                <Mic className="w-4 h-4 mr-1" /> Allow Voice Response
                              </span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={question.allowText ?? true}
                                onChange={(e) => updateQuestion(question.id, { allowText: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="inline-flex items-center text-sm">
                                <Type className="w-4 h-4 mr-1" /> Allow Text Response
                              </span>
                            </label>
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