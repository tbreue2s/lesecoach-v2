import { describe, it, expect } from 'vitest';
import {
  buildSpokenSpans,
  mapCharIndexToTokenId,
  calculateTokenTimeEstimates,
  mapElapsedTimeToTokenId,
} from './charMapper';
import type { WordToken } from '../types/reading';

describe('Token-CharIndex & Timing Mapper (WP05 Evidence)', () => {
  const sampleTokens: WordToken[] = [
    {
      id: 's0_w0',
      word: 'Der',
      cleanWord: 'Der',
      role: 'app',
      status: 'pending',
      sentenceIndex: 0,
      wordIndexInSentence: 0,
    },
    {
      id: 's0_w1',
      word: 'kleine',
      cleanWord: 'kleine',
      role: 'app',
      status: 'pending',
      sentenceIndex: 0,
      wordIndexInSentence: 1,
    },
    {
      id: 's0_w2',
      word: 'Hund.',
      cleanWord: 'Hund',
      role: 'app',
      status: 'pending',
      sentenceIndex: 0,
      wordIndexInSentence: 2,
    },
  ];

  it('builds valid spoken text and accurate character spans', () => {
    const { spokenText, spans } = buildSpokenSpans(sampleTokens);

    expect(spokenText).toBe('Der kleine Hund.');
    expect(spans).toHaveLength(3);

    expect(spans[0]).toEqual({
      tokenId: 's0_w0',
      word: 'Der',
      startIndex: 0,
      endIndex: 3,
    });

    expect(spans[1]).toEqual({
      tokenId: 's0_w1',
      word: 'kleine',
      startIndex: 4,
      endIndex: 10,
    });

    expect(spans[2]).toEqual({
      tokenId: 's0_w2',
      word: 'Hund.',
      startIndex: 11,
      endIndex: 16,
    });
  });

  it('handles empty token lists gracefully', () => {
    const { spokenText, spans } = buildSpokenSpans([]);
    expect(spokenText).toBe('');
    expect(spans).toEqual([]);

    expect(mapCharIndexToTokenId(0, [])).toBeNull();
    expect(mapCharIndexToTokenId(-1, spans)).toBeNull();
  });

  it('accurately maps exact word boundary charIndices to correct token IDs', () => {
    const { spans } = buildSpokenSpans(sampleTokens);

    expect(mapCharIndexToTokenId(0, spans)).toBe('s0_w0');
    expect(mapCharIndexToTokenId(4, spans)).toBe('s0_w1');
    expect(mapCharIndexToTokenId(11, spans)).toBe('s0_w2');
  });

  it('maps mid-word charIndices correctly to token IDs', () => {
    const { spans } = buildSpokenSpans(sampleTokens);

    expect(mapCharIndexToTokenId(1, spans)).toBe('s0_w0');
    expect(mapCharIndexToTokenId(2, spans)).toBe('s0_w0');
    expect(mapCharIndexToTokenId(5, spans)).toBe('s0_w1');
    expect(mapCharIndexToTokenId(8, spans)).toBe('s0_w1');
    expect(mapCharIndexToTokenId(13, spans)).toBe('s0_w2');
  });

  it('maps space between words to the preceding or closest span gracefully', () => {
    const { spans } = buildSpokenSpans(sampleTokens);

    expect(mapCharIndexToTokenId(3, spans)).toBe('s0_w0');
    expect(mapCharIndexToTokenId(10, spans)).toBe('s0_w1');
  });

  it('calculates token time estimates and maps elapsed ms correctly', () => {
    const { totalDurationMs, estimates } = calculateTokenTimeEstimates(sampleTokens, 0.85);

    expect(totalDurationMs).toBeGreaterThan(500);
    expect(estimates).toHaveLength(3);

    // Initial word at 0ms
    expect(mapElapsedTimeToTokenId(0, estimates)).toBe('s0_w0');
    // Middle of "Der"
    expect(mapElapsedTimeToTokenId(150, estimates)).toBe('s0_w0');
    // Middle of "kleine"
    const kleineStart = estimates[1].startMs;
    expect(mapElapsedTimeToTokenId(kleineStart + 50, estimates)).toBe('s0_w1');
    // Middle of "Hund."
    const hundStart = estimates[2].startMs;
    expect(mapElapsedTimeToTokenId(hundStart + 50, estimates)).toBe('s0_w2');
  });
});
