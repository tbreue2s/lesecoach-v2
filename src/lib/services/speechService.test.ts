import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  rankGermanVoice,
  preprocessGermanText,
  getGermanVoice,
  getAvailableGermanVoices,
  speakSentence,
  stopSpeech,
} from './speechService';

describe('SpeechService Voice Quality & Ranking', () => {
  const mockVoices: SpeechSynthesisVoice[] = [
    {
      voiceURI: 'espeak-de',
      name: 'German (espeak)',
      lang: 'de-DE',
      localService: true,
      default: false,
    },
    {
      voiceURI: 'google-deutsch',
      name: 'Google Deutsch',
      lang: 'de-DE',
      localService: false,
      default: false,
    },
    {
      voiceURI: 'ms-katja-natural',
      name: 'Microsoft Katja Online (Natural) - German (Germany)',
      lang: 'de-DE',
      localService: false,
      default: false,
    },
    {
      voiceURI: 'apple-anna-enhanced',
      name: 'Anna (Enhanced)',
      lang: 'de-DE',
      localService: true,
      default: true,
    },
    {
      voiceURI: 'generic-de',
      name: 'Marlene',
      lang: 'de-DE',
      localService: true,
      default: false,
    },
    {
      voiceURI: 'en-us-voice',
      name: 'Google US English',
      lang: 'en-US',
      localService: false,
      default: false,
    },
  ];

  beforeEach(() => {
    (window as any).speechSynthesis = {
      getVoices: vi.fn().mockReturnValue(mockVoices),
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
      paused: false,
      onvoiceschanged: null,
    };
    (window as any).SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
      text,
      lang: '',
      rate: 1,
      pitch: 1,
      voice: null,
      onstart: null,
      onboundary: null,
      onend: null,
      onerror: null,
    }));
  });

  afterEach(() => {
    stopSpeech();
    vi.restoreAllMocks();
  });

  it('ranks Natural/Neural/Enhanced voices dramatically higher than generic or espeak voices', () => {
    const naturalVoice = mockVoices.find((v) => v.name.includes('Natural'))!;
    const enhancedVoice = mockVoices.find((v) => v.name.includes('Enhanced'))!;
    const googleVoice = mockVoices.find((v) => v.name.includes('Google Deutsch'))!;
    const espeakVoice = mockVoices.find((v) => v.name.includes('espeak'))!;
    const englishVoice = mockVoices.find((v) => v.lang === 'en-US')!;

    expect(rankGermanVoice(naturalVoice)).toBeGreaterThan(rankGermanVoice(googleVoice));
    expect(rankGermanVoice(enhancedVoice)).toBeGreaterThan(rankGermanVoice(espeakVoice));
    expect(rankGermanVoice(googleVoice)).toBeGreaterThan(rankGermanVoice(espeakVoice));
    expect(rankGermanVoice(englishVoice)).toBeLessThan(0);
    expect(rankGermanVoice(espeakVoice)).toBeLessThan(0);
  });

  it('filters and sorts available German voices with getAvailableGermanVoices', () => {
    const voices = getAvailableGermanVoices();
    expect(voices.length).toBe(5); // 5 German voices out of 6
    // Top voice must be Microsoft Natural or Apple Enhanced
    expect(voices[0].name).toContain('Natural');
    // Lowest ranked voice must be espeak
    expect(voices[voices.length - 1].name).toContain('espeak');
  });

  it('selects the highest ranked natural voice by default with getGermanVoice', () => {
    const bestVoice = getGermanVoice();
    expect(bestVoice).not.toBeNull();
    expect(bestVoice?.name).toContain('Natural');
  });

  it('respects an explicit preferred voice URI', () => {
    const selected = getGermanVoice('google-deutsch');
    expect(selected?.voiceURI).toBe('google-deutsch');
  });

  it('preprocesses German text smoothly (stripping emojis, expanding abbreviations, cleaning quotes)', () => {
    const raw = '🦦 „Schau mal, z. B. der kleine Dino ... Er läuft schnell!“ 🦕';
    const cleaned = preprocessGermanText(raw);

    expect(cleaned).not.toContain('🦦');
    expect(cleaned).not.toContain('🦕');
    expect(cleaned).not.toContain('„');
    expect(cleaned).not.toContain('“');
    expect(cleaned).toContain('zum Beispiel');
    expect(cleaned).not.toContain('...');
    expect(cleaned).toContain('der kleine Dino, Er läuft schnell!');
  });

  it('speaks sentences at warm natural rate 0.90 and pitch 1.04 by default', () => {
    let capturedUtterance: any = null;
    (window as any).speechSynthesis.speak = vi.fn().mockImplementation((u) => {
      capturedUtterance = u;
    });

    speakSentence({
      text: 'Der Zauberer schwingt den Stab.',
    });

    expect(capturedUtterance).not.toBeNull();
    expect(capturedUtterance.rate).toBe(0.90);
    expect(capturedUtterance.pitch).toBe(1.04);
    expect(capturedUtterance.voice?.name).toContain('Natural');
  });
});
