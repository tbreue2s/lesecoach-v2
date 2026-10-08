import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSpeechRecognitionSupported,
  startListening,
  stopListening,
  abortListening,
  isListening,
} from './speechRecognitionService';

describe('SpeechRecognitionService (WP06 Evidence: Microphone Hygiene & Handling)', () => {
  let mockRecognitionInstance: any;
  let MockSpeechRecognition: any;

  beforeEach(() => {
    mockRecognitionInstance = {
      lang: '',
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null,
    };

    MockSpeechRecognition = vi.fn().mockImplementation(() => mockRecognitionInstance);
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = undefined;
  });

  afterEach(() => {
    stopListening();
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    vi.clearAllMocks();
  });

  it('detects SpeechRecognition availability correctly', () => {
    expect(isSpeechRecognitionSupported()).toBe(true);
    delete (window as any).SpeechRecognition;
    expect(isSpeechRecognitionSupported()).toBe(false);
  });

  it('initializes SpeechRecognition strictly with de-DE locale and starts listening', () => {
    const onStart = vi.fn();
    const success = startListening({ onStart });

    expect(success).toBe(true);
    expect(mockRecognitionInstance.lang).toBe('de-DE');
    expect(mockRecognitionInstance.interimResults).toBe(true);
    expect(mockRecognitionInstance.start).toHaveBeenCalledOnce();
    expect(isListening()).toBe(true);

    mockRecognitionInstance.onstart();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('delivers parsed transcripts via onResult', () => {
    const onResult = vi.fn();
    startListening({ onResult });

    const mockEvent = {
      results: [
        Object.assign([{ transcript: '  ein Hund  ' }], { isFinal: true }),
      ],
    };

    mockRecognitionInstance.onresult(mockEvent);
    expect(onResult).toHaveBeenCalledWith('ein Hund', true);
  });

  it('gracefully handles recognition errors (e.g. not-allowed / no-speech)', () => {
    const onError = vi.fn();
    startListening({ onError });

    mockRecognitionInstance.onerror({ error: 'not-allowed' });
    expect(onError).toHaveBeenCalledWith('not-allowed', { error: 'not-allowed' });
  });

  it('ensures clean microphone stream termination and stops active instance', () => {
    startListening();
    expect(isListening()).toBe(true);

    stopListening();
    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    expect(isListening()).toBe(false);
  });

  it('ensures abortListening terminates and discards instance', () => {
    startListening();
    expect(isListening()).toBe(true);

    abortListening();
    expect(mockRecognitionInstance.abort).toHaveBeenCalled();
    expect(isListening()).toBe(false);
  });

  it('automatically halts prior recognition instance when startListening is called again', () => {
    startListening();
    const firstInstance = mockRecognitionInstance;

    startListening();
    expect(firstInstance.stop).toHaveBeenCalled();
  });

  it('auto-restarts listening when browser triggers onend due to silence timeout', () => {
    vi.useFakeTimers();
    startListening();
    expect(MockSpeechRecognition).toHaveBeenCalledTimes(1);

    // Browser fires onend due to silence
    mockRecognitionInstance.onend();

    // Advance debounce timer
    vi.advanceTimersByTime(100);

    // Automatically re-armed a new recognition instance
    expect(MockSpeechRecognition).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
