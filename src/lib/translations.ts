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
      consentText: "I consent to {companyName} collecting and processing my feedback{voiceConsent}, including processing on US-based servers. I understand this data will be used to improve products and services.",
      andVoiceRecording: " and voice recording",
      theCompany: "the company",
      privacyPolicy: "Privacy Policy",
      thankYouTitle: "Thank You!",
      thankYouText: "Your feedback has been recorded.",
      consentRequired: "Please accept the consent notice to submit feedback",
      npsRequired: "Please provide an NPS score",
      requiredQuestions: "Please answer all required questions",
      submissionError: "Failed to submit feedback. Please try again.",
      textResponse: "Text Response",
      voiceResponse: "Voice Response",
      typeAnswerHere: "Type your answer here...",
      clickMicrophoneStart: "Click the microphone to start recording",
      recordingComplete: "Recording complete. Click play to review or trash to discard.",
      recording: "Recording...",
      optional: "(Optional)",
      // New translations for question components
      poor: "Poor",
      excellent: "Excellent",
      yes: "Yes",
      no: "No",
      play: "Play",
      pause: "Pause",
      discard: "Discard"
    }
  },
  de: {
    form: {
      title: "Teile dein feedback mit uns",
      npsQuestion: "Wie wahrscheinlich ist es, dass du uns Freunden und Familie empfehlen würdest?",
      notLikely: "Unwahrscheinlich",
      veryLikely: "Sehr wahrscheinlich",
      additionalQuestions: "Zusätzliche Fragen",
      additionalFeedback: "Zusätzliches Feedback:",
      voiceFeedback: "Sprachfeedback",
      textFeedback: "Textfeedback",
      recordLabel: "Zeichne dein Feedback auf (max. 5 Minuten):",
      textareaPlaceholder: "Bitte teile hier deine Gedanken mit...",
      submitButton: "Feedback abschicken",
      submitting: "Wird gesendet...",
      consentText: "Ich stimme zu, dass {companyName} mein Feedback{voiceConsent} sammelt und verarbeitet, einschließlich der Verarbeitung auf US-basierten Servern. Ich verstehe, dass diese Daten zur Verbesserung von Produkten und Dienstleistungen verwendet werden.",
      andVoiceRecording: " und meine Sprachaufnahme",
      theCompany: "das Unternehmen",
      privacyPolicy: "Datenschutzrichtlinie",
      thankYouTitle: "Vielen Dank!",
      thankYouText: "Dein Feedback wurde aufgezeichnet.",
      consentRequired: "Bitte akzeptiere die Einwilligungserklärung, um Feedback zu senden",
      npsRequired: "Bitte gib eine NPS-Bewertung ab",
      requiredQuestions: "Bitte beantworte alle erforderlichen Fragen",
      submissionError: "Fehler beim Absenden des Feedbacks. Bitte versuche es erneut.",
      textResponse: "Textantwort",
      voiceResponse: "Sprachantwort",
      typeAnswerHere: "Trage hier bitte deine Antwort ein.",
      clickMicrophoneStart: "Klicke auf das Mikrofon, um die Aufnahme zu starten",
      recordingComplete: "Aufnahme abgeschlossen. Klicke auf Wiedergabe, um sie zu überprüfen, oder auf Papierkorb, um sie zu verwerfen.",
      recording: "Aufnahme läuft...",
      optional: "(Optional)",
      // New translations for question components
      poor: "Schlecht",
      excellent: "Ausgezeichnet",
      yes: "Ja",
      no: "Nein",
      play: "Abspielen",
      pause: "Pause",
      discard: "Verwerfen"
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