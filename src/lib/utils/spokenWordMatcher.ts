/**
 * Tolerant Fuzzy Word Matcher for German Speech-to-Text Recognition in Early Reading.
 * Supports token matching, punctuation cleaning, umlaut normalization,
 * and Levenshtein edit-distance tolerance for words >= 4 letters.
 */

export interface ValidationMatchResult {
  isValid: boolean;
  normalizedSpoken: string;
  normalizedTarget: string;
  matchedWord: string | null;
  distance: number;
  matchType: 'exact' | 'token_exact' | 'levenshtein' | 'none';
}

/**
 * Normalizes text by converting to lowercase, removing punctuation and special characters,
 * and collapsing multiple whitespace characters.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,!?:;"'„“»«\(\)\[\]\{\}\/\\_~`^*+=<>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates the standard Levenshtein distance (edit distance) between two strings.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Validates whether the spoken phrase matches the target word with child-friendly tolerance.
 *
 * Rules:
 * 1. Sanitization: Lowercase, punctuation removal, trim.
 * 2. Exact match: If normalized spoken === normalized target.
 * 3. Token inclusion: If target word exists as an exact word in multi-word spoken input (e.g. "ein Hund").
 * 4. Fuzzy Levenshtein:
 *    - For target words with length >= 4: allow Levenshtein distance <= 1 against any spoken token.
 *    - For target words with length < 4: require exact match to prevent false positives.
 */
export function validateSpokenWord(
  spokenText: string,
  targetWord: string
): ValidationMatchResult {
  const cleanSpoken = normalizeText(spokenText);
  const cleanTarget = normalizeText(targetWord);

  if (!cleanSpoken || !cleanTarget) {
    return {
      isValid: false,
      normalizedSpoken: cleanSpoken,
      normalizedTarget: cleanTarget,
      matchedWord: null,
      distance: -1,
      matchType: 'none',
    };
  }

  // 1. Direct whole phrase exact match
  if (cleanSpoken === cleanTarget) {
    return {
      isValid: true,
      normalizedSpoken: cleanSpoken,
      normalizedTarget: cleanTarget,
      matchedWord: cleanSpoken,
      distance: 0,
      matchType: 'exact',
    };
  }

  const tokens = cleanSpoken.split(' ').filter((t) => t.length > 0);

  // 2. Token exact match (e.g. "der Baum" -> ["der", "baum"] matches "baum")
  const exactToken = tokens.find((token) => token === cleanTarget);
  if (exactToken) {
    return {
      isValid: true,
      normalizedSpoken: cleanSpoken,
      normalizedTarget: cleanTarget,
      matchedWord: exactToken,
      distance: 0,
      matchType: 'token_exact',
    };
  }

  // 3. Levenshtein fuzzy match across tokens (only for words with >= 4 characters)
  if (cleanTarget.length >= 4) {
    // Check against each token in spoken transcript
    let bestDistance = Infinity;
    let bestToken: string | null = null;

    for (const token of tokens) {
      const dist = calculateLevenshteinDistance(token, cleanTarget);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestToken = token;
      }
    }

    if (bestDistance <= 1 && bestToken) {
      return {
        isValid: true,
        normalizedSpoken: cleanSpoken,
        normalizedTarget: cleanTarget,
        matchedWord: bestToken,
        distance: bestDistance,
        matchType: 'levenshtein',
      };
    }

    // Also check direct distance against whole spoken text if it's a single word without spaces
    const fullDist = calculateLevenshteinDistance(cleanSpoken, cleanTarget);
    if (fullDist <= 1) {
      return {
        isValid: true,
        normalizedSpoken: cleanSpoken,
        normalizedTarget: cleanTarget,
        matchedWord: cleanSpoken,
        distance: fullDist,
        matchType: 'levenshtein',
      };
    }
  }

  return {
    isValid: false,
    normalizedSpoken: cleanSpoken,
    normalizedTarget: cleanTarget,
    matchedWord: null,
    distance: calculateLevenshteinDistance(cleanSpoken, cleanTarget),
    matchType: 'none',
  };
}

export interface ConsecutiveMatchResult {
  matchedCount: number;
  isValid: boolean;
  matchedWords: string[];
}

/**
 * Matches a spoken transcript against an ordered list of consecutive target words (e.g. ["alter", "Hut"]).
 * Returns how many consecutive target words matched in sequential order starting from index 0.
 */
export function matchConsecutiveWords(
  spokenText: string,
  targetWords: string[]
): ConsecutiveMatchResult {
  if (!spokenText || targetWords.length === 0) {
    return { matchedCount: 0, isValid: false, matchedWords: [] };
  }

  const cleanSpoken = normalizeText(spokenText);
  const cleanTargets = targetWords.map((w) => normalizeText(w)).filter((w) => w.length > 0);

  if (cleanTargets.length === 0 || !cleanSpoken) {
    return { matchedCount: 0, isValid: false, matchedWords: [] };
  }

  // 1. Direct joined phrase match (e.g. "alter hut" === "alter hut")
  const joinedTarget = cleanTargets.join(' ');
  if (cleanSpoken === joinedTarget) {
    return {
      matchedCount: cleanTargets.length,
      isValid: true,
      matchedWords: cleanTargets,
    };
  }

  const tokens = cleanSpoken.split(' ').filter((t) => t.length > 0);
  let matchedCount = 0;
  let currentTokenIndex = 0;
  const matchedWords: string[] = [];

  for (let targetIdx = 0; targetIdx < cleanTargets.length; targetIdx++) {
    const target = cleanTargets[targetIdx];
    let foundMatch = false;

    for (let i = currentTokenIndex; i < tokens.length; i++) {
      const token = tokens[i];
      let matches = false;

      // Exact match
      if (token === target) {
        matches = true;
      } else if (target.length >= 4) {
        // Levenshtein fuzzy match <= 1 for >= 4 char words
        const dist = calculateLevenshteinDistance(token, target);
        if (dist <= 1) {
          matches = true;
        }
      }

      if (matches) {
        matchedCount++;
        matchedWords.push(token);
        currentTokenIndex = i + 1; // subsequent target words must appear after this token
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      // Must match consecutive words starting from index 0
      break;
    }
  }

  return {
    matchedCount,
    isValid: matchedCount > 0,
    matchedWords,
  };
}
