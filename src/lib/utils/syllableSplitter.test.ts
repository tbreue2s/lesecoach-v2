import { describe, it, expect } from 'vitest';
import { splitSyllables } from './syllableSplitter';

describe('syllableSplitter (WP06 Task 5 Evidence: German Syllable Division)', () => {
  it('splits monosyllabic words correctly (1 syllable)', () => {
    expect(splitSyllables('Hund')).toEqual(['Hund']);
    expect(splitSyllables('Baum')).toEqual(['Baum']);
    expect(splitSyllables('Wald')).toEqual(['Wald']);
    expect(splitSyllables('Gras')).toEqual(['Gras']);
  });

  it('splits 2-syllable words with single consonant between vowels', () => {
    expect(splitSyllables('Wiese')).toEqual(['Wie', 'se']);
    expect(splitSyllables('Blumen')).toEqual(['Blu', 'men']);
    expect(splitSyllables('Rakete')).toEqual(['Ra', 'ke', 'te']);
  });

  it('splits 2-syllable words with double consonants or consonant clusters', () => {
    expect(splitSyllables('Sonne')).toEqual(['Son', 'ne']);
    expect(splitSyllables('Kiste')).toEqual(['Kis', 'te']);
    expect(splitSyllables('Katze')).toEqual(['Kat', 'ze']);
    expect(splitSyllables('bunten')).toEqual(['bun', 'ten']);
    expect(splitSyllables('fröhlich')).toEqual(['fröh', 'lich']);
  });

  it('splits 3-syllable words like Schmetterling', () => {
    expect(splitSyllables('Schmetterling')).toEqual(['Schmet', 'ter', 'ling']);
  });

  it('handles empty or blank inputs gracefully', () => {
    expect(splitSyllables('')).toEqual([]);
    expect(splitSyllables('   ')).toEqual([]);
  });
});
