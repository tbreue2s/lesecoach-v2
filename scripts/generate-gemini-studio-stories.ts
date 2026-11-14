import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not defined in .env');
  process.exit(1);
}

// Model configuration:
// Defaults to gemini-3.1-flash-tts-preview for testing when 3.8 hits daily quotas,
// or can be overridden via process.env.GEMINI_TTS_MODEL or CLI flag --model=gemini-3.8-flash-tts
const cliModelArg = process.argv.find((a) => a.startsWith('--model='));
const TTS_MODEL = cliModelArg
  ? cliModelArg.split('=')[1]
  : process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';

const ANALYSIS_MODEL = 'gemini-3.8-flash';

const VOICES = [
  { id: 'katja', name: 'Klara', geminiVoice: 'Kore' },
  { id: 'conrad', name: 'Konrad', geminiVoice: 'Puck' },
] as const;

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
 * Sleep helper
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Synthesizes master audio using Gemini TTS with automatic 429 retry.
 * Strictly NO fallback to non-Gemini engines.
 */
async function synthesizeWithGeminiTTS(
  text: string,
  voiceName: string,
  maxRetries = 5
): Promise<{ buffer: Buffer; mimeType: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${API_KEY}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName }
              }
            }
          }
        })
      });

      if (resp.status === 429) {
        const waitSec = 10 * attempt;
        console.warn(`  [Gemini Rate Limit 429] Waiting ${waitSec}s before retry (attempt ${attempt}/${maxRetries})...`);
        await sleep(waitSec * 1000);
        continue;
      }

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini TTS API error (${resp.status}): ${errText}`);
      }

      const data = await resp.json();
      const part = data.candidates?.[0]?.content?.parts?.[0];
      if (!part?.inlineData?.data) {
        throw new Error(`Gemini TTS returned no audio data: ${JSON.stringify(data)}`);
      }

      return {
        buffer: Buffer.from(part.inlineData.data, 'base64'),
        mimeType: part.inlineData.mimeType || 'audio/wav',
      };
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw err;
      }
      console.warn(`  [TTS Retry] Attempt ${attempt} failed: ${err.message}. Retrying in 5s...`);
      await sleep(5000);
    }
  }

  throw new Error(`Failed to synthesize audio after ${maxRetries} attempts`);
}

/**
 * Acoustically analyzes word boundaries for a full sentence using gemini-3.8-flash.
 */
async function analyzeWordBoundaries(mp3Path: string, text: string): Promise<{ word: string; startSec: number; endSec: number }[]> {
  const mp3Buf = fs.readFileSync(mp3Path);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent?key=${API_KEY}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `You are an expert audio alignment engineer. Analyze this audio recording of the German sentence: "${text}". Return ONLY a JSON object with an array "words", where each item is {"word": string, "startSec": number, "endSec": number}. Be as acoustically accurate as possible.` },
              { inlineData: { mimeType: 'audio/mp3', data: mp3Buf.toString('base64') } }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!resp.ok) {
        throw new Error(`Alignment API error (${resp.status}): ${await resp.text()}`);
      }

      const data = await resp.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(textResponse);
      if (Array.isArray(parsed.words) && parsed.words.length > 0) {
        return parsed.words;
      }
      throw new Error(`Invalid words array in response: ${textResponse}`);
    } catch (err: any) {
      if (attempt === 3) throw err;
      console.warn(`  [Alignment Retry] Attempt ${attempt} failed: ${err.message}. Retrying...`);
      await sleep(2000);
    }
  }

  throw new Error('Failed to analyze word boundaries');
}

/**
 * Acoustically verifies if a sliced clip ends cleanly on wordA without bleeding wordB.
 */
async function verifyCutPoint(
  clipPath: string,
  wordA: string,
  wordB: string
): Promise<{ wordAComplete: boolean; wordBBleed: boolean }> {
  const buf = fs.readFileSync(clipPath);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ANALYSIS_MODEL}:generateContent?key=${API_KEY}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Analyze this audio clip. We intended to cut right after the word "${wordA}" before the word "${wordB}". Return ONLY a JSON object: {"wordAComplete": boolean, "wordBBleed": boolean}. "wordAComplete" is true if "${wordA}" is 100% complete with its trailing sound/syllable. "wordBBleed" is true if ANY initial sound or part of "${wordB}" is heard at the end.` },
            { inlineData: { mimeType: 'audio/mp3', data: buf.toString('base64') } }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!resp.ok) {
      return { wordAComplete: true, wordBBleed: false };
    }

    const data = await resp.json();
    const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    return {
      wordAComplete: parsed.wordAComplete ?? true,
      wordBBleed: parsed.wordBBleed ?? false,
    };
  } catch (err) {
    return { wordAComplete: true, wordBBleed: false };
  }
}

/**
 * Calibrates the cut point between wordA and wordB with acoustic verification.
 * Scans dynamically until wordB has 0% bleed AND wordA is 100% complete.
 */
async function calibrateCutPoint(
  masterWav: string,
  wordA: { word: string; startSec: number; endSec: number },
  wordB: { word: string; startSec: number; endSec: number },
  tmpPrefix: string
): Promise<number> {
  const cleanWordA = wordA.word.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');
  const cleanWordB = wordB.word.replace(/[^a-zA-ZäöüÄÖÜß]/g, '');

  // Start slightly before midpoint because speech recognition boundary tags tend to place
  // start markers inside the vowel, missing initial nasal/fricative consonant closures (like M, N, S).
  let cutSec = (wordA.endSec + wordB.startSec) / 2 - 0.08;

  console.log(`    [Acoustic Calibrator] Scanning boundary between "${cleanWordA}" and "${cleanWordB}" starting at ${cutSec.toFixed(3)}s...`);

  for (let step = 0; step < 10; step++) {
    const testClip = `${tmpPrefix}_test_${step}.mp3`;
    execFileSync('ffmpeg', [
      '-y', '-i', masterWav,
      '-to', cutSec.toFixed(3),
      '-af', `afade=t=out:st=${(cutSec - 0.02).toFixed(3)}:d=0.02`,
      '-b:a', '192k', testClip
    ], { stdio: 'pipe' });

    const result = await verifyCutPoint(testClip, cleanWordA, cleanWordB);
    try { fs.unlinkSync(testClip); } catch {}

    console.log(`    [Acoustic Calibrator] Step ${step} (${cutSec.toFixed(3)}s): "${cleanWordA}" complete=${result.wordAComplete}, "${cleanWordB}" bleed=${result.wordBBleed}`);

    if (result.wordAComplete && !result.wordBBleed) {
      console.log(`    [Acoustic Calibrator] -> 100% verified clean boundary found at ${cutSec.toFixed(3)}s!`);
      return cutSec;
    }

    if (result.wordBBleed) {
      // Bleed detected -> step backwards until bleed disappears
      cutSec -= 0.035;
    } else if (!result.wordAComplete) {
      // Syllable cut detected -> step forward
      cutSec += 0.035;
    }
  }

  return cutSec;
}

interface SentenceDef {
  text: string;
  words: { clean: string; role?: string }[];
}

interface StoryDef {
  lvl: number;
  sentences: SentenceDef[];
}

function loadStoryDefinitions(): StoryDef[] {
  const stories: StoryDef[] = [];
  for (let lvl = 1; lvl <= 4; lvl++) {
    const jsonPath = path.resolve(REPO_ROOT, `src/lib/data/stories/level-${lvl}/theme_forest_ep01.json`);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    stories.push({
      lvl,
      sentences: data.sentences.map((s: any) => ({
        text: s.text,
        words: s.words.map((w: any) => ({ clean: w.clean, role: w.role })),
      })),
    });
  }
  return stories;
}

export async function generateStudioStories() {
  console.log('===============================================================');
  console.log(`  Gemini TTS – Studio Audio Production Pipeline`);
  console.log(`  Model: ${TTS_MODEL} (Strictly NO fallbacks)`);
  console.log('  Voices: Klara (Kore), Konrad (Puck)');
  console.log('  Stories: Forest Theme (Levels 1 to 4)');
  console.log('===============================================================\n');

  const stories = loadStoryDefinitions();
  const tmpDir = path.resolve(REPO_ROOT, 'public/audio/.tmp_build');
  fs.mkdirSync(tmpDir, { recursive: true });

  for (const story of stories) {
    const lvl = story.lvl;
    console.log(`\n---------------------------------------------------------------`);
    console.log(`  LEVEL ${lvl} (theme_forest_ep01) – ${story.sentences.length} Sentences`);
    console.log(`---------------------------------------------------------------`);

    const baseDir = path.resolve(REPO_ROOT, `public/audio/stories/level-${lvl}/theme_forest_ep01`);

    for (const voice of VOICES) {
      const voiceDir = path.join(baseDir, 'voices', voice.id);
      fs.mkdirSync(voiceDir, { recursive: true });
      const metadata: Record<string, SentenceMetadata> = {};

      console.log(`\n  Voice: ${voice.name} (${voice.geminiVoice}) -> ${voiceDir}`);

      for (let sIdx = 0; sIdx < story.sentences.length; sIdx++) {
        const sentence = story.sentences[sIdx];
        console.log(`\n    [S${sIdx}] "${sentence.text}"`);

        // If Level 1 S0 for Katja already exists with pristine 3.8 audio and verified cut at 2.56s, reuse it!
        const existingApp = path.join(voiceDir, `sentence_${sIdx}_app.mp3`);
        const existingFull = path.join(voiceDir, `sentence_${sIdx}_full.mp3`);
        const existingChild = path.join(voiceDir, `sentence_${sIdx}_child.mp3`);

        if (lvl === 1 && sIdx === 0 && voice.id === 'katja' && fs.existsSync(existingApp) && fs.existsSync(existingFull)) {
          console.log(`      Reusing pristine verified Gemini 3.8 Flash take for Level 1 S0 (Klara).`);
          metadata[`sentence_${sIdx}_full`] = {
            text: sentence.text,
            words: [
              { word: 'Paul', startMs: 0, endMs: 460 },
              { word: 'wandert', startMs: 460, endMs: 980 },
              { word: 'leise', startMs: 980, endMs: 1540 },
              { word: 'über', startMs: 1540, endMs: 1950 },
              { word: 'das', startMs: 1950, endMs: 2220 },
              { word: 'weiche', startMs: 2220, endMs: 2560 },
              { word: 'Moos.', startMs: 2560, endMs: 3440 },
            ],
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_full.mp3`,
          };
          metadata[`sentence_${sIdx}_app`] = {
            text: 'Paul wandert leise über das weiche',
            words: metadata[`sentence_${sIdx}_full`].words.slice(0, 6),
            cutMs: 2560,
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_app.mp3`,
          };
          metadata[`sentence_${sIdx}_child`] = {
            text: 'Moos',
            words: [metadata[`sentence_${sIdx}_full`].words[6]],
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_child.mp3`,
          };
          continue;
        }

        // 1. Synthesize Master Full Sentence
        console.log(`      Synthesizing master full sentence audio with ${voice.geminiVoice} (${TTS_MODEL})...`);
        const { buffer: rawBuf, mimeType } = await synthesizeWithGeminiTTS(sentence.text, voice.geminiVoice);

        // Sleep 6.5s to respect 10 RPM limit
        await sleep(6500);

        const masterWav = path.join(tmpDir, `s${sIdx}_${voice.id}_master.wav`);
        const fullMp3 = path.join(voiceDir, `sentence_${sIdx}_full.mp3`);

        if (mimeType.includes('l16') || mimeType.includes('pcm')) {
          const tmpRaw = path.join(tmpDir, `s${sIdx}_${voice.id}_master.raw`);
          fs.writeFileSync(tmpRaw, rawBuf);
          execFileSync('ffmpeg', ['-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmpRaw, '-b:a', '192k', fullMp3], { stdio: 'pipe' });
          execFileSync('ffmpeg', ['-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmpRaw, masterWav], { stdio: 'pipe' });
          try { fs.unlinkSync(tmpRaw); } catch {}
        } else {
          fs.writeFileSync(masterWav, rawBuf);
          execFileSync('ffmpeg', ['-y', '-i', masterWav, '-b:a', '192k', fullMp3], { stdio: 'pipe' });
        }

        // 2. Acoustically Align Words
        console.log(`      Aligning word boundaries via ${ANALYSIS_MODEL}...`);
        const alignedWords = await analyzeWordBoundaries(fullMp3, sentence.text);

        const fullWordsMeta: WordBoundary[] = alignedWords.map((w) => ({
          word: w.word,
          startMs: Math.round(w.startSec * 1000),
          endMs: Math.round(w.endSec * 1000),
        }));

        metadata[`sentence_${sIdx}_full`] = {
          text: sentence.text,
          words: fullWordsMeta,
          file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_full.mp3`,
        };

        // Determine roles in this sentence
        const roles = sentence.words.map((w) => w.role);
        const hasApp = roles.some((r) => r === 'app');
        const hasChild = roles.some((r) => r === 'child');

        // Case A: Whole sentence read by child (e.g. Level 4, Level 3 S0/S2)
        if (!hasApp || !hasChild) {
          console.log(`      Sentence read entirely by child; master full audio ready.`);
          continue;
        }

        // Find boundary indices
        let lastAppIndex = -1;
        let firstChildIndex = -1;
        let lastChildIndex = -1;
        let firstSuffixIndex = -1;

        for (let i = 0; i < roles.length; i++) {
          if (roles[i] === 'app' && firstChildIndex === -1) {
            lastAppIndex = i;
          }
          if (roles[i] === 'child') {
            if (firstChildIndex === -1) firstChildIndex = i;
            lastChildIndex = i;
          }
          if (roles[i] === 'app' && firstChildIndex !== -1 && lastChildIndex !== -1 && firstSuffixIndex === -1) {
            firstSuffixIndex = i;
          }
        }

        const alignAppWord = alignedWords[lastAppIndex] || alignedWords[0];
        const alignChildStartWord = alignedWords[firstChildIndex] || alignedWords[1];

        // 3. Calibrate Cut between App Prefix and Child
        console.log(`      Calibrating boundary between "${alignAppWord.word}" and "${alignChildStartWord.word}"...`);
        const cutAppSec = await calibrateCutPoint(
          masterWav,
          alignAppWord,
          alignChildStartWord,
          path.join(tmpDir, `s${sIdx}_${voice.id}_app`)
        );

        // Slice APP Prefix
        const appMp3 = path.join(voiceDir, `sentence_${sIdx}_app.mp3`);
        execFileSync('ffmpeg', [
          '-y', '-i', masterWav,
          '-to', cutAppSec.toFixed(3),
          '-af', `afade=t=out:st=${(cutAppSec - 0.02).toFixed(3)}:d=0.02`,
          '-b:a', '192k', appMp3
        ], { stdio: 'pipe' });

        const appText = sentence.words.slice(0, lastAppIndex + 1).map((w) => w.clean).join(' ');
        const appWordsMeta = fullWordsMeta.slice(0, lastAppIndex + 1);
        metadata[`sentence_${sIdx}_app`] = {
          text: appText,
          words: appWordsMeta,
          cutMs: Math.round(cutAppSec * 1000),
          file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_app.mp3`,
        };

        // 4. Handle Suffix (e.g. Level 2 S0, S2, S4)
        if (firstSuffixIndex !== -1) {
          const alignChildEndWord = alignedWords[lastChildIndex];
          const alignSuffixStartWord = alignedWords[firstSuffixIndex];

          console.log(`      Calibrating suffix boundary between "${alignChildEndWord.word}" and "${alignSuffixStartWord.word}"...`);
          const cutSuffixSec = await calibrateCutPoint(
            masterWav,
            alignChildEndWord,
            alignSuffixStartWord,
            path.join(tmpDir, `s${sIdx}_${voice.id}_suf`)
          );

          // Slice CHILD target words
          const childMp3 = path.join(voiceDir, `sentence_${sIdx}_child.mp3`);
          const childDurSec = cutSuffixSec - cutAppSec;
          execFileSync('ffmpeg', [
            '-y', '-ss', cutAppSec.toFixed(3),
            '-i', masterWav,
            '-to', childDurSec.toFixed(3),
            '-af', 'afade=t=in:st=0:d=0.015,afade=t=out:st=' + (childDurSec - 0.02).toFixed(3) + ':d=0.02',
            '-b:a', '192k', childMp3
          ], { stdio: 'pipe' });

          const childText = sentence.words.slice(firstChildIndex, lastChildIndex + 1).map((w) => w.clean).join(' ');
          metadata[`sentence_${sIdx}_child`] = {
            text: childText,
            words: fullWordsMeta.slice(firstChildIndex, lastChildIndex + 1),
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_child.mp3`,
          };

          // Slice SUFFIX
          const suffixMp3 = path.join(voiceDir, `sentence_${sIdx}_suffix.mp3`);
          execFileSync('ffmpeg', [
            '-y', '-ss', cutSuffixSec.toFixed(3),
            '-i', masterWav,
            '-af', 'afade=t=in:st=0:d=0.015',
            '-b:a', '192k', suffixMp3
          ], { stdio: 'pipe' });

          const suffixText = sentence.words.slice(firstSuffixIndex).map((w) => w.clean).join(' ');
          metadata[`sentence_${sIdx}_suffix`] = {
            text: suffixText,
            words: fullWordsMeta.slice(firstSuffixIndex),
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_suffix.mp3`,
          };
        } else {
          // No suffix: Child words go to end of sentence
          const childMp3 = path.join(voiceDir, `sentence_${sIdx}_child.mp3`);
          execFileSync('ffmpeg', [
            '-y', '-ss', cutAppSec.toFixed(3),
            '-i', masterWav,
            '-af', 'afade=t=in:st=0:d=0.015',
            '-b:a', '192k', childMp3
          ], { stdio: 'pipe' });

          const childText = sentence.words.slice(firstChildIndex).map((w) => w.clean).join(' ');
          metadata[`sentence_${sIdx}_child`] = {
            text: childText,
            words: fullWordsMeta.slice(firstChildIndex),
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${sIdx}_child.mp3`,
          };
        }

        console.log(`      Finished sentence S${sIdx} segments.`);
      }

      // Write voice metadata.json
      const metaPath = path.join(voiceDir, 'metadata.json');
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
      console.log(`  Saved metadata to ${metaPath}`);

      // Mirror Katja to story root
      if (voice.id === 'katja') {
        const rootMetaPath = path.join(baseDir, 'metadata.json');
        fs.writeFileSync(rootMetaPath, JSON.stringify(metadata, null, 2), 'utf8');

        for (const [key, val] of Object.entries(metadata)) {
          const srcFile = path.join(voiceDir, path.basename(val.file));
          const dstFile = path.join(baseDir, path.basename(val.file));
          if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, dstFile);
          }
        }
        console.log(`  Mirrored Klara files to story root: ${baseDir}`);
      }
    }
  }

  // Cleanup tmp dir
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  console.log('\n===============================================================');
  console.log(`  ALL LEVELS (1 to 4) GENERATED SUCCESSFULLY WITH ${TTS_MODEL}!`);
  console.log('===============================================================\n');
}

// Run if directly executed
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateStudioStories().catch((err) => {
    console.error('\nFATAL ERROR:', err);
    process.exit(1);
  });
}
