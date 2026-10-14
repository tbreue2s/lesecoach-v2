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

// German pronouns and non-noun sentence starters
export const GERMAN_PRONOUNS = new Set([
  'er', 'sie', 'es', 'wir', 'ihr', 'du', 'ich', 'mir', 'dir', 'ihm', 'uns', 'euch', 'ihnen', 'man',
  'ihre', 'ihren', 'ihrem', 'ihres', 'seine', 'seinen', 'seinem', 'seines',
  'meine', 'meinen', 'meinem', 'meines', 'deine', 'deinen', 'deinem', 'deines',
  'alle', 'allen', 'allem', 'alles', 'jede', 'jeder', 'jedes', 'jemand', 'niemand',
  'wer', 'was', 'wie', 'wo', 'wann', 'warum', 'welche', 'welcher', 'welches',
]);

/**
 * Checks if a word is a German noun (capitalized in orthography, not a pronoun/article/particle).
 */
export function isNoun(cleanWord: string): boolean {
  if (!cleanWord || cleanWord.length === 0) return false;
  const lower = cleanWord.toLowerCase();
  if (
    isArticle(lower) ||
    FORBIDDEN_LEVEL1_PARTICLES.has(lower) ||
    GERMAN_PRONOUNS.has(lower)
  ) {
    return false;
  }
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
 * Checks whether a word is the configured child name or companion name (including genitive 's').
 */
export function isProtectedName(
  word: string,
  companionName?: string,
  childName?: string
): boolean {
  const clean = cleanPunctuation(word).toLowerCase();
  if (!clean) return false;

  const namesToCheck = [companionName, childName].filter(Boolean) as string[];
  for (const name of namesToCheck) {
    const n = cleanPunctuation(name).toLowerCase();
    if (!n) continue;
    if (clean === n || clean === n + 's') {
      return true;
    }
  }
  return false;
}

/**
 * Calculates didactic complexity penalty score for a word (WP07).
 *
 * Scoring Rules:
 * 1. +10 Points (Red light / Killer):
 *    - Regex-Match: /[ßcqxyz]|ck|tz|pf/i.test(word)
 *    - Syllables limit: syllables.length >= 3
 *    - Compound protection (Length): word.length >= 8
 *    - Heavy endings in polysyllables: /(es|em|er|sten|chem)$/i.test(word) && syllables.length > 1
 *
 * 2. +3 Points (Heavy hurdles):
 *    - Nasals: /(nk|ng)/i.test(word)
 *    - Consonant clusters at syllable or word end (>= 2 consecutive consonants): /[bcdfghjklmnpqrstvwxyzß]{2,}$/i
 *
 * 3. +2 Points (Medium hurdles):
 *    - Complex graphemes: /(sch|ch|sp|st)/i.test(word)
 *    - Double letters (incl. umlauts): /([a-zäöü])\1/i.test(word)
 *
 * 4. +1 Point (Light hurdles):
 *    - Diphthongs: /(ei|au|eu|äu|ie)/i.test(word)
 *    - Simple umlauts: /[äöü]/i.test(word)
 *    - Dehnungs-h: /[aeiouäöü]h/i.test(word)
 */
export function calculateWordComplexity(
  word: string,
  syllables?: string[]
): number {
  const clean = cleanPunctuation(word).toLowerCase();
  if (!clean) return 0;

  let score = 0;

  const sylList =
    syllables && syllables.length > 0 ? syllables : splitSyllables(clean);
  const effSyllables = sylList.length > 0 ? sylList : [clean];

  // 1. +10 Punkte (Rote Ampel / Killer)
  if (/[ßcqxyz]|ck|tz|pf/i.test(clean)) {
    score += 10;
  }
  if (effSyllables.length >= 3) {
    score += 10;
  }
  if (clean.length >= 8) {
    score += 10;
  }
  if (/(es|em|er|sten|chem)$/i.test(clean) && effSyllables.length > 1) {
    score += 10;
  }

  // 2. +3 Punkte (Schwere Hürden)
  if (/(nk|ng)/i.test(clean)) {
    score += 3;
  }
  const CONSONANT_CLUSTER_END = /[bcdfghjklmnpqrstvwxyzß]{2,}$/i;
  let hasWordEndCluster = false;
  if (CONSONANT_CLUSTER_END.test(clean)) {
    score += 3;
    hasWordEndCluster = true;
  }
  effSyllables.forEach((syl, idx) => {
    const cleanSyl = cleanPunctuation(syl).toLowerCase();
    const isLast = idx === effSyllables.length - 1;
    if (CONSONANT_CLUSTER_END.test(cleanSyl)) {
      if (!isLast || !hasWordEndCluster) {
        score += 3;
      }
    }
  });

  // 3. +2 Punkte (Mittlere Hürden)
  if (/(sch|ch|sp|st)/i.test(clean)) {
    score += 2;
  }
  if (/([a-zäöü])\1/i.test(clean)) {
    score += 2;
  }

  // 4. +1 Punkt (Leichte Hürden)
  if (/(ei|au|eu|äu|ie)/i.test(clean)) {
    score += 1;
  }
  if (/[äöü]/i.test(clean)) {
    score += 1;
  }
  if (/[aeiouäöü]h/i.test(clean)) {
    score += 1;
  }

  return score;
}

/**
 * Checks whether a word is eligible as a Level 1 reading candidate (Noun or finite full verb).
 */
export function isLevel1EligibleWord(cleanWord: string): boolean {
  if (!cleanWord || cleanWord.length === 0) return false;
  const lower = cleanWord.toLowerCase();
  if (FORBIDDEN_LEVEL1_PARTICLES.has(lower)) return false;
  if (isArticle(lower)) return false;
  if (isGenitiveForm(cleanWord)) return false;
  if (GERMAN_PRONOUNS.has(lower)) return false;

  if (isNoun(cleanWord)) {
    return true;
  }

  // Vollverben or other candidate words: exclude pronouns and inflected adjectives
  if (isAdjective(cleanWord)) return false;
  if (/(e|er|en|es|em|el|ig|lich|isch|bar|sam|haft)$/i.test(lower)) {
    return false;
  }
  return true;
}

export interface WordMeta {
  word: string;
  cleanWord: string;
  syllables: string[];
}

/**
 * Intelligent selector for Phase A (Levels 1, 2, 3) enforcing didactic scoring (WP07):
 * - Level 1: Wählt das Nomen/Vollverb mit dem niedrigsten Score (Score <= 1). Überspringt bei Score >= 2 (role: 'app').
 * - Level 2: Strikte Adjazenz [Artikel/Adjektiv + Nomen], sum(syllables) <= 4, priorisiert nach niedrigstem Score.
 * - Level 3: 3 bis 4 aufeinanderfolgende Wörter mit sum(syllables) <= 7, kein Wort >= 4 Silben.
 */
export function selectPhaseAChildIndices(
  rawWords: WordMeta[],
  level: 1 | 2 | 3,
  usedChildNames?: Set<string>,
  companionName?: string,
  childName?: string
): Set<number> {
  const n = rawWords.length;
  if (n === 0) return new Set();

  const selected = new Set<number>();

  if (level === 1) {
    let bestIndex: number | null = null;
    let lowestScore = Infinity;
    let isBestNoun = false;

    for (let i = 0; i < rawWords.length; i++) {
      const w = rawWords[i];
      if (!isLevel1EligibleWord(w.cleanWord)) continue;

      let score = calculateWordComplexity(w.cleanWord, w.syllables);

      // Eigennamen-Entwertung:
      // Konfigurierte Eigennamen des Kindes und des Begleiters erhalten von Grund auf +50 Penalty,
      // damit sie niemals primär gewählt werden, wenn andere Nomen/Verben im Satz existieren.
      // Nach dem 1. Vorkommen in der Geschichte erhalten sie weiterhin +100.
      if (isProtectedName(w.cleanWord, companionName, childName)) {
        score += 50;
        const lower = cleanPunctuation(w.cleanWord).toLowerCase();
        if (usedChildNames?.has(lower)) {
          score += 100;
        }
      }

      const isCurrentNoun = isNoun(w.cleanWord);

      if (
        score < lowestScore ||
        (score === lowestScore && isCurrentNoun && !isBestNoun)
      ) {
        lowestScore = score;
        bestIndex = i;
        isBestNoun = isCurrentNoun;
      }
    }

    // In Level 1 (Einzelwort-Entdecker) darf ein Wort für role: 'child' MAXIMAL einen Complexity-Score von 1 besitzen.
    // Wörter mit Score >= 2 sind strikt zu schwer.
    // Wenn das am leichtesten bewertete Nomen/Verb im Satz einen Score >= 2 hat: Weise den gesamten Satz der App zu (role: 'app').
    if (bestIndex !== null && lowestScore <= 1) {
      selected.add(bestIndex);
    }

    return selected;
  }

  if (level === 2) {
    if (n < 2) {
      return selected;
    }

    let bestPair: [number, number] | null = null;
    let lowestScore = Infinity;

    // Tier 1: Strikte Adjazenz für [Artikel + Nomen] oder [Adjektiv + Nomen], Summe der Silben <= 4
    for (let i = 0; i < n - 1; i++) {
      const w1 = rawWords[i];
      const w2 = rawWords[i + 1];

      const isFirstArticleOrAdj = isArticle(w1.cleanWord) || isAdjective(w1.cleanWord);
      const isSecondNoun = isNoun(w2.cleanWord);

      if (!isFirstArticleOrAdj || !isSecondNoun) continue;

      const syl1 = w1.syllables.length;
      const syl2 = w2.syllables.length;
      if (syl1 + syl2 > 4) continue;

      let score1 = calculateWordComplexity(w1.cleanWord, w1.syllables);
      let score2 = calculateWordComplexity(w2.cleanWord, w2.syllables);

      if (isProtectedName(w1.cleanWord, companionName, childName)) {
        score1 += 50;
        const lower = cleanPunctuation(w1.cleanWord).toLowerCase();
        if (usedChildNames?.has(lower)) score1 += 100;
      }
      if (isProtectedName(w2.cleanWord, companionName, childName)) {
        score2 += 50;
        const lower = cleanPunctuation(w2.cleanWord).toLowerCase();
        if (usedChildNames?.has(lower)) score2 += 100;
      }

      const totalScore = score1 + score2;
      if (totalScore < lowestScore) {
        lowestScore = totalScore;
        bestPair = [i, i + 1];
      }
    }

    if (bestPair) {
      selected.add(bestPair[0]);
      selected.add(bestPair[1]);
      return selected;
    }

    // Tier 2 Fallback: Konsekutives Paar mit Summe <= 4 ohne verbotenen Partikel am Ende
    for (let i = 0; i < n - 1; i++) {
      const w1 = rawWords[i];
      const w2 = rawWords[i + 1];

      if (FORBIDDEN_LEVEL1_PARTICLES.has(w2.cleanWord.toLowerCase())) continue;

      const syl1 = w1.syllables.length;
      const syl2 = w2.syllables.length;
      if (syl1 + syl2 > 4) continue;

      let score1 = calculateWordComplexity(w1.cleanWord, w1.syllables);
      let score2 = calculateWordComplexity(w2.cleanWord, w2.syllables);

      if (isProtectedName(w1.cleanWord, companionName, childName)) {
        score1 += 50;
        const lower = cleanPunctuation(w1.cleanWord).toLowerCase();
        if (usedChildNames?.has(lower)) score1 += 100;
      }
      if (isProtectedName(w2.cleanWord, companionName, childName)) {
        score2 += 50;
        const lower = cleanPunctuation(w2.cleanWord).toLowerCase();
        if (usedChildNames?.has(lower)) score2 += 100;
      }

      const totalScore = score1 + score2;
      if (totalScore < lowestScore) {
        lowestScore = totalScore;
        bestPair = [i, i + 1];
      }
    }

    if (bestPair) {
      selected.add(bestPair[0]);
      selected.add(bestPair[1]);
      return selected;
    }

    return selected;
  }

  if (level === 3) {
    const validIndices = rawWords
      .map((_, idx) => idx)
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
  companionName: string = 'Bello',
  childName?: string,
  structuredOutput?: import('../types/reading').GeneratedStoryOutput
): SentenceToken[] {
  const preparedText = injectCompanionName(rawText, companionName);
  const sentenceStrings = splitIntoSentences(preparedText);

  const isRepeatedReadingLevel = level === 5 || level === 6;

  // Track protected names that have received role: 'child' in this story
  // Requirement: Child name and companion name may receive role: 'child' AT MOST ONCE per story!
  const usedChildNames = new Set<string>();

  const sentences: SentenceToken[] = sentenceStrings.map((sentenceStr, sentenceIndex) => {
    const rawWords = sentenceStr.split(/\s+/).filter((w) => w.length > 0);

    const wordMetas: WordMeta[] = rawWords.map((word, wordIndex) => {
      const clean = cleanPunctuation(word);
      const preStructuredWord = structuredOutput?.sentences?.[sentenceIndex]?.words?.[wordIndex];
      const syllables =
        preStructuredWord?.syllables && preStructuredWord.syllables.length > 0
          ? preStructuredWord.syllables
          : splitSyllables(clean.length > 0 ? clean : word);

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
        ? selectPhaseAChildIndices(wordMetas, level, usedChildNames, companionName, childName)
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

      // Eigennamen-Beschränkung:
      // Der konfigurierte Name des Kindes und der Begleiter-Name dürfen INNERHALB EINER GESCHICHTE
      // maximal EIN EINZIGES MAL das Attribut role: 'child' erhalten.
      // Bei allen weiteren Vorkommen im Text erhalten sie zwingend role: 'app'.
      if (level <= 5 && role === 'child' && isProtectedName(meta.cleanWord, companionName, childName)) {
        const lower = cleanPunctuation(meta.cleanWord).toLowerCase();
        if (usedChildNames.has(lower)) {
          role = 'app';
        } else {
          usedChildNames.add(lower);
        }
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
