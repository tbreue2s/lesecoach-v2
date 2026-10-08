import { writable } from 'svelte/store';
import type {
  ReadingLevelNumber,
  ReadingSessionState,
  SentenceToken,
  StoryData,
} from '../types/reading';
import { tokenizeStory } from '../utils/tokenizer';
import { SAMPLE_STORIES } from '../data/sampleStories';

const initialSessionState: ReadingSessionState = {
  storyId: '',
  storyTitle: '',
  level: 1,
  sentences: [],
  activeSentenceIndex: 0,
  activeWordTokenId: null,
  isSessionComplete: false,
  completedSentencesCount: 0,
  starsEarned: 0,
};

function activateFirstChildToken(sentences: SentenceToken[], sentenceIndex: number): string | null {
  if (!sentences[sentenceIndex]) return null;
  const sentence = sentences[sentenceIndex];
  const targetToken = sentence.words.find((w) => w.role === 'child' && w.status !== 'success')
    || sentence.words[0];

  if (targetToken) {
    targetToken.status = 'active';
    return targetToken.id;
  }
  return null;
}

function createReadingSessionStore() {
  const { subscribe, set, update } = writable<ReadingSessionState>(initialSessionState);

  return {
    subscribe,

    loadStory: (
      story: StoryData = SAMPLE_STORIES[0],
      level: ReadingLevelNumber = 1,
      companionName: string = 'Bello'
    ) => {
      const sentences = tokenizeStory(story.text, level, companionName);
      const activeWordId = activateFirstChildToken(sentences, 0);

      set({
        storyId: story.id,
        storyTitle: story.title,
        level,
        sentences,
        activeSentenceIndex: 0,
        activeWordTokenId: activeWordId,
        isSessionComplete: false,
        completedSentencesCount: 0,
        starsEarned: 0,
      });
    },

    loadNextStory: (
      level: ReadingLevelNumber = 1,
      companionName: string = 'Bello'
    ) => {
      update((state) => {
        const currentIndex = SAMPLE_STORIES.findIndex((s) => s.id === state.storyId);
        const nextIndex = (currentIndex + 1) % SAMPLE_STORIES.length;
        const nextStory = SAMPLE_STORIES[nextIndex >= 0 ? nextIndex : 0];
        const sentences = tokenizeStory(nextStory.text, level, companionName);
        const activeWordId = activateFirstChildToken(sentences, 0);

        return {
          storyId: nextStory.id,
          storyTitle: nextStory.title,
          level,
          sentences,
          activeSentenceIndex: 0,
          activeWordTokenId: activeWordId,
          isSessionComplete: false,
          completedSentencesCount: 0,
          starsEarned: 0,
        };
      });
    },

    advanceWordSuccess: () => {
      update((state) => {
        if (state.isSessionComplete || state.sentences.length === 0) return state;

        const currentSentence = state.sentences[state.activeSentenceIndex];
        if (!currentSentence) return state;

        // Find active word
        const activeWord = currentSentence.words.find((w) => w.id === state.activeWordTokenId);
        if (activeWord) {
          activeWord.status = 'success';
        }

        // Find next pending child word in current sentence
        const nextPendingChild = currentSentence.words.find(
          (w) => w.role === 'child' && w.status === 'pending'
        );

        if (nextPendingChild) {
          nextPendingChild.status = 'active';
          return {
            ...state,
            activeWordTokenId: nextPendingChild.id,
            starsEarned: state.starsEarned + 1,
          };
        } else {
          // All child words in sentence done -> sentence completed
          currentSentence.isCompleted = true;
          const nextSentenceIndex = state.activeSentenceIndex + 1;
          const isFinished = nextSentenceIndex >= state.sentences.length;

          let nextActiveTokenId: string | null = null;
          if (!isFinished) {
            nextActiveTokenId = activateFirstChildToken(state.sentences, nextSentenceIndex);
          }

          return {
            ...state,
            activeSentenceIndex: isFinished ? state.activeSentenceIndex : nextSentenceIndex,
            activeWordTokenId: nextActiveTokenId,
            isSessionComplete: isFinished,
            completedSentencesCount: state.completedSentencesCount + 1,
            starsEarned: state.starsEarned + 2, // Bonus star for sentence
          };
        }
      });
    },

    completeCurrentSentence: () => {
      update((state) => {
        if (state.isSessionComplete || state.sentences.length === 0) return state;

        const currentSentence = state.sentences[state.activeSentenceIndex];
        if (!currentSentence) return state;

        // Mark all words in sentence as success
        currentSentence.words.forEach((w) => {
          w.status = 'success';
        });
        currentSentence.isCompleted = true;

        const nextSentenceIndex = state.activeSentenceIndex + 1;
        const isFinished = nextSentenceIndex >= state.sentences.length;

        let nextActiveTokenId: string | null = null;
        if (!isFinished) {
          nextActiveTokenId = activateFirstChildToken(state.sentences, nextSentenceIndex);
        }

        return {
          ...state,
          activeSentenceIndex: isFinished ? state.activeSentenceIndex : nextSentenceIndex,
          activeWordTokenId: nextActiveTokenId,
          isSessionComplete: isFinished,
          completedSentencesCount: state.completedSentencesCount + 1,
          starsEarned: state.starsEarned + 3,
        };
      });
    },

    resetSession: () => {
      set(initialSessionState);
    },
  };
}

export const readingSessionStore = createReadingSessionStore();
