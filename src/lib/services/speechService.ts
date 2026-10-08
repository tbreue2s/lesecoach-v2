/**
 * Audio-Engine Service for SpeechSynthesis with Chromium GC Protection & Karaoke Sync.
 */

export interface SpeakOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
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
      // Ignore voice init errors
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
 * Retrieves the best matching German voice available in the browser.
 */
export function getGermanVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;

  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Exact 'de-DE' or 'de_DE'
    const deDE = voices.find(
      (v) => v.lang === 'de-DE' || v.lang === 'de_DE'
    );
    if (deDE) return deDE;

    // 2. Any German locale ('de-*')
    const anyGerman = voices.find((v) => v.lang.toLowerCase().startsWith('de'));
    if (anyGerman) return anyGerman;

    return null;
  } catch {
    return null;
  }
}

/**
 * Speaks a single sentence/phrase with configured voice and event callbacks.
 * Enforces:
 * - Single-sentence chunks to avoid Chromium 15s freeze bug.
 * - Module/window GC retention.
 * - Slower pace (rate = 0.78) for 1st/2nd grade early readers.
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
    rate = 0.78,
    pitch = 1.0,
    onStart,
    onBoundary,
    onEnd,
    onError,
  } = options;

  if (!text || text.trim().length === 0) {
    options.onEnd?.({} as SpeechSynthesisEvent);
    return false;
  }

  try {
    // 1. Cancel any active synthesis before launching new utterance
    stopSpeech();

    // 2. Instantiate and configure new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    const germanVoice = getGermanVoice();
    if (germanVoice) {
      utterance.voice = germanVoice;
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
