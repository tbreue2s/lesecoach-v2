import type {
  ReadingLevelNumber,
  SentenceToken,
  StoryData,
} from '../types/reading';
import { READING_LEVEL_INFOS } from '../data/readingLevels';
import {
  splitIntoSentences,
  cleanPunctuation,
  hasComplexClusters,
  calculateWordComplexity,
  tokenizeStory,
} from './tokenizer';
import { splitSyllables } from './syllableSplitter';

export { hasComplexClusters, calculateWordComplexity };

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates a single word and its syllables against a didactic reading level.
 */
export function validateWordForLevel(
  word: string,
  syllables: string[],
  level: ReadingLevelNumber
): ValidationResult {
  const levelInfo = READING_LEVEL_INFOS[level];
  if (!levelInfo) {
    return { isValid: false, reason: `Unknown level: ${level}` };
  }

  const clean = cleanPunctuation(word);

  // Phase A strict rule: Child words must NEVER have >= 4 syllables
  if (level <= 3 && syllables.length >= 4) {
    return {
      isValid: false,
      reason: `Wort "${word}" hat ${syllables.length} Silben. Wörter mit >= 4 Silben sind in Phase A für das Kind strikt verboten.`,
    };
  }

  // Level 1: Strict didactic complexity score threshold (score === 0)
  if (level === 1) {
    if (calculateWordComplexity(clean, syllables) > 0) {
      return {
        isValid: false,
        reason: `Wort "${word}" hat eine zu hohe Komplexität für Level 1 (Score > 0).`,
      };
    }
  }

  // Level 2: Strict rules forbidding ß, double consonants, and ck/tz, max 2 syllables
  if (level === 2) {
    if (
      /ß/i.test(clean) ||
      /([a-zA-ZäöüÄÖÜ])\1/i.test(clean) ||
      /(ck|tz)/i.test(clean) ||
      syllables.length >= 3
    ) {
      return {
        isValid: false,
        reason: `Wort "${word}" erfüllt die Kriterien für Level 2 nicht.`,
      };
    }
  }

  // Check general syllable length against level constraint
  const { maxSyllablesPerWord, allowComplexClusters } = levelInfo.constraints;
  if (syllables.length > maxSyllablesPerWord) {
    return {
      isValid: false,
      reason: `Wort "${word}" hat ${syllables.length} Silben (maximal ${maxSyllablesPerWord} erlaubt für Level ${level}).`,
    };
  }

  if (!allowComplexClusters && hasComplexClusters(word)) {
    return {
      isValid: false,
      reason: `Wort "${word}" enthält unzulässige Konsonanten-Cluster für Level ${level}.`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a sentence token against the constraints of a given reading level.
 */
export function validateSentenceForLevel(
  sentence: SentenceToken,
  level: ReadingLevelNumber
): ValidationResult {
  const levelInfo = READING_LEVEL_INFOS[level];
  if (!levelInfo) {
    return { isValid: false, reason: `Unknown level: ${level}` };
  }

  const childIndices: number[] = [];
  sentence.words.forEach((w, idx) => {
    if (w.role === 'child') childIndices.push(idx);
  });
  const childTokens = sentence.words.filter((w) => w.role === 'child');
  const childWordCount = childTokens.length;
  const combinedSyllables = childTokens.reduce((sum, token) => sum + token.syllables.length, 0);

  if (level === 1) {
    if (childWordCount > 1) {
      return {
        isValid: false,
        reason: `Level 1 erlaubt maximal 1 Zielwort pro Satz (gefunden: ${childWordCount}).`,
      };
    }
  } else if (level === 2) {
    if (childWordCount !== 2 && childWordCount !== 0) {
      return {
        isValid: false,
        reason: `Level 2 erfordert genau 2 Zielwörter pro Satz oder 0 wenn die App vorliest (gefunden: ${childWordCount}).`,
      };
    }
    if (childWordCount === 2) {
      // Check adjacency (consecutive indices i and i+1)
      if (childIndices[1] !== childIndices[0] + 1) {
        return {
          isValid: false,
          reason: `Level 2 Wortpaar muss unmittelbar aufeinander folgen (Indizes: ${childIndices.join(', ')}).`,
        };
      }
      if (combinedSyllables > 4) {
        return {
          isValid: false,
          reason: `Level 2 Wortpaar darf zusammen maximal 4 Silben haben (gefunden: ${combinedSyllables} Silben).`,
        };
      }
      for (const token of childTokens) {
        if (token.syllables.length >= 3) {
          return {
            isValid: false,
            reason: `Wort "${token.cleanWord}" hat ${token.syllables.length} Silben (>= 3 Silben im Level 2 Paar verboten).`,
          };
        }
      }
    }
  } else if (level === 3) {
    if (childWordCount < 3 || childWordCount > 4) {
      return {
        isValid: false,
        reason: `Level 3 erfordert 3 bis 4 Wörter am Stück (gefunden: ${childWordCount}).`,
      };
    }
    if (combinedSyllables > 7) {
      return {
        isValid: false,
        reason: `Level 3 Halbsatz darf zusammen maximal 7 Silben haben (gefunden: ${combinedSyllables} Silben).`,
      };
    }
  }

  // Phase A strict rule: No child token may have >= 4 syllables
  if (level <= 3) {
    for (const token of childTokens) {
      if (token.syllables.length >= 4) {
        return {
          isValid: false,
          reason: `Wort "${token.cleanWord}" hat ${token.syllables.length} Silben (Wörter >= 4 Silben sind in Phase A für das Kind verboten).`,
        };
      }
    }
  }

  // Check individual word validity for all child tokens
  for (const token of childTokens) {
    const wordVal = validateWordForLevel(token.cleanWord, token.syllables, level);
    if (!wordVal.isValid) {
      return wordVal;
    }
  }

  return { isValid: true };
}

export interface StoryValidationResult {
  isSuitable: boolean;
  issues: string[];
}

/**
 * Validates a full story text or data against the didactic constraints of a reading level.
 */
export function validateStoryForLevel(
  storyText: string,
  level: ReadingLevelNumber
): StoryValidationResult {
  const issues: string[] = [];
  const levelInfo = READING_LEVEL_INFOS[level];

  if (!levelInfo) {
    return { isSuitable: false, issues: [`Unbekanntes Level: ${level}`] };
  }

  const sentences = splitIntoSentences(storyText);
  const words = storyText.split(/\s+/).filter((w) => w.trim().length > 0);
  const totalWordCount = words.length;

  const { totalStoryWordsMin, totalStoryWordsMax, totalSentencesMax } = levelInfo.constraints;

  if (totalStoryWordsMin !== undefined && totalWordCount < totalStoryWordsMin) {
    issues.push(
      `Text hat nur ${totalWordCount} Wörter (Minimum für Level ${level} ist ${totalStoryWordsMin}).`
    );
  }

  if (totalStoryWordsMax !== undefined && totalWordCount > totalStoryWordsMax) {
    issues.push(
      `Text hat ${totalWordCount} Wörter (Maximum für Level ${level} ist ${totalStoryWordsMax}).`
    );
  }

  if (totalSentencesMax !== undefined && sentences.length > totalSentencesMax) {
    issues.push(
      `Text hat ${sentences.length} Sätze (Maximum für Level ${level} ist ${totalSentencesMax}).`
    );
  }

  // Didactic word suitability:
  // Complex or richer narrative words may be read aloud by the app,
  // as long as sufficient suitable simple target words are present for the child.
  if (level === 1) {
    const tokenized = tokenizeStory(storyText, 1);
    tokenized.forEach((sent, idx) => {
      const childWords = sent.words.filter((w) => w.role === 'child');
      if (childWords.length === 0) {
        issues.push(
          `Satz ${idx + 1} enthält kein geeignetes einfaches Zielwort (Score 0) für das Kind.`
        );
      } else {
        for (const token of childWords) {
          const val = validateWordForLevel(token.cleanWord, token.syllables, 1);
          if (!val.isValid) {
            issues.push(
              val.reason || `Ungültiges Kind-Zielwort in Satz ${idx + 1}: ${token.cleanWord}`
            );
          }
        }
      }
    });
  } else if (level === 2) {
    const tokenized = tokenizeStory(storyText, 2);
    tokenized.forEach((sent, idx) => {
      const childWords = sent.words.filter((w) => w.role === 'child');
      if (childWords.length > 0 && childWords.length !== 2) {
        issues.push(`Satz ${idx + 1} enthält kein passendes Wortpaar (2 Wörter) für das Kind.`);
      }
    });
  } else if (level === 3) {
    const tokenized = tokenizeStory(storyText, 3);
    tokenized.forEach((sent, idx) => {
      const childWords = sent.words.filter((w) => w.role === 'child');
      if (childWords.length > 0 && (childWords.length < 3 || childWords.length > 4)) {
        issues.push(`Satz ${idx + 1} enthält keine passende Phrase (3-4 Wörter) für das Kind.`);
      }
    });
  }

  // Level 8 checks for expressive punctuation (?, !)
  if (level === 8) {
    const hasExpressivePunctuation = /[?!]/.test(storyText);
    if (!hasExpressivePunctuation) {
      issues.push(`Level 8 empfiehlt abwechslungsreiche Satzzeichen (?, !).`);
    }
  }

  return {
    isSuitable: issues.length === 0,
    issues,
  };
}

/**
 * Helper to validate a StoryData object.
 */
export function validateStoryLevelSuitability(
  story: StoryData,
  level: ReadingLevelNumber
): StoryValidationResult {
  return validateStoryForLevel(story.text, level);
}
