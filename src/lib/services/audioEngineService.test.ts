import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getActiveAudioEngine,
  setAudioEngineOverride,
  getStudioAudioUrl,
  getStudioSegmentMetadata,
  hasStudioAudio,
  playAudioSegment,
  pauseAudio,
  resumeAudio,
  stopAudio,
  sliceWavBlobForSegment,
  mapPhonemesToIds,
} from './audioEngineService';
import * as speechService from './speechService';
import type { WordToken } from '../types/reading';

function createSyntheticWavBlob(sampleRate: number, samples: Int16Array): Blob {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  // RIFF header
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataBytes, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataBytes, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: 'audio/x-wav' });
}

describe('AudioEngineService (WP15 Evidence: Thorsten WASM, Studio Audio & System TTS)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAudioEngineOverride(null);
    stopAudio();
  });

  afterEach(() => {
    setAudioEngineOverride(null);
    stopAudio();
  });

  it('correctly maps studio audio URLs for precomputed reference stories', () => {
    const urlApp = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(urlApp).toBe('/audio/stories/level-1/theme_forest_ep01/sentence_0_app.mp3');

    const urlFull = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 4, 'full');
    expect(urlFull).toBe('/audio/stories/level-1/theme_forest_ep01/sentence_4_full.mp3');

    const invalidUrl = getStudioAudioUrl('custom-story-id', 0, 'app');
    expect(invalidUrl).toBeNull();
  });

  it('accurately detects whether studio audio and exact WordBoundary metadata exist for all 5 sentences', () => {
    expect(hasStudioAudio('story-theme_forest-lvl1-ep1', 0, 'app')).toBe(true);
    expect(hasStudioAudio('story-theme_forest-lvl1-ep1', 4, 'app')).toBe(true);
    expect(hasStudioAudio('story-theme_forest-lvl1-ep1', 5, 'app')).toBe(false);
    expect(hasStudioAudio('story-space-trip-lvl1-ep1', 0, 'app')).toBe(false);

    const meta0 = getStudioSegmentMetadata('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(meta0).toBeTruthy();
    expect(meta0?.words.length).toBe(6);
    expect(meta0?.words[0].word).toBe('Paul');
    expect(meta0?.words[5].word).toBe('feuchten');
    expect(meta0?.cutMs).toBeGreaterThan(1500);
  });

  it('slices full-sentence WAV blobs at the inter-word silence dip for natural prosody', async () => {
    const sampleRate = 22050;
    // 1 second of audio: 0..0.65s active speech, 0.65..0.72s silence dip, 0.72..1.0s child word
    const totalSamples = sampleRate;
    const samples = new Int16Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      if (t >= 0.05 && t < 0.65) {
        samples[i] = 4000;
      } else if (t >= 0.65 && t < 0.72) {
        samples[i] = 10; // Silence dip between app segment and child word
      } else if (t >= 0.72 && t < 0.95) {
        samples[i] = 4500;
      }
    }

    const fullBlob = createSyntheticWavBlob(sampleRate, samples);
    const fullTokens: WordToken[] = [
      { id: 'w0', word: 'Paul', cleanWord: 'Paul', syllables: ['Paul'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
      { id: 'w1', word: 'wandert', cleanWord: 'wandert', syllables: ['wan', 'dert'], role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 1 },
      { id: 'w2', word: 'Boden.', cleanWord: 'Boden', syllables: ['Bo', 'den'], role: 'child', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 2 },
    ];
    const appTokens = fullTokens.slice(0, 2);

    const { blob: slicedBlob, estimates } = await sliceWavBlobForSegment(fullBlob, appTokens, fullTokens);
    expect(slicedBlob.size).toBeLessThan(fullBlob.size);
    expect(slicedBlob.size).toBeGreaterThan(44);
    expect(estimates.length).toBe(2);
    expect(estimates[0].tokenId).toBe('w0');
    expect(estimates[1].tokenId).toBe('w1');
  });

  it('respects audio engine overrides', () => {
    expect(getActiveAudioEngine()).toBeTruthy();

    setAudioEngineOverride('studio-audio');
    expect(getActiveAudioEngine()).toBe('studio-audio');

    setAudioEngineOverride('system-tts');
    expect(getActiveAudioEngine()).toBe('system-tts');

    setAudioEngineOverride(null);
  });

  it('delegates to system-tts when system-tts engine is selected', () => {
    setAudioEngineOverride('system-tts');
    const speakSpy = vi.spyOn(speechService, 'speakSentence').mockReturnValue(true);

    const tokens: WordToken[] = [
      { id: 'w1', word: 'Paul', cleanWord: 'Paul', role: 'app', syllables: ['Paul'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
    ];

    playAudioSegment({
      text: 'Paul',
      tokens,
      segmentType: 'app',
    });

    expect(speakSpy).toHaveBeenCalled();
  });

  it('handles pause, resume, and stop across audio engines', () => {
    const pauseSpy = vi.spyOn(speechService, 'pauseSpeech');
    const resumeSpy = vi.spyOn(speechService, 'resumeSpeech');
    const stopSpy = vi.spyOn(speechService, 'stopSpeech');

    pauseAudio();
    expect(pauseSpy).toHaveBeenCalled();

    resumeAudio();
    expect(resumeSpy).toHaveBeenCalled();

    stopAudio();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('gracefully falls back to system-tts when studio audio is requested for an uncomputed story', () => {
    setAudioEngineOverride('studio-audio');
    const speakSpy = vi.spyOn(speechService, 'speakSentence').mockReturnValue(true);

    const tokens: WordToken[] = [
      { id: 'w1', word: 'Rakete', cleanWord: 'Rakete', role: 'app', syllables: ['Ra', 'ke', 'te'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
    ];

    playAudioSegment({
      text: 'Rakete',
      tokens,
      storyId: 'story-space-trip-lvl1-ep1',
      sentenceIndex: 0,
      segmentType: 'app',
    });

    expect(speakSpy).toHaveBeenCalled();
  });

  it('mapPhonemesToIds maps IPA symbols strictly within model-specific bounds and handles pause cut markers', () => {
    const mockModelConfig = {
      phoneme_id_map: {
        _: [0],
        '^': [1],
        $: [2],
        ' ': [3],
        a: [14],
        b: [15],
        ',': [8],
      },
    };

    const phonemes = ['a', ' ', 'b'];
    const idsFull = mapPhonemesToIds(phonemes, mockModelConfig);
    // [BOS(1), PAD(0), a(14), PAD(0), space(3), PAD(0), b(15), PAD(0), EOS(2)]
    expect(idsFull).toEqual([1, 0, 14, 0, 3, 0, 15, 0, 2]);

    // Test with cutAfterWordCount = 1: should insert pause tokens [0, 8, 0, 3, 0, 3] at word 1
    const idsCut = mapPhonemesToIds(phonemes, mockModelConfig, 1);
    expect(idsCut).toContain(8); // comma pause
    expect(Math.max(...idsCut)).toBeLessThanOrEqual(15);
  });
});

