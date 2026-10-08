import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { readingSessionStore } from './readingSessionStore';
import { SAMPLE_STORIES } from '../data/sampleStories';

describe('Reading Session Store (WP03)', () => {
  beforeEach(() => {
    readingSessionStore.resetSession();
  });

  it('loads story and activates the first child token', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');
    const state = get(readingSessionStore);

    expect(state.storyId).toBe(SAMPLE_STORIES[0].id);
    expect(state.level).toBe(1);
    expect(state.sentences.length).toBeGreaterThan(0);
    expect(state.activeSentenceIndex).toBe(0);
    expect(state.activeWordTokenId).toBeTruthy();

    const activeWord = state.sentences[0].words.find((w) => w.id === state.activeWordTokenId);
    expect(activeWord?.status).toBe('active');
    expect(activeWord?.role).toBe('child');
  });

  it('advances word success and awards stars', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');

    let state = get(readingSessionStore);
    expect(state.activeWordTokenId).toBeTruthy();

    readingSessionStore.advanceWordSuccess();
    state = get(readingSessionStore);

    // In Level 1 (1 word per sentence), completing that word completes the sentence and advances sentence index
    expect(state.sentences[0].isCompleted).toBe(true);
    expect(state.completedSentencesCount).toBe(1);
    expect(state.activeSentenceIndex).toBe(1);
    expect(state.starsEarned).toBeGreaterThan(0);
  });

  it('cycles through stories via loadNextStory', () => {
    readingSessionStore.loadStory(SAMPLE_STORIES[0], 1, 'Bello');
    expect(get(readingSessionStore).storyId).toBe(SAMPLE_STORIES[0].id);

    readingSessionStore.loadNextStory(1, 'Bello');
    expect(get(readingSessionStore).storyId).toBe(SAMPLE_STORIES[1].id);
  });
});
