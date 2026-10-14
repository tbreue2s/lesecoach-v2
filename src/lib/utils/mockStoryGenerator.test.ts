import { describe, it, expect } from 'vitest';
import { generateStoryFromConfig, generateStoryJson } from './mockStoryGenerator';
import { parseGeneratedStoryJson } from './promptTemplates';
import { STORY_THEMES } from '../data/storyThemes';
import { tokenizeStory, cleanPunctuation } from './tokenizer';
import type { StoryConfigPayload } from '../types/storyConfig';

describe('Level-based Story Generation & Structured Output (WP08)', () => {
  it('contains exactly 10 distinct predefined themes', () => {
    expect(STORY_THEMES.length).toBe(10);
    const themeIds = STORY_THEMES.map((t) => t.id);
    const uniqueIds = new Set(themeIds);
    expect(uniqueIds.size).toBe(10);
  });

  describe('Level 1 Strict Didactic Mandates across all 10 Themes', () => {
    for (const theme of STORY_THEMES) {
      it(`adheres strictly to Level 1 rules for theme "${theme.label}" (${theme.id})`, () => {
        const payload: StoryConfigPayload = {
          level: 1,
          childName: 'Emil',
          companion: {
            id: 'dog',
            name: 'Bello',
            type: 'dog',
            icon: '🐶',
          },
          theme,
        };

        const story = generateStoryFromConfig(payload);

        // 1. Exactly 4 sentences
        const sentences = story.text.split('\n').filter((s) => s.trim().length > 0);
        expect(sentences).toHaveLength(4);

        // 2. Syntax & Vocabulary verification for each sentence
        for (const sentence of sentences) {
          // No commas allowed in Level 1
          expect(sentence).not.toContain(',');

          const rawWords = sentence.split(/\s+/).filter((w) => w.length > 0);
          // Sentence length: 4-5 words
          expect(rawWords.length).toBeGreaterThanOrEqual(4);
          expect(rawWords.length).toBeLessThanOrEqual(5);

          for (const rawWord of rawWords) {
            const clean = cleanPunctuation(rawWord);
            // No ß, ck, tz, pf
            expect(clean).not.toMatch(/[ß]|ck|tz|pf/i);
            // No consonant clusters sch, sp, st (Emil and Bello also comply)
            expect(clean).not.toMatch(/sch|sp|st/i);
          }
        }

        // 3. Structured Output & Syllables
        expect(story.structuredOutput).toBeDefined();
        expect(story.structuredOutput?.sentences).toHaveLength(4);
        for (const sentObj of story.structuredOutput!.sentences) {
          expect(sentObj.words.length).toBeGreaterThanOrEqual(4);
          for (const wordObj of sentObj.words) {
            expect(wordObj.clean).toBeTruthy();
            expect(wordObj.syllables.length).toBeGreaterThanOrEqual(1);
            expect(wordObj.syllables.length).toBeLessThanOrEqual(2);
          }
        }

        // 4. Clean Tokenization into reading session tokens
        const tokens = tokenizeStory(
          story.text,
          1,
          payload.companion?.name || '',
          payload.childName,
          story.structuredOutput
        );
        expect(tokens).toHaveLength(4);
        // Ensure child words exist and receive valid assignment
        const allWords = tokens.flatMap((s) => s.words);
        expect(allWords.some((w) => w.role === 'child')).toBe(true);
      });
    }
  });

  describe('Level 2 Noun-Phrase & Syllable Rules', () => {
    it('generates 4-5 sentences and adheres to max 3 syllables per word', () => {
      const payload: StoryConfigPayload = {
        level: 2,
        childName: 'Mia',
        companion: {
          id: 'cat',
          name: 'Flora',
          type: 'cat',
          icon: '🐱',
        },
        theme: STORY_THEMES[0],
      };

      const story = generateStoryFromConfig(payload);
      const sentences = story.text.split('\n').filter((s) => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(4);
      expect(sentences.length).toBeLessThanOrEqual(5);

      for (const sentObj of story.structuredOutput!.sentences) {
        for (const wordObj of sentObj.words) {
          expect(wordObj.syllables.length).toBeLessThanOrEqual(3);
        }
      }

      const tokens = tokenizeStory(
        story.text,
        2,
        payload.companion?.name || '',
        payload.childName,
        story.structuredOutput
      );
      expect(tokens.length).toBe(sentences.length);
      const childTokens = tokens.flatMap((s) => s.words).filter((w) => w.role === 'child');
      expect(childTokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Level 4 & 5 Tandem Structure', () => {
    it('generates 6 sentences alternating between app and child for Level 5', () => {
      const payload: StoryConfigPayload = {
        level: 5,
        childName: 'Lukas',
        companion: {
          id: 'dog',
          name: 'Rexi',
          type: 'dog',
          icon: '🐕',
        },
        theme: STORY_THEMES[1], // theme_wizard
      };

      const story = generateStoryFromConfig(payload);
      const sentences = story.text.split('\n').filter((s) => s.trim().length > 0);
      expect(sentences).toHaveLength(6);

      const tokens = tokenizeStory(
        story.text,
        5,
        payload.companion?.name || '',
        payload.childName,
        story.structuredOutput
      );
      expect(tokens).toHaveLength(6);
      expect(tokens[0].role).toBe('app');
      expect(tokens[1].role).toBe('child');
      expect(tokens[2].role).toBe('app');
      expect(tokens[3].role).toBe('child');
    });
  });

  describe('Phase C (Level 7-9) Passage Length Scaling', () => {
    const makePayload = (level: 7 | 8 | 9): StoryConfigPayload => ({
      level,
      childName: 'Emma',
      companion: null,
      theme: STORY_THEMES[2], // theme_horse
    });

    it('scales word counts appropriately: Level 7 (~30w), Level 8 (~60w), Level 9 (100+w)', () => {
      const story7 = generateStoryFromConfig(makePayload(7));
      const words7 = story7.text.split(/\s+/).filter((w) => w.length > 0).length;
      expect(words7).toBeGreaterThanOrEqual(25);
      expect(words7).toBeLessThanOrEqual(55);

      const story8 = generateStoryFromConfig(makePayload(8));
      const words8 = story8.text.split(/\s+/).filter((w) => w.length > 0).length;
      expect(words8).toBeGreaterThanOrEqual(50);
      expect(words8).toBeLessThanOrEqual(95);

      const story9 = generateStoryFromConfig(makePayload(9));
      const words9 = story9.text.split(/\s+/).filter((w) => w.length > 0).length;
      expect(words9).toBeGreaterThanOrEqual(100);
    });
  });

  describe('generateStoryJson serialization', () => {
    it('serializes stories to valid JSON that parses cleanly with parseGeneratedStoryJson', () => {
      const payload: StoryConfigPayload = {
        level: 1,
        childName: 'Emil',
        companion: null,
        theme: STORY_THEMES[3], // theme_unicorn
      };

      const jsonStr = generateStoryJson(payload);
      const parsed = parseGeneratedStoryJson(jsonStr);

      expect(parsed.sentences).toHaveLength(4);
      expect(parsed.sentences[0].words.length).toBeGreaterThanOrEqual(4);
      expect(parsed.sentences[0].words[0].clean).toBe('Emil');
    });
  });
});
