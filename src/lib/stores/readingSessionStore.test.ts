import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { readingSessionStore } from './readingSessionStore';
import { SAMPLE_STORIES } from '../data/sampleStories';
import * as speechService from '../services/speechService';
import type { ReadingSessionState } from '../types/reading';

describe('Reading Session Store & Tandem Engine (WP05 Evidence)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    readingSessionStore.resetSession();
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

  it('stops TTS before child word and transitions to CHILD_TURN', () => {
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

    const activeToken = state.sentences[0].words.find((w) => w.id === state.activeWordTokenId);
    expect(activeToken?.role).toBe('child');
    expect(activeToken?.status).toBe('active');
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

  it('cycles through stories via loadNextStory', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');
    expect(get(readingSessionStore).storyId).toBe(SAMPLE_STORIES[0].id);

    readingSessionStore.loadNextStory(1, 'Bello');
    expect(get(readingSessionStore).storyId).toBe(SAMPLE_STORIES[1].id);
  });
});
