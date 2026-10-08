export type ReadingPhaseId = 'phase_a' | 'phase_b' | 'phase_c';

export type ReadingLevelNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type TokenRole = 'app' | 'child';

export type TokenStatus = 'pending' | 'active' | 'success';

export interface ReadingPhase {
  id: ReadingPhaseId;
  title: string;
  subtitle: string;
  badgeEmoji: string;
  levels: ReadingLevelNumber[];
  defaultSyllableColoring: boolean;
}

export type SentenceDistribution =
  | 'target_word'
  | 'word_pair'
  | 'half_sentence'
  | 'every_3rd_sentence'
  | 'alternating'
  | 'full_child';

export interface ReadingLevelConstraints {
  maxWordsPerSentenceChild: number;
  maxSyllablesPerWord: number;
  maxCombinedSyllablesChild?: number;
  allowComplexClusters: boolean;
  sentenceDistribution: SentenceDistribution;
  requiresRepeatedReading: boolean;
  totalStoryWordsMin?: number;
  totalStoryWordsMax?: number;
  totalSentencesMax?: number;
}

export interface ReadingLevelInfo {
  level: ReadingLevelNumber;
  phaseId: ReadingPhaseId;
  title: string;
  description: string;
  constraints: ReadingLevelConstraints;
  targetChildWordsPerSentence?: number;
  isRepeatedReadingEnabled: boolean;
}

export interface WordToken {
  id: string;
  word: string;
  cleanWord: string;
  syllables: string[];
  role: TokenRole;
  status: TokenStatus;
  sentenceIndex: number;
  wordIndexInSentence: number;
  hasInterventionActive?: boolean;
}

export interface SentenceToken {
  id: string;
  sentenceIndex: number;
  rawText: string;
  words: WordToken[];
  role: 'app' | 'child' | 'mixed';
  requiresRepeatedReading: boolean;
  isCompleted: boolean;
}

export interface StoryData {
  id: string;
  title: string;
  coverEmoji: string;
  levelSuitability: ReadingLevelNumber[];
  text: string;
}

export type TurnState =
  | 'IDLE'
  | 'APP_TURN'
  | 'CHILD_TURN'
  | 'REPEATED_READING'
  | 'PAUSED'
  | 'COMPLETED';

export interface ReadingSessionState {
  storyId: string;
  storyTitle: string;
  level: ReadingLevelNumber;
  sentences: SentenceToken[];
  activeSentenceIndex: number;
  activeWordTokenId: string | null;
  karaokeWordTokenId: string | null;
  turnState: TurnState;
  isSpeaking: boolean;
  isListening: boolean;
  lastSpokenTranscript: string | null;
  micError: string | null;
  isSuccessFlashingTokenId: string | null;
  isSessionComplete: boolean;
  completedSentencesCount: number;
  starsEarned: number;
}
