/**
 * Speech Recognition (STT) Service wrapping Web Speech API / webkitSpeechRecognition.
 * Enforces strict microphone hygiene:
 * - Active continuously during CHILD_TURN (persistent auto-rearm on browser silence timeouts).
 * - Stopped immediately prior to TTS playback to prevent audio echo / feedback loops.
 * - Configured strictly for 'de-DE'.
 */

export type SpeechRecognitionErrorCode =
  | 'not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'service-not-allowed'
  | 'unknown';

export interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoRestart?: boolean;
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: SpeechRecognitionErrorCode, rawEvent: any) => void;
  onEnd?: () => void;
}

// Module-level active recognition instance for single-session microphone control
let activeRecognition: any = null;
let isExplicitlyStopping = false;
let currentOptions: SpeechRecognitionOptions | null = null;
let restartTimeout: ReturnType<typeof setTimeout> | null = null;

// Typed interface for browser SpeechRecognition constructors
interface IWindowSpeechRecognition {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * Checks if the Web Speech Recognition API is supported in the current environment.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as IWindowSpeechRecognition;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

/**
 * Factory to get the browser's native SpeechRecognition class constructor.
 */
function getSpeechRecognitionConstructor(): any {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as IWindowSpeechRecognition;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

/**
 * Returns whether speech recognition is currently active and listening.
 */
export function isListening(): boolean {
  return activeRecognition !== null;
}

function clearRestartTimeout() {
  if (restartTimeout !== null) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
}

/**
 * Internal launcher for starting/restarting the SpeechRecognition instance.
 */
function launchRecognitionInstance(options: SpeechRecognitionOptions): boolean {
  const SpeechRecClass = getSpeechRecognitionConstructor();
  if (!SpeechRecClass) {
    options.onError?.('unknown', { error: 'SpeechRecognition not supported' });
    return false;
  }

  try {
    const recognition = new SpeechRecClass();

    // Strict German language setting & continuous streaming
    recognition.lang = options.lang || 'de-DE';
    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
    recognition.maxAlternatives = options.maxAlternatives ?? 3;

    recognition.onstart = () => {
      options.onStart?.();
    };

    recognition.onresult = (event: any) => {
      if (!event.results || event.results.length === 0) return;

      const lastResult = event.results[event.results.length - 1];
      const isFinal = Boolean(lastResult.isFinal);
      const transcript = lastResult[0]?.transcript?.trim() || '';

      if (transcript) {
        options.onResult?.(transcript, isFinal);
      }
    };

    recognition.onerror = (event: any) => {
      const errCode: SpeechRecognitionErrorCode = event.error || 'unknown';

      // Ignore intentional abort/stop events triggered by lifecycle transitions
      if (errCode === 'aborted' && isExplicitlyStopping) {
        return;
      }

      if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
        isExplicitlyStopping = true;
        console.warn('[speechRecognitionService] Microphone permission not granted.');
      } else if (errCode !== 'no-speech') {
        console.warn('[speechRecognitionService] Recognition error:', errCode);
      }

      options.onError?.(errCode, event);
    };

    recognition.onend = () => {
      cleanupRecognition(recognition);

      // Persistent listening: if the browser stopped listening due to silence (not-allowed / explicit stop excluded), auto-rearm immediately
      const shouldAutoRestart = (options.autoRestart ?? true) && !isExplicitlyStopping;

      if (shouldAutoRestart) {
        clearRestartTimeout();
        restartTimeout = setTimeout(() => {
          if (!isExplicitlyStopping && currentOptions) {
            launchRecognitionInstance(currentOptions);
          }
        }, 80);
      } else {
        options.onEnd?.();
      }
    };

    activeRecognition = recognition;
    recognition.start();
    return true;
  } catch (err: any) {
    cleanupRecognition();
    if (!isExplicitlyStopping && (options.autoRestart ?? true) && currentOptions) {
      clearRestartTimeout();
      restartTimeout = setTimeout(() => {
        if (!isExplicitlyStopping && currentOptions) {
          launchRecognitionInstance(currentOptions);
        }
      }, 250);
      return false;
    }
    options.onError?.('unknown', err);
    return false;
  }
}

/**
 * Starts speech recognition with persistent listening defaults.
 * Automatically halts any prior recognition instance before starting.
 */
export function startListening(options: SpeechRecognitionOptions = {}): boolean {
  if (!isSpeechRecognitionSupported()) {
    console.warn('[speechRecognitionService] SpeechRecognition not supported in this browser.');
    options.onError?.('unknown', { error: 'SpeechRecognition not supported' });
    return false;
  }

  // Enforce microphone hygiene: stop any active instance before initiating a new one
  stopListening();

  isExplicitlyStopping = false;
  currentOptions = options;
  clearRestartTimeout();

  return launchRecognitionInstance(options);
}

/**
 * Stops recognition gracefully, completing any ongoing transcript processing and preventing auto-restart.
 */
export function stopListening(): void {
  isExplicitlyStopping = true;
  currentOptions = null;
  clearRestartTimeout();

  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {
      // Ignore errors when stopping already-inactive recognition
    }
    cleanupRecognition();
  }
}

/**
 * Aborts recognition immediately, discarding uncommitted audio buffers and preventing auto-restart.
 */
export function abortListening(): void {
  isExplicitlyStopping = true;
  currentOptions = null;
  clearRestartTimeout();

  if (activeRecognition) {
    try {
      activeRecognition.abort();
    } catch {
      // Ignore abort errors
    }
    cleanupRecognition();
  }
}

/**
 * Internal cleanup ensuring instance references are dereferenced.
 */
function cleanupRecognition(instanceToClean?: any): void {
  if (!instanceToClean || activeRecognition === instanceToClean) {
    if (activeRecognition) {
      activeRecognition.onstart = null;
      activeRecognition.onresult = null;
      activeRecognition.onerror = null;
      activeRecognition.onend = null;
    }
    activeRecognition = null;
  }
}
