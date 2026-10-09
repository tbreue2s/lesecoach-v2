import { describe, it, expect } from 'vitest';
import {
  hasComplexClusters,
  validateWordForLevel,
  validateSentenceForLevel,
  validateStoryForLevel,
  isPhoneticallyValidForLevel,
} from './levelValidator';
import type { SentenceToken } from '../types/reading';

describe('Level Validator Engine (WP03)', () => {
  describe('Complex Consonant Cluster Detection', () => {
    it('detects German consonant clusters (sch, ch, sp, st, pfl, str)', () => {
      expect(hasComplexClusters('Schule')).toBe(true);
      expect(hasComplexClusters('Buch')).toBe(true);
      expect(hasComplexClusters('spielen')).toBe(true);
      expect(hasComplexClusters('Stein')).toBe(true);
      expect(hasComplexClusters('Pflanze')).toBe(true);
      expect(hasComplexClusters('Straße')).toBe(true);
    });

    it('returns false for simple phonological words', () => {
      expect(hasComplexClusters('Hund')).toBe(false);
      expect(hasComplexClusters('Auto')).toBe(false);
      expect(hasComplexClusters('Baum')).toBe(false);
      expect(hasComplexClusters('Rose')).toBe(false);
      expect(hasComplexClusters('Oma')).toBe(false);
      expect(hasComplexClusters('Tomate')).toBe(false);
    });
  });

  describe('isPhoneticallyValidForLevel & validateWordForLevel', () => {
    it('Level 1: accepts 1- or 2-syllable phonetically regular words without clusters, diphthongs, or rare letters', () => {
      expect(validateWordForLevel('Hut', ['Hut'], 1).isValid).toBe(true);
      expect(validateWordForLevel('Rose', ['Ro', 'se'], 1).isValid).toBe(true);
      expect(validateWordForLevel('Tor', ['Tor'], 1).isValid).toBe(true);
    });

    it('Level 1: rejects words with diphthongs, rare letters, or clusters', () => {
      expect(validateWordForLevel('Auto', ['Au', 'to'], 1).isValid).toBe(false); // au
      expect(validateWordForLevel('Schaf', ['Schaf'], 1).isValid).toBe(false);
      expect(validateWordForLevel('Stein', ['Stein'], 1).isValid).toBe(false);
      expect(validateWordForLevel('Tomate', ['To', 'ma', 'te'], 1).isValid).toBe(false);
    });

    it('Evidence: Level 1 rejects "weißen", "Koppel", "Mähne", "Pfad", and "fröhlich"', () => {
      expect(isPhoneticallyValidForLevel('weißen', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('Koppel', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('Mähne', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('Pfad', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('fröhlich', 1)).toBe(false);
    });

    it('Level 2: allows up to 2 syllables per word in pair and rejects words >= 3 syllables', () => {
      expect(validateWordForLevel('Auto', ['Au', 'to'], 2).isValid).toBe(true);
      expect(validateWordForLevel('Schaf', ['Schaf'], 2).isValid).toBe(true);
      expect(validateWordForLevel('Wiese', ['Wie', 'se'], 2).isValid).toBe(true);
      expect(validateWordForLevel('Tomate', ['To', 'ma', 'te'], 2).isValid).toBe(false);
      expect(validateWordForLevel('Schmetterling', ['Schmet', 'ter', 'ling'], 2).isValid).toBe(false);
      expect(validateWordForLevel('Lokomotive', ['Lo', 'ko', 'mo', 'ti', 've'], 2).isValid).toBe(false);
    });

    it('Level 2: strictly forbids "ß", double consonants, and "ck"/"tz"', () => {
      expect(isPhoneticallyValidForLevel('weißen', 2)).toBe(false);
      expect(isPhoneticallyValidForLevel('Koppel', 2)).toBe(false);
      expect(isPhoneticallyValidForLevel('Katze', 2)).toBe(false);
      expect(isPhoneticallyValidForLevel('Sack', 2)).toBe(false);
    });
  });

  describe('validateSentenceForLevel', () => {
    it('validates Level 1 sentence requires at most 1 child word', () => {
      const sentence1Child: SentenceToken = {
        id: 's1',
        sentenceIndex: 0,
        rawText: 'Hier ist ein Hut.',
        words: [
          { id: 'w1', word: 'Hier', cleanWord: 'Hier', syllables: ['Hier'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
          { id: 'w2', word: 'ist', cleanWord: 'ist', syllables: ['ist'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 1 },
          { id: 'w3', word: 'ein', cleanWord: 'ein', syllables: ['ein'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 2 },
          { id: 'w4', word: 'Hut.', cleanWord: 'Hut', syllables: ['Hut'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 3 },
        ],
        role: 'mixed',
        requiresRepeatedReading: false,
        isCompleted: false,
      };

      expect(validateSentenceForLevel(sentence1Child, 1).isValid).toBe(true);

      const sentence2Children: SentenceToken = {
        ...sentence1Child,
        words: sentence1Child.words.map((w, idx) => ({ ...w, role: idx >= 2 ? 'child' : 'app' })),
      };

      expect(validateSentenceForLevel(sentence2Children, 1).isValid).toBe(false);
      expect(validateSentenceForLevel(sentence2Children, 2).isValid).toBe(true);

      // Level 2 with combined syllables > 4 should fail
      const sentence2Heavy: SentenceToken = {
        id: 's2',
        sentenceIndex: 0,
        rawText: 'Die Banane und die Tomate.',
        words: [
          { id: 'w1', word: 'Die', cleanWord: 'Die', syllables: ['Die'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
          { id: 'w2', word: 'Banane', cleanWord: 'Banane', syllables: ['Ba', 'na', 'ne'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 1 },
          { id: 'w3', word: 'Tomate.', cleanWord: 'Tomate', syllables: ['To', 'ma', 'te'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 2 },
        ],
        role: 'mixed',
        requiresRepeatedReading: false,
        isCompleted: false,
      };
      // 3 + 3 = 6 syllables -> fails for Level 2 (max 4)
      expect(validateSentenceForLevel(sentence2Heavy, 2).isValid).toBe(false);

      // Level 3 with combined syllables <= 7 passes, > 7 fails
      const sentence3Valid: SentenceToken = {
        id: 's3',
        sentenceIndex: 0,
        rawText: 'Er hüpft auf den Baum.',
        words: [
          { id: 'w1', word: 'Er', cleanWord: 'Er', syllables: ['Er'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
          { id: 'w2', word: 'hüpft', cleanWord: 'hüpft', syllables: ['hüpft'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 1 },
          { id: 'w3', word: 'auf', cleanWord: 'auf', syllables: ['auf'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 2 },
          { id: 'w4', word: 'den', cleanWord: 'den', syllables: ['den'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 3 },
          { id: 'w5', word: 'Baum.', cleanWord: 'Baum', syllables: ['Baum'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 4 },
        ],
        role: 'mixed',
        requiresRepeatedReading: false,
        isCompleted: false,
      };
      // 4 child words, 1+1+1+1 = 4 syllables -> passes Level 3
      expect(validateSentenceForLevel(sentence3Valid, 3).isValid).toBe(true);

      // Phase A: word with >= 4 syllables must fail
      const sentenceWith4Syl: SentenceToken = {
        id: 's4',
        sentenceIndex: 0,
        rawText: 'Ein wunderschönes Auto.',
        words: [
          { id: 'w1', word: 'Ein', cleanWord: 'Ein', syllables: ['Ein'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
          { id: 'w2', word: 'wunderschönes', cleanWord: 'wunderschönes', syllables: ['wun', 'der', 'schö', 'nes'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 1 },
          { id: 'w3', word: 'Auto.', cleanWord: 'Auto', syllables: ['Au', 'to'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 2 },
        ],
        role: 'mixed',
        requiresRepeatedReading: false,
        isCompleted: false,
      };
      expect(validateSentenceForLevel(sentenceWith4Syl, 2).isValid).toBe(false);
    });
  });

  describe('validateStoryForLevel', () => {
    it('validates Level 7 story constraints (25-35 words, max 3-4 sentences)', () => {
      const shortStory =
        'Der kleine Hund rennt fröhlich in den grünen Wald. Er sieht einen schönen roten Ball im Gras. Der runde Ball rollt schnell zum großen Baum.';
      const res = validateStoryForLevel(shortStory, 7);
      expect(res.isSuitable).toBe(true);
    });

    it('flags too long story for Level 7', () => {
      const tooLongStory =
        'Satz eins ist kurz. Satz zwei ist kurz. Satz drei ist kurz. Satz vier ist kurz. Satz fünf ist zu viel für Level 7.';
      const res = validateStoryForLevel(tooLongStory, 7);
      expect(res.isSuitable).toBe(false);
    });

    it('Level 8 checks for expressive punctuation', () => {
      const storyWithoutPunctuation =
        'Dies ist ein normaler Satz ohne Ausrufezeichen oder Fragezeichen im gesamten Text der Geschichte.';
      const res = validateStoryForLevel(storyWithoutPunctuation, 8);
      expect(res.issues.some((i) => i.includes('Satzzeichen'))).toBe(true);
    });
  });
});
