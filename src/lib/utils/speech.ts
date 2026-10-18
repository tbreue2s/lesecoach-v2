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
 * Speech synthesis utility for reading out UI messages and text with natural voice ranking.
 */
export function speakText(text: string, preferredVoiceURI?: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis is not supported in this environment.');
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterance

    const cleanText = stripEmojis(text)
      .replace(/[„“"»«”]/g, '')
      .replace(/\.{3,}|…/g, ', ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'de-DE';
    utterance.rate = 0.90; // Natural, warm storybook pace
    utterance.pitch = 1.04;

    // Use intelligent voice selection
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      let selectedVoice: SpeechSynthesisVoice | undefined;

      if (preferredVoiceURI) {
        selectedVoice = voices.find(
          (v) => v.voiceURI === preferredVoiceURI || v.name === preferredVoiceURI
        );
      }

      if (!selectedVoice) {
        // High quality voice ranking
        const germanVoices = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('de'));
        if (germanVoices.length > 0) {
          // Sort by natural voice quality
          germanVoices.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();

            const score = (name: string, voice: SpeechSynthesisVoice) => {
              let s = 0;
              if (name.includes('natural')) s += 100;
              if (name.includes('enhanced')) s += 80;
              if (name.includes('premium')) s += 70;
              if (name.includes('google')) s += 60;
              if (voice.localService === false) s += 20;
              if (name.includes('espeak')) s -= 100;
              return s;
            };

            return score(bName, b) - score(aName, a);
          });

          selectedVoice = germanVoices[0];
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Error in speakText:', err);
  }
}
