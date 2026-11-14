import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getActiveAudioEngine,
  setAudioEngineOverride,
  getActivePiperVoice,
  getActiveStudioVoice,
  resetAudioOverrides,
  getStudioAudioUrl,
  getStudioSegmentMetadata,
  hasStudioAudio,
  playAudioSegment,
  pauseAudio,
  resumeAudio,
  stopAudio,
  sliceWavBlobForSegment,
  mapPhonemesToIds,
  resolveAssetUrl,
  PIPER_VOICES,
} from './audioEngineService';
import { profileStore } from '../stores/profileStore';
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

  it('correctly maps studio audio URLs with voice paths for precomputed reference stories', () => {
    const urlAppKatja = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 0, 'app', 'katja');
    expect(urlAppKatja).toBe('/audio/stories/level-1/theme_forest_ep01/voices/katja/sentence_0_app.mp3');

    const urlFullConrad = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 2, 'full', 'conrad');
    expect(urlFullConrad).toBe('/audio/stories/level-1/theme_forest_ep01/voices/conrad/sentence_2_full.mp3');

    const invalidUrl = getStudioAudioUrl('custom-story-id', 0, 'app');
    expect(invalidUrl).toBeNull();
  });

  it('enables studio audio for theme_forest_ep01 reference story with 3 distinct voices', () => {
    expect(hasStudioAudio('story-theme_forest-lvl1-ep1', 0, 'app')).toBe(true);
    expect(hasStudioAudio('story-theme_forest-lvl1-ep1', 3, 'app')).toBe(true);
    expect(hasStudioAudio('story-space-trip-lvl1-ep1', 0, 'app')).toBe(false);

    const metaKatja = getStudioSegmentMetadata('story-theme_forest-lvl1-ep1', 0, 'app', 'katja');
    expect(metaKatja).toBeTruthy();
    expect(metaKatja?.words[0].word).toBe('Paul');

    const metaConrad = getStudioSegmentMetadata('story-theme_forest-lvl1-ep1', 0, 'app', 'conrad');
    expect(metaConrad).toBeTruthy();
    expect(metaConrad?.words[0].word).toBe('Paul');
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

    setAudioEngineOverride('thorsten-pwa');
    expect(getActiveAudioEngine()).toBe('thorsten-pwa');

    setAudioEngineOverride(null);
  });

  it('executes callbacks when playing studio-audio segment', () => {
    setAudioEngineOverride('studio-audio');
    const onStart = vi.fn();
    const onWordHighlight = vi.fn();
    const onEnd = vi.fn();

    const tokens: WordToken[] = [
      { id: 'w1', word: 'Paul', cleanWord: 'Paul', role: 'app', syllables: ['Paul'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
    ];

    playAudioSegment({
      text: 'Paul',
      tokens,
      segmentType: 'app',
      onStart,
      onWordHighlight,
      onEnd,
    });

    expect(onStart).toHaveBeenCalled();
    expect(onWordHighlight).toHaveBeenCalledWith('w1');
    expect(onEnd).toHaveBeenCalled();
  });

  it('handles pause, resume, and stop across audio engines without throwing', () => {
    expect(() => pauseAudio()).not.toThrow();
    expect(() => resumeAudio()).not.toThrow();
    expect(() => stopAudio()).not.toThrow();
  });

  it('gracefully executes callbacks when studio audio is requested for an uncomputed story', () => {
    setAudioEngineOverride('studio-audio');
    const onEnd = vi.fn();

    const tokens: WordToken[] = [
      { id: 'w1', word: 'Rakete', cleanWord: 'Rakete', role: 'app', syllables: ['Ra', 'ke', 'te'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
    ];

    playAudioSegment({
      text: 'Rakete',
      tokens,
      storyId: 'story-space-trip-lvl1-ep1',
      sentenceIndex: 0,
      segmentType: 'app',
      onEnd,
    });

    expect(onEnd).toHaveBeenCalled();
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

  it('only offers Thorsten and Kerstin as Piper voices (Point 1)', () => {
    expect(PIPER_VOICES.length).toBe(2);
    expect(PIPER_VOICES.map((v) => v.id)).toEqual([
      'de_DE-thorsten-medium',
      'de_DE-kerstin-low',
    ]);
  });

  it('resolves asset URLs cleanly for root and subdirectory deployments', () => {
    const url = resolveAssetUrl('/audio/stories/sample.mp3');
    expect(url).toContain('audio/stories/sample.mp3');
    expect(url.startsWith('/audio')).toBe(false);
  });

  it('correctly speaks suffix tokens after the child word without repeating sentence prefix', () => {
    setAudioEngineOverride('studio-audio');
    const onEnd = vi.fn();

    const fullTokens: WordToken[] = [
      { id: 'w0', word: 'Paul', cleanWord: 'Paul', role: 'app', syllables: ['Paul'], status: 'success', sentenceIndex: 0, wordIndexInSentence: 0 },
      { id: 'w1', word: 'sieht', cleanWord: 'sieht', role: 'app', syllables: ['sieht'], status: 'success', sentenceIndex: 0, wordIndexInSentence: 1 },
      { id: 'w2', word: 'Moos', cleanWord: 'Moos', role: 'child', syllables: ['Moos'], status: 'success', sentenceIndex: 0, wordIndexInSentence: 2 },
      { id: 'w3', word: 'im', cleanWord: 'im', role: 'app', syllables: ['im'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 3 },
      { id: 'w4', word: 'dichten', cleanWord: 'dichten', role: 'app', syllables: ['dich', 'ten'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 4 },
      { id: 'w5', word: 'Wald.', cleanWord: 'Wald', role: 'app', syllables: ['Wald'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 5 },
    ];

    // Suffix segment: tokens AFTER the child word (w3, w4, w5)
    const suffixTokens = fullTokens.slice(3);

    playAudioSegment({
      text: 'im dichten Wald.',
      tokens: suffixTokens,
      fullSentenceTokens: fullTokens,
      segmentType: 'app',
      onEnd,
    });

    expect(onEnd).toHaveBeenCalled();
  });

  it('normalizes document.baseURI without trailing slash so subdirectory assets never 404', () => {
    const originalBaseURI = document.baseURI;
    try {
      Object.defineProperty(document, 'baseURI', {
        value: 'https://tommy2105.github.io/lesecoach-v2',
        configurable: true,
      });

      const resolved = resolveAssetUrl('/audio/stories/level-1/theme_forest_ep01/sentence_0_app.mp3');
      expect(resolved).toBe(
        'https://tommy2105.github.io/lesecoach-v2/audio/stories/level-1/theme_forest_ep01/sentence_0_app.mp3'
      );
      expect(resolved).not.toBe(
        'https://tommy2105.github.io/audio/stories/level-1/theme_forest_ep01/sentence_0_app.mp3'
      );
    } finally {
      Object.defineProperty(document, 'baseURI', {
        value: originalBaseURI,
        configurable: true,
      });
    }
  });

  it('seamlessly switches between all Studio and PWA voices during runtime without restart', () => {
    // 1. Initial configuration: Studio Audio with Katja
    profileStore.setAudioEngine('studio-audio');
    profileStore.setStudioVoice('katja');
    resetAudioOverrides();

    expect(getActiveAudioEngine()).toBe('studio-audio');
    expect(getActiveStudioVoice()).toBe('katja');

    let studioUrl = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(studioUrl).toBe('/audio/stories/level-1/theme_forest_ep01/voices/katja/sentence_0_app.mp3');
    let studioMeta = getStudioSegmentMetadata('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(studioMeta).toBeTruthy();
    expect(studioMeta?.words[0].word).toBe('Paul');

    // 2. Seamless switch mid-session to Conrad
    stopAudio();
    profileStore.setStudioVoice('conrad');
    resetAudioOverrides();

    expect(getActiveStudioVoice()).toBe('conrad');
    studioUrl = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(studioUrl).toBe('/audio/stories/level-1/theme_forest_ep01/voices/conrad/sentence_0_app.mp3');
    studioMeta = getStudioSegmentMetadata('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(studioMeta?.words.length).toBe(6);

    // 3. Seamless switch mid-session back to Katja (Klara)
    stopAudio();
    profileStore.setStudioVoice('katja');
    resetAudioOverrides();

    expect(getActiveStudioVoice()).toBe('katja');
    studioUrl = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(studioUrl).toBe('/audio/stories/level-1/theme_forest_ep01/voices/katja/sentence_0_app.mp3');

    // 4. Seamless switch mid-session to PWA Kerstin
    stopAudio();
    profileStore.setAudioEngine('thorsten-pwa');
    profileStore.setPiperVoice('de_DE-kerstin-low');
    resetAudioOverrides();

    expect(getActiveAudioEngine()).toBe('thorsten-pwa');
    expect(getActivePiperVoice()).toBe('de_DE-kerstin-low');

    // 5. Seamless switch mid-session to PWA Thorsten
    stopAudio();
    profileStore.setPiperVoice('de_DE-thorsten-medium');
    resetAudioOverrides();

    expect(getActivePiperVoice()).toBe('de_DE-thorsten-medium');

    // 6. Seamless switch back to Studio Katja
    stopAudio();
    profileStore.setAudioEngine('studio-audio');
    profileStore.setStudioVoice('katja');
    resetAudioOverrides();

    expect(getActiveAudioEngine()).toBe('studio-audio');
    expect(getActiveStudioVoice()).toBe('katja');
    studioUrl = getStudioAudioUrl('story-theme_forest-lvl1-ep1', 0, 'app');
    expect(studioUrl).toBe('/audio/stories/level-1/theme_forest_ep01/voices/katja/sentence_0_app.mp3');
  });
});

