import { describe, it, expect } from 'vitest';
import { storyGeneratorService } from './storyGeneratorService';
import { STORY_THEMES } from '../data/storyThemes';
import type { StoryConfigPayload } from '../types/storyConfig';

describe('StoryGeneratorService (WP08)', () => {
  it('creates prompt via createPrompt', () => {
    const prompt = storyGeneratorService.createPrompt({
      level: 1,
      theme: STORY_THEMES[0],
      childName: 'Emil',
      companionName: 'Bello',
    });

    expect(prompt).toContain('Lese-Stufe 1');
    expect(prompt).toContain('Emil');
    expect(prompt).toContain('Bello');
  });

  it('generates mock story synchronously and asynchronously with identical output', async () => {
    const payload: StoryConfigPayload = {
      level: 2,
      childName: 'Lea',
      companion: {
        id: 'cat',
        name: 'Minka',
        type: 'cat',
        icon: '🐱',
      },
      theme: STORY_THEMES[1],
    };

    const mockStory = storyGeneratorService.generateMockStory(payload);
    const asyncStory = await storyGeneratorService.generateStory(payload);

    expect(mockStory.title).toBe(asyncStory.title);
    expect(mockStory.text).toBe(asyncStory.text);
    expect(mockStory.structuredOutput).toBeDefined();
    expect(asyncStory.structuredOutput).toBeDefined();
  });

  it('parses valid story JSON output via parseStoryOutput', () => {
    const jsonStr = JSON.stringify({
      sentences: [
        {
          text: 'Das ist ein Test.',
          words: [
            { clean: 'Das', syllables: ['Das'] },
            { clean: 'ist', syllables: ['ist'] },
            { clean: 'ein', syllables: ['ein'] },
            { clean: 'Test', syllables: ['Test'] },
          ],
        },
      ],
    });

    const parsed = storyGeneratorService.parseStoryOutput(jsonStr);
    expect(parsed.sentences).toHaveLength(1);
    expect(parsed.sentences[0].words).toHaveLength(4);
  });
});
