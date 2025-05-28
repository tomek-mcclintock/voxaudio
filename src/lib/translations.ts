// src/lib/translations.ts
export const translations = {
  en: {
    form: {
      title: "Share Your Experience With Us",
      npsQuestion: "How likely are you to recommend us to friends and family?",
      notLikely: "Not likely",
      veryLikely: "Very likely",
      additionalQuestions: "Additional Questions",
      additionalFeedback: "Additional feedback:",
      voiceFeedback: "Voice Feedback",
      textFeedback: "Text Feedback",
      recordLabel: "Record your feedback (max 5 minutes):",
      textareaPlaceholder: "Please share your thoughts...",
      submitButton: "Submit Feedback",
      submitting: "Submitting...",
      consentText: "I consent to {companyName} collecting and processing my feedback{voiceConsent} to improve products and services.",
      andVoiceRecording: " and voice recording",
      theCompany: "the company",
      privacyPolicy: "Privacy Policy",
      thankYouTitle: "Thank You!",
      additionalFeedbackPlaceholder: "What could we do to improve?",
      thankYouText: "Your feedback has been recorded.",
      consentRequired: "Please accept the consent notice to submit feedback",
      npsRequired: "Please provide an NPS score",
      requiredQuestions: "Please answer all required questions",
      submissionError: "Failed to submit feedback. Please try again.",
      textResponse: "Text Response",
      voiceResponse: "Voice Response",
      switchToTextInstead: "Switch to text feedback instead",
      switchToVoiceInstead: "Switch to voice feedback instead",
      typeAnswerHere: "Type your answer here...",
      clickMicrophoneStart: "Click the microphone to start recording",
      recordingComplete: "Recording complete. Click play to review or trash to discard.",
      recording: "Recording...",
      optional: "(Optional)",
      // Question components translations
      poor: "Poor",
      excellent: "Excellent",
      yes: "Yes",
      no: "No",
      play: "Play",
      pause: "Pause",
      discard: "Discard",
      // Progress bar messages
      progressInitial: "The best feedback is >45s",
      progressSegment1: "Great start, you're on a roll!",
      progressSegment2: "Keep going, you're getting close!",
      progressSegment3: "Perfect length achieved! Feel free to add any final thoughts.",
      useVoiceRecommended: "Use Voice (Recommended)",
      voiceSelected: "Voice Selected"
    }
  },
  de: {
    form: {
      title: "Teile dein feedback mit uns",
      npsQuestion: "Wie wahrscheinlich ist es, dass Sie unser Unternehmen einem Freund oder Kollegen weiterempfehlen würden?",
      notLikely: "Unwahrscheinlich",
      veryLikely: "Sehr wahrscheinlich",
      additionalQuestions: "Weitere Fragen",
      additionalFeedback: "Weiteres Feedback:",
      voiceFeedback: "Sprachfeedback",
      textFeedback: "Textfeedback",
      recordLabel: "Nimm dein Feedback auf (max. 5 Minuten):",
      textareaPlaceholder: "Teile deine Gedanken mit uns...",
      submitButton: "Feedback senden",
      submitting: "Wird gesendet...",
      consentText: "Ich stimme zu, dass {companyName} mein Feedback{voiceConsent} sammelt und verarbeitet, um Produkte und Dienstleistungen zu verbessern.",
      andVoiceRecording: " und meine Sprachaufnahme",
      theCompany: "das Unternehmen",
      privacyPolicy: "Datenschutz",
      thankYouTitle: "Vielen Dank!",
      additionalFeedbackPlaceholder: "Was könnten wir verbessern?",
      thankYouText: "Dein Feedback wurde aufgezeichnet.",
      consentRequired: "Bitte akzeptiere die Datenschutzerklärung",
      npsRequired: "Bitte gib eine Bewertung ab",
      requiredQuestions: "Bitte beantworte alle Pflichtfragen",
      submissionError: "Fehler beim Senden. Bitte versuche es erneut.",
      textResponse: "Textantwort",
      voiceResponse: "Sprachantwort",
      switchToTextInstead: "Stattdessen zu Textfeedback wechseln",
      switchToVoiceInstead: "Stattdessen zu Sprachfeedback wechseln",
      typeAnswerHere: "Trage hier bitte deine Antwort ein...",
      clickMicrophoneStart: "Klicke auf das Mikrofon zum Starten",
      recordingComplete: "Aufnahme abgeschlossen. Abspielen oder verwerfen?",
      recording: "Aufnahme läuft...",
      optional: "(Optional)",
      // Question components translations - improved
      poor: "Schlecht",
      excellent: "Hervorragend",
      yes: "Ja",
      no: "Nein",
      play: "Abspielen",
      pause: "Pause",
      discard: "Löschen",
      // Progress bar messages - improved for more natural German
      progressInitial: "Am besten >45 Sekunden sprechen",
      progressSegment1: "Guter Start, weiter so!",
      progressSegment2: "Fast geschafft!",
      progressSegment3: "Perfekt! Gerne noch mehr hinzufügen.",
      useVoiceRecommended: "Sprachaufnahme nutzen (Empfohlen)",
      voiceSelected: "Sprache ausgewählt"
    }
  }
};
  
// Helper function to get translation
export function translate(lang: string, key: string, replacements: Record<string, string> = {}): string {
  // Default to English if language not found
  const language = translations[lang as keyof typeof translations] || translations.en;
  
  // Split the key path (e.g., 'form.title')
  const keys = key.split('.');
  let value: any = language;
  
  // Navigate through the keys
  for (const k of keys) {
    if (!value || typeof value !== 'object') return key;
    value = value[k];
  }
  
  // If no translation found, return the key
  if (typeof value !== 'string') return key;
  
  // Replace placeholders like {name} with values from replacements
  return value.replace(/\{(\w+)\}/g, (_, name) => {
    return replacements[name] !== undefined ? replacements[name] : `{${name}}`;
  });
}