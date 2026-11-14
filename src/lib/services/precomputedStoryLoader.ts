import type { StoryData, ReadingLevelNumber } from '../types/reading';
import type { StoryTheme } from '../types/storyConfig';

// Eagerly load all JSON stories from the stories directory
const storyModules = import.meta.glob('../data/stories/**/*.json', { eager: true }) as Record<
  string,
  { default?: any; [key: string]: any }
>;

/**
 * Loads a precomputed JSON story for a given theme, level, and optional episode.
 * Returns null if no precomputed story is found.
 */
export function loadPrecomputedStory(
  themeId: string,
  level: ReadingLevelNumber,
  theme: StoryTheme,
  episode: number = 1,
  childName?: string
): StoryData | null {
  const suffix = `level-${level}/${themeId}_ep${String(episode).padStart(2, '0')}.json`;
  const matchingKey = Object.keys(storyModules).find((key) => key.endsWith(suffix));

  if (!matchingKey) {
    const prefix = `level-${level}/${themeId}_`;
    const fallbackKey = Object.keys(storyModules).find((key) => key.includes(prefix));
    if (!fallbackKey) return null;
    const json = storyModules[fallbackKey]?.default || storyModules[fallbackKey];
    return convertJsonToStoryData(json, theme, childName);
  }

  const json = storyModules[matchingKey]?.default || storyModules[matchingKey];
  return convertJsonToStoryData(json, theme, childName);
}

function convertJsonToStoryData(json: any, theme: StoryTheme, childName?: string): StoryData {
  const sentencesText = json.sentences?.map((s: any) => s.text).join('\n') || '';
  const baseTitle = json.title || 'Abenteuer-Geschichte';
  const title = childName ? `${childName}: ${baseTitle}` : baseTitle;
  return {
    id: `story-${json.themeId}-lvl${json.level}-ep${json.episode || 1}`,
    title,
    coverEmoji: theme.defaultCoverEmoji || '📖',
    levelSuitability: [json.level as ReadingLevelNumber],
    text: sentencesText,
    structuredOutput: {
      sentences: json.sentences?.map((s: any) => ({
        text: s.text,
        words: s.words?.map((w: any) => ({
          clean: w.clean,
          syllables: w.syllables,
          role: w.role,
        })) || [],
      })) || [],
    },
  };
}
