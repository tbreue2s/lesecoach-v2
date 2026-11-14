import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Load environment variables from .env if present
function loadEnv() {
  const envPath = path.resolve(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

export interface VoiceProfile {
  id: 'katja' | 'conrad';
  probeId: 'probe1' | 'probe2';
  name: string;
  gender: 'female' | 'male';
  style: string;
  geminiVoice: string;
  chirpVoice: string;
  neuralVoice: string;
}

export const VOICES: VoiceProfile[] = [
  {
    id: 'katja',
    probeId: 'probe1',
    name: 'Klara (Herzliche Erzählerin)',
    gender: 'female',
    style: 'Weiblich herzlich, warm und einfühlsam',
    geminiVoice: 'Kore',
    chirpVoice: 'de-DE-Chirp3-HD-Fenrir',
    neuralVoice: 'de-DE-KatjaNeural',
  },
  {
    id: 'conrad',
    probeId: 'probe2',
    name: 'Konrad (Ruhiger Erzähler)',
    gender: 'male',
    style: 'Männlich ruhig-erzählerisch, sanft und klar',
    geminiVoice: 'Puck',
    chirpVoice: 'de-DE-Chirp3-HD-Puck',
    neuralVoice: 'de-DE-ConradNeural',
  },
];

export interface WordBoundary {
  word: string;
  startMs: number;
  endMs: number;
}

export interface SentenceMetadata {
  text: string;
  words: WordBoundary[];
  cutMs?: number;
  file: string;
}

/**
 * Returns audio duration in seconds using ffprobe.
 */
export function getAudioDurationSec(filePath: string): number {
  try {
    const out = execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { encoding: 'utf8' }).trim();
    return parseFloat(out) || 0;
  } catch (err) {
    console.warn(`[generate-tts] ffprobe failed for ${filePath}:`, err);
    return 0;
  }
}

/**
 * Fallback: Calculates proportional word timestamps calibrated for German child storybook speech cadence.
 */
export function calculateWordTimestamps(text: string, durationSec: number): WordBoundary[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const totalDurationMs = Math.max(1000, durationSec * 1000);
  const leadSilenceMs = 120;
  const trailSilenceMs = 150;
  const spokenDurationMs = Math.max(800, totalDurationMs - leadSilenceMs - trailSilenceMs);

  const weights = words.map((w) => {
    const clean = w.replace(/[.,!?;:„“"»«”]/g, '');
    let syllables = Math.max(1, Math.round(clean.length / 2.8));
    if (/[aeiouäöü]{2,}/i.test(clean)) syllables = Math.max(1, syllables - 1);
    let weight = Math.max(1.0, syllables * 1.35 + clean.length * 0.15);
    if (/[.,!?;:]$/.test(w)) weight += 0.8;
    return weight;
  });

  const totalWeight = weights.reduce((acc, v) => acc + v, 0);
  let currentStart = leadSilenceMs;

  return words.map((w, idx) => {
    const wordDuration = (weights[idx] / totalWeight) * spokenDurationMs;
    const startMs = Math.round(currentStart * 10) / 10;
    const endMs = Math.round((currentStart + wordDuration * 0.88) * 10) / 10;
    currentStart += wordDuration;
    return {
      word: w,
      startMs,
      endMs,
    };
  });
}

/**
 * Extracts exact word timestamps from an audio file using Gemini multimodal audio analysis.
 */
export async function extractWordTimestampsWithGemini(
  audioPath: string,
  apiKey: string
): Promise<WordBoundary[] | null> {
  try {
    const buf = fs.readFileSync(audioPath);
    const b64 = buf.toString('base64');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Listen to the audio carefully. Return a JSON array of words with their start_time and end_time in seconds, e.g. [{"word": "Paul", "start": 0.1, "end": 0.5}]. Only return valid JSON.',
                },
                { inlineData: { mimeType: 'audio/mp3', data: b64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;
    const rawList = JSON.parse(rawText);
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((item: any) => ({
        word: String(item.word || item.text || ''),
        startMs: Math.round(Number(item.start ?? item.start_time ?? 0) * 1000),
        endMs: Math.round(Number(item.end ?? item.end_time ?? 0) * 1000),
      }));
    }
    return null;
  } catch (err) {
    console.warn(`[generate-tts] Gemini timestamp extraction failed:`, (err as Error).message);
    return null;
  }
}

/**
 * Slices an audio segment from a source MP3 with optional fade-in and fade-out.
 * Places -i before -ss for sample-accurate decoding.
 */
export function sliceSegmentWithFfmpeg(
  sourcePath: string,
  destPath: string,
  startSec: number,
  durationSec: number,
  options: { fadeInMs?: number; fadeOutMs?: number } = {}
): void {
  const fadeInSec = (options.fadeInMs || 0) / 1000;
  const fadeOutSec = (options.fadeOutMs || 0) / 1000;
  const filters: string[] = [];

  if (fadeInSec > 0) {
    filters.push(`afade=t=in:st=0:d=${fadeInSec.toFixed(3)}`);
  }
  if (fadeOutSec > 0) {
    const fadeOutStart = Math.max(0, durationSec - fadeOutSec);
    filters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOutSec.toFixed(3)}`);
  }

  const args = ['-y', '-i', sourcePath];
  if (startSec > 0) {
    args.push('-ss', startSec.toFixed(3));
  }
  args.push('-t', durationSec.toFixed(3));
  if (filters.length > 0) {
    args.push('-af', filters.join(','));
  }
  args.push(destPath);

  execFileSync('ffmpeg', args, { stdio: 'pipe' });
}

/**
 * Uses PCM energy analysis to find the exact silence valley (energy minimum) between two words.
 */
export function findAcousticBoundary(
  audioPath: string,
  approxMs: number,
  searchWindowMs = 250
): number {
  try {
    const pcm = execFileSync('ffmpeg', [
      '-y', '-i', audioPath,
      '-f', 's16le', '-ac', '1', '-ar', '24000', 'pipe:1'
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
    const totalMs = Math.round(samples.length / 24);
    const minSearchMs = Math.max(20, approxMs - searchWindowMs);
    const maxSearchMs = Math.min(totalMs - 20, approxMs + searchWindowMs);

    let bestMs = approxMs;
    let minEnergy = Infinity;

    // 10ms window (240 samples), 2ms step (48 samples)
    for (let ms = minSearchMs; ms <= maxSearchMs; ms += 2) {
      const startSample = Math.round(ms * 24);
      let sum = 0;
      for (let i = 0; i < 240; i++) {
        const s = samples[startSample + i] || 0;
        sum += s * s;
      }
      if (sum < minEnergy) {
        minEnergy = sum;
        bestMs = ms;
      }
    }

    return bestMs;
  } catch (err) {
    console.warn('[findAcousticBoundary] Failed, falling back to approxMs:', err);
    return approxMs;
  }
}

const GEMINI_TTS_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-3.8-flash-tts',
];

let currentModelIndex = 0;

/**
 * Synthesizes audio using Gemini Flash TTS API with Flash-Lite priority and quota rotation.
 */
async function synthesizeWithGemini(
  text: string,
  voice: VoiceProfile,
  apiKey: string,
  attempt = 1
): Promise<Buffer> {
  const model = GEMINI_TTS_MODELS[currentModelIndex];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: text,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice.geminiVoice,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();

    // Daily quota reached -> rotate to next model
    if (errText.includes('requests_per_model_per_day') || errText.includes('per day limit exceeded')) {
      if (currentModelIndex < GEMINI_TTS_MODELS.length - 1) {
        currentModelIndex++;
        console.warn(`  [Gemini Quota] Daily quota reached for ${model}, rotating to ${GEMINI_TTS_MODELS[currentModelIndex]}...`);
        return synthesizeWithGemini(text, voice, apiKey, 1);
      }
    }

    if (response.status === 429 && attempt <= 4) {
      const waitSec = 15 * attempt;
      console.warn(`  [Gemini Rate Limit 429 (${model})] Waiting ${waitSec}s before retry (attempt ${attempt}/4)...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      return synthesizeWithGemini(text, voice, apiKey, attempt + 1);
    }
    throw new Error(`Gemini API error (${response.status}) on ${model}: ${errText}`);
  }

  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) {
    throw new Error('Gemini response did not contain inline audio data');
  }

  const rawBuffer = Buffer.from(part.inlineData.data, 'base64');
  const mimeType = part.inlineData.mimeType || '';

  if (mimeType.includes('wav')) {
    const tmpWav = `/tmp/gemini_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`;
    const tmpMp3 = tmpWav.replace('.wav', '.mp3');
    fs.writeFileSync(tmpWav, rawBuffer);
    try {
      execFileSync('ffmpeg', ['-y', '-i', tmpWav, '-b:a', '192k', tmpMp3], { stdio: 'pipe' });
      return fs.readFileSync(tmpMp3);
    } finally {
      try { fs.unlinkSync(tmpWav); } catch {}
      try { fs.unlinkSync(tmpMp3); } catch {}
    }
  }

  if (mimeType.includes('l16') || mimeType.includes('pcm')) {
    const tmpRaw = `/tmp/gemini_tts_${Date.now()}_${Math.random().toString(36).slice(2)}.raw`;
    const tmpMp3 = tmpRaw.replace('.raw', '.mp3');
    fs.writeFileSync(tmpRaw, rawBuffer);
    try {
      execFileSync('ffmpeg', ['-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmpRaw, '-b:a', '192k', tmpMp3], { stdio: 'pipe' });
      return fs.readFileSync(tmpMp3);
    } finally {
      try { fs.unlinkSync(tmpRaw); } catch {}
      try { fs.unlinkSync(tmpMp3); } catch {}
    }
  }

  return rawBuffer;
}

/**
 * Ensures Python venv with edge-tts is available for offline neural voice fallback.
 */
function ensureVenvPython(): string {
  const venvDir = '/tmp/tts_venv';
  const pythonBin = path.join(venvDir, 'bin', 'python');
  if (!fs.existsSync(pythonBin)) {
    console.log('[generate-tts] Creating /tmp/tts_venv with edge-tts for high-quality neural fallback...');
    execSync('python3 -m venv /tmp/tts_venv && /tmp/tts_venv/bin/pip install edge-tts', {
      stdio: 'pipe',
    });
  }
  return pythonBin;
}

/**
 * Synthesizes audio using offline Neural TTS via edge-tts.
 */
function synthesizeWithOfflineNeural(text: string, voice: VoiceProfile, outPath: string): void {
  const pythonBin = ensureVenvPython();
  const escapedText = text.replace(/"/g, '\\"');
  const pyScript = `
import asyncio, edge_tts
async def run():
    c = edge_tts.Communicate("${escapedText}", "${voice.neuralVoice}")
    await c.save("${outPath}")
asyncio.run(run())
`;
  execFileSync(pythonBin, ['-c', pyScript], { stdio: 'pipe' });
}

const synthesisCache = new Map<string, Buffer>();

/**
 * Checks whether an audio file exists and is valid.
 */
export function isCleanAudioFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (stat.size < 4000) return false;
  const dur = getAudioDurationSec(filePath);
  return dur > 0.4 && dur < 9.0;
}

/**
 * Synthesizes full sentence text to an MP3 file.
 */
export async function synthesizeAudio(
  text: string,
  voice: VoiceProfile,
  outPath: string,
  options: { apiKey?: string; gcpKey?: string; offline?: boolean; force?: boolean } = {}
): Promise<void> {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (!options.force && isCleanAudioFile(outPath)) {
    console.log(`  [Clean Audio Kept] Skipping "${text.slice(0, 32)}..." (${voice.id})`);
    return;
  }

  const cacheKey = `${voice.id}:${text.trim()}`;
  if (synthesisCache.has(cacheKey)) {
    console.log(`  [Cache Hit] Using cached audio for "${text.slice(0, 32)}..." (${voice.id})`);
    fs.writeFileSync(outPath, synthesisCache.get(cacheKey)!);
    return;
  }

  if (options.apiKey && !options.offline) {
    try {
      console.log(`  [Gemini Flash TTS] Synthesizing "${text.slice(0, 32)}..." with ${voice.geminiVoice}`);
      const audioBuffer = await synthesizeWithGemini(text, voice, options.apiKey);
      synthesisCache.set(cacheKey, audioBuffer);
      fs.writeFileSync(outPath, audioBuffer);
      // Pacing for Gemini API rate limits (10 RPM on Tier 1)
      await new Promise((r) => setTimeout(r, 6200));
      return;
    } catch (err) {
      console.warn(`  [Gemini Flash TTS] Fallback triggered due to:`, (err as Error).message);
    }
  }

  synthesizeWithOfflineNeural(text, voice, outPath);
}

/**
 * Generates the 2 intro demo samples for Klara and Konrad.
 */
export async function generateDemoSamples(options: {
  apiKey?: string;
  gcpKey?: string;
  offline?: boolean;
}) {
  const demoText = 'Willkommen im Zauberwald! Lass uns gemeinsam ein spannendes Abenteuer lesen.';
  console.log(`\n🎙️ [1/2] Generating Storybook Audio Demos in static/audio/demos/ & public/audio/demos/...`);

  const publicDemosDir = path.resolve(REPO_ROOT, 'public/audio/demos');
  const staticDemosDir = path.resolve(REPO_ROOT, 'static/audio/demos');
  fs.mkdirSync(publicDemosDir, { recursive: true });
  fs.mkdirSync(staticDemosDir, { recursive: true });

  // Clean up legacy Probe 3
  try { fs.unlinkSync(path.join(publicDemosDir, 'demo_probe3.mp3')); } catch {}
  try { fs.unlinkSync(path.join(staticDemosDir, 'demo_probe3.mp3')); } catch {}

  const metadata: Record<string, SentenceMetadata> = {};

  for (const voice of VOICES) {
    const filename = `demo_${voice.probeId}.mp3`;
    const pubFile = path.join(publicDemosDir, filename);
    const staticFile = path.join(staticDemosDir, filename);

    console.log(`  Generating ${voice.probeId}: ${voice.name}...`);
    await synthesizeAudio(demoText, voice, pubFile, options);
    fs.copyFileSync(pubFile, staticFile);

    const durSec = getAudioDurationSec(pubFile);
    let words: WordBoundary[] = [];
    if (options.apiKey) {
      const extracted = await extractWordTimestampsWithGemini(pubFile, options.apiKey);
      if (extracted && extracted.length > 0) words = extracted;
    }
    if (words.length === 0) {
      words = calculateWordTimestamps(demoText, durSec);
    }

    metadata[voice.probeId] = {
      text: demoText,
      words,
      file: `/audio/demos/${filename}`,
    };
  }

  fs.writeFileSync(
    path.join(publicDemosDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(staticDemosDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf8'
  );

  console.log(`✅ Demo samples generated successfully for Klara (Probe 1) and Konrad (Probe 2).`);
}

/**
 * Generates audio files and metadata for "Wald & Bäume" (theme_forest_ep01) across Levels 1 to 4.
 * Uses full-sentence synthesis to prevent hallucinations, and slices app / child portions with exact millisecond timestamps.
 */
export async function generateForestStoryAudio(options: {
  apiKey?: string;
  gcpKey?: string;
  offline?: boolean;
  levels?: number[];
}) {
  const levels = options.levels && options.levels.length > 0 ? options.levels : [1, 2, 3, 4];
  console.log(`\n🌲 [2/2] Generating "Wald & Bäume" story audio for Levels [${levels.join(', ')}] across Klara & Konrad...`);

  for (const lvl of levels) {
    console.log(`\n======================================================`);
    console.log(`📖 Generating Story Audio for Level ${lvl}...`);
    console.log(`======================================================`);

    const storyFilePath = path.resolve(
      REPO_ROOT,
      `src/lib/data/stories/level-${lvl}/theme_forest_ep01.json`
    );
    if (!fs.existsSync(storyFilePath)) {
      console.warn(`[generate-tts] Story file for level ${lvl} not found: ${storyFilePath}`);
      continue;
    }

    const storyData = JSON.parse(fs.readFileSync(storyFilePath, 'utf8'));
    const baseStoryAudioDir = path.resolve(
      REPO_ROOT,
      `public/audio/stories/level-${lvl}/theme_forest_ep01`
    );
    fs.mkdirSync(baseStoryAudioDir, { recursive: true });

    // Clean up any legacy amala folders
    const amalaDir = path.join(baseStoryAudioDir, 'voices', 'amala');
    if (fs.existsSync(amalaDir)) {
      try { fs.rmSync(amalaDir, { recursive: true, force: true }); } catch {}
    }

    interface StorySentenceDef {
      index: number;
      fullText: string;
      prefixText: string;
      childText: string;
      suffixText: string;
    }

    const sentenceDefs: StorySentenceDef[] =
      storyData.sentences.map((s: any, idx: number) => {
        const fullText = s.text;
        let prefixText = '';
        let childText = '';
        let suffixText = '';

        if (lvl === 1) {
          const words = s.text.split(/\s+/).filter((w: string) => w.length > 0);
          prefixText = words.slice(0, words.length - 1).join(' ');
          childText = words[words.length - 1];
          suffixText = '';
        } else if (lvl === 2) {
          const l2Defs: [string, string, string][] = [
            ['Ein', 'leiser Wind', 'weht über den Pfad.'],
            ['Dort steht plötzlich ein', 'altes Klavier.', ''],
            ['Ein', 'kleiner Igel', 'schleicht neugierig heran.'],
            ['Vorsichtig drückt er eine', 'hohe Note.', ''],
            ['Ein', 'bunter Vogel', 'singt vergnügt mit.'],
          ];
          const def = l2Defs[idx] || ['', s.text, ''];
          prefixText = def[0];
          childText = def[1];
          suffixText = def[2];
        } else if (lvl === 3) {
          const l3Defs: [string, string, string][] = [
            ['', 'Der Pfad raschelt leise.', ''],
            ['Alte Bäume wiegen', 'sich sanft im Wind.', ''],
            ['', 'Dort steht ein Klavier!', ''],
            ['Es ruht mitten', 'im weichen, grünen Moos.', ''],
            ['Ein', 'kleiner Igel drückt mutig.', ''],
            ['Der helle', 'Ton kitzelt alle seine Stacheln.', ''],
          ];
          const def = l3Defs[idx] || ['', s.text, ''];
          prefixText = def[0];
          childText = def[1];
          suffixText = def[2];
        } else if (lvl === 4) {
          const l4Defs: [string, string, string][] = [
            ['Im Moos rascheln goldene Blätter.', '', ''],
            ['', 'Zwei Kinder wandern leise über schmale Waldpfade.', ''],
            ['Da steht ein altes Klavier!', '', ''],
            ['Es glänzt mitten auf der stillen Lichtung.', '', ''],
            ['', 'Ein kleiner Igel tippelt heran.', ''],
            ['Neugierig drückt seine Pfote eine helle Note.', '', ''],
          ];
          const def = l4Defs[idx] || [s.text, '', ''];
          prefixText = def[0];
          childText = def[1];
          suffixText = def[2];
        }

        return {
          index: idx,
          fullText,
          prefixText,
          childText,
          suffixText,
        };
      });

    // Generate per-voice files
    for (const voice of VOICES) {
      const voiceDir = path.join(baseStoryAudioDir, 'voices', voice.id);
      fs.mkdirSync(voiceDir, { recursive: true });
      console.log(`\n  Voice "${voice.id}" (${voice.name}) for Level ${lvl}:`);

      const voiceMetadata: Record<string, SentenceMetadata> = {};

      for (const sDef of sentenceDefs) {
        const fullMp3 = path.join(voiceDir, `sentence_${sDef.index}_full.mp3`);
        const appMp3 = path.join(voiceDir, `sentence_${sDef.index}_app.mp3`);
        const childMp3 = path.join(voiceDir, `sentence_${sDef.index}_child.mp3`);
        const suffixMp3 = path.join(voiceDir, `sentence_${sDef.index}_suffix.mp3`);

        console.log(`    Sentence ${sDef.index}: "${sDef.fullText}"`);

        // 1. Synthesize full sentence (never hallucinating words)
        await synthesizeAudio(sDef.fullText, voice, fullMp3, options);
        const fullDurSec = getAudioDurationSec(fullMp3);

        // 2. Extract word-level boundaries
        let words: WordBoundary[] = [];
        if (options.apiKey) {
          const extracted = await extractWordTimestampsWithGemini(fullMp3, options.apiKey);
          if (extracted && extracted.length > 0) words = extracted;
        }
        if (words.length === 0) {
          words = calculateWordTimestamps(sDef.fullText, fullDurSec);
        }

        voiceMetadata[`sentence_${sDef.index}_full`] = {
          text: sDef.fullText,
          words,
          file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sDef.index}_full.mp3`,
        };

        const hasPrefix = Boolean(sDef.prefixText && sDef.prefixText.trim().length > 0);
        const hasChild = Boolean(sDef.childText && sDef.childText.trim().length > 0);
        const hasSuffix = Boolean(sDef.suffixText && sDef.suffixText.trim().length > 0);

        const prefixWordCount = hasPrefix ? sDef.prefixText.split(/\s+/).filter(Boolean).length : 0;
        const childWordCount = hasChild ? sDef.childText.split(/\s+/).filter(Boolean).length : 0;

        if (hasPrefix && !hasChild && !hasSuffix) {
          // Entire sentence is app
          fs.copyFileSync(fullMp3, appMp3);
          voiceMetadata[`sentence_${sDef.index}_app`] = {
            text: sDef.prefixText,
            words,
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sDef.index}_app.mp3`,
          };
        } else if (!hasPrefix && hasChild && !hasSuffix) {
          // Entire sentence is child
          fs.copyFileSync(fullMp3, childMp3);
          voiceMetadata[`sentence_${sDef.index}_child`] = {
            text: sDef.childText,
            words,
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sDef.index}_child.mp3`,
          };
        } else {
          // Mixed sentence: calculate precise acoustic boundaries
          let t1 = 0;
          if (hasPrefix) {
            const lastPrefixWord = words[Math.min(words.length - 1, prefixWordCount - 1)];
            const firstChildWord = words[Math.min(words.length - 1, prefixWordCount)];
            const approx1 = Math.round(
              ((lastPrefixWord?.endMs ?? 200) + (firstChildWord?.startMs ?? 300)) / 2
            );
            t1 = findAcousticBoundary(fullMp3, approx1, 200);

            sliceSegmentWithFfmpeg(fullMp3, appMp3, 0, t1 / 1000, { fadeOutMs: 10 });
            voiceMetadata[`sentence_${sDef.index}_app`] = {
              text: sDef.prefixText,
              words: words.slice(0, prefixWordCount),
              cutMs: t1,
              file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sDef.index}_app.mp3`,
            };
          }

          let t2 = Math.round(fullDurSec * 1000);
          if (hasSuffix) {
            const lastChildIdx = Math.min(words.length - 1, prefixWordCount + childWordCount - 1);
            const firstSuffixIdx = Math.min(words.length - 1, prefixWordCount + childWordCount);
            const lastChildWord = words[lastChildIdx];
            const firstSuffixWord = words[firstSuffixIdx];
            const approx2 = Math.round(
              ((lastChildWord?.endMs ?? 1000) + (firstSuffixWord?.startMs ?? 1100)) / 2
            );
            t2 = findAcousticBoundary(fullMp3, approx2, 200);

            const suffixStartSec = t2 / 1000;
            const suffixDurSec = Math.max(0.2, fullDurSec - suffixStartSec);
            sliceSegmentWithFfmpeg(fullMp3, suffixMp3, suffixStartSec, suffixDurSec, { fadeInMs: 10 });
            voiceMetadata[`sentence_${sDef.index}_suffix`] = {
              text: sDef.suffixText,
              words: words.slice(prefixWordCount + childWordCount),
              file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sDef.index}_suffix.mp3`,
            };
          }

          if (hasChild) {
            const childStartSec = t1 / 1000;
            const childDurSec = Math.max(0.2, (t2 - t1) / 1000);
            sliceSegmentWithFfmpeg(fullMp3, childMp3, childStartSec, childDurSec, {
              fadeInMs: 10,
              fadeOutMs: 10,
            });
            voiceMetadata[`sentence_${sDef.index}_child`] = {
              text: sDef.childText,
              words: words.slice(prefixWordCount, prefixWordCount + childWordCount),
              file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sDef.index}_child.mp3`,
            };
          }
        }
      }

      const voiceMetaPath = path.join(voiceDir, 'metadata.json');
      fs.writeFileSync(voiceMetaPath, JSON.stringify(voiceMetadata, null, 2) + '\n', 'utf8');

      // Also copy Katja (Klara) to story root as the primary default
      if (voice.id === 'katja') {
        for (const sDef of sentenceDefs) {
          fs.copyFileSync(
            path.join(voiceDir, `sentence_${sDef.index}_full.mp3`),
            path.join(baseStoryAudioDir, `sentence_${sDef.index}_full.mp3`)
          );
          if (fs.existsSync(path.join(voiceDir, `sentence_${sDef.index}_app.mp3`))) {
            fs.copyFileSync(
              path.join(voiceDir, `sentence_${sDef.index}_app.mp3`),
              path.join(baseStoryAudioDir, `sentence_${sDef.index}_app.mp3`)
            );
          }
          if (fs.existsSync(path.join(voiceDir, `sentence_${sDef.index}_child.mp3`))) {
            fs.copyFileSync(
              path.join(voiceDir, `sentence_${sDef.index}_child.mp3`),
              path.join(baseStoryAudioDir, `sentence_${sDef.index}_child.mp3`)
            );
          }
          if (fs.existsSync(path.join(voiceDir, `sentence_${sDef.index}_suffix.mp3`))) {
            fs.copyFileSync(
              path.join(voiceDir, `sentence_${sDef.index}_suffix.mp3`),
              path.join(baseStoryAudioDir, `sentence_${sDef.index}_suffix.mp3`)
            );
          }
        }
        fs.writeFileSync(
          path.join(baseStoryAudioDir, 'metadata.json'),
          JSON.stringify(voiceMetadata, null, 2) + '\n',
          'utf8'
        );
      }
    }
  }

  console.log(`✅ All requested levels generated successfully.`);
}

/**
 * Main CLI entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  const options: {
    apiKey?: string;
    gcpKey?: string;
    offline?: boolean;
    levels?: number[];
  } = {
    apiKey: process.env.GEMINI_API_KEY,
    gcpKey: process.env.GOOGLE_CLOUD_TTS_KEY || process.env.GCP_TTS_API_KEY,
    offline: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--apiKey' && args[i + 1]) options.apiKey = args[++i];
    else if (a === '--gcpKey' && args[i + 1]) options.gcpKey = args[++i];
    else if (a === '--offline') options.offline = true;
    else if (a === '--levels' && args[i + 1]) {
      options.levels = args[++i].split(',').map((n) => parseInt(n.trim(), 10));
    }
  }

  console.log('===========================================================');
  console.log('🎧 Lesecoach HD Audio Generator: Demos & Wald & Bäume');
  console.log('===========================================================');
  if (options.apiKey) {
    console.log('API Mode: Gemini Flash TTS (key detected)');
  } else if (options.gcpKey) {
    console.log('API Mode: Google Cloud TTS Chirp 3 HD (key detected)');
  } else {
    console.log('API Mode: High-Fidelity Neural Storybook Voice Generator');
  }

  await generateDemoSamples(options);
  await generateForestStoryAudio(options);

  console.log('\n🎉 Audio generation completed successfully!');
}

if (process.argv[1] && process.argv[1].endsWith('generate-tts-demos.ts')) {
  main().catch((err) => {
    console.error('Fatal generator error:', err);
    process.exit(1);
  });
}
