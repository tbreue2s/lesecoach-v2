/**
 * Audio-Engine Service for SpeechSynthesis with Chromium GC Protection,
 * Intelligent Natural Voice Ranking, Text Preprocessing, and Karaoke Sync.
 */

import { stripEmojis } from '../utils/speech';

export interface SpeakOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  voiceURI?: string;
  voice?: SpeechSynthesisVoice;
  onStart?: (event: SpeechSynthesisEvent) => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
  onEnd?: (event: SpeechSynthesisEvent) => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

// Module-scoped utterance instance to prevent Chromium Garbage Collection bug (Issue 679437)
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function getActiveUtterance(): SpeechSynthesisUtterance | null {
  return activeUtterance;
}

// Global window anchor as a secondary retention barrier against aggressive GC
if (typeof window !== 'undefined') {
  (window as unknown as { __lesecoach_tts_active_utterance: SpeechSynthesisUtterance | null }).__lesecoach_tts_active_utterance = null;
  // Pre-warm voices on startup
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    } catch {
      // Ignore voice init errors in non-browser/test environments
    }
  }
}

/**
 * Checks whether SpeechSynthesis is supported in the current environment.
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
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
 * Rates the acoustic quality of a German voice.
 * Prioritizes modern Neural/Natural, Enhanced, Google, and Apple storybook voices
 * while penalizing low-bitrate mechanical synthesizers (e.g. eSpeak).
 */
export function rankGermanVoice(voice: SpeechSynthesisVoice): number {
  if (!voice) return -1000;

  const lang = (voice.lang || '').toLowerCase().replace('_', '-');
  const name = (voice.name || '').toLowerCase();

  // If not a German locale, disqualify
  if (!lang.startsWith('de')) {
    return -1000;
  }

  let score = 0;

  // 1. Dialect matching
  if (lang === 'de-de') {
    score += 40;
  } else if (lang === 'de-at' || lang === 'de-ch') {
    score += 20;
  } else {
    score += 10;
  }

  // 2. High-quality neural / natural voice engines
  if (name.includes('natural') || name.includes('online (natural)')) {
    score += 180; // Microsoft Natural / Azure Neural
  } else if (name.includes('enhanced')) {
    score += 150; // Apple Enhanced (iOS / macOS)
  } else if (name.includes('premium')) {
    score += 140; // Apple Premium
  } else if (name.includes('google')) {
    score += 120; // Google Chrome natural voice
  } else if (name.includes('neural')) {
    score += 100;
  }

  // 3. Known warm, high-fidelity German narrator voices
  if (
    name.includes('katja') ||
    name.includes('amala') ||
    name.includes('klara') ||
    name.includes('marlene') ||
    name.includes('anna') ||
    name.includes('petra')
  ) {
    score += 50;
  } else if (
    name.includes('conrad') ||
    name.includes('markus') ||
    name.includes('christoph') ||
    name.includes('killian') ||
    name.includes('vicki') ||
    name.includes('hans')
  ) {
    score += 40;
  }

  // 4. Remote / cloud service voices in Chromium (higher sample rate)
  if (voice.localService === false) {
    score += 35;
  }

  // 5. Penalties for low-fidelity, robotic engines
  if (name.includes('espeak')) {
    score -= 300;
  }
  if (name.includes('speech-dispatcher')) {
    score -= 250;
  }
  if (name.includes('festival') || name.includes('mbrola')) {
    score -= 150;
  }

  return score;
}

/**
 * Returns all available German voices sorted by acoustic quality ranking (highest score first).
 */
export function getAvailableGermanVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];

  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return [];

    return voices
      .filter((v) => (v.lang || '').toLowerCase().startsWith('de'))
      .sort((a, b) => rankGermanVoice(b) - rankGermanVoice(a));
  } catch {
    return [];
  }
}

/**
 * Retrieves the best matching natural German voice available in the browser,
 * taking optional user preferences into account.
 */
export function getGermanVoice(preferredVoiceURI?: string): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;

  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Check explicitly passed preferredVoiceURI or persisted preference
    let targetURI = preferredVoiceURI;
    if (!targetURI && typeof window !== 'undefined' && window.localStorage) {
      targetURI = localStorage.getItem('lesecoach_tts_preferred_voice') || undefined;
    }

    if (targetURI) {
      const match = voices.find((v) => v.voiceURI === targetURI || v.name === targetURI);
      if (match) return match;
    }

    // 2. Select the highest ranked German voice
    const ranked = getAvailableGermanVoices();
    if (ranked.length > 0 && rankGermanVoice(ranked[0]) > -500) {
      return ranked[0];
    }

    // 3. Fallback: Any German locale
    const anyGerman = voices.find((v) => (v.lang || '').toLowerCase().startsWith('de'));
    if (anyGerman) return anyGerman;

    // 4. Ultimate fallback to first available system voice
    return voices[0] || null;
  } catch {
    return null;
  }
}

/**
 * Plays a short, cheerful test sample with the selected voice.
 */
export function testVoice(voiceOrURI?: SpeechSynthesisVoice | string | null, customText?: string): void {
  const sample =
    customText || 'Hallo! Ich bin dein Lese-Begleiter und freue mich darauf, mit dir tolle Geschichten zu lesen!';

  let chosenVoice: SpeechSynthesisVoice | undefined;
  if (typeof voiceOrURI === 'string') {
    chosenVoice = getGermanVoice(voiceOrURI) || undefined;
  } else if (voiceOrURI) {
    chosenVoice = voiceOrURI;
  } else {
    chosenVoice = getGermanVoice() || undefined;
  }

  speakSentence({
    text: sample,
    rate: 0.90,
    pitch: 1.04,
    voice: chosenVoice,
  });
}

/**
 * Speaks a single sentence/phrase with configured voice and event callbacks.
 * Enforces:
 * - Single-sentence chunks to avoid Chromium 15s freeze bug.
 * - Module/window GC retention.
 * - Gentle, warm, natural pace (rate = 0.90, pitch = 1.04) for optimal intonation.
 */
export function speakSentence(options: SpeakOptions): boolean {
  if (!isSpeechSupported()) {
    console.warn('[speechService] SpeechSynthesis is not supported in this environment.');
    options.onEnd?.({} as SpeechSynthesisEvent);
    return false;
  }

  const {
    text,
    lang = 'de-DE',
    rate = 0.90,
    pitch = 1.04,
    voice,
    voiceURI,
    onStart,
    onBoundary,
    onEnd,
    onError,
  } = options;

  if (!text || text.trim().length === 0) {
    options.onEnd?.({} as SpeechSynthesisEvent);
    return false;
  }

  const cleanedText = preprocessGermanText(text);
  if (!cleanedText) {
    options.onEnd?.({} as SpeechSynthesisEvent);
    return false;
  }

  try {
    // 1. Cancel any active synthesis before launching new utterance
    stopSpeech();

    // 2. Instantiate and configure new utterance with cleaned text
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    const chosenVoice = voice || (voiceURI ? getGermanVoice(voiceURI) : getGermanVoice());
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    // 3. Attach event listeners
    utterance.onstart = (event) => {
      onStart?.(event);
    };

    utterance.onboundary = (event) => {
      onBoundary?.(event);
    };

    utterance.onend = (event) => {
      cleanupUtterance();
      onEnd?.(event);
    };

    utterance.onerror = (event) => {
      // Ignore 'canceled' error events caused by deliberate stopSpeech() calls
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.warn('[speechService] Speech synthesis error:', event.error);
      }
      cleanupUtterance();
      onError?.(event);
    };

    // 4. Pin utterance in module-scope & window-scope to protect from GC
    activeUtterance = utterance;
    if (typeof window !== 'undefined') {
      (window as unknown as { __lesecoach_tts_active_utterance: SpeechSynthesisUtterance | null }).__lesecoach_tts_active_utterance = utterance;
    }

    // 5. Trigger speech
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('[speechService] Error starting speech synthesis:', err);
    cleanupUtterance();
    options.onError?.(err as SpeechSynthesisErrorEvent);
    return false;
  }
}

/**
 * Pauses currently playing speech.
 */
export function pauseSpeech(): void {
  if (isSpeechSupported() && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resumes paused speech.
 */
export function resumeSpeech(): void {
  if (isSpeechSupported() && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
}

/**
 * Stops and cancels all pending speech, resetting utterance references.
 */
export function stopSpeech(): void {
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors
    }
  }
  cleanupUtterance();
}

/**
 * Helper to clear persistent utterance references upon completion or error.
 */
function cleanupUtterance(): void {
  activeUtterance = null;
  if (typeof window !== 'undefined') {
    (window as unknown as { __lesecoach_tts_active_utterance: SpeechSynthesisUtterance | null }).__lesecoach_tts_active_utterance = null;
  }
}

/**
 * Returns whether speech is currently in progress.
 */
export function isSpeaking(): boolean {
  return isSpeechSupported() && window.speechSynthesis.speaking && !window.speechSynthesis.paused;
}

/**
 * Returns whether speech is currently paused.
 */
export function isPaused(): boolean {
  return isSpeechSupported() && window.speechSynthesis.paused;
}
