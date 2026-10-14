import { describe, it, expect } from 'vitest';
import {
  tokenizeStory,
  splitIntoSentences,
  cleanPunctuation,
  FORBIDDEN_LEVEL1_PARTICLES,
  isArticle,
  isAdjective,
  isNoun,
  calculateWordComplexity,
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

  describe('Strict Grapheme & Phoneme Filtering via Complexity Score', () => {
    it('LEVEL 1: tokens with score >= 2 ("weißen", "Pfad", "Pferd", "Sandburg", "Koppel", "Mähne", "gibt", "Wind", "sanft") NEVER receive role: "child"', () => {
      expect(calculateWordComplexity('weißen')).toBeGreaterThanOrEqual(10);
      expect(calculateWordComplexity('Koppel')).toBeGreaterThanOrEqual(2);
      expect(calculateWordComplexity('Mähne')).toBeGreaterThanOrEqual(2);
      expect(calculateWordComplexity('Pfad')).toBeGreaterThanOrEqual(10);
      expect(calculateWordComplexity('fröhlich')).toBeGreaterThanOrEqual(2);
      expect(calculateWordComplexity('gibt')).toBeGreaterThanOrEqual(2);
      expect(calculateWordComplexity('Wind')).toBeGreaterThanOrEqual(2);
      expect(calculateWordComplexity('sanft')).toBeGreaterThanOrEqual(2);

      const story =
        'Auf dem weißen Pfad steht ein Pferd vor der großen Sandburg. Der Hund rennt fröhlich.';
      const sentences = tokenizeStory(story, 1, 'Bello');

      for (const sentence of sentences) {
        for (const token of sentence.words) {
          const lower = token.cleanWord.toLowerCase();
          if (['weißen', 'pfad', 'pferd', 'sandburg', 'fröhlich'].includes(lower)) {
            expect(token.role).not.toBe('child');
            expect(token.role).toBe('app');
          }
        }
      }
    });

    it('LEVEL 1: completely marks sentences as role: "app" when no word reaches score <= 1', () => {
      // User test case 1: "Der Wind weht sanft durch die lange Mähne."
      // "Wind" (score 3), "weht" (score 4), "sanft" (score 3), "Mähne" (score 2) -> all score >= 2
      const sentence1 = 'Der Wind weht sanft durch die lange Mähne.';
      const tokenized1 = tokenizeStory(sentence1, 1, 'Bello');
      expect(tokenized1.length).toBe(1);
      expect(tokenized1[0].role).toBe('app');
      expect(tokenized1[0].words.filter((w) => w.role === 'child').length).toBe(0);

      // User test case 2: "Rexi läuft fröhlich neben der Koppel her."
      // "Rexi" (+50 penalty, 'x' killer), "läuft" (score 4), "fröhlich" (score 3), "Koppel" (score 2) -> all score >= 2
      const sentence2 = 'Rexi läuft fröhlich neben der Koppel her.';
      const tokenized2 = tokenizeStory(sentence2, 1, 'Rexi');
      expect(tokenized2.length).toBe(1);
      expect(tokenized2[0].role).toBe('app');
      expect(tokenized2[0].words.filter((w) => w.role === 'child').length).toBe(0);
    });

    it('LEVEL 1 Selector Fallback: App reads entire sentence if no word passes filter (score <= 1), child gets word in next valid sentence', () => {
      // Sentence 1 has no valid Level 1 words (all score >= 2) -> app reads it
      // Sentence 2 has "Hut" (valid Level 1 word, score 0) -> child gets "Hut"
      const story = 'Auf dem weißen Pfad galoppiert ein Pferd. Hier liegt ein roter Hut.';
      const sentences = tokenizeStory(story, 1, 'Bello');

      expect(sentences.length).toBe(2);

      // Sentence 1: fallback -> all words are role: 'app'
      const s1ChildWords = sentences[0].words.filter((w) => w.role === 'child');
      expect(s1ChildWords.length).toBe(0);
      expect(sentences[0].role).toBe('app');

      // Sentence 2: valid word "Hut" is selected for child
      const s2ChildWords = sentences[1].words.filter((w) => w.role === 'child');
      expect(s2ChildWords.length).toBe(1);
      expect(s2ChildWords[0].cleanWord).toBe('Hut');
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

    it('LEVEL 1: avoids Genitive forms (Pferdes) and heavy penalty words', () => {
      const trickySentence = 'Das Fell des Pferdes glänzt schön in der Sonne. Hier liegt ein roter Hut.';
      const sentences = tokenizeStory(trickySentence, 1, 'Bello');

      for (const sentence of sentences) {
        for (const token of sentence.words) {
          if (token.role === 'child') {
            expect(token.cleanWord).not.toBe('Pferdes');
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
        'Ein roter Bus fährt an dem Tor. Auf dem Weg liegt ein Rad. Hier liegt ein Hut.';
      const sentences = tokenizeStory(storyWithValidWords, 1, 'Bello');

      for (const sentence of sentences) {
        const childWords = sentence.words.filter((w) => w.role === 'child');
        expect(childWords.length).toBe(1);

        const childToken = childWords[0];
        expect(childToken.syllables.length).toBeLessThanOrEqual(2);
        expect(calculateWordComplexity(childToken.cleanWord, childToken.syllables)).toBeLessThanOrEqual(1);
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

  describe('Work Package 07: Tokenizer Refactoring (Didaktischer Schiedsrichter)', () => {
    describe('2.1 Penalty-Scoring-System (calculateWordComplexity)', () => {
      it('calculates correct complexity scores for mandatory acceptance test cases', () => {
        // Sandburg (Länge 8 -> +10, 'nd' -> +3, 'rg' -> +3) = Score >= 16
        expect(calculateWordComplexity('Sandburg', ['sand', 'burg'])).toBeGreaterThanOrEqual(16);
        expect(calculateWordComplexity('Sandburg')).toBeGreaterThanOrEqual(16);

        // Auto ('au' -> +1, Länge 4, 2 Silben) = Score 1
        expect(calculateWordComplexity('Auto', ['au', 'to'])).toBe(1);
        expect(calculateWordComplexity('Auto')).toBe(1);

        // Hut (0 Treffer) = Score 0
        expect(calculateWordComplexity('Hut', ['hut'])).toBe(0);
        expect(calculateWordComplexity('Hut')).toBe(0);

        // weißen ('ß' -> +10, 'ei' -> +1) = Score >= 11
        expect(calculateWordComplexity('weißen', ['wei', 'ßen'])).toBeGreaterThanOrEqual(11);
        expect(calculateWordComplexity('weißen')).toBeGreaterThanOrEqual(11);
      });

      it('correctly scores killer hurdles (+10 points)', () => {
        // Killer regex /[ßcqxyz]|ck|tz|pf/i
        expect(calculateWordComplexity('Pferd', ['pferd'])).toBeGreaterThanOrEqual(10);
        expect(calculateWordComplexity('Katze', ['kat', 'ze'])).toBeGreaterThanOrEqual(10);
        expect(calculateWordComplexity('Sack', ['sack'])).toBeGreaterThanOrEqual(10);
        expect(calculateWordComplexity('Zug', ['zug'])).toBeGreaterThanOrEqual(10);

        // Syllables limit >= 3 (+10)
        expect(calculateWordComplexity('Lokomotive', ['lo', 'ko', 'mo', 'ti', 've'])).toBeGreaterThanOrEqual(10);

        // Polysyllable heavy endings: (es|em|er|sten|chem)$ (+10)
        expect(calculateWordComplexity('schönsten', ['schön', 'sten'])).toBeGreaterThanOrEqual(10);
      });

      it('correctly scores heavy hurdles (+3), medium hurdles (+2), and light hurdles (+1)', () => {
        // Nasal (nk/ng) -> +3
        expect(calculateWordComplexity('Trank', ['trank'])).toBeGreaterThanOrEqual(3);
        expect(calculateWordComplexity('Ring', ['ring'])).toBeGreaterThanOrEqual(3);

        // Medium: complex grapheme (sch/ch/sp/st) -> +2
        expect(calculateWordComplexity('Fisch', ['fisch'])).toBeGreaterThanOrEqual(2);
        // Medium: double consonants -> +2
        expect(calculateWordComplexity('Sonne', ['son', 'ne'])).toBe(2);

        // Light: diphthong -> +1
        expect(calculateWordComplexity('Baum', ['baum'])).toBe(1);
        // Light: simple umlaut -> +1
        expect(calculateWordComplexity('Tür', ['tür'])).toBe(1);
        // Light: Dehnungs-h -> +1
        expect(calculateWordComplexity('Reh', ['reh'])).toBe(1);
      });
    });

    describe('2.2 Level 1 & Level 2 Scoring Selection', () => {
      it('Level 1: selects candidate with lowest score (score <= 1) and skips sentence if lowestScore >= 2', () => {
        // In this sentence: "Baum" has score 1, "steht" has score 3, "Park" has score 3
        const sentence = 'Ein schöner Baum steht im Park.';
        const tokenized = tokenizeStory(sentence, 1, 'Bello');
        const childTokens = tokenized[0].words.filter((w) => w.role === 'child');
        expect(childTokens.length).toBe(1);
        expect(childTokens[0].cleanWord).toBe('Baum');

        // When all candidate words have score >= 2: sentence is completely skipped (app role)
        const hardSentence = 'Auf dem weißen Pfad galoppiert ein Pferd vor der Sandburg.';
        const tokenizedHard = tokenizeStory(hardSentence, 1, 'Bello');
        const hardChildTokens = tokenizedHard[0].words.filter((w) => w.role === 'child');
        expect(hardChildTokens.length).toBe(0);
        expect(tokenizedHard[0].role).toBe('app');
      });

      it('Level 2: selects consecutive [Article/Adj + Noun] bigram with <= 4 syllables prioritized by lowest score', () => {
        // "grünen Wiese" has score 2 (ü=1, ie=1)
        // "rote Rose" has score 0 (both 0)
        // Level 2 should pick "rote Rose" because 0 < 2!
        const story = 'Auf der grünen Wiese blüht eine rote Rose.';
        const tokenized = tokenizeStory(story, 2, 'Bello');
        const childTokens = tokenized[0].words.filter((w) => w.role === 'child');

        expect(childTokens.length).toBe(2);
        expect(childTokens[0].cleanWord).toBe('rote');
        expect(childTokens[1].cleanWord).toBe('Rose');
      });
    });

    describe('2.3 Eigennamen-Entwertung & Limitierung (Kind & Begleiter)', () => {
      it('applies +50 penalty from the start so proper names are never picked over other eligible words', () => {
        // Configured child name "Emil" has +50 penalty, "Hut" has score 0 -> "Hut" must be selected for child
        const sentence = 'Emil sucht den roten Hut.';
        const tokenized = tokenizeStory(sentence, 1, 'Flora', 'Emil');
        const childTokens = tokenized[0].words.filter((w) => w.role === 'child');
        expect(childTokens.length).toBe(1);
        expect(childTokens[0].cleanWord).toBe('Hut');
      });

      it('in Level 2 assigns proper name role: "child" at most ONCE, adding +100 penalty on subsequent occurrences', () => {
        // In Level 2, bigram with companion name "Bello"
        const story = 'Der liebe Bello bellt laut. Der liebe Bello rennt weg.';
        const tokenized = tokenizeStory(story, 2, 'Bello', 'Emil');

        expect(tokenized.length).toBe(2);

        // Across the entire story, Bello has role: 'child' at most ONCE
        const allBelloTokens = tokenized.flatMap((s) => s.words).filter((w) => w.cleanWord === 'Bello');
        const belloChildTokens = allBelloTokens.filter((w) => w.role === 'child');
        expect(belloChildTokens.length).toBeLessThanOrEqual(1);
      });
    });
  });
});
