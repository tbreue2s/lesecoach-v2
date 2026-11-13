import { describe, it, expect, vi, beforeEach } from 'vitest';
import { speakUiText, stopUiSpeech } from './uiSpeechService';
import * as speechUtils from '../utils/speech';

describe('uiSpeechService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stopUiSpeech();
  });

  it('plays exact static UI phrases via HTMLAudioElement without calling system speech', async () => {
    const speakTextSpy = vi.spyOn(speechUtils, 'speakText');
    const audioPlaySpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

    await speakUiText('Hallo! Wie heißt du und wer soll mit dir lesen?');

    expect(audioPlaySpy).toHaveBeenCalled();
    expect(speakTextSpy).not.toHaveBeenCalled();
  });

  it('recognizes pre-rendered child names and plays matching greeting audio', async () => {
    const speakTextSpy = vi.spyOn(speechUtils, 'speakText');
    const audioPlaySpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

    // Mock fetch for pre-rendered file to return ok
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as any);

    await speakUiText('Hallo Jonas! Dein Lese-Begleiter ist bereit!', { childName: 'Jonas' });

    expect(audioPlaySpy).toHaveBeenCalled();
    expect(speakTextSpy).not.toHaveBeenCalled();
  });

  it('falls back cleanly to generic studio greeting or device TTS when no pre-rendered name exists', async () => {
    const audioPlaySpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 } as any);

    await speakUiText('Hallo Xylophon! Dein Lese-Begleiter ist bereit!', { childName: 'Xylophon' });

    // Should fall back to greeting_generic.mp3
    expect(audioPlaySpy).toHaveBeenCalled();
  });
});
