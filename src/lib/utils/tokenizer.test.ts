import { describe, it, expect } from 'vitest';
import { tokenizeStory, splitIntoSentences, cleanPunctuation } from './tokenizer';
import { SAMPLE_STORIES } from '../data/sampleStories';

describe('Story Tokenizer & Didactic 9-Level Matrix (WP03)', () => {
  const sampleText = SAMPLE_STORIES[0].text;

  it('splits text into correct sentences and cleans punctuation', () => {
    const sentences = splitIntoSentences(sampleText);
    expect(sentences.length).toBeGreaterThan(0);
    expect(cleanPunctuation('Hallo,')).toBe('Hallo');
    expect(cleanPunctuation('Bello!')).toBe('Bello');
    expect(cleanPunctuation('„Wiese“')).toBe('Wiese');
  });

  describe('Phase A (Wort-Entdecker): Exact Target Word Counts', () => {
    it('LEVEL 1: sets EXACTLY 1 word per sentence to role: "child"', () => {
      const sentences = tokenizeStory(sampleText, 1, 'Bello');
      expect(sentences.length).toBeGreaterThan(0);

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        expect(childWords.length).toBe(1);

        const appWords = sentence.words.filter((w) => w.role === 'app');
        expect(appWords.length).toBe(sentence.words.length - 1);
      }
    });

    it('LEVEL 2: sets EXACTLY 2 words per sentence to role: "child"', () => {
      const sentences = tokenizeStory(sampleText, 2, 'Bello');
      expect(sentences.length).toBeGreaterThan(0);

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        expect(childWords.length).toBe(2);

        const appWords = sentence.words.filter((w) => w.role === 'app');
        expect(appWords.length).toBe(sentence.words.length - 2);
      }
    });

    it('LEVEL 3: sets 3 to 4 words (half-sentence) per sentence to role: "child"', () => {
      const sentences = tokenizeStory(sampleText, 3, 'Bello');
      expect(sentences.length).toBeGreaterThan(0);

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        expect(childWords.length).toBeGreaterThanOrEqual(3);
        expect(childWords.length).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('Phase B (Satz-Pionier): Repeated Reading & Sentence Roles', () => {
    it('LEVEL 4, 5, 6: sets requiresRepeatedReading = true on all sentences', () => {
      for (const lvl of [4, 5, 6] as const) {
        const sentences = tokenizeStory(sampleText, lvl, 'Bello');
        for (const sentence of sentences) {
          expect(sentence.requiresRepeatedReading).toBe(true);
        }
      }
    });

    it('LEVEL 1-3 & LEVEL 7-9: sets requiresRepeatedReading = false', () => {
      for (const lvl of [1, 2, 3, 7, 8, 9] as const) {
        const sentences = tokenizeStory(sampleText, lvl, 'Bello');
        for (const sentence of sentences) {
          expect(sentence.requiresRepeatedReading).toBe(false);
        }
      }
    });

    it('LEVEL 5 (Lese-Tandem): alternates sentences between App (even) and Child (odd)', () => {
      const sentences = tokenizeStory(sampleText, 5, 'Bello');
      expect(sentences.length).toBeGreaterThanOrEqual(2);

      sentences.forEach((sentence, index) => {
        const expectedRole = index % 2 === 1 ? 'child' : 'app';
        expect(sentence.role).toBe(expectedRole);

        // Every word in that sentence inherits the sentence role
        for (const word of sentence.words) {
          expect(word.role).toBe(expectedRole);
        }
      });
    });

    it('LEVEL 6: sets all sentences and words to role: "child"', () => {
      const sentences = tokenizeStory(sampleText, 6, 'Bello');
      for (const sentence of sentences) {
        expect(sentence.role).toBe('child');
        for (const word of sentence.words) {
          expect(word.role).toBe('child');
        }
      }
    });
  });

  describe('Phase C (Lese-Kapitän): Free Reading', () => {
    it('LEVEL 7, 8, 9: sets all words to role: "child" for free reading', () => {
      for (const lvl of [7, 8, 9] as const) {
        const sentences = tokenizeStory(sampleText, lvl, 'Bello');
        for (const sentence of sentences) {
          expect(sentence.role).toBe('child');
          for (const word of sentence.words) {
            expect(word.role).toBe('child');
          }
        }
      }
    });
  });
});
