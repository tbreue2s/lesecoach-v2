import { describe, it, expect } from 'vitest';
import {
  DISTURBER_WORDS,
  LEVEL_1_NOUN_WHITELIST,
  parseArgs,
  sampleRandom,
  buildDraftingPrompt,
  buildTranslationPrompt,
  generateFallbackStory,
  refineAndValidateStory,
} from '../../../scripts/generateStories';
import { STORY_THEMES } from '../data/storyThemes';

describe('generateStories Pipeline (WP13 Evidence)', () => {
  const forestTheme = STORY_THEMES.find((t) => t.id === 'theme_forest')!;

  it('has a pool of at least 25 disturber words', () => {
    expect(DISTURBER_WORDS.length).toBeGreaterThanOrEqual(25);
    expect(DISTURBER_WORDS).toContain('Ufo');
    expect(DISTURBER_WORDS).toContain('Sofa');
    expect(DISTURBER_WORDS).toContain('Dino');
  });

  it('contains exactly the 70 didactically compliant Level 1 nouns in the whitelist', () => {
    expect(LEVEL_1_NOUN_WHITELIST.length).toBe(70);
    expect(LEVEL_1_NOUN_WHITELIST).toContain('Dino');
    expect(LEVEL_1_NOUN_WHITELIST).toContain('Lama');
    expect(LEVEL_1_NOUN_WHITELIST).toContain('Dieb');
    expect(LEVEL_1_NOUN_WHITELIST).toContain('Tor');
    expect(LEVEL_1_NOUN_WHITELIST).toContain('Ufo');
  });

  it('correctly parses CLI arguments', () => {
    const parsed = parseArgs([
      '--level', '1',
      '--theme', 'theme_forest',
      '--count', '5',
      '--apiKey', 'test-key',
      '--dry-run',
      '--verbose',
    ]);

    expect(parsed.level).toBe(1);
    expect(parsed.themeId).toBe('theme_forest');
    expect(parsed.count).toBe(5);
    expect(parsed.apiKey).toBe('test-key');
    expect(parsed.dryRun).toBe(true);
    expect(parsed.verbose).toBe(true);
  });

  it('samples unique random elements from an array', () => {
    const sampled = sampleRandom(LEVEL_1_NOUN_WHITELIST, 5);
    expect(sampled.length).toBe(5);
    const unique = new Set(sampled);
    expect(unique.size).toBe(5);
  });

  it('constructs a creative Step 1 (Drafting) prompt with disturber collision', () => {
    const prompt = buildDraftingPrompt(forestTheme, 'Ufo', 1);
    expect(prompt).toContain('Wald & Bäume');
    expect(prompt).toContain('"Ufo"');
    expect(prompt).toContain('Level 1');
    expect(prompt).toContain('Genau 4 bis 6 Sätze');
  });

  it('constructs Step 2 (Translation) prompt enforcing Level 1 whitelist nouns and JSON format', () => {
    const selectedNouns = ['Dino', 'Tor', 'Oma', 'Vogel'];
    const prompt = buildTranslationPrompt(
      forestTheme,
      'Ufo',
      1,
      1,
      'Das ist ein Test-Plot.',
      selectedNouns
    );

    expect(prompt).toContain('DIDAKTISCHE LEVEL-1-REGELN');
    expect(prompt).toContain('Dino');
    expect(prompt).toContain('Tor');
    expect(prompt).toContain('Oma');
    expect(prompt).toContain('Vogel');
    expect(prompt).toContain('SILBENTRENNUNG');
    expect(prompt).toContain('"themeId": "theme_forest"');
    expect(prompt).toContain('"disturberWord": "Ufo"');
  });

  it('generates a valid fallback story for Level 1 conforming to all rules', () => {
    const selectedNouns = ['Vogel', 'Dino', 'Tor', 'Haus'];
    const fallback = generateFallbackStory(forestTheme, 'Ufo', 1, 1, selectedNouns);

    expect(fallback.themeId).toBe('theme_forest');
    expect(fallback.level).toBe(1);
    expect(fallback.episode).toBe(1);
    expect(fallback.disturberWord).toBe('Ufo');
    expect(fallback.sentences.length).toBe(4);

    // Each sentence must have clean words and non-empty syllables
    for (const sent of fallback.sentences) {
      expect(sent.words.length).toBeGreaterThan(0);
      for (const word of sent.words) {
        expect(word.clean.length).toBeGreaterThan(0);
        expect(word.syllables.length).toBeGreaterThan(0);
      }
    }

    const { isValid, issues } = refineAndValidateStory(fallback, 1, selectedNouns);
    expect(isValid).toBe(true);
    expect(issues).toEqual([]);
  });

  it('ensures correct syllable separation for every word in refineAndValidateStory', () => {
    const rawStory = {
      themeId: 'theme_forest',
      level: 1 as const,
      episode: 1,
      disturberWord: 'Ufo',
      title: 'Ufo beim Tor',
      sentences: [
        {
          text: 'Ein Ufo landet am Tor.',
          words: [], // Empty syllables to test automatic computation
        },
        {
          text: 'Der Vogel sieht den Hut.',
          words: [],
        },
        {
          text: 'Ein Dino eilt froh umher.',
          words: [],
        },
        {
          text: 'Papa ruft an das Rad.',
          words: [],
        },
      ],
    };

    const selectedNouns = ['Tor', 'Vogel', 'Dino', 'Rad'];
    const { story, isValid } = refineAndValidateStory(rawStory, 1, selectedNouns);

    expect(isValid).toBe(true);
    expect(story.sentences[0].words.find((w) => w.clean === 'Ufo')?.syllables).toEqual(['U', 'fo']);
    expect(story.sentences[0].words.find((w) => w.clean === 'landet')?.syllables).toEqual(['lan', 'det']);
    expect(story.sentences[1].words.find((w) => w.clean === 'Vogel')?.syllables).toEqual(['Vo', 'gel']);
  });
});
