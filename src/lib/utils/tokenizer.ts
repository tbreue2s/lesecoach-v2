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

/**
 * Strict phonetic and orthographic validation filter for didactic reading levels (WP03).
 *
 * 1. Level 1 – Harte Blacklist (role: 'child'):
 *    Verworfen wenn:
 *    - Enthält Sonderzeichen oder seltene Buchstaben: [ß, ä, ö, ü, c, v, w, x, y, q] (groß/klein)
 *    - Enthält Diphthonge / Zwielaute: (ei|au|eu|äu|ie)
 *    - Enthält Konsonanten-Verbindungen: (sch|ch|ck|tz|sp|st|pf|str|qu)
 *    - Enthält Doppelkonsonanten: /(\w)\1/i (z. B. "pp" in Koppel, "ll", "ss", "mm", "tt", "ff", "nn")
 *    - Dehnungs-h: (z. B. Mähne, Reh, Zahn, Ohr)
 *    - Silben-Constraint: Maximal 2 Silben
 *    - Wortart: Nur Nomen oder finite Vollverben (keine gebeugten Adjektive wie "weißen")
 *
 * 2. Level 2 – Filter (role: 'child'):
 *    - 'ß' und Doppelkonsonanten ((\w)\1) sowie 'ck'/'tz' bleiben strikt VERBOTEN.
 *    - Erlaubt: 'ei', 'au', 'ie', einfache Umlaute und 'sch'/'ch'. Max 2 Silben pro Wort.
 */
export function isPhoneticallyValidForLevel(
  word: string,
  level: ReadingLevelNumber
): boolean {
  const clean = cleanPunctuation(word);
  if (!clean || clean.length === 0) return false;

  const lower = clean.toLowerCase();
  const syllables = splitSyllables(clean);

  // Phase A strict rule: Child words must NEVER have >= 4 syllables
  if (level <= 3 && syllables.length >= 4) {
    return false;
  }

  if (level === 1) {
    // 1. Sonderzeichen oder seltene Buchstaben: [ß, ä, ö, ü, c, v, w, x, y, q]
    if (/[ßäöücvwxyq]/i.test(clean)) {
      return false;
    }

    // 2. Diphthonge / Zwielaute: (ei|au|eu|äu|ie)
    if (/(ei|au|eu|äu|ie)/i.test(clean)) {
      return false;
    }

    // 3. Konsonanten-Verbindungen: (sch|ch|ck|tz|sp|st|pf|str|qu)
    if (/(sch|ch|ck|tz|sp|st|pf|str|qu)/i.test(clean)) {
      return false;
    }

    // 4. Doppelkonsonanten: /(\w)\1/i (z. B. "pp" in Koppel, "ll", "ss", "mm", "tt", "ff", "nn")
    if (/([a-zA-ZäöüÄÖÜ])\1/i.test(clean)) {
      return false;
    }

    // Dehnungs-h (z. B. Mähne, Reh, Zahn, Ohr)
    if (hasDehnungsH(clean)) {
      return false;
    }

    // 5. Silben-Constraint: Maximal 2 Silben
    if (syllables.length > 2) {
      return false;
    }

    // 6. Wortart: Nur Nomen oder finite Vollverben (keine gebeugten Adjektive wie "weißen", keine Partikel/Artikel)
    if (FORBIDDEN_LEVEL1_PARTICLES.has(lower) || isArticle(lower) || isGenitiveForm(clean)) {
      return false;
    }

    const isNounWord = isNoun(clean);
    if (!isNounWord) {
      if (isAdjective(clean)) {
        return false;
      }
      if (['er', 'sie', 'es', 'wir', 'ihr', 'du', 'ich', 'mir', 'dir', 'ihm', 'ihr', 'uns', 'euch', 'ihnen', 'man'].includes(lower)) {
        return false;
      }
      // Adjektiv-Flexionsendungen
      if (/(e|er|en|es|em|el|ig|lich|isch|bar|sam|haft)$/i.test(lower)) {
        return false;
      }
    }

    return true;
  }

  if (level === 2) {
    // 1. 'ß' ist strikt VERBOTEN
    if (/ß/i.test(clean)) {
      return false;
    }

    // 2. Doppelkonsonanten ((\w)\1) sind strikt VERBOTEN (z. B. "pp" in Koppel, "ll", "ss", etc.)
    if (/([a-zA-ZäöüÄÖÜ])\1/i.test(clean)) {
      return false;
    }

    // 3. 'ck' / 'tz' bleiben strikt VERBOTEN
    if (/(ck|tz)/i.test(clean)) {
      return false;
    }

    // 4. Silben-Constraint: Im Level-2-Paar darf kein Einzelwort >= 3 Silben haben
    if (syllables.length >= 3) {
      return false;
    }

    // Non-article particles or genitive forbidden
    if ((FORBIDDEN_LEVEL1_PARTICLES.has(lower) && !isArticle(lower)) || isGenitiveForm(clean)) {
      return false;
    }

    // Erlaubt sind: 'ei', 'au', 'ie', einfache Umlaute und 'sch'/'ch'
    return true;
  }

  if (level === 3) {
    if (syllables.length >= 4) return false;
    return true;
  }

  return true;
}

export interface WordMeta {
  word: string;
  cleanWord: string;
  syllables: string[];
}

/**
 * Intelligent selector for Phase A (Levels 1, 2, 3) enforcing strict phonetic and syntactic constraints:
 * - Level 1: Genau 1 Zielwort pro Satz, gefiltert über isPhoneticallyValidForLevel(clean, 1).
 *   Fällt ein Satz durch den Filter (kein Wort erfüllt Kriterien), gibt der Selector ein leeres Set zurück
 *   (die App liest den gesamten Satz vor).
 * - Level 2: Genau 2 aufeinanderfolgende Wörter (beide validiert für Level 2, sum <= 4 Silben).
 * - Level 3: 3 bis 4 aufeinanderfolgende Wörter mit sum(syllables) <= 7, kein Wort >= 4 Silben.
 */
export function selectPhaseAChildIndices(rawWords: WordMeta[], level: 1 | 2 | 3): Set<number> {
  const n = rawWords.length;
  if (n === 0) return new Set();

  const selected = new Set<number>();

  if (level === 1) {
    // 1. Suche bevorzugt ein Nomen, das isPhoneticallyValidForLevel(clean, 1) erfüllt
    for (let i = rawWords.length - 1; i >= 0; i--) {
      const w = rawWords[i];
      if (isPhoneticallyValidForLevel(w.cleanWord, 1) && isNoun(w.cleanWord)) {
        selected.add(i);
        return selected;
      }
    }

    // 2. Ansonsten beliebiges anderes phonetisch valides Wort (z. B. finites Verb)
    for (let i = rawWords.length - 1; i >= 0; i--) {
      const w = rawWords[i];
      if (isPhoneticallyValidForLevel(w.cleanWord, 1)) {
        selected.add(i);
        return selected;
      }
    }

    // 3. Selector-Fallback: Fällt ein Satz durch den Filter (kein Wort erfüllt Kriterien),
    // liest die App den gesamten Satz vor -> leeres Set zurückgeben!
    return selected;
  }

  if (level === 2) {
    if (n < 2) {
      return selected;
    }

    // Tier 1: [Article/Adj + Noun], beide Wörter erfüllen Level 2 Kriterien, syl1 <= 2, syl2 <= 2, sum <= 4
    for (let i = n - 2; i >= 0; i--) {
      const w1 = rawWords[i];
      const w2 = rawWords[i + 1];
      const syl1 = w1.syllables.length;
      const syl2 = w2.syllables.length;

      if (
        isPhoneticallyValidForLevel(w1.cleanWord, 2) &&
        isPhoneticallyValidForLevel(w2.cleanWord, 2) &&
        (isArticle(w1.cleanWord) || isAdjective(w1.cleanWord)) &&
        isNoun(w2.cleanWord) &&
        syl1 <= 2 &&
        syl2 <= 2 &&
        syl1 + syl2 <= 4
      ) {
        selected.add(i);
        selected.add(i + 1);
        return selected;
      }
    }

    // Tier 2: Beliebiges konsekutives Paar, beide Wörter erfüllen Level 2 Kriterien, sum <= 4, kein Partikel am Ende
    for (let i = n - 2; i >= 0; i--) {
      const w1 = rawWords[i];
      const w2 = rawWords[i + 1];
      const syl1 = w1.syllables.length;
      const syl2 = w2.syllables.length;

      if (
        isPhoneticallyValidForLevel(w1.cleanWord, 2) &&
        isPhoneticallyValidForLevel(w2.cleanWord, 2) &&
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

    // Tier 3: Beliebiges konsekutives Paar, beide Wörter erfüllen Level 2 Kriterien, syl1 <= 2, syl2 <= 2
    for (let i = n - 2; i >= 0; i--) {
      const w1 = rawWords[i];
      const w2 = rawWords[i + 1];
      const syl1 = w1.syllables.length;
      const syl2 = w2.syllables.length;

      if (
        isPhoneticallyValidForLevel(w1.cleanWord, 2) &&
        isPhoneticallyValidForLevel(w2.cleanWord, 2) &&
        syl1 <= 2 &&
        syl2 <= 2
      ) {
        selected.add(i);
        selected.add(i + 1);
        return selected;
      }
    }

    // Kein valides Paar gefunden -> App liest vor (leeres Set)
    return selected;
  }

  if (level === 3) {
    const validIndices = rawWords
      .map((w, idx) => idx)
      .filter((idx) => rawWords[idx].syllables.length < 4);

    // 1. 4-Wort-Fenster mit sum <= 7
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

    // 2. 3-Wort-Fenster mit sum <= 7
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

    // 3. Fallback: 3 Wörter mit kleinster Summe
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

    // 4. Fallback: 2 Wörter
    for (let i = n - 2; i >= 0; i--) {
      const window = [i, i + 1];
      if (window.every((idx) => validIndices.includes(idx))) {
        window.forEach((idx) => selected.add(idx));
        return selected;
      }
    }

    const availableIndices = validIndices.length > 0 ? validIndices : [0];
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

    const hasAnyChildWord = words.some((w) => w.role === 'child');
    const actualSentenceRole =
      sentenceRole === 'mixed' && !hasAnyChildWord ? 'app' : sentenceRole;

    const requiresRepeatedReading = isRepeatedReadingLevel && actualSentenceRole === 'child';

    return {
      id: `sentence_${sentenceIndex}`,
      sentenceIndex,
      rawText: sentenceStr,
      words,
      role: actualSentenceRole,
      requiresRepeatedReading,
      isCompleted: false,
    };
  });

  return sentences;
}
