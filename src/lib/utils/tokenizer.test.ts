import { describe, it, expect } from 'vitest';
import {
  tokenizeStory,
  splitIntoSentences,
  cleanPunctuation,
  isPhoneticallyValidForLevel,
  FORBIDDEN_LEVEL1_PARTICLES,
  isArticle,
  isAdjective,
  isNoun,
} from './tokenizer';
import { SAMPLE_STORIES } from '../data/sampleStories';

describe('Story Tokenizer & Didactic 9-Level Matrix (WP03)', () => {
  const sampleText = SAMPLE_STORIES[0].text;

  it('splits text into correct sentences, cleans punctuation, and splits syllables', () => {
    const sentences = splitIntoSentences(sampleText);
    expect(sentences.length).toBeGreaterThan(0);
    expect(cleanPunctuation('Hallo,')).toBe('Hallo');
    expect(cleanPunctuation('Bello!')).toBe('Bello');
    expect(cleanPunctuation('„Wiese“')).toBe('Wiese');

    const tokenized = tokenizeStory(sampleText, 1, 'Bello');
    for (const s of tokenized) {
      for (const w of s.words) {
        expect(w.syllables).toBeDefined();
        expect(w.syllables.length).toBeGreaterThan(0);
      }
    }
  });

  describe('WP03 Bugfix: Strict Grapheme & Phoneme Blacklist (Evidence)', () => {
    it('isPhoneticallyValidForLevel rejects blacklisted words for Level 1', () => {
      expect(isPhoneticallyValidForLevel('weißen', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('Koppel', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('Mähne', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('Pfad', 1)).toBe(false);
      expect(isPhoneticallyValidForLevel('fröhlich', 1)).toBe(false);
    });

    it('LEVEL 1: tokens with "weißen", "Koppel", "Mähne", "Pfad", "fröhlich" NEVER receive role: "child"', () => {
      const story =
        'Auf der weißen Koppel steht ein Pferd. Die lange Mähne weht im Wind über den Pfad. Der Hund rennt fröhlich.';
      const sentences = tokenizeStory(story, 1, 'Bello');

      for (const sentence of sentences) {
        for (const token of sentence.words) {
          const lower = token.cleanWord.toLowerCase();
          if (['weißen', 'koppel', 'mähne', 'pfad', 'fröhlich'].includes(lower)) {
            expect(token.role).not.toBe('child');
            expect(token.role).toBe('app');
          }
        }
      }
    });

    it('LEVEL 1 Selector Fallback: App reads entire sentence if no word passes filter, child gets word in next valid sentence', () => {
      // Sentence 1 has no valid Level 1 words -> app reads it
      // Sentence 2 has "Hund" (valid Level 1 word) -> child gets "Hund"
      const story = 'Auf der weißen Koppel grasen Pferde. Hier bellt ein Hund laut.';
      const sentences = tokenizeStory(story, 1, 'Bello');

      expect(sentences.length).toBe(2);

      // Sentence 1: fallback -> all words are role: 'app'
      const s1ChildWords = sentences[0].words.filter((w) => w.role === 'child');
      expect(s1ChildWords.length).toBe(0);
      expect(sentences[0].role).toBe('app');

      // Sentence 2: valid word "Hund" is selected for child
      const s2ChildWords = sentences[1].words.filter((w) => w.role === 'child');
      expect(s2ChildWords.length).toBe(1);
      expect(s2ChildWords[0].cleanWord).toBe('Hund');
    });

    it('LEVEL 2 Filter: forbids "ß", double consonants, and "ck"/"tz"; allows "ei", "au", "ie", Umlaute, "sch"/"ch"', () => {
      // Forbids:
      expect(isPhoneticallyValidForLevel('weißen', 2)).toBe(false); // contains ß
      expect(isPhoneticallyValidForLevel('Koppel', 2)).toBe(false); // double consonant pp
      expect(isPhoneticallyValidForLevel('Katze', 2)).toBe(false); // contains tz
      expect(isPhoneticallyValidForLevel('Sack', 2)).toBe(false); // contains ck

      // Allows:
      expect(isPhoneticallyValidForLevel('Wiese', 2)).toBe(true); // ie
      expect(isPhoneticallyValidForLevel('Baum', 2)).toBe(true); // au
      expect(isPhoneticallyValidForLevel('Mähne', 2)).toBe(true); // ä
      expect(isPhoneticallyValidForLevel('Schaf', 2)).toBe(true); // sch
      expect(isPhoneticallyValidForLevel('Buch', 2)).toBe(true); // ch
      expect(isPhoneticallyValidForLevel('Pfad', 2)).toBe(true); // pf allowed in Level 2
    });
  });

  describe('Level 1 & 2 Syntactic and Phonetic Target Selection', () => {
    it('LEVEL 1: NEVER selects isolated verb particles like "her." or "hin"', () => {
      const sentenceWithParticles = 'Der kleine Hund läuft schnell hin und her. Ein Kind ruft laut.';
      const sentences = tokenizeStory(sentenceWithParticles, 1, 'Bello');

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        if (childWords.length > 0) {
          const clean = childWords[0].cleanWord.toLowerCase();
          expect(FORBIDDEN_LEVEL1_PARTICLES.has(clean)).toBe(false);
          expect(clean).not.toBe('her');
          expect(clean).not.toBe('hin');
          expect(clean).not.toBe('auf');
        }
      }
    });

    it('LEVEL 1: avoids Genitive forms (Pferdes) and Dehnungs-h (Mähne)', () => {
      const trickySentence = 'Das Fell des Pferdes glänzt schön in der Sonne. Die lange Mähne weht im Wind.';
      const sentences = tokenizeStory(trickySentence, 1, 'Bello');

      for (const sentence of sentences) {
        for (const token of sentence.words) {
          if (token.role === 'child') {
            expect(token.cleanWord).not.toBe('Pferdes');
            expect(token.cleanWord).not.toBe('Mähne');
            expect(token.syllables.length).toBeLessThanOrEqual(2);
          }
        }
      }
    });

    it('LEVEL 2: ALWAYS selects strictly consecutive indices (i and i+1) forming valid Noun Phrases with max 4 syllables', () => {
      const story =
        'Auf der grünen Wiese blüht eine rote Rose. Der Hund rennt über den Pfad. Ein kleiner Vogel singt ein frohes Lied.';
      const sentences = tokenizeStory(story, 2, 'Bello');

      for (const sentence of sentences) {
        const childIndices: number[] = [];
        sentence.words.forEach((w, idx) => {
          if (w.role === 'child') childIndices.push(idx);
        });

        if (childIndices.length > 0) {
          // Strict consecutive adjacency
          expect(childIndices.length).toBe(2);
          expect(childIndices[1]).toBe(childIndices[0] + 1);

          const w1 = sentence.words[childIndices[0]];
          const w2 = sentence.words[childIndices[1]];

          // Combined syllable sum <= 4
          expect(w1.syllables.length + w2.syllables.length).toBeLessThanOrEqual(4);
          expect(w1.syllables.length).toBeLessThanOrEqual(2);
          expect(w2.syllables.length).toBeLessThanOrEqual(2);

          // Grammatical noun phrase: [Article + Noun] or [Adjective + Noun]
          const isValidPhrase =
            (isArticle(w1.cleanWord) || isAdjective(w1.cleanWord)) && isNoun(w2.cleanWord);
          expect(isValidPhrase).toBe(true);
        }
      }
    });
  });

  describe('Phase A Hard Phonetic Constraints & Syllable Limits', () => {
    it('LEVEL 1: exactly 1 word per valid sentence, never >= 3 syllables, prefers no clusters', () => {
      const storyWithValidWords =
        'Ein treuer Hund rennt im Park. Eine rote Rose blüht schön. Hier steht ein Tor.';
      const sentences = tokenizeStory(storyWithValidWords, 1, 'Bello');

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        expect(childWords.length).toBe(1);

        const childToken = childWords[0];
        expect(childToken.syllables.length).toBeLessThanOrEqual(2);
        expect(isPhoneticallyValidForLevel(childToken.cleanWord, 1)).toBe(true);
      }
    });

    it('LEVEL 2: exactly 2 consecutive words, COMBINED SUM <= 4 syllables', () => {
      const story =
        'Auf der grünen Wiese blüht eine rote Rose. Der Hund rennt über den Pfad. Ein kleiner Vogel singt ein frohes Lied.';
      const sentences = tokenizeStory(story, 2, 'Bello');

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        if (childWords.length > 0) {
          expect(childWords.length).toBe(2);

          const combinedSyllables = childWords.reduce((sum, w) => sum + w.syllables.length, 0);
          expect(combinedSyllables).toBeLessThanOrEqual(4);

          for (const token of childWords) {
            expect(token.syllables.length).toBeLessThanOrEqual(2);
          }
        }
      }
    });

    it('LEVEL 2: sample stories never exceed 4 syllables combined sum for child word pairs', () => {
      for (const sample of SAMPLE_STORIES) {
        const sentences = tokenizeStory(sample.text, 2, 'Bello');
        for (const sentence of sentences) {
          const childWords = sentence.words.filter((w) => w.role === 'child');
          if (childWords.length === 2) {
            const sum = childWords[0].syllables.length + childWords[1].syllables.length;
            expect(sum).toBeLessThanOrEqual(4);
          }
        }
      }
    });

    it('LEVEL 3: 3 to 4 words with COMBINED SUM <= 7 syllables', () => {
      const complexStory =
        'Ein wunderschönes Schaf steht auf der grünen Wiese. Eine bunte Lokomotive fährt an einem fröhlichem Bach vorbei. Hier wächst eine rote Rose.';
      const sentences = tokenizeStory(complexStory, 3, 'Bello');
      expect(sentences.length).toBe(3);

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        expect(childWords.length).toBeGreaterThanOrEqual(3);
        expect(childWords.length).toBeLessThanOrEqual(4);

        const combinedSyllables = childWords.reduce((sum, w) => sum + w.syllables.length, 0);
        expect(combinedSyllables).toBeLessThanOrEqual(7);

        for (const token of childWords) {
          expect(token.syllables.length).toBeLessThan(4);
        }
      }
    });

    it('PHASE A RULE: No word with >= 4 syllables ever receives role: "child"', () => {
      const hardText =
        'Die wunderschöne Prinzessin bewundert die Lokomotive. Der Regenbogen leuchtet wunderbar.';
      for (const lvl of [1, 2, 3] as const) {
        const sentences = tokenizeStory(hardText, lvl, 'Bello');
        for (const s of sentences) {
          for (const w of s.words) {
            if (w.role === 'child') {
              expect(w.syllables.length).toBeLessThan(4);
            }
          }
        }
      }
    });
  });

  describe('Phase B (Satz-Pionier): Repeated Reading & Sentence Roles', () => {
    it('LEVEL 5, 6: sets requiresRepeatedReading = true on child sentences', () => {
      for (const lvl of [5, 6] as const) {
        const sentences = tokenizeStory(sampleText, lvl, 'Bello');
        for (const sentence of sentences) {
          if (sentence.role === 'child') {
            expect(sentence.requiresRepeatedReading).toBe(true);
          }
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

    it('LEVEL 5 (Ping-Pong-Tandem): alternates sentences between App (even) and Child (odd)', () => {
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
