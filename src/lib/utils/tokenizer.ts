import type {
  ReadingLevelNumber,
  SentenceToken,
  WordToken,
  TokenRole,
} from '../types/reading';
import { splitSyllables } from './syllableSplitter';

/**
 * Strips punctuation marks from a word to extract the clean phonetic word.
 */
export function cleanPunctuation(word: string): string {
  return word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'„“»«]/g, '').trim();
}

/**
 * Replaces companion placeholder tags with actual companion name.
 */
export function injectCompanionName(text: string, companionName: string): string {
  return text.replace(/\{companion\}/g, companionName);
}

/**
 * Splits raw story text into individual sentence strings.
 */
export function splitIntoSentences(text: string): string[] {
  const rawSentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return rawSentences;
}

/**
 * Determines whether a given sentence index should be read by the child for Level 4.
 * In Level 4, the child reads every ~3rd sentence (e.g. sentence index 1, 4, 7).
 */
function isLevel4ChildSentence(sentenceIndex: number): boolean {
  return sentenceIndex % 3 === 1;
}

// German Articles and Determiners (including contractions like am, im, ans, ins, zum, zur)
export const GERMAN_ARTICLES = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des',
  'ein', 'eine', 'einen', 'einem', 'eines', 'einer',
  'am', 'im', 'vom', 'zum', 'zur', 'ans', 'ins', 'beim',
  'kein', 'keine', 'keinen', 'keinem', 'keiner',
  'mein', 'meine', 'meinen', 'meinem', 'meiner',
  'dein', 'deine', 'deinen', 'deinem', 'deiner',
  'sein', 'seine', 'seinen', 'seinem', 'seiner',
]);

// Isolated verb prefixes and particles strictly forbidden as standalone targets in Level 1
export const FORBIDDEN_LEVEL1_PARTICLES = new Set([
  'her', 'hin', 'auf', 'ab', 'an', 'aus', 'bei', 'mit', 'nach', 'von', 'vor',
  'zu', 'ein', 'weg', 'los', 'um', 'durch', 'über', 'unter', 'hinter', 'neben',
  'da', 'dort', 'hier', 'fort', 'zurück', 'empor', 'entlang', 'hinein', 'heraus',
  'herein', 'hinab', 'hinauf', 'dran', 'drauf', 'drum', 'mit', 'gar', 'nur', 'so',
]);

/**
 * Checks if a word is a German noun (capitalized in orthography).
 */
export function isNoun(cleanWord: string): boolean {
  if (!cleanWord || cleanWord.length === 0) return false;
  const firstChar = cleanWord[0];
  return firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
}

/**
 * Checks if a word is a German article or contracted prepositional article.
 */
export function isArticle(cleanWord: string): boolean {
  return GERMAN_ARTICLES.has(cleanWord.toLowerCase());
}

/**
 * Checks if a word matches German adjective inflection forms.
 */
export function isAdjective(cleanWord: string): boolean {
  const lower = cleanWord.toLowerCase();
  if (isArticle(lower) || FORBIDDEN_LEVEL1_PARTICLES.has(lower)) return false;
  return /(e|er|en|es|em|el|ig|lich|isch|bar|sam|haft)$/i.test(lower) ||
    ['rot', 'blau', 'grün', 'gelb', 'bunt', 'groß', 'klein', 'alt', 'jung', 'neu', 'warm', 'kalt', 'lieb', 'wild', 'süß', 'laut', 'nah', 'rund', 'dick', 'dünn', 'hell', 'kurz', 'lang', 'froh', 'klug', 'müde'].includes(lower);
}

/**
 * Checks for Dehnungs-h: a vowel immediately followed by 'h' (e.g. Mähne, Reh, Zahn, Kuh, Huhn, Ohr).
 */
export function hasDehnungsH(cleanWord: string): boolean {
  return /([aeiouäöü])h/i.test(cleanWord);
}

/**
 * Checks for complex consonant clusters at the beginning of a word (e.g. Pferd, Pflanze, Schaf, Straße, Stein).
 */
export function hasInitialComplexCluster(cleanWord: string): boolean {
  return /^(pf|str|spr|schw|sch|sp|st|pfl|kn|gn|vr|ps|qu)/i.test(cleanWord);
}

/**
 * Checks for complex consonant clusters anywhere in the word.
 */
export function hasComplexClusters(cleanWord: string): boolean {
  return /(sch|ch|sp|st|pfl|str|qu)/i.test(cleanWord);
}

/**
 * Checks for Genitive endings on words (e.g. Pferdes, Kindes, des, eines).
 */
export function isGenitiveForm(cleanWord: string): boolean {
  const lower = cleanWord.toLowerCase();
  if (lower === 'des' || lower === 'eines' || lower === 'seines' || lower === 'ihres') {
    return true;
  }
  if (isNoun(cleanWord) && (cleanWord.endsWith('es') || cleanWord.endsWith('ens'))) {
    return true;
  }
  return false;
}

export interface WordMeta {
  word: string;
  cleanWord: string;
  syllables: string[];
}

/**
 * Intelligent selector for Phase A (Levels 1, 2, 3) enforcing strict phonetic and syntactic constraints:
 * - Level 1: Exactly 1 noun or finite verb (max 2 syllables, no particles, no Genitive, no Dehnungs-h, no initial clusters).
 * - Level 2: Exactly 2 consecutive words forming a valid [Article/Adj + Noun] phrase (sum <= 4 syllables, strictly <= 2 syllables per word).
 * - Level 3: 3 to 4 consecutive words with sum(syllables) <= 7, no word >= 4 syllables.
 * - Strict Phase A Rule: No word with >= 4 syllables is ever selected for the child.
 */
export function selectPhaseAChildIndices(rawWords: WordMeta[], level: 1 | 2 | 3): Set<number> {
  const n = rawWords.length;
  if (n === 0) return new Set();

  const selected = new Set<number>();

  // In Phase A, child words must strictly have < 4 syllables
  const validIndices = rawWords
    .map((w, idx) => idx)
    .filter((idx) => rawWords[idx].syllables.length < 4);

  const availableIndices = validIndices.length > 0 ? validIndices : [0];

  if (level === 1) {
    // 1. Noun or finite verb with <= 2 syllables and no complex clusters, no particles, no genitive, no dehnungs-h
    for (let i = availableIndices.length - 1; i >= 0; i--) {
      const idx = availableIndices[i];
      const w = rawWords[idx];
      const clean = w.cleanWord;
      const sylCount = w.syllables.length;

      if (
        sylCount <= 2 &&
        !FORBIDDEN_LEVEL1_PARTICLES.has(clean.toLowerCase()) &&
        !isGenitiveForm(clean) &&
        !hasDehnungsH(clean) &&
        !hasInitialComplexCluster(clean) &&
        !hasComplexClusters(clean) &&
        (isNoun(clean) || idx > 0)
      ) {
        selected.add(idx);
        return selected;
      }
    }

    // 2. Any word in availableIndices with <= 2 syllables, no particle, no genitive, no dehnungs-h, no initial cluster
    for (let i = availableIndices.length - 1; i >= 0; i--) {
      const idx = availableIndices[i];
      const w = rawWords[idx];
      const clean = w.cleanWord;
      const sylCount = w.syllables.length;

      if (
        sylCount <= 2 &&
        !FORBIDDEN_LEVEL1_PARTICLES.has(clean.toLowerCase()) &&
        !isGenitiveForm(clean) &&
        !hasDehnungsH(clean) &&
        !hasInitialComplexCluster(clean)
      ) {
        selected.add(idx);
        return selected;
      }
    }

    // 3. Any word in availableIndices with <= 2 syllables, not a particle, not genitive
    for (let i = availableIndices.length - 1; i >= 0; i--) {
      const idx = availableIndices[i];
      const w = rawWords[idx];
      const clean = w.cleanWord;
      const sylCount = w.syllables.length;

      if (
        sylCount <= 2 &&
        !FORBIDDEN_LEVEL1_PARTICLES.has(clean.toLowerCase()) &&
        !isGenitiveForm(clean)
      ) {
        selected.add(idx);
        return selected;
      }
    }

    // 4. Any non-particle word in availableIndices
    for (let i = availableIndices.length - 1; i >= 0; i--) {
      const idx = availableIndices[i];
      const w = rawWords[idx];
      if (!FORBIDDEN_LEVEL1_PARTICLES.has(w.cleanWord.toLowerCase())) {
        selected.add(idx);
        return selected;
      }
    }

    // Absolute fallback in availableIndices
    selected.add(availableIndices[availableIndices.length - 1]);
    return selected;
  }

  if (level === 2) {
    if (n < 2) {
      selected.add(availableIndices[0]);
      return selected;
    }

    // Tier 1: Perfect [Article/Adj + Noun] where both words are in validIndices, syl1 <= 2, syl2 <= 2, sum <= 4
    for (let i = n - 2; i >= 0; i--) {
      if (validIndices.includes(i) && validIndices.includes(i + 1)) {
        const w1 = rawWords[i];
        const w2 = rawWords[i + 1];
        const syl1 = w1.syllables.length;
        const syl2 = w2.syllables.length;

        const isFirstArticleOrAdj = isArticle(w1.cleanWord) || isAdjective(w1.cleanWord);
        const isSecondNoun = isNoun(w2.cleanWord);

        if (isFirstArticleOrAdj && isSecondNoun && syl1 <= 2 && syl2 <= 2 && syl1 + syl2 <= 4) {
          selected.add(i);
          selected.add(i + 1);
          return selected;
        }
      }
    }

    // Tier 2: Any consecutive pair in validIndices with syl1 <= 2, syl2 <= 2, sum <= 4, no particle at end
    for (let i = n - 2; i >= 0; i--) {
      if (validIndices.includes(i) && validIndices.includes(i + 1)) {
        const w1 = rawWords[i];
        const w2 = rawWords[i + 1];
        const syl1 = w1.syllables.length;
        const syl2 = w2.syllables.length;

        if (
          !FORBIDDEN_LEVEL1_PARTICLES.has(w2.cleanWord.toLowerCase()) &&
          syl1 <= 2 &&
          syl2 <= 2 &&
          syl1 + syl2 <= 4
        ) {
          selected.add(i);
          selected.add(i + 1);
          return selected;
        }
      }
    }

    // Tier 3: Any consecutive pair in validIndices with syl1 <= 2, syl2 <= 2
    for (let i = n - 2; i >= 0; i--) {
      if (validIndices.includes(i) && validIndices.includes(i + 1)) {
        const syl1 = rawWords[i].syllables.length;
        const syl2 = rawWords[i + 1].syllables.length;

        if (syl1 <= 2 && syl2 <= 2) {
          selected.add(i);
          selected.add(i + 1);
          return selected;
        }
      }
    }

    // Fallback 1: Best consecutive pair in validIndices
    let bestPair: [number, number] | null = null;
    let minSum = 999;

    for (let i = n - 2; i >= 0; i--) {
      if (validIndices.includes(i) && validIndices.includes(i + 1)) {
        const syl1 = rawWords[i].syllables.length;
        const syl2 = rawWords[i + 1].syllables.length;
        const penalty = (syl1 >= 3 ? 50 : 0) + (syl2 >= 3 ? 50 : 0) + (FORBIDDEN_LEVEL1_PARTICLES.has(rawWords[i + 1].cleanWord.toLowerCase()) ? 20 : 0);
        const sum = syl1 + syl2 + penalty;

        if (sum < minSum) {
          minSum = sum;
          bestPair = [i, i + 1];
        }
      }
    }

    if (bestPair) {
      selected.add(bestPair[0]);
      selected.add(bestPair[1]);
      return selected;
    }

    // Fallback 2: Any 2 indices from availableIndices
    const idx2 = availableIndices[availableIndices.length - 1];
    const idx1 = availableIndices.length > 1 ? availableIndices[availableIndices.length - 2] : idx2;
    selected.add(idx1);
    selected.add(idx2);
    return selected;
  }

  if (level === 3) {
    // 1. Try 4-word consecutive window where all words are in validIndices and sum <= 7
    for (let i = n - 4; i >= 0; i--) {
      const window = [i, i + 1, i + 2, i + 3];
      if (window.every((idx) => validIndices.includes(idx))) {
        const sum = window.reduce((acc, idx) => acc + rawWords[idx].syllables.length, 0);
        if (sum <= 7) {
          window.forEach((idx) => selected.add(idx));
          return selected;
        }
      }
    }

    // 2. Try 3-word consecutive window where all words are in validIndices and sum <= 7
    for (let i = n - 3; i >= 0; i--) {
      const window = [i, i + 1, i + 2];
      if (window.every((idx) => validIndices.includes(idx))) {
        const sum = window.reduce((acc, idx) => acc + rawWords[idx].syllables.length, 0);
        if (sum <= 7) {
          window.forEach((idx) => selected.add(idx));
          return selected;
        }
      }
    }

    // 3. Fallback: 3 consecutive words in validIndices with lowest sum
    let best3Window: number[] | null = null;
    let min3Sum = 999;

    for (let i = n - 3; i >= 0; i--) {
      const window = [i, i + 1, i + 2];
      if (window.every((idx) => validIndices.includes(idx))) {
        const sum = window.reduce((acc, idx) => acc + rawWords[idx].syllables.length, 0);
        if (sum < min3Sum) {
          min3Sum = sum;
          best3Window = window;
        }
      }
    }

    if (best3Window) {
      best3Window.forEach((idx) => selected.add(idx));
      return selected;
    }

    // 4. Fallback: 2 consecutive words in validIndices
    for (let i = n - 2; i >= 0; i--) {
      const window = [i, i + 1];
      if (window.every((idx) => validIndices.includes(idx))) {
        window.forEach((idx) => selected.add(idx));
        return selected;
      }
    }

    availableIndices.slice(-3).forEach((idx) => selected.add(idx));
    return selected;
  }

  return selected;
}

/**
 * Tokenizes a story into structured SentenceToken and WordToken objects based on the didactic level.
 */
export function tokenizeStory(
  rawText: string,
  level: ReadingLevelNumber,
  companionName: string = 'Bello'
): SentenceToken[] {
  const preparedText = injectCompanionName(rawText, companionName);
  const sentenceStrings = splitIntoSentences(preparedText);

  const isRepeatedReadingLevel = level === 5 || level === 6;

  const sentences: SentenceToken[] = sentenceStrings.map((sentenceStr, sentenceIndex) => {
    const rawWords = sentenceStr.split(/\s+/).filter((w) => w.length > 0);

    const wordMetas: WordMeta[] = rawWords.map((word) => {
      const clean = cleanPunctuation(word);
      const syllables = splitSyllables(clean.length > 0 ? clean : word);
      return {
        word,
        cleanWord: clean,
        syllables: syllables.length > 0 ? syllables : [clean],
      };
    });

    // Determine sentence-level role strategy
    let sentenceRole: 'app' | 'child' | 'mixed' = 'mixed';
    if (level === 5) {
      sentenceRole = sentenceIndex % 2 === 1 ? 'child' : 'app';
    } else if (level === 4) {
      sentenceRole = isLevel4ChildSentence(sentenceIndex) ? 'child' : 'app';
    } else if (level >= 6) {
      sentenceRole = 'child';
    } else {
      sentenceRole = 'mixed';
    }

    const requiresRepeatedReading = isRepeatedReadingLevel && sentenceRole === 'child';

    const phaseAChildIndices =
      sentenceRole === 'mixed' && (level === 1 || level === 2 || level === 3)
        ? selectPhaseAChildIndices(wordMetas, level)
        : new Set<number>();

    const words: WordToken[] = wordMetas.map((meta, wordIndex) => {
      const tokenId = `s${sentenceIndex}_w${wordIndex}`;

      let role: TokenRole = 'app';

      if (sentenceRole === 'child') {
        role = 'child';
      } else if (sentenceRole === 'app') {
        role = 'app';
      } else {
        role = phaseAChildIndices.has(wordIndex) ? 'child' : 'app';
      }

      return {
        id: tokenId,
        word: meta.word,
        cleanWord: meta.cleanWord,
        syllables: meta.syllables,
        role,
        status: 'pending',
        sentenceIndex,
        wordIndexInSentence: wordIndex,
        hasInterventionActive: false,
      };
    });

    return {
      id: `sentence_${sentenceIndex}`,
      sentenceIndex,
      rawText: sentenceStr,
      words,
      role: sentenceRole,
      requiresRepeatedReading,
      isCompleted: false,
    };
  });

  return sentences;
}
