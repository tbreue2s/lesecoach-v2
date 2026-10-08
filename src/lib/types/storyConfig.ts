import type { ReadingLevelNumber, StoryData } from './reading';

export interface StoryTheme {
  id: string;
  label: string;
  icon: string;
  description: string;
  defaultCoverEmoji: string;
}

export interface StoryCompanionPayload {
  id: string;
  name: string;
  type: string;
  icon: string;
}

export interface StoryConfigPayload {
  level: ReadingLevelNumber;
  childName: string;
  companion: StoryCompanionPayload | null;
  theme: StoryTheme;
}

export interface StoryConfigState {
  selectedThemeId: string;
  selectedLevel: ReadingLevelNumber;
  includeCompanion: boolean;
  generatedPayload: StoryConfigPayload | null;
  activeStory: StoryData | null;
}
