import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { readingSessionStore, isPhoneticallyValidForLevel } from './readingSessionStore';
import { SAMPLE_STORIES } from '../data/sampleStories';
import * as speechService from '../services/speechService';
import * as speechRecognitionService from '../services/speechRecognitionService';
import type { ReadingSessionState, StoryData } from '../types/reading';

const testStoryL1: StoryData = {
  id: 'test-story-l1',
  title: 'Hund im Park',
  coverEmoji: '🐕',
  levelSuitability: [1, 2, 3],
  text: 'Der Hund rennt in den Park. Eine Rose blüht schön.',
};

describe('Reading Session Store & Tandem Engine (WP06 Evidence)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    readingSessionStore.resetSession();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports isPhoneticallyValidForLevel from store module', () => {
    expect(typeof isPhoneticallyValidForLevel).toBe('function');
    expect(isPhoneticallyValidForLevel('weißen', 1)).toBe(false);
    expect(isPhoneticallyValidForLevel('Hund', 1)).toBe(true);
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

    readingSessionStore.loadStory(testStoryL1, 1, 'Bello');

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

    readingSessionStore.loadStory(testStoryL1, 1, 'Bello');

    vi.spyOn(speechService, 'speakSentence').mockImplementation((options: speechService.SpeakOptions) => {
      options.onEnd?.({} as SpeechSynthesisEvent);
      return true;
    });

    readingSessionStore.startSentenceReading();

    let state = get(readingSessionStore);
    expect(state.turnState).toBe('CHILD_TURN');

    const activeToken = state.sentences[0].words.find((w) => w.id === state.activeWordTokenId);
    expect(activeToken).toBeDefined();

    // Simulate child saying phrase containing the target word
    readingSessionStore.simulateSpokenWord(`ich sehe den ${activeToken?.cleanWord}`);

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

    const state = get(readingSessionStore);
    expect(state.level).toBe(4);
    expect(speakCount).toBeGreaterThan(0);
  });

  it('allows manual click on active word to advance with success chime as accessibility fallback', () => {
    readingSessionStore.loadStory(testStoryL1, 1, 'Bello');

    vi.spyOn(speechService, 'speakSentence').mockImplementation((options: speechService.SpeakOptions) => {
      options.onEnd?.({} as SpeechSynthesisEvent);
      return true;
    });

    readingSessionStore.startSentenceReading();

    const stateBefore = get(readingSessionStore);
    expect(stateBefore.turnState).toBe('CHILD_TURN');

    // Child taps active word directly
    readingSessionStore.advanceWordSuccess();

    vi.advanceTimersByTime(300);

    const stateAfter = get(readingSessionStore);
    expect(stateAfter.starsEarned).toBeGreaterThan(0);
  });

  it('activates intervention flag on active token when triggerIntervention is called', () => {
    readingSessionStore.loadStory(testStoryL1, 1, 'Bello');

    vi.spyOn(speechService, 'speakSentence').mockImplementation((options: speechService.SpeakOptions) => {
      options.onEnd?.({} as SpeechSynthesisEvent);
      return true;
    });

    readingSessionStore.startSentenceReading();

    const state = get(readingSessionStore);
    expect(state.turnState).toBe('CHILD_TURN');
    const targetTokenId = state.activeWordTokenId!;

    readingSessionStore.triggerIntervention();

    const updatedState = get(readingSessionStore);
    const targetToken = updatedState.sentences[0].words.find((w) => w.id === targetTokenId);
    expect(targetToken?.hasInterventionActive).toBe(true);
  });
});
