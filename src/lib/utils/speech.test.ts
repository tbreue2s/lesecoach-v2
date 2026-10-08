import { describe, it, expect } from 'vitest';
import { stripEmojis } from './speech';

describe('Speech Sanitization (stripEmojis)', () => {
  it('strips companion emojis from welcome messages', () => {
    const input = 'Hallo Emil! Dein Lese-Begleiter 🐶 Bello ist bereit!';
    const expected = 'Hallo Emil! Dein Lese-Begleiter Bello ist bereit!';
    expect(stripEmojis(input)).toBe(expected);
  });

  it('handles multiple and compound emojis correctly', () => {
    const input = '🦦✨ Super gemacht! 🦖 🦄 🧙‍♂️ Toll!';
    const expected = 'Super gemacht! Toll!';
    expect(stripEmojis(input)).toBe(expected);
  });

  it('preserves German umlauts, numbers, and punctuation', () => {
    const input = 'Äpfel, Öfen, Übungen und Spaß für 1. & 2. Klässler!';
    expect(stripEmojis(input)).toBe(input);
  });
});
