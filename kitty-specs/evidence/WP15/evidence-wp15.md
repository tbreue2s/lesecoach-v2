# Technical Evidence: Work Package 15 – TTS Voice Quality & Natural Audio Pipeline

**Work Package:** `WP15`  
**Status:** `merged`  
**Date:** 2026-10-18  

---

## 1. Scope & Verification

1. **Piper TTS WebAssembly Multi-Voice Engine (`public/wasm/` & `audioEngineService.ts`):**
   - Resolved ONNX Runtime CDN version mismatch (`1.18.0` vs `1.30.0`) by hosting `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm`, `piper_phonemize.wasm`, and `piper_phonemize.data` locally under `public/wasm/`.
   - **Root Cause & Fix for Female PWA Voices Fallback:** Female models (Eva K, Ramona, Kerstin) have a vocabulary of 130 symbols (range `[-130, 129]`), whereas default `piper_phonemize` outputted Thorsten-specific default phoneme IDs (e.g. index 140 for "ch" / "ç"), triggering ONNX Runtime `Gather indices out of bounds` errors that caused silent fallback to System-TTS. Implemented `mapPhonemesToIds` to map raw IPA phonemes strictly according to each model's `phoneme_id_map` within model bounds.
   - **Root Cause & Fix for 30s+ Latency:** Shared WASM assets (`ort-wasm-simd-threaded.wasm` 14 MB, `piper_phonemize.data` 18 MB, `piper_phonemize.wasm` 0.6 MB) and the phonemizer Emscripten module are now loaded ONCE via a singleton promise (`ensureSharedWasmAssets`). ONNX models are cached permanently in browser `CacheStorage` (`lesecoach-models-v1`) and OPFS, reducing voice switching and repeat loads from 30+ seconds to milliseconds.
   - Pre-warming of selected voices occurs automatically in background on mount and voice change.
   - Fixed mobile Chrome/Pixel 8 Pro autoplay block after async WASM inference via Web Audio API (`AudioContext` / `AudioBufferSourceNode`) with early gesture unlock (`setupMobileAudioUnlock`).
   - Added `sliceWavBlobForSegment` to synthesize complete sentences and slice 16-bit PCM WAV buffers at the natural RMS silence dip right before the child's word with a 20ms fade-out.

2. **Precomputed Studio Audio Pipeline with 3 Voices (`public/audio/stories/level-1/theme_forest_ep01/voices/`):**
   - Synthesized all 5 sentences (`sentence_0..4_full.mp3`) of *„Konzert im Moos“* (`theme_forest_ep01`) for **Conrad** (`de-DE-ConradNeural`), **Katja** (`de-DE-KatjaNeural`), and **Amala** (`de-DE-AmalaNeural`) with `WordBoundary` millisecond metadata (`metadata.json`).
   - Generated `sentence_0..4_app.mp3` by slicing directly from the full-sentence audio via `ffmpeg` right before the child's word with a 25ms `afade` fade-out, preserving 100% natural full-sentence intonation.
3. **Karaoke Synchronization & Multi-Voice Selectors:**
   - Fixed `playHtmlAudioWithSync` so `onloadedmetadata` updates duration estimates without terminating the running 25ms sync interval.
   - Updated `mapElapsedTimeToTokenId` to hold the previous word during inter-word micro-pauses instead of resetting to token 0.
   - Added voice selection cards with direct `🔊 Probe` preview in `ProfileSetup.svelte`.
   - Added voice pill switcher subrow in the reading dock (`MockReadingControls.svelte`).
4. **Full-Sentence Prosody in System-TTS (`playSystemTts`):**
   - Passed the complete sentence text to `SpeechSynthesisUtterance` and cut playback via `speechSynthesis.cancel()` in `onBoundary` as soon as `charIndex` reaches the child's target word.

---

## 2. Test Execution (`npm test -- --run`)

All 18 test suites (166 tests) pass with 0 errors:

```
 ✓ src/lib/services/audioEngineService.test.ts (8)
 ✓ src/lib/services/speechService.test.ts (6)
 ✓ src/lib/stores/readingSessionStore.test.ts (7)
 ✓ src/lib/services/speechRecognitionService.test.ts (8)
 ✓ src/lib/utils/tokenizer.test.ts (29)
 ✓ src/lib/utils/levelValidator.test.ts (13)
 ✓ src/lib/utils/mockStoryGenerator.test.ts (16)
 ✓ src/lib/utils/promptTemplates.test.ts (13)
 ✓ src/lib/utils/generateStories.test.ts (10)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/utils/charMapper.test.ts (6)
 ✓ src/lib/stores/profileStore.test.ts (5)
 ✓ src/lib/stores/routerStore.test.ts (3)
 ✓ src/lib/stores/storyConfigStore.test.ts (3)
 ✓ src/lib/services/storyGeneratorService.test.ts (3)
 ✓ src/lib/utils/syllableSplitter.test.ts (6)
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/utils/validation.test.ts (8)

 Test Files  18 passed (18)
      Tests  166 passed (166)
   Duration  2.34s
```

---

## 3. Production Build Execution (`npm run build`)

```
vite v5.4.21 building for production...
✓ 289 modules transformed.
dist/registerSW.js                                     0.14 kB
dist/manifest.webmanifest                              0.42 kB
dist/index.html                                        1.14 kB │ gzip:   0.59 kB
dist/assets/ort-wasm-simd-threaded-DcHrbrbl.wasm  14,239.90 kB
dist/assets/index-iZ1oCeyw.css                        38.90 kB │ gzip:   6.63 kB
dist/assets/piper-tts-web-BBDJZLZr.js                 16.42 kB │ gzip:   5.27 kB
dist/assets/ort.wasm.bundle.min-1L1tNTML.js           73.54 kB │ gzip:  24.75 kB
dist/assets/piper-o91UDS6e-DgOcfqjf.js                88.78 kB │ gzip:  24.74 kB
dist/assets/voices_static-D_OtJDHM-Paf1G-qN.js        96.60 kB │ gzip:  26.31 kB
dist/assets/index-BVa73Y43.js                        575.47 kB │ gzip: 134.08 kB
✓ built in 1.18s

PWA v2.0.0
mode      generateSW
precache  11 entries (874.17 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
```
