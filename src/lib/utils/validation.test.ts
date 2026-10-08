import { describe, it, expect } from 'vitest';
import { validateName } from './validation';
import { containsBadWord } from './badWords';

describe('Name Validation & Security (WP01)', () => {
  describe('Strict 1-Word Regex & Character Rules', () => {
    it('accepts valid single-word German names with umlauts and ß', () => {
      const validNames = ['Anna', 'Max', 'Björn', 'Jürgen', 'Änne', 'Özlem', 'Süßmaus', 'Felix'];
      for (const name of validNames) {
        const result = validateName(name);
        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeNull();
      }
    });

    it('STRICTLY REJECTS multi-word names with spaces (e.g., "Böser Wolf")', () => {
      const multiWordNames = [
        'Böser Wolf',
        'Anna Maria',
        'Super Held',
        'Lese Fuchs',
        ' Peter ',
        'Hans\tWurst',
        'Lina\nLustig',
      ];
      for (const name of multiWordNames) {
        const result = validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Leerzeichen');
      }
    });

    it('rejects names with numbers, special characters, and HTML injections', () => {
      const invalidNames = [
        'Anna123',
        'Lukas!',
        '<script>',
        'Felix_99',
        'Ben-Luca',
        'Dr.Müller',
        '👑König',
      ];
      for (const name of invalidNames) {
        const result = validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBeTruthy();
      }
    });

    it('enforces length constraints (2 to 16 characters)', () => {
      // Too short
      expect(validateName('A').isValid).toBe(false);
      expect(validateName('A').errorMessage).toContain('mindestens 2 Buchstaben');

      // Empty / whitespace
      expect(validateName('').isValid).toBe(false);
      expect(validateName('   ').isValid).toBe(false);

      // Too long (>16 chars)
      const longName = 'Maximilianusmagnus';
      expect(validateName(longName).isValid).toBe(false);
      expect(validateName(longName).errorMessage).toContain('maximal 16 Buchstaben');
    });
  });

  describe('Bad-Word-Filter & Content Sanitization', () => {
    it('detects and flags bad words and inappropriate terms including weapons and slurs', () => {
      const forbidden = [
        'Idiot',
        'Arschloch',
        'Scheisse',
        'Dummkopf',
        'Töten',
        'Hitler',
        'Messer',
        'Pistole',
        'Ficker',
        'Gewehr',
        'Schwert',
        'Drogen',
        'Nutte',
        'Bombe',
      ];
      for (const word of forbidden) {
        expect(containsBadWord(word)).toBe(true);
        const result = validateName(word);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('nicht erlaubt');
      }
    });

    it('allows clean, innocent names', () => {
      const allowed = ['Mia', 'Ben', 'Emma', 'Noah', 'Hannah', 'Elias', 'Sophie', 'Leon'];
      for (const word of allowed) {
        expect(containsBadWord(word)).toBe(false);
        expect(validateName(word).isValid).toBe(true);
      }
    });
  });
});
