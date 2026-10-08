import { writable, get } from 'svelte/store';
import type {
  ReadingLevelNumber,
  ReadingSessionState,
  StoryData,
  WordToken,
} from '../types/reading';
import { tokenizeStory } from '../utils/tokenizer';
import { SAMPLE_STORIES } from '../data/sampleStories';
import {
  buildSpokenSpans,
  mapCharIndexToTokenId,
  calculateTokenTimeEstimates,
  mapElapsedTimeToTokenId,
} from '../utils/charMapper';
import {
  speakSentence,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
} from '../services/speechService';

const SPEECH_RATE = 0.78;

const initialSessionState: ReadingSessionState = {
  storyId: '',
  storyTitle: '',
  level: 1,
  sentences: [],
  activeSentenceIndex: 0,
  activeWordTokenId: null,
  karaokeWordTokenId: null,
  turnState: 'IDLE',
  isSpeaking: false,
  isSessionComplete: false,
  completedSentencesCount: 0,
  starsEarned: 0,
};

let syncTimerInterval: ReturnType<typeof setInterval> | null = null;
let autoAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;

function clearSyncTimer() {
  if (syncTimerInterval !== null) {
    clearInterval(syncTimerInterval);
    syncTimerInterval = null;
  }
}

function clearAutoAdvance() {
  if (autoAdvanceTimeout !== null) {
    clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = null;
  }
}

function createReadingSessionStore() {
  const store = writable<ReadingSessionState>(initialSessionState);
  const { subscribe, set, update } = store;

  /**
   * Helper: Plays speech for an app segment with real-time hybrid Karaoke Highlighting.
   * Highlighting begins strictly when the audio actually starts (via onStart).
   */
  function speakAppSegment(tokensToSpeak: WordToken[], onFinished: () => void) {
    if (tokensToSpeak.length === 0) {
      onFinished();
      return;
    }

    clearSyncTimer();

    const { spokenText, spans } = buildSpokenSpans(tokensToSpeak);
    const { estimates } = calculateTokenTimeEstimates(tokensToSpeak, SPEECH_RATE);

    update((state) => ({
      ...state,
      turnState: 'APP_TURN',
      isSpeaking: true,
      activeWordTokenId: null,
      karaokeWordTokenId: null, // Will be set on actual audio start
    }));

    let startTime = 0;
    let started = false;

    const startTimer = () => {
      if (started) return;
      started = true;
      startTime = Date.now();

      update((state) => ({
        ...state,
        karaokeWordTokenId: tokensToSpeak[0].id,
      }));

      syncTimerInterval = setInterval(() => {
        const elapsedMs = Date.now() - startTime;
        const currentTokenId = mapElapsedTimeToTokenId(elapsedMs, estimates);
        if (currentTokenId) {
          update((s) => {
            if (s.karaokeWordTokenId !== currentTokenId) {
              return { ...s, karaokeWordTokenId: currentTokenId };
            }
            return s;
          });
        }
      }, 20);
    };

    // Safety fallback: if onStart takes longer than 150ms in non-standard environments
    const startFallbackTimeout = setTimeout(() => {
      startTimer();
    }, 150);

    speakSentence({
      text: spokenText,
      rate: SPEECH_RATE,
      onStart: () => {
        clearTimeout(startFallbackTimeout);
        startTimer();
      },
      onBoundary: (event) => {
        if (!started) {
          clearTimeout(startFallbackTimeout);
          startTimer();
        }
        const tokenId = mapCharIndexToTokenId(event.charIndex, spans);
        if (tokenId) {
          const matchingEst = estimates.find((e) => e.tokenId === tokenId);
          if (matchingEst) {
            startTime = Date.now() - matchingEst.startMs;
          }
          update((state) => ({
            ...state,
            karaokeWordTokenId: tokenId,
          }));
        }
      },
      onEnd: () => {
        clearTimeout(startFallbackTimeout);
        clearSyncTimer();
        update((state) => {
          const currentSentence = state.sentences[state.activeSentenceIndex];
          if (currentSentence) {
            tokensToSpeak.forEach((t) => {
              const wordObj = currentSentence.words.find((w) => w.id === t.id);
              if (wordObj) {
                wordObj.status = 'success';
              }
            });
          }
          return {
            ...state,
            karaokeWordTokenId: null,
            isSpeaking: false,
          };
        });
        onFinished();
      },
      onError: () => {
        clearTimeout(startFallbackTimeout);
        clearSyncTimer();
        update((state) => {
          const currentSentence = state.sentences[state.activeSentenceIndex];
          if (currentSentence) {
            tokensToSpeak.forEach((t) => {
              const wordObj = currentSentence.words.find((w) => w.id === t.id);
              if (wordObj) {
                wordObj.status = 'success';
              }
            });
          }
          return {
            ...state,
            karaokeWordTokenId: null,
            isSpeaking: false,
          };
        });
        onFinished();
      },
    });
  }

  /**
   * Tandem Orchestrator: Reads next chunk, stops before child word, or advances to next sentence.
   */
  function stepTandemEngine() {
    const state = get(store);
    if (state.isSessionComplete || state.sentences.length === 0) return;

    const currentSentence = state.sentences[state.activeSentenceIndex];
    if (!currentSentence) return;

    // Find all unread tokens in the current sentence
    const unreadTokens = currentSentence.words.filter((w) => w.status !== 'success');

    if (unreadTokens.length === 0) {
      if (currentSentence.requiresRepeatedReading && !currentSentence.isCompleted) {
        startRepeatedReading();
      } else {
        finishSentence();
        const nextState = get(store);
        if (!nextState.isSessionComplete) {
          clearAutoAdvance();
          autoAdvanceTimeout = setTimeout(() => {
            stepTandemEngine();
          }, 350);
        }
      }
      return;
    }

    const firstChildIndex = unreadTokens.findIndex((w) => w.role === 'child');

    if (firstChildIndex === -1) {
      speakAppSegment(unreadTokens, () => {
        stepTandemEngine();
      });
    } else if (firstChildIndex > 0) {
      const appSegment = unreadTokens.slice(0, firstChildIndex);
      speakAppSegment(appSegment, () => {
        stepTandemEngine();
      });
    } else {
      const childToken = unreadTokens[0];
      update((s) => {
        childToken.status = 'active';
        return {
          ...s,
          turnState: 'CHILD_TURN',
          activeWordTokenId: childToken.id,
          karaokeWordTokenId: null,
          isSpeaking: false,
        };
      });
    }
  }

  /**
   * Performs full-sentence fluent repeated reading (Phase B / Level 4-6).
   */
  function startRepeatedReading() {
    const state = get(store);
    const currentSentence = state.sentences[state.activeSentenceIndex];
    if (!currentSentence) return;

    clearSyncTimer();

    const { spokenText, spans } = buildSpokenSpans(currentSentence.words);
    const { estimates } = calculateTokenTimeEstimates(currentSentence.words, SPEECH_RATE);

    update((s) => ({
      ...s,
      turnState: 'REPEATED_READING',
      isSpeaking: true,
      activeWordTokenId: null,
      karaokeWordTokenId: null,
    }));

    let startTime = 0;
    let started = false;

    const startTimer = () => {
      if (started) return;
      started = true;
      startTime = Date.now();

      update((s) => ({
        ...s,
        karaokeWordTokenId: currentSentence.words[0]?.id || null,
      }));

      syncTimerInterval = setInterval(() => {
        const elapsedMs = Date.now() - startTime;
        const currentTokenId = mapElapsedTimeToTokenId(elapsedMs, estimates);
        if (currentTokenId) {
          update((s) => {
            if (s.karaokeWordTokenId !== currentTokenId) {
              return { ...s, karaokeWordTokenId: currentTokenId };
            }
            return s;
          });
        }
      }, 20);
    };

    const startFallbackTimeout = setTimeout(() => {
      startTimer();
    }, 150);

    speakSentence({
      text: spokenText,
      rate: SPEECH_RATE,
      onStart: () => {
        clearTimeout(startFallbackTimeout);
        startTimer();
      },
      onBoundary: (event) => {
        if (!started) {
          clearTimeout(startFallbackTimeout);
          startTimer();
        }
        const tokenId = mapCharIndexToTokenId(event.charIndex, spans);
        if (tokenId) {
          const matchingEst = estimates.find((e) => e.tokenId === tokenId);
          if (matchingEst) {
            startTime = Date.now() - matchingEst.startMs;
          }
          update((s) => ({
            ...s,
            karaokeWordTokenId: tokenId,
          }));
        }
      },
      onEnd: () => {
        clearTimeout(startFallbackTimeout);
        clearSyncTimer();
        update((s) => ({
          ...s,
          karaokeWordTokenId: null,
          isSpeaking: false,
        }));
        finishSentence();
        const nextState = get(store);
        if (!nextState.isSessionComplete) {
          clearAutoAdvance();
          autoAdvanceTimeout = setTimeout(() => {
            stepTandemEngine();
          }, 350);
        }
      },
      onError: () => {
        clearTimeout(startFallbackTimeout);
        clearSyncTimer();
        update((s) => ({
          ...s,
          karaokeWordTokenId: null,
          isSpeaking: false,
        }));
        finishSentence();
        const nextState = get(store);
        if (!nextState.isSessionComplete) {
          clearAutoAdvance();
          autoAdvanceTimeout = setTimeout(() => {
            stepTandemEngine();
          }, 350);
        }
      },
    });
  }

  /**
   * Finalizes completion of the current sentence and advances to the next sentence.
   */
  function finishSentence() {
    clearSyncTimer();
    update((state) => {
      if (state.sentences.length === 0) return state;

      const currentSentence = state.sentences[state.activeSentenceIndex];
      if (currentSentence) {
        currentSentence.words.forEach((w) => {
          if (w.role === 'child') {
            w.status = 'success';
          }
        });
        currentSentence.isCompleted = true;
      }

      const nextIndex = state.activeSentenceIndex + 1;
      const isFinished = nextIndex >= state.sentences.length;

      return {
        ...state,
        activeSentenceIndex: isFinished ? state.activeSentenceIndex : nextIndex,
        activeWordTokenId: null,
        karaokeWordTokenId: null,
        turnState: isFinished ? 'COMPLETED' : 'IDLE',
        isSpeaking: false,
        isSessionComplete: isFinished,
        completedSentencesCount: state.completedSentencesCount + 1,
        starsEarned: state.starsEarned + 2,
      };
    });
  }

  return {
    subscribe,

    loadStory: (
      story: StoryData = SAMPLE_STORIES[0],
      level: ReadingLevelNumber = 1,
      companionName: string = 'Bello'
    ) => {
      clearSyncTimer();
      clearAutoAdvance();
      stopSpeech();
      const sentences = tokenizeStory(story.text, level, companionName);

      set({
        storyId: story.id,
        storyTitle: story.title,
        level,
        sentences,
        activeSentenceIndex: 0,
        activeWordTokenId: null,
        karaokeWordTokenId: null,
        turnState: 'IDLE',
        isSpeaking: false,
        isSessionComplete: false,
        completedSentencesCount: 0,
        starsEarned: 0,
      });
    },

    loadNextStory: (
      level: ReadingLevelNumber = 1,
      companionName: string = 'Bello'
    ) => {
      clearSyncTimer();
      clearAutoAdvance();
      stopSpeech();
      update((state) => {
        const currentIndex = SAMPLE_STORIES.findIndex((s) => s.id === state.storyId);
        const nextIndex = (currentIndex + 1) % SAMPLE_STORIES.length;
        const nextStory = SAMPLE_STORIES[nextIndex >= 0 ? nextIndex : 0];
        const sentences = tokenizeStory(nextStory.text, level, companionName);

        return {
          storyId: nextStory.id,
          storyTitle: nextStory.title,
          level,
          sentences,
          activeSentenceIndex: 0,
          activeWordTokenId: null,
          karaokeWordTokenId: null,
          turnState: 'IDLE',
          isSpeaking: false,
          isSessionComplete: false,
          completedSentencesCount: 0,
          starsEarned: 0,
        };
      });
    },

    startSentenceReading: () => {
      clearAutoAdvance();
      stepTandemEngine();
    },

    advanceWordSuccess: () => {
      clearAutoAdvance();
      const state = get(store);
      if (state.isSessionComplete || state.sentences.length === 0) return;

      const currentSentence = state.sentences[state.activeSentenceIndex];
      if (!currentSentence) return;

      const activeWord = currentSentence.words.find((w) => w.id === state.activeWordTokenId);
      if (activeWord) {
        activeWord.status = 'success';
      }

      update((s) => ({
        ...s,
        starsEarned: s.starsEarned + 1,
        activeWordTokenId: null,
      }));

      stepTandemEngine();
    },

    triggerRepeatedReading: () => {
      clearAutoAdvance();
      startRepeatedReading();
    },

    completeCurrentSentence: () => {
      clearSyncTimer();
      clearAutoAdvance();
      stopSpeech();
      finishSentence();
    },

    pauseAudio: () => {
      clearSyncTimer();
      clearAutoAdvance();
      pauseSpeech();
      update((s) => ({ ...s, turnState: 'PAUSED', isSpeaking: false }));
    },

    resumeAudio: () => {
      clearAutoAdvance();
      resumeSpeech();
      update((s) => ({ ...s, isSpeaking: true }));
    },

    stopAudio: () => {
      clearSyncTimer();
      clearAutoAdvance();
      stopSpeech();
      update((s) => ({
        ...s,
        karaokeWordTokenId: null,
        isSpeaking: false,
        turnState: 'IDLE',
      }));
    },

    resetSession: () => {
      clearSyncTimer();
      clearAutoAdvance();
      stopSpeech();
      set(initialSessionState);
    },
  };
}

export const readingSessionStore = createReadingSessionStore();
