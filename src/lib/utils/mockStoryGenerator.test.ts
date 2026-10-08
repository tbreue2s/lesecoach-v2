import { describe, it, expect } from 'vitest';
import { generateStoryFromConfig } from './mockStoryGenerator';
import { STORY_THEMES } from '../data/storyThemes';
import { tokenizeStory } from './tokenizer';
import type { StoryConfigPayload } from '../types/storyConfig';

describe('Mock Story Generator for 10 Themes (WP04)', () => {
  it('contains exactly 10 distinct predefined themes', () => {
    expect(STORY_THEMES.length).toBe(10);
    const themeIds = STORY_THEMES.map((t) => t.id);
    const uniqueIds = new Set(themeIds);
    expect(uniqueIds.size).toBe(10);
  });

  it('generates a valid, readable story for EACH of the 10 themes', () => {
    for (const theme of STORY_THEMES) {
      const payload: StoryConfigPayload = {
        level: 1,
        childName: 'Emma',
        companion: {
          id: 'dog',
          name: 'Bello',
          type: 'dog',
          icon: '🐶',
        },
        theme,
      };

      const story = generateStoryFromConfig(payload);

      expect(story.id).toBeTruthy();
      expect(story.title).toContain('Emma');
      expect(story.text).toBeTruthy();
      expect(story.text).toContain('Emma');
      expect(story.text).toContain('Bello');
      expect(story.coverEmoji).toBeTruthy();

      // Ensure the generated text can be tokenized cleanly across levels
      const tokens = tokenizeStory(story.text, 1, 'Bello');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      for (const sent of tokens) {
        expect(sent.words.length).toBeGreaterThan(0);
      }
    }
  });

  it('handles stories without a companion gracefully', () => {
    const spaceTheme = STORY_THEMES.find((t) => t.id === 'theme_space')!;
    const payload: StoryConfigPayload = {
      level: 2,
      childName: 'Jonas',
      companion: null,
      theme: spaceTheme,
    };

    const story = generateStoryFromConfig(payload);
    expect(story.title).toContain('Jonas');
    expect(story.text).toContain('Jonas');
    expect(story.text.length).toBeGreaterThan(50);
  });
});
