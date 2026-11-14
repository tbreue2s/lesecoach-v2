/**
 * Text Preprocessing and Speech Control Service.
 * Browser/system TTS has been completely removed in favor of
 * pre-generated HD audio (Studio MP3/WAV) and offline PWA neural voices.
 */

import { stripEmojis } from '../utils/speech';

export interface SpeakOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onError?: (error?: any) => void;
}

/**
 * Checks whether browser system speech is supported/enabled.
 * Always returns false because system-TTS has been completely removed in favor of HD audio.
 */
export function isSpeechSupported(): boolean {
  return false;
}

/**
 * Preprocesses German text to improve pronunciation, eliminate robotic pauses,
 * expand abbreviations, and prevent voices from reading out quotation marks.
 */
export function preprocessGermanText(text: string): string {
  if (!text) return '';

  return stripEmojis(text)
    // Expand common abbreviations so TTS doesn't stumble or spell out letters
    .replace(/\bz\.\s*B\./gi, 'zum Beispiel')
    .replace(/\bd\.\s*h\./gi, 'das heißt')
    .replace(/\bu\.\s*a\./gi, 'unter anderem')
    .replace(/\busw\./gi, 'und so weiter')
    .replace(/\bbzw\./gi, 'beziehungsweise')
    .replace(/\bca\./gi, 'circa')
    .replace(/\bevtl\./gi, 'eventuell')
    // Remove dialogue quotation marks that some synthesizers pronounce aloud ("Gänsefüßchen", "Anführungszeichen")
    .replace(/[„“"»«”]/g, '')
    // Normalize ellipses to a single comma for smooth, human-like pauses
    .replace(/\s*(?:\.{3,}|…)\s*/g, ', ')
    // Normalize spaced hyphens/dashes to a gentle comma pause
    .replace(/\s+[-–—]\s+/g, ', ')
    // Clean up spaces before punctuation
    .replace(/\s+([,;:.!?])/g, '$1')
    // Normalize excessive whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Backward compatibility helpers for speech control.
 */
let isPausedState = false;
let isSpeakingState = false;

export function speakSentence(options: SpeakOptions): boolean {
  // Direct calls without pre-generated audio are redirected/acknowledged
  options.onEnd?.();
  return true;
}

export function pauseSpeech(): void {
  isPausedState = true;
}

export function resumeSpeech(): void {
  isPausedState = false;
}

export function stopSpeech(): void {
  isSpeakingState = false;
  isPausedState = false;
}

export function isSpeaking(): boolean {
  return isSpeakingState;
}

export function isPaused(): boolean {
  return isPausedState;
}

export function testVoice(_voiceOrURI?: any, _customText?: string): void {
  // Legacy testVoice stub
}
