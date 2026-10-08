import { containsBadWord } from './badWords';
import type { ValidationResult } from '../types/profile';

/**
 * Strict 1-word regex allowing only German alphabetical characters (no spaces, digits, or symbols).
 */
export const STRICT_NAME_REGEX = /^[a-zA-ZäöüÄÖÜß]+$/;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 16;

/**
 * Validates a child or companion name against strict security and decency rules.
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: 'Bitte gib einen Namen ein.',
    };
  }

  // Check for spaces or multiple words explicitly
  if (name.includes(' ') || name.includes('\t') || name.includes('\n')) {
    return {
      isValid: false,
      errorMessage: 'Bitte gib nur ein einzelnes Wort ohne Leerzeichen ein (z. B. "Anna" statt "Böser Wolf").',
    };
  }

  // Check length constraints
  if (trimmed.length < MIN_NAME_LENGTH) {
    return {
      isValid: false,
      errorMessage: `Der Name muss mindestens ${MIN_NAME_LENGTH} Buchstaben haben.`,
    };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      isValid: false,
      errorMessage: `Der Name darf maximal ${MAX_NAME_LENGTH} Buchstaben haben.`,
    };
  }

  // Strict regex check: only alphabetical letters
  if (!STRICT_NAME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'Bitte verwende nur Buchstaben (keine Zahlen, Sonderzeichen oder Smileys).',
    };
  }

  // Bad words check
  if (containsBadWord(trimmed)) {
    return {
      isValid: false,
      errorMessage: 'Dieser Name ist leider nicht erlaubt. Bitte wähle einen freundlichen Namen.',
    };
  }

  return {
    isValid: true,
    errorMessage: null,
  };
}
