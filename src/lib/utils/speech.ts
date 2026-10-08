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

    const utterance = new SpeechSynthesisUtterance(text);
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
