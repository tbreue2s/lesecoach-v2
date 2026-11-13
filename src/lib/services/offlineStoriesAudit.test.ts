import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tokenizeStory, calculateWordComplexity, cleanPunctuation } from '../utils/tokenizer';
import type { ReadingLevelNumber, GeneratedStoryOutput } from '../types/reading';

interface RawStoryJson {
  themeId: string;
  level: number;
  episode: number;
  title: string;
  disturberWord?: string;
  sentences: {
    text: string;
    words: {
      clean: string;
      syllables: string[];
    }[];
  }[];
}

describe('Automated Offline Stories & Didactic Quota Audit (Levels 1-9)', () => {
  const storiesRoot = path.resolve(__dirname, '../data/stories');

  for (let lvl = 1; lvl <= 9; lvl++) {
    const levelDir = path.join(storiesRoot, `level-${lvl}`);
    if (!fs.existsSync(levelDir)) continue;

    const files = fs.readdirSync(levelDir).filter((f) => f.endsWith('.json')).sort();

    describe(`Level ${lvl} Stories (${files.length} stories)`, () => {
      for (const file of files) {
        it(`tokenizes and verifies ${file} accurately according to Level ${lvl} matrix`, () => {
          const filePath = path.join(levelDir, file);
          const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RawStoryJson;

          expect(raw.sentences.length).toBeGreaterThanOrEqual(1);

          const fullText = raw.sentences.map((s) => s.text).join('\n');
          const structuredOutput: GeneratedStoryOutput = {
            sentences: raw.sentences.map((s) => ({
              text: s.text,
              words: s.words.map((w) => ({
                clean: w.clean,
                syllables: w.syllables,
              })),
            })),
          };

          const tokenized = tokenizeStory(
            fullText,
            lvl as ReadingLevelNumber,
            'Bello',
            'Emil',
            structuredOutput
          );

          expect(tokenized.length).toBe(raw.sentences.length);

          // 1. Syllable verification across all words
          for (const sent of tokenized) {
            for (const word of sent.words) {
              expect(word.syllables.length).toBeGreaterThanOrEqual(1);
              // Clean representation should match joined syllables (case-insensitive)
              const joined = cleanPunctuation(word.syllables.join('')).toLowerCase();
              const expectedClean = cleanPunctuation(word.cleanWord).toLowerCase();
              if (expectedClean.length > 0) {
                expect(joined).toBe(expectedClean);
              }
            }
          }

          // 2. Level-specific didactic checks
          if (lvl === 1) {
            expect(tokenized.length).toBeGreaterThanOrEqual(4);
            expect(tokenized.length).toBeLessThanOrEqual(5);
            for (const sent of tokenized) {
              const childTokens = sent.words.filter((w) => w.role === 'child');
              expect(childTokens.length).toBe(1);
              const score = calculateWordComplexity(childTokens[0].cleanWord, childTokens[0].syllables);
              expect(score).toBeLessThanOrEqual(1);
            }
          } else if (lvl === 2) {
            for (const sent of tokenized) {
              const childTokens = sent.words.filter((w) => w.role === 'child');
              expect(childTokens.length).toBeGreaterThanOrEqual(2);
            }
          } else if (lvl === 4) {
            tokenized.forEach((sent, sIdx) => {
              if (sIdx % 3 === 1) {
                expect(sent.role).toBe('child');
              } else {
                expect(sent.role).toBe('app');
              }
            });
          } else if (lvl === 5) {
            tokenized.forEach((sent, sIdx) => {
              if (sIdx % 2 === 1) {
                expect(sent.role).toBe('child');
                expect(sent.requiresRepeatedReading).toBe(true);
              } else {
                expect(sent.role).toBe('app');
                expect(sent.requiresRepeatedReading).toBe(false);
              }
            });
          } else if (lvl === 6) {
            for (const sent of tokenized) {
              expect(sent.role).toBe('child');
              expect(sent.requiresRepeatedReading).toBe(true);
            }
          } else if (lvl >= 7) {
            for (const sent of tokenized) {
              expect(sent.role).toBe('child');
              expect(sent.requiresRepeatedReading).toBe(false);
              for (const word of sent.words) {
                expect(word.role).toBe('child');
              }
            }
          }
        });
      }
    });
  }
});
