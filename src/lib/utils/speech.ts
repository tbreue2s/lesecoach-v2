/**
 * Strips emojis and special pictographs from text for smooth, natural speech synthesis.
 */
export function stripEmojis(text: string): string {
  if (!text) return '';
  return text
    // Remove Unicode emojis, pictographs, symbols, variation selectors
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D/gu, '')
    // Normalize multi-spaces caused by emoji removal
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Speech synthesis utility for reading out UI messages and text.
 */
export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis is not supported in this environment.');
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterance

    const cleanText = stripEmojis(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9; // Child-friendly slightly slower pace

    // Prefer German voice if available
    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(
      (v) => v.lang.startsWith('de') || v.lang === 'de_DE' || v.lang === 'de-DE'
    );
    if (germanVoice) {
      utterance.voice = germanVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Error in speakText:', err);
  }
}
