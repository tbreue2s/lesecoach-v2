import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { readingSessionStore, calculateWordComplexity } from './readingSessionStore';
import { SAMPLE_STORIES } from '../data/sampleStories';
import * as speechRecognitionService from '../services/speechRecognitionService';
import type { ReadingSessionState, StoryData } from '../types/reading';

const testStoryL1: StoryData = {
  id: 'test-story-l1',
  title: 'Bus am Tor',
  coverEmoji: '🚌',
  levelSuitability: [1, 2, 3],
  text: 'Der rote Bus hält an dem Tor. Eine Rose blüht schön.',
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

  it('exports calculateWordComplexity from store module', () => {
    expect(typeof calculateWordComplexity).toBe('function');
    expect(calculateWordComplexity('weißen')).toBeGreaterThanOrEqual(10);
    expect(calculateWordComplexity('Hut')).toBe(0);
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
    readingSessionStore.startSentenceReading();

    const state: ReadingSessionState = get(readingSessionStore);
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
    readingSessionStore.startSentenceReading();

    const state = get(readingSessionStore);
    expect(state.level).toBe(4);
  });

  it('allows manual click on active word to advance with success chime as accessibility fallback', () => {
    readingSessionStore.loadStory(testStoryL1, 1, 'Bello');
    readingSessionStore.startSentenceReading();

    const stateBefore = get(readingSessionStore);
    expect(stateBefore.turnState).toBe('CHILD_TURN');

    // Child taps active word directly
    readingSessionStore.advanceWordSuccess();

    vi.advanceTimersByTime(300);

    const stateAfter = get(readingSessionStore);
    expect(stateAfter.starsEarned).toBeGreaterThan(0);
  });

  it('supports word-by-word reading in Level 2 without muting mic until all child words complete', () => {
    const stopListeningSpy = vi.spyOn(speechRecognitionService, 'stopListening');
    vi.spyOn(speechRecognitionService, 'startListening').mockReturnValue(true);

    const testStoryL2: StoryData = {
      id: 'test-story-l2',
      title: 'Level 2 Test',
      coverEmoji: '🌲',
      levelSuitability: [2],
      text: 'Ein leiser Wind weht leise.',
    };

    readingSessionStore.loadStory(testStoryL2, 2, 'Bello');
    readingSessionStore.startSentenceReading();

    let state = get(readingSessionStore);
    expect(state.turnState).toBe('CHILD_TURN');
    stopListeningSpy.mockClear();

    const childWords = state.sentences[0].words.filter((w) => w.role === 'child');
    expect(childWords.length).toBe(2);

    // 1. Read first child word ("leiser")
    readingSessionStore.simulateSpokenWord(childWords[0].cleanWord);

    // Microphone remains OPEN!
    expect(stopListeningSpy).not.toHaveBeenCalled();
    state = get(readingSessionStore);
    expect(state.isListening).toBe(true);
    expect(childWords[0].status).toBe('success');
    expect(childWords[1].status).toBe('pending');
    expect(state.activeWordTokenId).toBe(childWords[1].id);

    // 2. Read second child word ("Wind")
    readingSessionStore.simulateSpokenWord(childWords[1].cleanWord);

    // Now all child words of this sentence are done: mic is muted!
    expect(stopListeningSpy).toHaveBeenCalled();
    state = get(readingSessionStore);
    expect(childWords[1].status).toBe('success');
  });

  it('supports reading consecutive child words in one single breath', () => {
    const stopListeningSpy = vi.spyOn(speechRecognitionService, 'stopListening');
    vi.spyOn(speechRecognitionService, 'startListening').mockReturnValue(true);

    const testStoryL2: StoryData = {
      id: 'test-story-l2-fluent',
      title: 'Level 2 Fluent Test',
      coverEmoji: '🌲',
      levelSuitability: [2],
      text: 'Ein leiser Wind weht leise.',
    };

    readingSessionStore.loadStory(testStoryL2, 2, 'Bello');
    readingSessionStore.startSentenceReading();

    let state = get(readingSessionStore);
    expect(state.turnState).toBe('CHILD_TURN');
    stopListeningSpy.mockClear();

    const childWords = state.sentences[0].words.filter((w) => w.role === 'child');
    expect(childWords.length).toBe(2);

    // Read both words in one breath ("leiser Wind")
    readingSessionStore.simulateSpokenWord(`${childWords[0].cleanWord} ${childWords[1].cleanWord}`);

    // Completed all child words at once!
    expect(stopListeningSpy).toHaveBeenCalled();
    state = get(readingSessionStore);
    expect(childWords[0].status).toBe('success');
    expect(childWords[1].status).toBe('success');
  });

  it('activates intervention flag on active token when triggerIntervention is called', () => {
    readingSessionStore.loadStory(testStoryL1, 1, 'Bello');
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
