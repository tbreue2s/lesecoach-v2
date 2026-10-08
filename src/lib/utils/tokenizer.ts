import type {
  ReadingLevelNumber,
  SentenceToken,
  WordToken,
  TokenRole,
} from '../types/reading';

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
  // Matches sentence endings (. ! ?) while preserving text
  const rawSentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return rawSentences;
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

  const sentences: SentenceToken[] = sentenceStrings.map((sentenceStr, sentenceIndex) => {
    const rawWords = sentenceStr.split(/\s+/).filter((w) => w.length > 0);

    // Repeated Reading is active for Phase B (Levels 4, 5, 6)
    const requiresRepeatedReading = level === 4 || level === 5 || level === 6;

    // Determine sentence-level role strategy
    let sentenceRole: 'app' | 'child' | 'mixed' = 'mixed';
    if (level === 5) {
      // Tandem: Alternating sentences (0 = app, 1 = child, 2 = app, 3 = child, ...)
      sentenceRole = sentenceIndex % 2 === 1 ? 'child' : 'app';
    } else if (level === 4) {
      // Periodic child sentences (e.g. sentence 1 and 3 are child, others app)
      sentenceRole = sentenceIndex % 2 === 1 ? 'child' : 'app';
    } else if (level >= 6) {
      // Solo / Free reading: Child reads every sentence
      sentenceRole = 'child';
    } else {
      // Levels 1-3: Mixed sentence where specific target words belong to the child
      sentenceRole = 'mixed';
    }

    // Assign roles to individual word tokens
    const words: WordToken[] = rawWords.map((word, wordIndex) => {
      const clean = cleanPunctuation(word);
      const tokenId = `s${sentenceIndex}_w${wordIndex}`;

      let role: TokenRole = 'app';

      if (sentenceRole === 'child') {
        role = 'child';
      } else if (sentenceRole === 'app') {
        role = 'app';
      } else {
        // Phase A: Word-level target allocation (Levels 1, 2, 3)
        if (level === 1) {
          // Exactly 1 target word per sentence (select the last content word or index 2)
          const targetIndex = Math.min(2, rawWords.length - 1);
          role = wordIndex === targetIndex ? 'child' : 'app';
        } else if (level === 2) {
          // Exactly 2 target words per sentence
          const target1 = Math.min(1, rawWords.length - 1);
          const target2 = Math.min(rawWords.length - 1, target1 + 2);
          role = (wordIndex === target1 || wordIndex === target2) ? 'child' : 'app';
        } else if (level === 3) {
          // 3 to 4 target words (half-sentence cluster)
          const clusterStart = Math.max(0, Math.floor(rawWords.length / 2));
          const clusterEnd = Math.min(rawWords.length, clusterStart + 3);
          role = (wordIndex >= clusterStart && wordIndex < clusterEnd) ? 'child' : 'app';
        }
      }

      return {
        id: tokenId,
        word,
        cleanWord: clean,
        role,
        status: 'pending',
        sentenceIndex,
        wordIndexInSentence: wordIndex,
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
