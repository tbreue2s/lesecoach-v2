import { get, writable } from 'svelte/store';
import type { WordToken } from '../types/reading';
import type { AudioEngineType, PiperVoiceId, StudioVoiceId } from '../types/profile';
import type { TokenTimeEstimate } from '../utils/charMapper';
import { profileStore } from '../stores/profileStore';
import {
  speakSentence,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  testVoice,
} from './speechService';
import {
  buildSpokenSpans,
  calculateTokenTimeEstimates,
  mapCharIndexToTokenId,
  mapElapsedTimeToTokenId,
} from '../utils/charMapper';

import studioForestEp01Metadata from '../../../public/audio/stories/level-1/theme_forest_ep01/metadata.json';
import studioConradMetadata from '../../../public/audio/stories/level-1/theme_forest_ep01/voices/conrad/metadata.json';
import studioKatjaMetadata from '../../../public/audio/stories/level-1/theme_forest_ep01/voices/katja/metadata.json';
import studioAmalaMetadata from '../../../public/audio/stories/level-1/theme_forest_ep01/voices/amala/metadata.json';

export type { PiperVoiceId, StudioVoiceId };
export type ThorstenVoiceId = PiperVoiceId;

/**
 * Resolves an asset URL (such as /wasm/... or /audio/...) against document.baseURI
 * or Vite's BASE_URL, ensuring it loads correctly in subdirectory deployments (e.g. GitHub Pages).
 */
export function resolveAssetUrl(path: string): string {
  if (!path || path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const clean = path.replace(/^\/+/, '');
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && document?.baseURI) {
    try {
      const base = document.baseURI;
      return new URL(clean, base).href;
    } catch {
      // Fallback
    }
  }
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
}

export interface AudioSegmentOptions {
  text: string;
  tokens: WordToken[];
  fullSentenceTokens?: WordToken[];
  storyId?: string;
  sentenceIndex?: number;
  segmentType: 'app' | 'full';
  rate?: number;
  onStart?: () => void;
  onWordHighlight?: (tokenId: string) => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

export interface StudioWordBoundary {
  word: string;
  startMs: number;
  endMs: number;
}

export interface StudioSegmentMeta {
  text: string;
  words: StudioWordBoundary[];
  cutMs?: number;
  file: string;
}

export interface ThorstenStatusState {
  isLoading: boolean;
  progress: number;
  statusMessage: string | null;
  errorMessage: string | null;
}

export const PIPER_VOICES: {
  id: PiperVoiceId;
  label: string;
  gender: 'male' | 'female';
  size: string;
  desc: string;
}[] = [
  {
    id: 'de_DE-thorsten-medium',
    label: 'Thorsten (Mann)',
    gender: 'male',
    size: '61 MB',
    desc: 'Warme, tiefe Erzählerstimme',
  },
  {
    id: 'de_DE-kerstin-low',
    label: 'Kerstin (Frau)',
    gender: 'female',
    size: '61 MB',
    desc: 'Sanfte, ruhige Begleiterin',
  },
];

export const STUDIO_VOICES: {
  id: StudioVoiceId;
  label: string;
  gender: 'male' | 'female';
  desc: string;
}[] = [
  {
    id: 'conrad',
    label: 'Konrad (Mann)',
    gender: 'male',
    desc: 'Männlicher Studio-Erzähler',
  },
  {
    id: 'katja',
    label: 'Katja (Frau)',
    gender: 'female',
    desc: 'Warme, freundliche Profi-Erzählerin',
  },
  {
    id: 'amala',
    label: 'Amala (Frau)',
    gender: 'female',
    desc: 'Lebendige, junge Vorlesestimme',
  },
];

export const thorstenStatusStore = writable<ThorstenStatusState>({
  isLoading: false,
  progress: 0,
  statusMessage: null,
  errorMessage: null,
});

// Cache synthesized Audio Blobs in memory to avoid re-synthesis
const piperBlobCache = new Map<string, Blob>();

let currentAudio: HTMLAudioElement | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;
let sharedAudioContext: AudioContext | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let currentBlobUrl: string | null = null;
let syncTimerInterval: ReturnType<typeof setInterval> | null = null;
let currentEngineOverride: AudioEngineType | null = null;
let currentPiperVoiceOverride: PiperVoiceId | null = null;
let currentStudioVoiceOverride: StudioVoiceId | null = null;
let isThorstenDownloading = false;
let thorstenDownloadProgress = 0;

export interface ActivePiperSession {
  ort: any;
  ortSession: any;
  modelConfig: any;
  phonemizeModule: any;
}

// Per-voice Thorsten/Piper WASM runtime session cache
const activePiperSessions = new Map<PiperVoiceId, Promise<ActivePiperSession>>();


/**
 * Unlocks Web Audio API and a persistent HTMLAudioElement on user interaction
 * so mobile browsers (Android Chrome / iOS Safari) allow playback after async WASM inference
 * or SpeechRecognition callbacks.
 */
function setupMobileAudioUnlock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom');
  if (isJsdom) return;

  const unlock = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !sharedAudioContext) {
        sharedAudioContext = new AudioCtx();
      }
      if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume().catch(() => {});
      }
      if (!sharedAudioElement && typeof Audio !== 'undefined') {
        sharedAudioElement = new Audio();
        sharedAudioElement.preload = 'auto';
      }
    } catch {
      // Ignore audio context init errors
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('click', unlock, { passive: true });
}

setupMobileAudioUnlock();

function clearSyncTimer() {
  if (syncTimerInterval !== null) {
    clearInterval(syncTimerInterval);
    syncTimerInterval = null;
  }
}

function clearCurrentAudio() {
  clearSyncTimer();
  if (activeBufferSource) {
    try {
      activeBufferSource.onended = null;
      activeBufferSource.stop();
      activeBufferSource.disconnect();
    } catch {
      // Ignore buffer source teardown errors
    }
    activeBufferSource = null;
  }
  if (currentAudio) {
    try {
      currentAudio.onplay = null;
      currentAudio.onloadedmetadata = null;
      currentAudio.ontimeupdate = null;
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // Audio element teardown
    }
    currentAudio = null;
  }
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch {
      // Blob cleanup
    }
    currentBlobUrl = null;
  }
}

/**
 * Gets the active Piper (PWA WASM) voice.
 */
export function getActivePiperVoice(): PiperVoiceId {
  if (currentPiperVoiceOverride) return currentPiperVoiceOverride;
  const profile = get(profileStore);
  return profile?.selectedPiperVoice || 'de_DE-thorsten-medium';
}

/**
 * Sets temporary override for Piper voice (e.g. from UI testing toggle).
 */
export function setPiperVoiceOverride(voice: PiperVoiceId | null) {
  currentPiperVoiceOverride = voice;
}

/**
 * Gets the active Studio Audio voice.
 */
export function getActiveStudioVoice(): StudioVoiceId {
  if (currentStudioVoiceOverride) return currentStudioVoiceOverride;
  const profile = get(profileStore);
  return profile?.selectedStudioVoice || 'conrad';
}

/**
 * Sets temporary override for Studio voice (e.g. from UI testing toggle).
 */
export function setStudioVoiceOverride(voice: StudioVoiceId | null) {
  currentStudioVoiceOverride = voice;
}

/**
 * Looks up precomputed Studio Audio metadata (including exact WordBoundary timestamps)
 * for a given story sentence segment and selected studio voice.
 */
export function getStudioSegmentMetadata(
  storyId?: string,
  sentenceIndex?: number,
  segmentType?: 'app' | 'full',
  studioVoice?: StudioVoiceId
): StudioSegmentMeta | null {
  if (!storyId || sentenceIndex === undefined || !segmentType) return null;
  const voice = studioVoice || getActiveStudioVoice();
  if (storyId === 'story-theme_forest-lvl1-ep1') {
    const key = `sentence_${sentenceIndex}_${segmentType}`;
    let metaDict: any = studioConradMetadata;
    if (voice === 'katja') metaDict = studioKatjaMetadata;
    else if (voice === 'amala') metaDict = studioAmalaMetadata;
    const entry = metaDict[key] as StudioSegmentMeta | undefined;
    return entry || (studioForestEp01Metadata as any)[key] || null;
  }
  return null;
}

/**
 * Returns the candidate studio audio file path for a story sentence segment and selected voice.
 */
export function getStudioAudioUrl(
  storyId?: string,
  sentenceIndex?: number,
  segmentType?: 'app' | 'full',
  studioVoice?: StudioVoiceId
): string | null {
  if (!storyId || sentenceIndex === undefined || !segmentType) return null;

  const voice = studioVoice || getActiveStudioVoice();
  const match = storyId.match(/^story-([a-zA-Z0-9_]+)-lvl(\d+)-ep(\d+)$/);
  if (match) {
    const [, themeId, level, ep] = match;
    const epPadded = ep.padStart(2, '0');
    if (voice && voice !== 'conrad') {
      return `/audio/stories/level-${level}/${themeId}_ep${epPadded}/voices/${voice}/sentence_${sentenceIndex}_${segmentType}.mp3`;
    }
    return `/audio/stories/level-${level}/${themeId}_ep${epPadded}/sentence_${sentenceIndex}_${segmentType}.mp3`;
  }
  return null;
}

/**
 * Checks whether precomputed studio audio exists for the given story segment.
 */
export function hasStudioAudio(
  storyId?: string,
  sentenceIndex?: number,
  segmentType?: 'app' | 'full'
): boolean {
  if (!storyId || sentenceIndex === undefined || !segmentType) return false;
  return (
    storyId === 'story-theme_forest-lvl1-ep1' &&
    sentenceIndex >= 0 &&
    sentenceIndex <= 4
  );
}

/**
 * Determines the active audio engine based on store preferences and override.
 */
export function getActiveAudioEngine(): AudioEngineType {
  if (currentEngineOverride) return currentEngineOverride;
  const profile = get(profileStore);
  return profile?.audioEngine || 'thorsten-pwa';
}

/**
 * Temporarily overrides the audio engine (e.g. from UI testing toggle).
 */
export function setAudioEngineOverride(engine: AudioEngineType | null) {
  currentEngineOverride = engine;
}

const CACHE_NAME_WASM = 'lesecoach-wasm-v1';
const CACHE_NAME_MODELS = 'lesecoach-models-v1';

async function getCachedBuffer(cacheName: string, url: string): Promise<ArrayBuffer | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(cacheName);
    const match = await cache.match(url);
    if (match) {
      return await match.arrayBuffer();
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

async function putCachedBuffer(
  cacheName: string,
  url: string,
  buffer: ArrayBuffer,
  contentType = 'application/octet-stream'
) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(cacheName);
    const resp = new Response(buffer, {
      headers: { 'Content-Type': contentType },
    });
    await cache.put(url, resp);
  } catch {
    // Ignore cache put errors
  }
}

interface SharedWasmAssets {
  ort: any;
  phonemizeModule: any;
}

let sharedWasmPromise: Promise<SharedWasmAssets> | null = null;
let currentPhonemizePrintHandler: (data: string) => void = () => {};

/**
 * Loads and initializes shared WASM binaries (ONNX runtime + piper_phonemize) once.
 * Reuses them across all Piper voices for near-instant voice switching.
 */
export async function ensureSharedWasmAssets(): Promise<SharedWasmAssets> {
  if (sharedWasmPromise) return sharedWasmPromise;

  sharedWasmPromise = (async () => {
    const fetchOrCache = async (url: string) => {
      const cached = await getCachedBuffer(CACHE_NAME_WASM, url);
      if (cached && cached.byteLength > 1000) return cached;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
      const buf = await res.arrayBuffer();
      putCachedBuffer(CACHE_NAME_WASM, url, buf);
      return buf;
    };

    const [ortModule, phonemizeModuleDef, ortWasmBinary, phonemizeWasm, phonemizeData] =
      await Promise.all([
        import('onnxruntime-web/wasm'),
        import('./piperPhonemize.js'),
        fetchOrCache(resolveAssetUrl('/wasm/ort-wasm-simd-threaded.wasm')),
        fetchOrCache(resolveAssetUrl('/wasm/piper_phonemize.wasm')),
        fetchOrCache(resolveAssetUrl('/wasm/piper_phonemize.data')),
      ]);

    const ort = (ortModule as any).default || ortModule;
    const createPiperPhonemize =
      (phonemizeModuleDef as any).createPiperPhonemize || (phonemizeModuleDef as any).default;

    if (ort?.env?.wasm) {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmBinary = ortWasmBinary;
      ort.env.wasm.wasmPaths = undefined;
    }

    const phonemizeModule = await createPiperPhonemize({
      wasmBinary: phonemizeWasm,
      getPreloadedPackage: () => phonemizeData,
      print: (data: string) => currentPhonemizePrintHandler(data),
      printErr: () => {},
    });

    return {
      ort,
      phonemizeModule,
    };
  })().catch((err) => {
    sharedWasmPromise = null;
    throw err;
  });

  return sharedWasmPromise;
}

/**
 * Checks if a Piper model is already initialized in memory or available locally in cache/OPFS.
 */
export async function isThorstenStored(
  voiceId: PiperVoiceId = 'de_DE-thorsten-medium'
): Promise<boolean> {
  if (activePiperSessions.has(voiceId)) return true;
  if (typeof window === 'undefined') return false;
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME_MODELS);
      const match = await cache.match(resolveAssetUrl(`/wasm/${voiceId}.onnx`));
      if (match) return true;
    } catch {}
  }
  if ('storage' in navigator && navigator.storage?.getDirectory) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('piper', { create: false });
      await dir.getFileHandle(`${voiceId}.onnx`, { create: false });
      return true;
    } catch {}
  }
  return false;
}

async function fetchBufferWithProgress(
  url: string,
  onProgress?: (pct: number) => void
): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} loading ${url}`);
  }
  const contentLength = Number(res.headers.get('Content-Length') || 0);
  if (!res.body || !contentLength) {
    const buf = await res.arrayBuffer();
    onProgress?.(100);
    return buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(Math.min(99, Math.round((loaded / contentLength) * 100)));
    }
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress?.(100);
  return merged.buffer;
}

const PIPER_HF_PATHS: Record<PiperVoiceId, string> = {
  'de_DE-thorsten-medium': 'de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx',
  'de_DE-kerstin-low': 'de/de_DE/kerstin/low/de_DE-kerstin-low.onnx',
};

async function loadPiperModelBuffer(
  voiceId: PiperVoiceId,
  onProgress?: (pct: number) => void
): Promise<ArrayBuffer> {
  const modelUrl = resolveAssetUrl(`/wasm/${voiceId}.onnx`);

  // 1. Check browser CacheStorage first (lightning fast flash storage, persists across sessions)
  const cachedFromStorage = await getCachedBuffer(CACHE_NAME_MODELS, modelUrl);
  if (cachedFromStorage && cachedFromStorage.byteLength > 500_000) {
    onProgress?.(100);
    return cachedFromStorage;
  }

  // 2. Check OPFS cache if available
  if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage?.getDirectory) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('piper', { create: true });
      const fileHandle = await dir.getFileHandle(`${voiceId}.onnx`, { create: false });
      const file = await fileHandle.getFile();
      if (file.size > 500_000) {
        onProgress?.(100);
        const buf = await file.arrayBuffer();
        putCachedBuffer(CACHE_NAME_MODELS, modelUrl, buf);
        return buf;
      }
    } catch {
      // Not in OPFS yet
    }
  }

  // 3. Load from local /wasm/ server (fast LAN/PWA asset) or fall back to HuggingFace
  let modelBuffer: ArrayBuffer;
  try {
    modelBuffer = await fetchBufferWithProgress(modelUrl, onProgress);
  } catch {
    const hfPath = PIPER_HF_PATHS[voiceId] || PIPER_HF_PATHS['de_DE-thorsten-medium'];
    modelBuffer = await fetchBufferWithProgress(
      `https://huggingface.co/diffusionstudio/piper-voices/resolve/main/${hfPath}`,
      onProgress
    );
  }

  // 4. Persist to CacheStorage & OPFS in background for instant subsequent reloads
  putCachedBuffer(CACHE_NAME_MODELS, modelUrl, modelBuffer);
  if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage?.getDirectory) {
    navigator.storage
      .getDirectory()
      .then(async (root) => {
        const dir = await root.getDirectoryHandle('piper', { create: true });
        const fileHandle = await dir.getFileHandle(`${voiceId}.onnx`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(modelBuffer);
        await writable.close();
      })
      .catch(() => {});
  }

  return modelBuffer;
}

/**
 * Initializes a Piper WASM & ONNX Runtime session for the specified voice.
 * Shared WASM binaries are loaded once; models are cached in browser CacheStorage.
 */
export async function ensurePiperInitialized(
  voiceId: PiperVoiceId = 'de_DE-thorsten-medium',
  onProgress?: (pct: number) => void
): Promise<ActivePiperSession> {
  if (activePiperSessions.has(voiceId)) {
    return activePiperSessions.get(voiceId)!;
  }

  const voiceMeta = PIPER_VOICES.find((v) => v.id === voiceId);
  const voiceLabel = voiceMeta?.label || voiceId;

  const initPromise = (async () => {
    try {
      isThorstenDownloading = true;
      thorstenStatusStore.set({
        isLoading: true,
        progress: 10,
        statusMessage: `${voiceLabel} wird initialisiert...`,
        errorMessage: null,
      });

      // 1. Load shared runtime and phonemizer + voice model in parallel
      const [{ ort, phonemizeModule }, modelConfigRes, modelBuffer] = await Promise.all([
        ensureSharedWasmAssets(),
        fetch(resolveAssetUrl(`/wasm/${voiceId}.onnx.json`)).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status} loading ${voiceId}.onnx.json`);
          return r.json();
        }),
        loadPiperModelBuffer(voiceId, (pct) => {
          thorstenDownloadProgress = pct;
          thorstenStatusStore.set({
            isLoading: true,
            progress: pct,
            statusMessage:
              pct < 100
                ? `${voiceLabel} wird geladen (${pct}%)...`
                : `${voiceLabel} wird aktiviert...`,
            errorMessage: null,
          });
          onProgress?.(pct);
        }),
      ]);

      thorstenStatusStore.set({
        isLoading: true,
        progress: 95,
        statusMessage: `${voiceLabel} wird gestartet...`,
        errorMessage: null,
      });

      const ortSession = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['wasm'],
      });

      thorstenStatusStore.set({
        isLoading: false,
        progress: 100,
        statusMessage: null,
        errorMessage: null,
      });

      return {
        ort,
        ortSession,
        modelConfig: modelConfigRes,
        phonemizeModule,
      };
    } catch (err: any) {
      activePiperSessions.delete(voiceId);
      thorstenStatusStore.set({
        isLoading: false,
        progress: 0,
        statusMessage: null,
        errorMessage: err?.message || `${voiceLabel} Initialisierung fehlgeschlagen`,
      });
      throw err;
    } finally {
      isThorstenDownloading = false;
    }
  })();

  activePiperSessions.set(voiceId, initPromise);
  return initPromise;
}


/**
 * Pre-downloads and initializes a Piper model for offline PWA use.
 */
export async function downloadThorstenVoice(
  voiceId: PiperVoiceId = 'de_DE-thorsten-medium',
  onProgress?: (progress: number) => void
): Promise<void> {
  if (typeof window === 'undefined') return;
  await ensurePiperInitialized(voiceId, onProgress);
}

export function getThorstenDownloadState() {
  return {
    isDownloading: isThorstenDownloading,
    progress: thorstenDownloadProgress,
  };
}

function pcmFloat32ToWavArrayBuffer(
  pcm: Float32Array,
  sampleRate: number
): ArrayBuffer {
  const numChannels = 1;
  const headerLength = 44;
  const bufferLength = pcm.length;
  const arrayBuffer = new ArrayBuffer(bufferLength * 2 + headerLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier 'RIFF'
  view.setUint32(0, 1179011410, true);
  view.setUint32(4, arrayBuffer.byteLength - 8, true);
  // 'WAVE'
  view.setUint32(8, 1163280727, true);
  // 'fmt '
  view.setUint32(12, 544501094, true);
  view.setUint16(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, numChannels * 2 * sampleRate, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  // 'data'
  view.setUint32(36, 1635017060, true);
  view.setUint32(40, bufferLength * 2, true);

  let p = headerLength;
  for (let i = 0; i < bufferLength; i++) {
    const v = pcm[i];
    const s = v >= 1 ? 32767 : v <= -1 ? -32768 : (v * 32768) | 0;
    view.setInt16(p, s, true);
    p += 2;
  }

  return arrayBuffer;
}

/**
 * Maps raw IPA phonemes produced by piper_phonemize to model-specific symbol IDs
 * according to the model's phoneme_id_map and phoneme_map.
 * Respects BOS (1), EOS (2), PAD (0), and max symbol bounds of the model.
 * If cutAfterWordCount is set, injects silence pause markers before the child's word.
 */
export function mapPhonemesToIds(
  phonemes: string[],
  modelConfig: any,
  cutAfterWordCount?: number
): number[] {
  const map: Record<string, number[]> = modelConfig.phoneme_id_map || {};
  const phonemeMap: Record<string, string> = modelConfig.phoneme_map || {};

  let maxAllowedId = 0;
  for (const ids of Object.values(map)) {
    for (const id of ids) {
      if (id > maxAllowedId) maxAllowedId = id;
    }
  }
  if (maxAllowedId === 0) maxAllowedId = 129;

  const result: number[] = [1];
  let wordCount = 0;

  for (let ph of phonemes) {
    if (ph === ' ') {
      wordCount++;
      if (cutAfterWordCount && wordCount === cutAfterWordCount) {
        // Pause tokens [comma(8), pad(0), space(3), pad(0), space(3)]
        result.push(0);
        result.push(8);
        result.push(0);
        result.push(3);
        result.push(0);
        result.push(3);
        continue;
      }
    }

    if (phonemeMap[ph]) {
      ph = phonemeMap[ph];
    }
    const ids = map[ph];
    if (ids && ids.length > 0) {
      for (const id of ids) {
        if (id <= maxAllowedId) {
          result.push(0);
          result.push(id);
        }
      }
    }
  }

  result.push(0);
  result.push(2);
  return result;
}

/**
 * Synthesizes German speech with a selected Piper voice (Thorsten, Ramona, Eva K, Kerstin).
 * If `cutAfterWordCount` is specified (for `'app'` segments), phonemizes the full sentence first
 * so `espeak-ng` generates 100% natural mid-sentence prosody, then injects a clean pause marker
 * right after the last app word so the VITS waveform has an unmistakable silence gap before the child's word.
 */
export async function synthesizeThorsten(
  text: string,
  voiceId: PiperVoiceId = 'de_DE-thorsten-medium',
  cutAfterWordCount?: number
): Promise<Blob> {
  const effectiveVoice = voiceId || getActivePiperVoice();
  const cacheKey = `${effectiveVoice}::${cutAfterWordCount ?? 'full'}::${text.trim()}`;
  const cached = piperBlobCache.get(cacheKey);
  if (cached) return cached;

  const {
    ort,
    ortSession,
    modelConfig,
    phonemizeModule,
  } = await ensurePiperInitialized(effectiveVoice);

  const inputJson = JSON.stringify([{ text: text.trim() }]);
  let phonemes: string[] = [];

  currentPhonemizePrintHandler = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.phonemes && Array.isArray(parsed.phonemes)) {
        phonemes = parsed.phonemes;
      }
    } catch {
      // Ignore non-json print
    }
  };

  phonemizeModule.callMain([
    '-l',
    modelConfig.espeak?.voice || 'de',
    '--input',
    inputJson,
    '--espeak_data',
    '/espeak-ng-data',
  ]);

  const finalPhonemeIds = mapPhonemesToIds(phonemes, modelConfig, cutAfterWordCount);

  const noiseScale = modelConfig.inference?.noise_scale ?? 0.667;
  const lengthScale = modelConfig.inference?.length_scale ?? 1.0;
  const noiseW = modelConfig.inference?.noise_w ?? 0.8;

  const feeds: Record<string, any> = {
    input: new ort.Tensor(
      'int64',
      BigInt64Array.from(finalPhonemeIds.map((id) => BigInt(id))),
      [1, finalPhonemeIds.length]
    ),
    input_lengths: new ort.Tensor(
      'int64',
      BigInt64Array.from([BigInt(finalPhonemeIds.length)]),
      [1]
    ),
    scales: new ort.Tensor(
      'float32',
      Float32Array.from([noiseScale, lengthScale, noiseW]),
      [3]
    ),
  };

  if (modelConfig.speaker_id_map && Object.keys(modelConfig.speaker_id_map).length > 0) {
    feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  }

  const {
    output: { data: pcm },
  } = await ortSession.run(feeds);

  const wavBuffer = pcmFloat32ToWavArrayBuffer(
    pcm as Float32Array,
    modelConfig.audio?.sample_rate || 22050
  );
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  piperBlobCache.set(cacheKey, blob);
  return blob;
}


async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Failed to read Blob as ArrayBuffer'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Slices a full-sentence 16-bit mono WAV Blob right at the natural silence gap before the child's word,
 * preserving 100% natural full-sentence intonation (Prosodie) and returning aligned word time estimates.
 */
export async function sliceWavBlobForSegment(
  fullWavBlob: Blob,
  segmentTokens: WordToken[],
  fullSentenceTokens: WordToken[],
  rate: number = 0.9
): Promise<{ blob: Blob; estimates: TokenTimeEstimate[] }> {
  const normalizedFullTokens = fullSentenceTokens.map((t) => ({
    ...t,
    word: t.cleanWord || t.word.replace(/[.!?,;:]+$/, ''),
  }));
  const { totalDurationMs: fullEstDuration, estimates: fullEstimates } =
    calculateTokenTimeEstimates(normalizedFullTokens, rate);

  const arrayBuffer = await readBlobAsArrayBuffer(fullWavBlob);
  if (arrayBuffer.byteLength <= 44) {
    return {
      blob: fullWavBlob,
      estimates: fullEstimates.slice(0, segmentTokens.length),
    };
  }

  const view = new DataView(arrayBuffer);
  const sampleRate = view.getUint32(24, true) || 22050;
  const pcmSamples = new Int16Array(arrayBuffer, 44);
  const totalSamples = pcmSamples.length;

  // Detect active speech start and end (excluding leading/trailing digital silence)
  const silenceThreshold = 300;
  let speechStartSample = 0;
  while (
    speechStartSample < totalSamples &&
    Math.abs(pcmSamples[speechStartSample]) < silenceThreshold
  ) {
    speechStartSample++;
  }

  let speechEndSample = totalSamples - 1;
  while (
    speechEndSample > speechStartSample &&
    Math.abs(pcmSamples[speechEndSample]) < silenceThreshold
  ) {
    speechEndSample--;
  }

  const activeSpeechSamples = Math.max(1, speechEndSample - speechStartSample);
  const speechStartMs = (speechStartSample / sampleRate) * 1000;
  const activeSpeechDurationMs = (activeSpeechSamples / sampleRate) * 1000;

  // If playing the full sentence, no cut is needed
  if (
    segmentTokens.length === 0 ||
    segmentTokens.length >= fullSentenceTokens.length ||
    fullEstimates.length === 0
  ) {
    const scale = fullEstDuration > 0 ? activeSpeechDurationMs / fullEstDuration : 1.0;
    const alignedFullEstimates: TokenTimeEstimate[] = fullEstimates.map((e, idx) => ({
      ...e,
      startMs: idx === 0 ? 0 : speechStartMs + e.startMs * scale,
      endMs: speechStartMs + e.endMs * scale,
    }));
    return {
      blob: fullWavBlob,
      estimates: alignedFullEstimates,
    };
  }

  // Locate the silence gap right before the child's word(s)
  const frameSamples = Math.max(1, Math.floor(sampleRate * 0.015)); // 15ms frames
  const lastAppRatio =
    fullEstDuration > 0
      ? fullEstimates[segmentTokens.length - 1].endMs / fullEstDuration
      : segmentTokens.length / fullSentenceTokens.length;

  const expectedCutSample =
    speechStartSample + Math.floor(lastAppRatio * activeSpeechSamples);

  const searchStartFrame = Math.max(
    Math.floor(speechStartSample / frameSamples),
    Math.floor((expectedCutSample - Math.floor(sampleRate * 0.35)) / frameSamples)
  );
  const searchEndFrame = Math.min(
    Math.floor((speechEndSample - Math.floor(sampleRate * 0.15)) / frameSamples),
    Math.floor((expectedCutSample + Math.floor(sampleRate * 0.35)) / frameSamples)
  );

  let bestGapStartFrame = -1;
  let bestGapEndFrame = -1;
  let currentGapStart = -1;

  for (let f = searchStartFrame; f <= searchEndFrame; f++) {
    let sumSq = 0;
    const fStart = f * frameSamples;
    for (let i = 0; i < frameSamples && fStart + i < totalSamples; i++) {
      const s = pcmSamples[fStart + i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / frameSamples);
    if (rms < 110) {
      if (currentGapStart === -1) currentGapStart = f;
      const currentLen = f - currentGapStart + 1;
      const bestLen =
        bestGapStartFrame !== -1 ? bestGapEndFrame - bestGapStartFrame + 1 : 0;
      if (currentLen >= bestLen) {
        bestGapStartFrame = currentGapStart;
        bestGapEndFrame = f;
      }
    } else {
      currentGapStart = -1;
    }
  }

  let bestCutSample: number;
  if (
    bestGapStartFrame !== -1 &&
    bestGapEndFrame - bestGapStartFrame + 1 >= 4
  ) {
    bestCutSample = Math.min(
      totalSamples,
      (bestGapStartFrame + 2) * frameSamples
    );
  } else {
    const windowSize = Math.max(1, Math.floor(sampleRate * 0.015));
    const minSample = Math.max(
      speechStartSample,
      expectedCutSample - Math.floor(sampleRate * 0.035)
    );
    const maxSample = Math.min(
      speechEndSample - windowSize,
      expectedCutSample + Math.floor(sampleRate * 0.055)
    );
    bestCutSample = Math.min(totalSamples, expectedCutSample);
    let minRms = Infinity;
    const step = Math.max(1, Math.floor(sampleRate * 0.004));
    for (let s = minSample; s <= maxSample; s += step) {
      let sumSq = 0;
      for (let j = 0; j < windowSize && s + j < totalSamples; j++) {
        const val = pcmSamples[s + j];
        sumSq += val * val;
      }
      const rms = Math.sqrt(sumSq / windowSize);
      if (rms < minRms) {
        minRms = rms;
        bestCutSample = s + Math.floor(windowSize / 2);
      }
    }
  }

  const cutByteLength = bestCutSample * 2;
  const newWavBuffer = new ArrayBuffer(44 + cutByteLength);
  const newUint8 = new Uint8Array(newWavBuffer);

  newUint8.set(new Uint8Array(arrayBuffer, 0, 44 + cutByteLength));

  const newView = new DataView(newWavBuffer);
  newView.setUint32(4, 36 + cutByteLength, true);
  newView.setUint32(40, cutByteLength, true);

  // Smooth 15ms linear fade-out at the cut point
  const newSamples = new Int16Array(newWavBuffer, 44, bestCutSample);
  const fadeSamples = Math.min(bestCutSample, Math.floor(sampleRate * 0.015));
  for (let i = 0; i < fadeSamples; i++) {
    const idx = bestCutSample - fadeSamples + i;
    const gain = 1 - i / fadeSamples;
    newSamples[idx] = Math.round(newSamples[idx] * gain);
  }

  // Scale the app segment word estimates onto [speechStartMs, cutMs]
  const cutMs = (bestCutSample / sampleRate) * 1000;
  const appEstDuration = fullEstimates[segmentTokens.length - 1]?.endMs || 1;
  const activeAppDurationMs = Math.max(100, cutMs - speechStartMs);
  const appScale = activeAppDurationMs / appEstDuration;

  const segmentEstimates: TokenTimeEstimate[] = fullEstimates
    .slice(0, segmentTokens.length)
    .map((e, idx) => ({
      ...e,
      startMs: idx === 0 ? 0 : speechStartMs + e.startMs * appScale,
      endMs: speechStartMs + e.endMs * appScale,
    }));

  return {
    blob: new Blob([newWavBuffer], { type: 'audio/wav' }),
    estimates: segmentEstimates,
  };
}

/**
 * Plays a WAV Blob directly through Web Audio API (AudioContext), which never suffers from
 * mobile HTMLAudioElement autoplay blocks after async WASM inference.
 */
async function playWavBlobWithAudioContext(
  wavBlob: Blob,
  tokens: WordToken[],
  exactEstimates: TokenTimeEstimate[],
  callbacks: {
    onStart?: () => void;
    onWordHighlight?: (tokenId: string) => void;
    onEnd?: () => void;
  }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return false;

  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }

    const arrayBuffer = await readBlobAsArrayBuffer(wavBlob);
    const audioBuffer = await sharedAudioContext.decodeAudioData(arrayBuffer.slice(0));

    clearCurrentAudio();

    const source = sharedAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(sharedAudioContext.destination);
    activeBufferSource = source;

    let finished = false;
    const startCtxTime = sharedAudioContext.currentTime;

    callbacks.onStart?.();
    if (tokens.length > 0) {
      callbacks.onWordHighlight?.(tokens[0].id);
    }

    syncTimerInterval = setInterval(() => {
      if (finished || !sharedAudioContext) return;
      const elapsedMs = (sharedAudioContext.currentTime - startCtxTime) * 1000;
      const currentTokenId = mapElapsedTimeToTokenId(elapsedMs, exactEstimates);
      if (currentTokenId) {
        callbacks.onWordHighlight?.(currentTokenId);
      }
    }, 20);

    source.onended = () => {
      if (finished) return;
      finished = true;
      clearCurrentAudio();
      callbacks.onEnd?.();
    };

    source.start(0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays an HTMLAudioElement or Web Audio buffer with synchronized word highlighting (Karaoke).
 * Reuses a persistent shared AudioContext / HTMLAudioElement for mobile autoplay compatibility.
 */
function playHtmlAudioWithSync(
  audioSrc: string,
  tokens: WordToken[],
  rate: number,
  callbacks: {
    exactEstimates?: TokenTimeEstimate[];
    stopAtMs?: number;
    onStart?: () => void;
    onWordHighlight?: (tokenId: string) => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  }
) {
  clearCurrentAudio();

  const resolvedSrc = resolveAssetUrl(audioSrc);
  const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom');

  const { estimates: fallbackEstimates } = calculateTokenTimeEstimates(tokens, rate);
  const totalEstimatedDuration =
    fallbackEstimates[fallbackEstimates.length - 1]?.endMs || 1000;

  const activeEstimates: TokenTimeEstimate[] =
    callbacks.exactEstimates && callbacks.exactEstimates.length > 0
      ? callbacks.exactEstimates
      : fallbackEstimates;

  // On real browsers (especially mobile Chrome/Safari), prefer Web Audio API (sharedAudioContext)
  // because it plays instantly and is never rejected by mobile autoplay restrictions.
  if (typeof window !== 'undefined' && !isJsdom) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!sharedAudioContext) {
        try {
          sharedAudioContext = new AudioCtx();
        } catch {}
      }
      if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume().catch(() => {});
      }

      if (sharedAudioContext) {
        fetch(resolvedSrc)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.arrayBuffer();
          })
          .then((ab) => sharedAudioContext!.decodeAudioData(ab))
          .then((audioBuffer) => {
            clearCurrentAudio();

            const source = sharedAudioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(sharedAudioContext!.destination);
            activeBufferSource = source;

            let finished = false;
            const startCtxTime = sharedAudioContext!.currentTime;

            const finishPlayback = () => {
              if (finished) return;
              finished = true;
              clearCurrentAudio();
              callbacks.onEnd?.();
            };

            callbacks.onStart?.();
            if (tokens.length > 0) {
              callbacks.onWordHighlight?.(tokens[0].id);
            }

            syncTimerInterval = setInterval(() => {
              if (finished || !sharedAudioContext) return;
              const elapsedMs = (sharedAudioContext.currentTime - startCtxTime) * 1000;
              if (callbacks.stopAtMs !== undefined && elapsedMs >= callbacks.stopAtMs) {
                finishPlayback();
                return;
              }
              const currentTokenId = mapElapsedTimeToTokenId(elapsedMs, activeEstimates);
              if (currentTokenId) {
                callbacks.onWordHighlight?.(currentTokenId);
              }
            }, 20);

            source.onended = () => {
              finishPlayback();
            };

            if (callbacks.stopAtMs !== undefined && callbacks.stopAtMs > 0) {
              source.start(0);
              source.stop(startCtxTime + callbacks.stopAtMs / 1000);
            } else {
              source.start(0);
            }
          })
          .catch((err) => {
            console.warn('[AudioEngine] Web Audio playback failed, falling back to HTMLAudioElement:', err);
            playHtmlFallback(resolvedSrc);
          });
        return;
      }
    }
  }

  playHtmlFallback(resolvedSrc);

  function playHtmlFallback(src: string) {
    const hasExactEstimates = Boolean(
      callbacks.exactEstimates && callbacks.exactEstimates.length > 0
    );

    let currentFallbackEstimates = activeEstimates;
    const audio = sharedAudioElement || new Audio();
    audio.src = src;
    currentAudio = audio;

    let started = false;
    let finished = false;

    const finishPlayback = () => {
      if (finished) return;
      finished = true;
      clearCurrentAudio();
      callbacks.onEnd?.();
    };

    const updateHighlightFromCurrentTime = () => {
      if (!currentAudio || finished) return;
      const elapsedMs = currentAudio.currentTime * 1000;

      if (callbacks.stopAtMs !== undefined && elapsedMs >= callbacks.stopAtMs) {
        finishPlayback();
        return;
      }

      const currentTokenId = mapElapsedTimeToTokenId(elapsedMs, currentFallbackEstimates);
      if (currentTokenId) {
        callbacks.onWordHighlight?.(currentTokenId);
      }
    };

    const ensureSyncRunning = () => {
      if (!started) {
        started = true;
        callbacks.onStart?.();
        if (tokens.length > 0) {
          callbacks.onWordHighlight?.(tokens[0].id);
        }
      }

      if (syncTimerInterval === null) {
        syncTimerInterval = setInterval(() => {
          if (!currentAudio || currentAudio.paused || finished) return;
          updateHighlightFromCurrentTime();
        }, 20);
      }
    };

    audio.onloadedmetadata = () => {
      if (!hasExactEstimates && audio.duration && Number.isFinite(audio.duration)) {
        const durationMs = audio.duration * 1000;
        if (durationMs > 0 && totalEstimatedDuration > 0) {
          const scale = durationMs / totalEstimatedDuration;
          currentFallbackEstimates = fallbackEstimates.map((e) => ({
            ...e,
            startMs: e.startMs * scale,
            endMs: e.endMs * scale,
          }));
        }
      }
    };

    audio.onplay = () => {
      ensureSyncRunning();
    };

    audio.ontimeupdate = () => {
      ensureSyncRunning();
      updateHighlightFromCurrentTime();
    };

    audio.onended = () => {
      finishPlayback();
    };

    audio.onerror = (e) => {
      if (finished) return;
      finished = true;
      clearCurrentAudio();
      callbacks.onError?.(e);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          ensureSyncRunning();
        })
        .catch((err) => {
          if (finished) return;
          finished = true;
          clearCurrentAudio();
          callbacks.onError?.(err);
        });
    }
  }
}

/**
 * Plays speech using Web Speech API fallback.
 * Supports full-sentence prosody with calibrated cut right before the child's word.
 */
function playSystemTts(options: AudioSegmentOptions) {
  const {
    tokens,
    fullSentenceTokens,
    text,
    rate = 0.9,
    onStart,
    onWordHighlight,
    onEnd,
    onError,
  } = options;

  const isJsdom =
    typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom');

  const useFullSentenceCut =
    !isJsdom &&
    fullSentenceTokens &&
    fullSentenceTokens.length > tokens.length &&
    tokens.length > 0 &&
    fullSentenceTokens[0].id === tokens[0].id;

  const { spokenText: appSpokenText, spans: appSpans } = buildSpokenSpans(tokens);
  const { spokenText: fullSpokenText } = useFullSentenceCut
    ? buildSpokenSpans(fullSentenceTokens!)
    : { spokenText: text || appSpokenText };

  const utteranceText = useFullSentenceCut ? fullSpokenText : text || appSpokenText;
  const { estimates, totalDurationMs: segmentDurationMs } = calculateTokenTimeEstimates(
    tokens,
    rate
  );

  const lastAppSpan = appSpans[appSpans.length - 1];
  const cutCharIndex = lastAppSpan ? lastAppSpan.endIndex : appSpokenText.length;

  let startTime = 0;
  let started = false;
  let finished = false;
  let cutTimeout: ReturnType<typeof setTimeout> | null = null;

  const cleanupTimers = () => {
    clearSyncTimer();
    if (cutTimeout !== null) {
      clearTimeout(cutTimeout);
      cutTimeout = null;
    }
  };

  const finishOnce = () => {
    if (finished) return;
    finished = true;
    cleanupTimers();
    onEnd?.();
  };

  const scheduleCutInMs = (delayMs: number) => {
    if (!useFullSentenceCut) return;
    if (cutTimeout !== null) {
      clearTimeout(cutTimeout);
    }
    cutTimeout = setTimeout(() => {
      stopSpeech();
      finishOnce();
    }, Math.max(20, delayMs));
  };

  const startEstimatesFallback = () => {
    if (started || finished) return;
    started = true;
    startTime = Date.now();
    onStart?.();
    if (tokens.length > 0) {
      onWordHighlight?.(tokens[0].id);
    }

    if (useFullSentenceCut) {
      // Compensate for ~45ms OS speechSynthesis.cancel() IPC latency so the child word never starts
      scheduleCutInMs(segmentDurationMs - 45);
    }

    syncTimerInterval = setInterval(() => {
      if (finished) return;
      const elapsedMs = Date.now() - startTime;
      const currentTokenId = mapElapsedTimeToTokenId(elapsedMs, estimates);
      if (currentTokenId) {
        onWordHighlight?.(currentTokenId);
      }
    }, 20);
  };

  const startFallbackTimeout = setTimeout(() => {
    startEstimatesFallback();
  }, 150);

  speakSentence({
    text: utteranceText,
    rate,
    onStart: () => {
      clearTimeout(startFallbackTimeout);
      startEstimatesFallback();
    },
    onBoundary: (event) => {
      if (finished) return;
      if (!started) {
        clearTimeout(startFallbackTimeout);
        startEstimatesFallback();
      }
      if (useFullSentenceCut && event.charIndex >= cutCharIndex) {
        stopSpeech();
        finishOnce();
        return;
      }
      const tokenId = mapCharIndexToTokenId(event.charIndex, appSpans);
      if (tokenId) {
        const matchingEst = estimates.find((e) => e.tokenId === tokenId);
        if (matchingEst) {
          startTime = Date.now() - matchingEst.startMs;
          if (useFullSentenceCut) {
            const remainingMs = segmentDurationMs - matchingEst.startMs - 45;
            scheduleCutInMs(remainingMs);
          }
        }
        onWordHighlight?.(tokenId);
      }
    },
    onEnd: () => {
      clearTimeout(startFallbackTimeout);
      finishOnce();
    },
    onError: (err) => {
      clearTimeout(startFallbackTimeout);
      if (finished) return;
      finished = true;
      cleanupTimers();
      onError?.(err);
    },
  });
}

/**
 * Unified Audio Orchestrator:
 * Plays an audio segment using the configured engine (Studio Audio, Thorsten/Piper PWA, or System TTS),
 * with full-sentence prosody slicing and exact word-level Karaoke synchronization.
 */
export function playAudioSegment(options: AudioSegmentOptions): void {
  const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom');
  const engine = getActiveAudioEngine();
  const speechRate = options.rate ?? 0.9;

  // In headless test environments (JSDOM/Vitest) without audio hardware,
  // execute via System TTS synchronous mock unless engine is explicitly overridden.
  if (isJsdom && !currentEngineOverride) {
    playSystemTts(options);
    return;
  }

  // 1. Studio Audio Mode
  if (engine === 'studio-audio') {
    const fullTokens = options.fullSentenceTokens || options.tokens;
    const isPrefix =
      options.tokens.length > 0 &&
      fullTokens.length > options.tokens.length &&
      fullTokens[0]?.id === options.tokens[0]?.id;

    const isStudioSegmentSupported =
      options.segmentType === 'full' || (options.segmentType === 'app' && isPrefix);

    if (isStudioSegmentSupported) {
      const studioVoice = getActiveStudioVoice();
      const studioUrl = getStudioAudioUrl(
        options.storyId,
        options.sentenceIndex,
        options.segmentType,
        studioVoice
      );
      const studioMeta = getStudioSegmentMetadata(
        options.storyId,
        options.sentenceIndex,
        options.segmentType,
        studioVoice
      );

      if (studioUrl && hasStudioAudio(options.storyId, options.sentenceIndex, options.segmentType) && typeof window !== 'undefined' && !isJsdom) {
        let exactEstimates: TokenTimeEstimate[] | undefined;
        let stopAtMs: number | undefined;

        if (studioMeta && studioMeta.words.length > 0) {
          exactEstimates = options.tokens.map((token, idx) => {
            const wIdx = token.wordIndexInSentence ?? idx;
            const sw = studioMeta.words[wIdx] || studioMeta.words[idx];
            return {
              tokenId: token.id,
              word: token.word,
              startMs: idx === 0 ? 0 : sw?.startMs ?? idx * 350,
              endMs: sw?.endMs ?? (idx + 1) * 350,
            };
          });

          // If playing a shorter prefix (e.g. Level 2/3 where child reads 2-3 words),
          // stop playback right after the last spoken app word
          if (options.tokens.length < studioMeta.words.length) {
            const lastSpokenWordMeta = studioMeta.words[options.tokens.length - 1];
            const nextWordMeta = studioMeta.words[options.tokens.length];
            if (lastSpokenWordMeta && nextWordMeta) {
              stopAtMs = (lastSpokenWordMeta.endMs + nextWordMeta.startMs) / 2;
            } else if (lastSpokenWordMeta) {
              stopAtMs = lastSpokenWordMeta.endMs + 25;
            }
          }
        }

        try {
          playHtmlAudioWithSync(studioUrl, options.tokens, speechRate, {
            exactEstimates,
            stopAtMs,
            onStart: options.onStart,
            onWordHighlight: options.onWordHighlight,
            onEnd: options.onEnd,
            onError: (err) => {
              console.warn('[AudioEngine] Studio audio failed to play, falling back:', err);
              playThorstenOrFallback({ ...options, rate: speechRate });
            },
          });
          return;
        } catch (err) {
          console.warn('[AudioEngine] Studio audio error, falling back:', err);
        }
      }
    }
    // If no studio audio exists for this story, or if this segment is a suffix after a child's word,
    // seamlessly fall back to Piper WASM or system TTS
    playThorstenOrFallback({ ...options, rate: speechRate });
    return;
  }

  // 2. Thorsten / Piper PWA Mode
  if (engine === 'thorsten-pwa') {
    const piperVoice = getActivePiperVoice();
    playThorstenOrFallback({ ...options, rate: speechRate }, piperVoice);
    return;
  }

  // 3. System TTS Mode
  playSystemTts(options);
}

/**
 * Plays via Piper WASM (Thorsten, Kerstin) using full-sentence synthesis and WAV prosody slicing;
 * if environment or download fails, falls back to System TTS.
 */
async function playThorstenOrFallback(
  options: AudioSegmentOptions,
  voiceId?: PiperVoiceId
): Promise<void> {
  const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom');
  if (typeof window === 'undefined' || isJsdom) {
    playSystemTts(options);
    return;
  }

  try {
    const piperVoice = voiceId || getActivePiperVoice();
    const fullTokens =
      options.fullSentenceTokens && options.fullSentenceTokens.length >= options.tokens.length
        ? options.fullSentenceTokens
        : options.tokens;

    const isAppPrefix =
      options.tokens.length > 0 &&
      fullTokens.length > options.tokens.length &&
      fullTokens[0]?.id === options.tokens[0]?.id;

    const { spokenText: fullSpokenText } = buildSpokenSpans(fullTokens);
    const { spokenText: appSpokenText } = buildSpokenSpans(options.tokens);

    let segmentBlob: Blob;
    let exactEstimates: TokenTimeEstimate[];

    if (isAppPrefix) {
      const fullWavBlob = await synthesizeThorsten(
        fullSpokenText || options.text,
        piperVoice,
        options.tokens.length
      );

      const sliced = await sliceWavBlobForSegment(
        fullWavBlob,
        options.tokens,
        fullTokens,
        options.rate ?? 0.9
      );
      segmentBlob = sliced.blob;
      exactEstimates = sliced.estimates;
    } else {
      // Suffix words (words coming AFTER the child's word) or full sentence:
      // Synthesize ONLY the segment's actual words, not the sentence prefix!
      const wavBlob = await synthesizeThorsten(
        options.text || appSpokenText,
        piperVoice
      );
      const sliced = await sliceWavBlobForSegment(
        wavBlob,
        options.tokens,
        options.tokens,
        options.rate ?? 0.9
      );
      segmentBlob = sliced.blob;
      exactEstimates = sliced.estimates;
    }

    // Prefer Web Audio API (AudioContext) for synthesized WAV blobs so mobile browsers
    // never block playback after async WASM synthesis
    const playedViaWebAudio = await playWavBlobWithAudioContext(
      segmentBlob,
      options.tokens,
      exactEstimates,
      {
        onStart: options.onStart,
        onWordHighlight: options.onWordHighlight,
        onEnd: options.onEnd,
      }
    );
    if (playedViaWebAudio) {
      return;
    }

    const blobUrl = URL.createObjectURL(segmentBlob);
    currentBlobUrl = blobUrl;

    playHtmlAudioWithSync(blobUrl, options.tokens, options.rate ?? 0.9, {
      exactEstimates,
      onStart: options.onStart,
      onWordHighlight: options.onWordHighlight,
      onEnd: () => {
        if (currentBlobUrl === blobUrl) {
          URL.revokeObjectURL(blobUrl);
          currentBlobUrl = null;
        }
        options.onEnd?.();
      },
      onError: (err) => {
        console.warn('[AudioEngine] Piper audio playback error, falling back to System TTS:', err);
        if (currentBlobUrl === blobUrl) {
          URL.revokeObjectURL(blobUrl);
          currentBlobUrl = null;
        }
        playSystemTts(options);
      },
    });
  } catch (err) {
    console.warn('[AudioEngine] Piper WASM failed, falling back to System TTS:', err);
    playSystemTts(options);
  }
}

/**
 * Tests an audio engine with a selected voice and sample text.
 */
export async function testAudioEngineVoice(
  engine: AudioEngineType,
  voiceId?: string,
  sampleText: string = 'Hallo! Lass uns zusammen lesen!'
): Promise<void> {
  const dummyTokens: WordToken[] = [
    { id: 't0', word: 'Hallo!', cleanWord: 'Hallo', role: 'app', syllables: ['Hal', 'lo'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
    { id: 't1', word: 'Lass', cleanWord: 'Lass', role: 'app', syllables: ['Lass'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 1 },
    { id: 't2', word: 'uns', cleanWord: 'uns', role: 'app', syllables: ['uns'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 2 },
    { id: 't3', word: 'zusammen', cleanWord: 'zusammen', role: 'app', syllables: ['zu', 'sam', 'men'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 3 },
    { id: 't4', word: 'lesen!', cleanWord: 'lesen', role: 'app', syllables: ['le', 'sen'], status: 'pending', sentenceIndex: 0, wordIndexInSentence: 4 },
  ];

  if (engine === 'studio-audio') {
    const vId = (voiceId as StudioVoiceId) || getActiveStudioVoice();
    const url = `/audio/stories/level-1/theme_forest_ep01/voices/${vId}/sentence_0_full.mp3`;
    playHtmlAudioWithSync(url, dummyTokens, 0.9, {});
    return;
  }

  if (engine === 'thorsten-pwa') {
    const vId = (voiceId as PiperVoiceId) || getActivePiperVoice();
    playThorstenOrFallback(
      {
        text: sampleText,
        tokens: dummyTokens,
        segmentType: 'full',
        rate: 0.9,
      },
      vId
    );
    return;
  }

  // System TTS
  testVoice(voiceId, sampleText);
}

/**
 * Pauses active audio playback across all engines.
 */
export function pauseAudio(): void {
  clearSyncTimer();
  if (sharedAudioContext && sharedAudioContext.state === 'running' && activeBufferSource) {
    sharedAudioContext.suspend().catch(() => {});
  }
  if (currentAudio) {
    currentAudio.pause();
  }
  pauseSpeech();
}

/**
 * Resumes paused audio playback across all engines.
 */
export function resumeAudio(): void {
  if (sharedAudioContext && sharedAudioContext.state === 'suspended' && activeBufferSource) {
    sharedAudioContext.resume().catch(() => {});
  } else if (currentAudio) {
    currentAudio.play().catch(() => {});
  } else {
    resumeSpeech();
  }
}

/**
 * Stops any active audio playback across all engines and cleans up resources.
 */
export function stopAudio(): void {
  clearCurrentAudio();
  stopSpeech();
}
