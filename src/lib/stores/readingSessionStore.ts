import { writable, get } from 'svelte/store';
import type {
  ReadingLevelNumber,
  ReadingSessionState,
  StoryData,
  WordToken,
} from '../types/reading';
import { tokenizeStory, isProtectedName, calculateWordComplexity } from '../utils/tokenizer';
export { isProtectedName, calculateWordComplexity };
import { profileStore } from './profileStore';
import { SAMPLE_STORIES } from '../data/sampleStories';
import { buildSpokenSpans } from '../utils/charMapper';
import {
  playAudioSegment,
  playChildWordReinforcement,
  preloadStoryAudioBuffers,
  pauseAudio as enginePauseAudio,
  resumeAudio as engineResumeAudio,
  stopAudio as engineStopAudio,
} from '../services/audioEngineService';
import {
  startListening,
  stopListening,
} from '../services/speechRecognitionService';
import { validateSpokenWord, matchConsecutiveWords } from '../utils/spokenWordMatcher';
import { playSuccessChime } from '../utils/soundEffects';

// Natural, clear storytelling pace for children without metallic slow-motion artifacts
const SPEECH_RATE = 0.90;

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
  isListening: false,
  lastSpokenTranscript: null,
  micError: null,
  isSuccessFlashingTokenId: null,
  isSessionComplete: false,
  completedSentencesCount: 0,
  starsEarned: 0,
};

let syncTimerInterval: ReturnType<typeof setInterval> | null = null;
let autoAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;
let flashSuccessTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingChildWordTimeout: ReturnType<typeof setTimeout> | null = null;

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

function clearFlashSuccessTimeout() {
  if (flashSuccessTimeout !== null) {
    clearTimeout(flashSuccessTimeout);
    flashSuccessTimeout = null;
  }
}

function clearPendingChildWordTimeout() {
  if (pendingChildWordTimeout !== null) {
    clearTimeout(pendingChildWordTimeout);
    pendingChildWordTimeout = null;
  }
}

function createReadingSessionStore() {
  const store = writable<ReadingSessionState>(initialSessionState);
  const { subscribe, set, update } = store;

  /**
   * Helper: Plays speech for an app segment with real-time hybrid Karaoke Highlighting.
   * Enforces microphone hygiene: stops speech recognition prior to TTS playback.
   */
  function speakAppSegment(tokensToSpeak: WordToken[], onFinished: () => void) {
    if (tokensToSpeak.length === 0) {
      onFinished();
      return;
    }

    clearSyncTimer();
    stopListening(); // Mute mic immediately before TTS to prevent echo feedback

    const { spokenText } = buildSpokenSpans(tokensToSpeak);

    update((state) => ({
      ...state,
      turnState: 'APP_TURN',
      isSpeaking: true,
      isListening: false,
      activeWordTokenId: null,
      karaokeWordTokenId: tokensToSpeak[0]?.id || null,
    }));

    const curState = get(store);
    const curSentence = curState.sentences[curState.activeSentenceIndex];

    playAudioSegment({
      text: spokenText,
      tokens: tokensToSpeak,
      fullSentenceTokens: curSentence?.words ?? tokensToSpeak,
      storyId: curState.storyId,
      sentenceIndex: curState.activeSentenceIndex,
      segmentType: 'app',
      rate: SPEECH_RATE,
      onStart: () => {
        update((state) => ({
          ...state,
          isSpeaking: true,
          karaokeWordTokenId: tokensToSpeak[0]?.id || null,
        }));
      },
      onWordHighlight: (tokenId) => {
        update((s) => {
          if (s.karaokeWordTokenId !== tokenId) {
            return { ...s, karaokeWordTokenId: tokenId };
          }
          return s;
        });
      },
      onEnd: () => {
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
   * Starts Speech-to-Text listening for the child with microphone hygiene & error handling.
   * Supports both individual word reading (e.g. "alter", then "Hut") and continuous fluent reading ("alter Hut").
   */
  function startListeningForChild(_childToken?: WordToken) {
    clearPendingChildWordTimeout();

    startListening({
      lang: 'de-DE',
      interimResults: true,
      onStart: () => {
        update((s) => ({ ...s, isListening: true, micError: null }));
      },
      onResult: (transcript: string) => {
        update((s) => ({ ...s, lastSpokenTranscript: transcript }));

        const curState = get(store);
        const curSentence = curState.sentences[curState.activeSentenceIndex];
        if (!curSentence) return;

        // Current unread child tokens in this sentence
        const unreadChildTokens = curSentence.words.filter(
          (w) => w.role === 'child' && w.status !== 'success'
        );

        if (unreadChildTokens.length === 0) return;

        const consecutiveTargetWords = unreadChildTokens.map((t) => t.cleanWord);
        const match = matchConsecutiveWords(transcript, consecutiveTargetWords);

        if (match.matchedCount > 0) {
          const matched = unreadChildTokens.slice(0, match.matchedCount);
          handleChildWordsSuccess(matched);
        }
      },
      onError: (errorCode) => {
        if (errorCode === 'not-allowed') {
          update((s) => ({
            ...s,
            micError: 'Mikrofonzugriff nicht erlaubt. Bitte erlaube den Mikrofonzugriff im Browser.',
            isListening: false,
          }));
        } else if (errorCode !== 'no-speech' && errorCode !== 'aborted') {
          update((s) => ({
            ...s,
            micError: `Mikrofon-Hinweis: ${errorCode}`,
          }));
        }
      },
      onEnd: () => {
        update((s) => {
          if (s.turnState === 'CHILD_TURN' && !s.isSuccessFlashingTokenId && !s.isSpeaking) {
            return { ...s, isListening: false };
          }
          return s;
        });
      },
    });
  }

  /**
   * Activates child turn listening during CHILD_TURN.
   */
  function startChildTurnListening(childToken: WordToken) {
    engineStopAudio();

    update((s) => ({
      ...s,
      turnState: 'CHILD_TURN',
      activeWordTokenId: childToken.id,
      karaokeWordTokenId: null,
      isSpeaking: false,
      isListening: true,
      micError: null,
      lastSpokenTranscript: null,
      isSuccessFlashingTokenId: null,
    }));

    // Initialize Speech Recognition with de-DE locale
    startListeningForChild(childToken);
  }

  /**
   * Handles successful word recognition for one or multiple child words:
   * - Immediately marks matched words as success and awards stars.
   * - If more child words remain in the sentence: keeps microphone listening without audio interruption.
   * - When all child words of the sentence are complete: mutes microphone and triggers sentence repetition or reinforcement.
   */
  function handleChildWordsSuccess(matchedTokens: WordToken[]) {
    clearPendingChildWordTimeout();
    playSuccessChime();

    const curState = get(store);
    const curSentence = curState.sentences[curState.activeSentenceIndex];
    if (!curSentence) return;

    // Remaining unread child tokens in the sentence AFTER this match
    const remainingChildTokens = curSentence.words.filter(
      (w) =>
        w.role === 'child' &&
        w.status !== 'success' &&
        !matchedTokens.some((m) => m.id === w.id)
    );

    const isTurnComplete = remainingChildTokens.length === 0;

    if (isTurnComplete) {
      stopListening(); // Mute mic immediately when child has finished all words
    }

    const flashId = matchedTokens.map((t) => t.id).join(',');

    // Mark matched tokens as success immediately and update UI
    update((s) => {
      const sentence = s.sentences[s.activeSentenceIndex];
      if (sentence) {
        matchedTokens.forEach((t) => {
          const wordObj = sentence.words.find((w) => w.id === t.id);
          if (wordObj) {
            wordObj.status = 'success';
          }
        });
      }
      return {
        ...s,
        starsEarned: s.starsEarned + matchedTokens.length,
        isListening: !isTurnComplete,
        isSuccessFlashingTokenId: flashId,
        activeWordTokenId: isTurnComplete ? null : remainingChildTokens[0]?.id || null,
      };
    });

    clearFlashSuccessTimeout();
    flashSuccessTimeout = setTimeout(() => {
      update((s) => ({
        ...s,
        isSuccessFlashingTokenId: null,
      }));

      if (!isTurnComplete) {
        // Child still has words to read in this sentence!
        // Keep microphone listening without any audio interruption.
        return;
      }

      // Child has finished ALL child words of this sentence
      const updatedState = get(store);
      const updatedSentence = updatedState.sentences[updatedState.activeSentenceIndex];
      if (!updatedSentence) return;

      const hasUnreadAppWords = updatedSentence.words.some(
        (w) => w.role === 'app' && w.status !== 'success'
      );

      // In Level 3 & Level 4: Full-sentence repeated reading once all words are completed
      if (updatedState.level >= 3 && !hasUnreadAppWords) {
        startRepeatedReading();
      } else if (updatedState.level >= 3 && hasUnreadAppWords) {
        stepTandemEngine();
      } else {
        // Level 1 & Level 2: Narrator speaks child word reinforcement
        const allChildTokens = updatedSentence.words.filter((w) => w.role === 'child');
        const phraseText = allChildTokens.map((t) => t.cleanWord).join(' ');

        update((s) => ({
          ...s,
          isSpeaking: true,
          karaokeWordTokenId: allChildTokens[0]?.id || null,
        }));

        playChildWordReinforcement(
          updatedState.storyId,
          updatedState.activeSentenceIndex,
          phraseText,
          () => {
            update((s) => ({
              ...s,
              isSpeaking: false,
              karaokeWordTokenId: null,
              activeWordTokenId: null,
            }));
            stepTandemEngine();
          }
        );
      }
    }, 280);
  }

  function handleChildWordSuccess(childToken: WordToken) {
    handleChildWordsSuccess([childToken]);
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
      const hasChildWords = currentSentence.words.some((w) => w.role === 'child');
      if (
        (currentSentence.requiresRepeatedReading || (state.level >= 3 && hasChildWords)) &&
        !currentSentence.isCompleted
      ) {
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
      childToken.status = 'active';
      startChildTurnListening(childToken);
    }
  }

  /**
   * Performs full-sentence fluent repeated reading (Phase B / Level 4-6).
   */
  function startRepeatedReading() {
    const curState = get(store);
    const currentSentence = curState.sentences[curState.activeSentenceIndex];
    if (!currentSentence) return;

    clearSyncTimer();
    stopListening(); // Mute mic prior to full sentence TTS

    const { spokenText } = buildSpokenSpans(currentSentence.words);

    update((s) => ({
      ...s,
      turnState: 'REPEATED_READING',
      isSpeaking: true,
      isListening: false,
      activeWordTokenId: null,
      karaokeWordTokenId: currentSentence.words[0]?.id || null,
    }));

    playAudioSegment({
      text: spokenText,
      tokens: currentSentence.words,
      storyId: curState.storyId,
      sentenceIndex: curState.activeSentenceIndex,
      segmentType: 'full',
      rate: SPEECH_RATE,
      onStart: () => {
        update((s) => ({
          ...s,
          isSpeaking: true,
          karaokeWordTokenId: currentSentence.words[0]?.id || null,
        }));
      },
      onWordHighlight: (tokenId) => {
        update((s) => {
          if (s.karaokeWordTokenId !== tokenId) {
            return { ...s, karaokeWordTokenId: tokenId };
          }
          return s;
        });
      },
      onEnd: () => {
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
    stopListening();

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
        isListening: false,
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
      companionName: string = 'Bello',
      childName?: string
    ) => {
      clearSyncTimer();
      clearAutoAdvance();
      clearFlashSuccessTimeout();
      clearPendingChildWordTimeout();
      engineStopAudio();
      stopListening();
      const effectiveChildName = childName ?? get(profileStore)?.childName;
      const sentences = tokenizeStory(
        story.text,
        level,
        companionName,
        effectiveChildName,
        story.structuredOutput
      );

      preloadStoryAudioBuffers(story.id);

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
        isListening: false,
        lastSpokenTranscript: null,
        micError: null,
        isSuccessFlashingTokenId: null,
        isSessionComplete: false,
        completedSentencesCount: 0,
        starsEarned: 0,
      });
    },

    loadNextStory: (
      level: ReadingLevelNumber = 1,
      companionName: string = 'Bello',
      childName?: string
    ) => {
      clearSyncTimer();
      clearAutoAdvance();
      clearFlashSuccessTimeout();
      clearPendingChildWordTimeout();
      engineStopAudio();
      stopListening();
      update((state) => {
        const currentIndex = SAMPLE_STORIES.findIndex((s) => s.id === state.storyId);
        const nextIndex = (currentIndex + 1) % SAMPLE_STORIES.length;
        const nextStory = SAMPLE_STORIES[nextIndex >= 0 ? nextIndex : 0];
        const effectiveChildName = childName ?? get(profileStore)?.childName;
        const sentences = tokenizeStory(
          nextStory.text,
          level,
          companionName,
          effectiveChildName,
          nextStory.structuredOutput
        );

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
          isListening: false,
          lastSpokenTranscript: null,
          micError: null,
          isSuccessFlashingTokenId: null,
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
      stopListening();

      const state = get(store);
      if (state.isSessionComplete || state.sentences.length === 0) return;

      const currentSentence = state.sentences[state.activeSentenceIndex];
      if (!currentSentence) return;

      const activeWord = currentSentence.words.find((w) => w.id === state.activeWordTokenId);
      if (activeWord) {
        handleChildWordSuccess(activeWord);
      } else {
        stepTandemEngine();
      }
    },

    simulateSpokenWord: (spokenWord?: string) => {
      const state = get(store);
      if (state.turnState !== 'CHILD_TURN' || !state.activeWordTokenId) return;

      const currentSentence = state.sentences[state.activeSentenceIndex];
      if (!currentSentence) return;

      const unreadChildTokens = currentSentence.words.filter(
        (w) => w.role === 'child' && w.status !== 'success'
      );
      if (unreadChildTokens.length === 0) return;

      const textToValidate = spokenWord ?? unreadChildTokens[0]?.cleanWord;
      update((s) => ({ ...s, lastSpokenTranscript: textToValidate }));

      const consecutiveTargetWords = unreadChildTokens.map((t) => t.cleanWord);
      const match = matchConsecutiveWords(textToValidate, consecutiveTargetWords);

      if (match.matchedCount > 0) {
        const matched = unreadChildTokens.slice(0, match.matchedCount);
        handleChildWordsSuccess(matched);
      } else {
        const activeWord = currentSentence.words.find((w) => w.id === state.activeWordTokenId);
        if (activeWord) {
          const result = validateSpokenWord(textToValidate, activeWord.cleanWord);
          if (result.isValid) {
            handleChildWordSuccess(activeWord);
          }
        }
      }
    },

    triggerRepeatedReading: () => {
      clearAutoAdvance();
      startRepeatedReading();
    },

    completeCurrentSentence: () => {
      clearSyncTimer();
      clearAutoAdvance();
      engineStopAudio();
      stopListening();
      finishSentence();
    },

    pauseAudio: () => {
      clearSyncTimer();
      clearAutoAdvance();
      enginePauseAudio();
      stopListening();
      update((s) => ({ ...s, turnState: 'PAUSED', isSpeaking: false, isListening: false }));
    },

    resumeAudio: () => {
      clearAutoAdvance();
      engineResumeAudio();
      update((s) => ({ ...s, isSpeaking: true }));
    },

    stopAudio: () => {
      clearSyncTimer();
      clearAutoAdvance();
      engineStopAudio();
      stopListening();
      update((s) => ({
        ...s,
        karaokeWordTokenId: null,
        isSpeaking: false,
        isListening: false,
        turnState: 'IDLE',
      }));
    },

    triggerIntervention: (wordTokenId?: string) => {
      update((state) => {
        const targetId = wordTokenId || state.activeWordTokenId;
        if (!targetId) return state;

        const currentSentence = state.sentences[state.activeSentenceIndex];
        if (currentSentence) {
          const targetToken = currentSentence.words.find((w) => w.id === targetId);
          if (targetToken) {
            targetToken.hasInterventionActive = true;
          }
        }
        return { ...state };
      });
    },

    resetSession: () => {
      clearSyncTimer();
      clearAutoAdvance();
      clearFlashSuccessTimeout();
      clearPendingChildWordTimeout();
      engineStopAudio();
      stopListening();
      set(initialSessionState);
    },
  };
}

export const readingSessionStore = createReadingSessionStore();
