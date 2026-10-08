import type { WordToken } from '../types/reading';

export interface SpokenSpan {
  tokenId: string;
  word: string;
  startIndex: number;
  endIndex: number;
}

export interface TokenTimeEstimate {
  tokenId: string;
  word: string;
  startMs: number;
  endMs: number;
}

/**
 * Builds spoken text and corresponding character spans for a list of word tokens.
 * Each token's exact character offsets are calculated based on single-space joined words.
 */
export function buildSpokenSpans(tokens: WordToken[]): {
  spokenText: string;
  spans: SpokenSpan[];
} {
  if (!tokens || tokens.length === 0) {
    return { spokenText: '', spans: [] };
  }

  const spans: SpokenSpan[] = [];
  let currentPos = 0;
  const words: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const wordText = token.word;
    const startIndex = currentPos;
    const endIndex = startIndex + wordText.length;

    spans.push({
      tokenId: token.id,
      word: wordText,
      startIndex,
      endIndex,
    });

    words.push(wordText);
    currentPos = endIndex + 1; // +1 space between tokens
  }

  const spokenText = words.join(' ');
  return { spokenText, spans };
}

/**
 * Maps a SpeechSynthesisUtterance `onboundary` event `charIndex` to the matching WordToken ID.
 * Supports exact boundary hits, mid-word indices, and graceful fallback for browser timing quirks.
 */
export function mapCharIndexToTokenId(
  charIndex: number,
  spans: SpokenSpan[]
): string | null {
  if (!spans || spans.length === 0 || charIndex < 0) {
    return null;
  }

  // 1. Direct span interval check: startIndex <= charIndex < endIndex
  for (const span of spans) {
    if (charIndex >= span.startIndex && charIndex < span.endIndex) {
      return span.tokenId;
    }
  }

  // 2. Trailing space or boundary hit: if charIndex is on the space right after a span
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const nextSpan = spans[i + 1];
    if (nextSpan && charIndex >= span.endIndex && charIndex < nextSpan.startIndex) {
      return span.tokenId;
    }
  }

  // 3. Fallback: Find the last span whose startIndex is <= charIndex
  for (let i = spans.length - 1; i >= 0; i--) {
    if (charIndex >= spans[i].startIndex) {
      return spans[i].tokenId;
    }
  }

  // 4. Default to first span if charIndex was before all spans
  return spans[0]?.tokenId || null;
}

/**
 * Calculates time estimates for each token based on syllable/character length,
 * speech rate, and sentence punctuation pauses.
 * Calibrated for German SpeechSynthesis at rate ~0.78.
 */
export function calculateTokenTimeEstimates(
  tokens: WordToken[],
  rate: number = 0.78
): { totalDurationMs: number; estimates: TokenTimeEstimate[] } {
  if (!tokens || tokens.length === 0) {
    return { totalDurationMs: 0, estimates: [] };
  }

  const effectiveRate = Math.max(0.5, Math.min(2.0, rate));
  // Calibrated values: 54ms per character and 75ms base word envelope at rate 1.0
  const msPerChar = 54 / effectiveRate;
  const baseWordMs = 75 / effectiveRate;

  let currentMs = 0;
  const estimates: TokenTimeEstimate[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const clean = token.cleanWord || token.word;
    let wordDuration = baseWordMs + clean.length * msPerChar;

    // Pauses for punctuation
    if (/[.!?]$/.test(token.word)) {
      wordDuration += 180 / effectiveRate;
    } else if (/[,;:]$/.test(token.word)) {
      wordDuration += 100 / effectiveRate;
    }

    const startMs = currentMs;
    const endMs = startMs + wordDuration;

    estimates.push({
      tokenId: token.id,
      word: token.word,
      startMs,
      endMs,
    });

    currentMs = endMs;
  }

  return { totalDurationMs: currentMs, estimates };
}

/**
 * Maps elapsed speaking time in ms to the currently spoken WordToken ID.
 */
export function mapElapsedTimeToTokenId(
  elapsedMs: number,
  estimates: TokenTimeEstimate[]
): string | null {
  if (!estimates || estimates.length === 0 || elapsedMs < 0) return null;

  for (const est of estimates) {
    if (elapsedMs >= est.startMs && elapsedMs < est.endMs) {
      return est.tokenId;
    }
  }

  if (elapsedMs >= estimates[estimates.length - 1].endMs) {
    return estimates[estimates.length - 1].tokenId;
  }

  return estimates[0].tokenId;
}
