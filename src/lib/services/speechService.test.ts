import { describe, it, expect } from 'vitest';
import {
  preprocessGermanText,
  isSpeechSupported,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  isSpeaking,
  isPaused,
} from './speechService';

describe('SpeechService (HD Audio Architecture)', () => {
  it('disables system speech in favor of pre-generated HD audio', () => {
    expect(isSpeechSupported()).toBe(false);
  });

  it('preprocesses German abbreviations cleanly for smooth audio narration', () => {
    const raw = 'Paul liest z. B. ein Buch, d. h. er übt fleißig u. a. mit Ben usw.';
    const cleaned = preprocessGermanText(raw);
    expect(cleaned).toContain('zum Beispiel');
    expect(cleaned).toContain('das heißt');
    expect(cleaned).toContain('unter anderem');
    expect(cleaned).toContain('und so weiter');
  });

  it('removes dialogue quotation marks that some synthesizers pronounce aloud', () => {
    const raw = '„Hallo Paul!“, rief Bello. »Komm mit!«';
    const cleaned = preprocessGermanText(raw);
    expect(cleaned).not.toContain('„');
    expect(cleaned).not.toContain('“');
    expect(cleaned).not.toContain('»');
    expect(cleaned).not.toContain('«');
    expect(cleaned).toBe('Hallo Paul!, rief Bello. Komm mit!');
  });

  it('normalizes ellipses and dashes to gentle pauses', () => {
    const raw = 'Der Igel schläft... ganz leise – im Wald.';
    const cleaned = preprocessGermanText(raw);
    expect(cleaned).toBe('Der Igel schläft, ganz leise, im Wald.');
  });

  it('handles playback state transitions correctly', () => {
    stopSpeech();
    expect(isSpeaking()).toBe(false);
    expect(isPaused()).toBe(false);

    pauseSpeech();
    expect(isPaused()).toBe(true);

    resumeSpeech();
    expect(isPaused()).toBe(false);
  });
});
