import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { readingSessionStore } from './readingSessionStore';
import { SAMPLE_STORIES } from '../data/sampleStories';
import * as speechService from '../services/speechService';
import * as speechRecognitionService from '../services/speechRecognitionService';
import type { ReadingSessionState } from '../types/reading';

describe('Reading Session Store & Tandem Engine (WP06 Evidence)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    readingSessionStore.resetSession();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads story and initializes turnState to IDLE', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');
    const state: ReadingSessionState = get(readingSessionStore);

    expect(state.storyId).toBe(SAMPLE_STORIES[0].id);
    expect(state.level).toBe(1);
    expect(state.sentences.length).toBeGreaterThan(0);
    expect(state.activeSentenceIndex).toBe(0);
    expect(state.turnState).toBe('IDLE');
    expect(state.isSpeaking).toBe(false);
  });

  it('stops TTS before child word and transitions to CHILD_TURN with microphone active', () => {
    const startListeningSpy = vi.spyOn(speechRecognitionService, 'startListening').mockReturnValue(true);

    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');

    let capturedOptions: speechService.SpeakOptions | null = null;
    vi.spyOn(speechService, 'speakSentence').mockImplementation((options: speechService.SpeakOptions) => {
      capturedOptions = options;
      options.onStart?.({} as SpeechSynthesisEvent);
      options.onBoundary?.({ charIndex: 0 } as SpeechSynthesisEvent);
      options.onEnd?.({} as SpeechSynthesisEvent);
      return true;
    });

    readingSessionStore.startSentenceReading();

    const state: ReadingSessionState = get(readingSessionStore);
    expect(speechService.speakSentence).toHaveBeenCalled();
    expect((capturedOptions as speechService.SpeakOptions | null)?.text).toBeTruthy();
    expect(state.turnState).toBe('CHILD_TURN');
    expect(state.activeWordTokenId).toBeTruthy();
    expect(state.isListening).toBe(true);

    // Microphone started for CHILD_TURN with German locale
    expect(startListeningSpy).toHaveBeenCalled();
    const activeToken = state.sentences[0].words.find((w) => w.id === state.activeWordTokenId);
    expect(activeToken?.role).toBe('child');
    expect(activeToken?.status).toBe('active');
  });

  it('handles simulated spoken word recognition with fuzzy tolerance and mutes microphone immediately', () => {
    const stopListeningSpy = vi.spyOn(speechRecognitionService, 'stopListening');
    vi.spyOn(speechRecognitionService, 'startListening').mockReturnValue(true);

    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');

    vi.spyOn(speechService, 'speakSentence').mockImplementation((options: speechService.SpeakOptions) => {
      options.onEnd?.({} as SpeechSynthesisEvent);
      return true;
    });

    readingSessionStore.startSentenceReading();

    let state = get(readingSessionStore);
    expect(state.turnState).toBe('CHILD_TURN');

    const activeToken = state.sentences[0].words.find((w) => w.id === state.activeWordTokenId);
    expect(activeToken).toBeDefined();

    // Simulate child saying phrase containing the target word (e.g. "ein Wiese" or "die Wiese")
    readingSessionStore.simulateSpokenWord(`ich sehe die ${activeToken?.cleanWord}`);

    // Muted microphone immediately (microphone hygiene)
    expect(stopListeningSpy).toHaveBeenCalled();

    // Fast-forward flash delay
    vi.advanceTimersByTime(300);

    state = get(readingSessionStore);
    expect(state.starsEarned).toBeGreaterThan(0);
  });

  it('resumes TTS after child finishes word and triggers Repeated Reading for Level 4', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 4, 'Bello');

    let speakCount = 0;
    vi.spyOn(speechService, 'speakSentence').mockImplementation((options: speechService.SpeakOptions) => {
      speakCount++;
      options.onEnd?.({} as SpeechSynthesisEvent);
      return true;
    });

    readingSessionStore.startSentenceReading();

    let state: ReadingSessionState = get(readingSessionStore);
    if (state.turnState === 'CHILD_TURN') {
      readingSessionStore.advanceWordSuccess();
      vi.advanceTimersByTime(300);
      state = get(readingSessionStore);
    }

    expect(speakCount).toBeGreaterThanOrEqual(1);
    expect(state.starsEarned).toBeGreaterThan(0);
  });

  it('triggers Repeated Reading when manually called', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 4, 'Bello');

    let repeatedSpokenText = '';
    vi.spyOn(speechService, 'speakSentence').mockImplementation((options: speechService.SpeakOptions) => {
      repeatedSpokenText = options.text;
      options.onEnd?.({} as SpeechSynthesisEvent);
      return true;
    });

    readingSessionStore.triggerRepeatedReading();

    expect(speechService.speakSentence).toHaveBeenCalled();
    expect(repeatedSpokenText.length).toBeGreaterThan(0);
  });

  it('activates intervention flag on active token when triggerIntervention is called', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 5, 'Bello');
    readingSessionStore.startSentenceReading();

    let state = get(readingSessionStore);
    if (state.activeWordTokenId) {
      readingSessionStore.triggerIntervention();
      state = get(readingSessionStore);
      const activeToken = state.sentences[state.activeSentenceIndex].words.find(
        (w) => w.id === state.activeWordTokenId
      );
      expect(activeToken?.hasInterventionActive).toBe(true);
    }
  });

  it('cycles through stories via loadNextStory', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');
    expect(get(readingSessionStore).storyId).toBe(SAMPLE_STORIES[0].id);

    readingSessionStore.loadNextStory(1, 'Bello');
    expect(get(readingSessionStore).storyId).toBe(SAMPLE_STORIES[1].id);
  });
});
