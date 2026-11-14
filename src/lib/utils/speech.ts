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
 * Speech utility stub - browser system TTS has been replaced with pre-generated HD audio.
 */
export function speakText(text: string, _preferredVoiceURI?: string): void {
  // Browser system TTS has been completely removed in favor of pre-generated HD audio
  const clean = stripEmojis(text);
  if (!clean) return;
}
