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
