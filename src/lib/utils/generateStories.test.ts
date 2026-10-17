import { describe, it, expect } from 'vitest';
import {
  DISTURBER_WORDS,
  LEVEL_1_NOUN_WHITELIST,
  LEVEL_1_2_DISTURBER_WORDS,
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

  it('contains simple, funny disturber objects for early reader levels 1 and 2', () => {
    expect(LEVEL_1_2_DISTURBER_WORDS.length).toBeGreaterThanOrEqual(10);
    expect(LEVEL_1_2_DISTURBER_WORDS).toContain('Ufo');
    expect(LEVEL_1_2_DISTURBER_WORDS).toContain('Sofa');
    expect(LEVEL_1_2_DISTURBER_WORDS).toContain('Torte');
    expect(LEVEL_1_2_DISTURBER_WORDS).toContain('Keks');
  });

  it('constructs a creative Step 1 (Drafting) prompt with disturber collision and Level 1 whitelist', () => {
    const prompt = buildDraftingPrompt(forestTheme, 'Ufo', 1);
    expect(prompt).toContain('Wald & Bäume');
    expect(prompt).toContain('Ufo');
    expect(prompt).toContain('4 bis 5 Sätze');
    expect(prompt).toContain('Dino');
    expect(prompt).toContain('WICHTIG (FÜR LEVEL 1)');
  });

  it('constructs Step 2 (Translation) prompt enforcing Level 1 whitelist nouns and JSON format', () => {
    const prompt = buildTranslationPrompt(
      forestTheme,
      'Ufo',
      1,
      1,
      'Das ist ein Test-Plot.'
    );

    expect(prompt).toContain('REGELN FÜR LEVEL 1');
    expect(prompt).toContain('4 bis 5 Sätze');
    expect(prompt).toContain('5 bis 8 Wörter');
    expect(prompt).toContain('Dino');
    expect(prompt).toContain('Tor');
    expect(prompt).toContain('SILBENTRENNUNG & JSON-SCHEMA');
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

  it('verifies all THEME_LEVEL1_ANCHOR_WORDS have complexity score 0 and are eligible Level 1 nouns', async () => {
    const { THEME_LEVEL1_ANCHOR_WORDS, THEME_SURPRISE_SEEDS } = await import('./promptTemplates');
    const { calculateWordComplexity, isLevel1EligibleWord, tokenizeStory } = await import('./tokenizer');
    const { splitSyllables } = await import('./syllableSplitter');

    for (const theme of STORY_THEMES) {
      const anchors = THEME_LEVEL1_ANCHOR_WORDS[theme.id];
      expect(anchors.length).toBeGreaterThanOrEqual(25);
      for (const word of anchors) {
        const syllables = splitSyllables(word);
        expect(calculateWordComplexity(word, syllables)).toBe(0);
        expect(isLevel1EligibleWord(word)).toBe(true);
      }

      const seeds = THEME_SURPRISE_SEEDS[theme.id];
      expect(seeds.length).toBe(10);
    }

    // Verify cross-sentence target word variety in Level 1
    const sampleStory = [
      'Lilly wandert fröhlich durch den grünen Wald zum See.',
      'Am stillen See steht plötzlich ein Klavier im Moos.',
      'Ein kleiner Igel tippt am Klavier auf eine helle Note.',
      'Am Abend fliegt ein bunter Vogel über das Tal.',
    ].join(' ');
    const tokenized = tokenizeStory(sampleStory, 1);
    const chosenWords = tokenized.map((s) => s.words.find((w) => w.role === 'child')?.cleanWord);
    expect(chosenWords).toEqual(['See', 'Moos', 'Igel', 'Vogel']);
  });
});
