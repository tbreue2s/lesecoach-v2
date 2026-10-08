import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  calculateLevenshteinDistance,
  validateSpokenWord,
} from './spokenWordMatcher';

describe('normalizeText', () => {
  it('converts to lowercase and trims whitespace', () => {
    expect(normalizeText('  Hund  ')).toBe('hund');
  });

  it('removes German punctuation marks and special quotes', () => {
    expect(normalizeText('„Hallo, Welt! Wie geht\'s?“')).toBe('hallo welt wie geht s');
  });

  it('collapses multiple whitespace characters', () => {
    expect(normalizeText('Der   kleine\t\nKatzenbaum.')).toBe('der kleine katzenbaum');
  });

  it('handles empty or null string gracefully', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText('   ')).toBe('');
  });
});

describe('calculateLevenshteinDistance', () => {
  it('calculates 0 for identical strings', () => {
    expect(calculateLevenshteinDistance('hund', 'hund')).toBe(0);
  });

  it('calculates 1 for single substitution', () => {
    expect(calculateLevenshteinDistance('groß', 'gros')).toBe(1);
  });

  it('calculates 1 for single insertion', () => {
    expect(calculateLevenshteinDistance('hund', 'hunde')).toBe(1);
  });

  it('calculates 1 for single deletion', () => {
    expect(calculateLevenshteinDistance('katze', 'katz')).toBe(1);
  });

  it('calculates distance accurately for completely different strings', () => {
    expect(calculateLevenshteinDistance('katze', 'hund')).toBe(5);
  });
});

describe('validateSpokenWord (WP06 Evidence: Tolerante Lückentext-Validierung)', () => {
  // Case 1: Exact matches
  it('accepts exact word match regardless of case and punctuation', () => {
    const result = validateSpokenWord('Hund!', 'Hund');
    expect(result.isValid).toBe(true);
    expect(result.matchType).toBe('exact');
    expect(result.distance).toBe(0);
  });

  // Case 2: Multi-word transcript (substring / token inclusion)
  it('accepts target word inside multi-word spoken phrase: "der Baum" vs "Baum"', () => {
    const result = validateSpokenWord('der Baum', 'Baum');
    expect(result.isValid).toBe(true);
    expect(result.matchType).toBe('token_exact');
    expect(result.matchedWord).toBe('baum');
  });

  it('accepts target word in longer phrase: "ein kleiner Hund" vs "Hund"', () => {
    const result = validateSpokenWord('ein kleiner Hund', 'Hund');
    expect(result.isValid).toBe(true);
    expect(result.matchType).toBe('token_exact');
  });

  // Case 3: Levenshtein tolerance for words >= 4 letters ("Hund" vs "Hunde")
  it('accepts 1 edit distance for words >= 4 letters: "Hunde" vs "Hund"', () => {
    const result = validateSpokenWord('Hunde', 'Hund');
    expect(result.isValid).toBe(true);
    expect(result.matchType).toBe('levenshtein');
    expect(result.distance).toBe(1);
  });

  // Case 4: Levenshtein tolerance: "gros" vs "groß"
  it('accepts 1 edit distance substitution: "gros" vs "groß"', () => {
    const result = validateSpokenWord('gros', 'groß');
    expect(result.isValid).toBe(true);
    expect(result.matchType).toBe('levenshtein');
    expect(result.distance).toBe(1);
  });

  // Case 5: Fuzzy token match in multi-word sentence: "das ist ein hunde" vs "Hund"
  it('accepts 1 edit distance token in multi-word phrase: "das ist ein hunde" vs "Hund"', () => {
    const result = validateSpokenWord('das ist ein hunde', 'Hund');
    expect(result.isValid).toBe(true);
    expect(result.matchType).toBe('levenshtein');
  });

  // Case 6: Boundary case: Words < 4 letters require exact match (prevent false positives)
  it('rejects 1 edit distance on short 2-3 letter words: "an" vs "in"', () => {
    const result = validateSpokenWord('an', 'in');
    expect(result.isValid).toBe(false);
  });

  it('accepts exact match on short words: "in" vs "in"', () => {
    const result = validateSpokenWord('in', 'in');
    expect(result.isValid).toBe(true);
    expect(result.matchType).toBe('exact');
  });

  it('rejects completely distinct words: "Katze" vs "Hund"', () => {
    const result = validateSpokenWord('Katze', 'Hund');
    expect(result.isValid).toBe(false);
  });

  // Case 7: Empty or missing input
  it('handles empty input cleanly', () => {
    expect(validateSpokenWord('', 'Hund').isValid).toBe(false);
    expect(validateSpokenWord('Hund', '').isValid).toBe(false);
  });
});
