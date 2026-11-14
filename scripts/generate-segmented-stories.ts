import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const VOICES = [
  { id: 'katja', name: 'de-DE-KatjaNeural' },
  { id: 'conrad', name: 'de-DE-ConradNeural' },
] as const;

interface SegmentSpec {
  lvl: number;
  idx: number;
  fullText: string;
  appText?: string;
  childText?: string;
  suffixText?: string;
}

const STORY_SEGMENTS: SegmentSpec[] = [
  // --- LEVEL 1 (Das Sofa im Moos) ---
  {
    lvl: 1,
    idx: 0,
    fullText: 'Paul wandert leise über das weiche Moos.',
    appText: 'Paul wandert leise über das weiche,',
    childText: 'Moos.',
  },
  {
    lvl: 1,
    idx: 1,
    fullText: 'Mitten im Wald steht ein rotes Sofa.',
    appText: 'Mitten im Wald steht ein rotes,',
    childText: 'Sofa.',
  },
  {
    lvl: 1,
    idx: 2,
    fullText: 'Darauf schläft friedlich ein kleiner dicker Igel.',
    appText: 'Darauf schläft friedlich ein kleiner dicker,',
    childText: 'Igel.',
  },
  {
    lvl: 1,
    idx: 3,
    fullText: 'Kichernd rollt der Igel vom weichen Sofa.',
    appText: 'Kichernd rollt der Igel vom weichen,',
    childText: 'Sofa.',
  },

  // --- LEVEL 2 (Musik im Moos) ---
  {
    lvl: 2,
    idx: 0,
    fullText: 'Ein leiser Wind weht über den Pfad.',
    appText: 'Ein,',
    childText: 'leiser Wind.',
    suffixText: 'weht über den Pfad.',
  },
  {
    lvl: 2,
    idx: 1,
    fullText: 'Dort steht plötzlich ein altes Klavier.',
    appText: 'Dort steht plötzlich ein,',
    childText: 'altes Klavier.',
  },
  {
    lvl: 2,
    idx: 2,
    fullText: 'Ein kleiner Igel schleicht neugierig heran.',
    appText: 'Ein,',
    childText: 'kleiner Igel.',
    suffixText: 'schleicht neugierig heran.',
  },
  {
    lvl: 2,
    idx: 3,
    fullText: 'Vorsichtig drückt er eine hohe Note.',
    appText: 'Vorsichtig drückt er eine,',
    childText: 'hohe Note.',
  },
  {
    lvl: 2,
    idx: 4,
    fullText: 'Ein bunter Vogel singt vergnügt mit.',
    appText: 'Ein,',
    childText: 'bunter Vogel.',
    suffixText: 'singt vergnügt mit.',
  },

  // --- LEVEL 3 (Musik im Moos) ---
  {
    lvl: 3,
    idx: 0,
    fullText: 'Der Pfad raschelt leise.',
    childText: 'Der Pfad raschelt leise.',
  },
  {
    lvl: 3,
    idx: 1,
    fullText: 'Alte Bäume wiegen sich sanft im Wind.',
    appText: 'Alte Bäume wiegen,',
    childText: 'sich sanft im Wind.',
  },
  {
    lvl: 3,
    idx: 2,
    fullText: 'Dort steht ein Klavier!',
    childText: 'Dort steht ein Klavier!',
  },
  {
    lvl: 3,
    idx: 3,
    fullText: 'Es ruht mitten im weichen, grünen Moos.',
    appText: 'Es ruht mitten,',
    childText: 'im weichen, grünen Moos.',
  },
  {
    lvl: 3,
    idx: 4,
    fullText: 'Ein kleiner Igel drückt mutig.',
    appText: 'Ein,',
    childText: 'kleiner Igel drückt mutig.',
  },
  {
    lvl: 3,
    idx: 5,
    fullText: 'Der helle Ton kitzelt alle seine Stacheln.',
    appText: 'Der helle,',
    childText: 'Ton kitzelt alle seine Stacheln.',
  },

  // --- LEVEL 4 (Das Geheimnis im Moos) ---
  {
    lvl: 4,
    idx: 0,
    fullText: 'Im Moos rascheln goldene Blätter.',
    appText: 'Im Moos rascheln goldene Blätter.',
  },
  {
    lvl: 4,
    idx: 1,
    fullText: 'Zwei Kinder wandern leise über schmale Waldpfade.',
    childText: 'Zwei Kinder wandern leise über schmale Waldpfade.',
  },
  {
    lvl: 4,
    idx: 2,
    fullText: 'Da steht ein altes Klavier!',
    appText: 'Da steht ein altes Klavier!',
  },
  {
    lvl: 4,
    idx: 3,
    fullText: 'Es glänzt mitten auf der stillen Lichtung.',
    appText: 'Es glänzt mitten auf der stillen Lichtung.',
  },
  {
    lvl: 4,
    idx: 4,
    fullText: 'Ein kleiner Igel tippelt heran.',
    childText: 'Ein kleiner Igel tippelt heran.',
  },
  {
    lvl: 4,
    idx: 5,
    fullText: 'Neugierig drückt seine Pfote eine helle Note.',
    appText: 'Neugierig drückt seine Pfote eine helle Note.',
  },
];

function ensureVenvPython(): string {
  const venvDir = '/tmp/tts_venv';
  const pythonBin = path.join(venvDir, 'bin', 'python');
  if (!fs.existsSync(pythonBin)) {
    console.log('[generate] Setting up /tmp/tts_venv with edge-tts...');
    execSync('python3 -m venv /tmp/tts_venv && /tmp/tts_venv/bin/pip install edge-tts', {
      stdio: 'pipe',
    });
  }
  return pythonBin;
}

function getAudioDurationSec(filePath: string): number {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { encoding: 'utf8' }).trim();
    return parseFloat(out) || 0;
  } catch {
    return 0;
  }
}

function synthesizeRaw(pythonBin: string, text: string, voiceName: string, outPath: string) {
  const escaped = text.replace(/"/g, '\\"');
  const pyScript = `
import asyncio, edge_tts
async def run():
    c = edge_tts.Communicate("${escaped}", "${voiceName}")
    await c.save("${outPath}")
asyncio.run(run())
`;
  execFileSync(pythonBin, ['-c', pyScript], { stdio: 'pipe' });
}

function postProcessAudio(rawPath: string, destPath: string) {
  // Trim dead trailing silence and apply apad 80ms and gentle 8ms fade
  const filter = 'afade=t=in:st=0:d=0.008,areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-38dB,areverse,apad=pad_dur=0.08';
  execFileSync('ffmpeg', [
    '-y',
    '-i', rawPath,
    '-af', filter,
    destPath,
  ], { stdio: 'ignore' });
}

function computeWordTimings(text: string, durationSec: number) {
  const words = text.replace(/[,;:.!?]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const durMs = durationSec * 1000;
  const wordDur = durMs / words.length;

  return words.map((w, idx) => ({
    word: w,
    startMs: Math.round(idx * wordDur),
    endMs: Math.round((idx + 1) * wordDur),
  }));
}

async function generateAll() {
  const pythonBin = ensureVenvPython();
  console.log('🎙️ Generating natural segment-based audio for Wald & Bäume Levels 1 to 4...\n');

  for (const voice of VOICES) {
    console.log(`\n================== VOICE: ${voice.id.toUpperCase()} (${voice.name}) ==================`);

    for (let lvl = 1; lvl <= 4; lvl++) {
      const levelSpecs = STORY_SEGMENTS.filter((s) => s.lvl === lvl);
      const voiceDir = path.resolve(REPO_ROOT, `public/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}`);
      fs.mkdirSync(voiceDir, { recursive: true });

      const metaPath = path.join(voiceDir, 'metadata.json');
      const meta: Record<string, any> = {};

      for (const spec of levelSpecs) {
        console.log(`  [L${lvl} S${spec.idx}] Processing "${spec.fullText.slice(0, 32)}..."`);

        // 1. Full sentence audio
        const fullMp3 = path.join(voiceDir, `sentence_${spec.idx}_full.mp3`);
        const tmpFull = `/tmp/raw_full_${voice.id}_l${lvl}_s${spec.idx}.mp3`;
        synthesizeRaw(pythonBin, spec.fullText, voice.name, tmpFull);
        postProcessAudio(tmpFull, fullMp3);
        try { fs.unlinkSync(tmpFull); } catch {}
        const fullDur = getAudioDurationSec(fullMp3);

        meta[`sentence_${spec.idx}_full`] = {
          text: spec.fullText,
          words: computeWordTimings(spec.fullText, fullDur),
          file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${spec.idx}_full.mp3`,
        };

        // 2. App segment (prefix) if defined
        if (spec.appText) {
          const appMp3 = path.join(voiceDir, `sentence_${spec.idx}_app.mp3`);
          const tmpApp = `/tmp/raw_app_${voice.id}_l${lvl}_s${spec.idx}.mp3`;
          synthesizeRaw(pythonBin, spec.appText, voice.name, tmpApp);
          postProcessAudio(tmpApp, appMp3);
          try { fs.unlinkSync(tmpApp); } catch {}
          const appDur = getAudioDurationSec(appMp3);

          meta[`sentence_${spec.idx}_app`] = {
            text: spec.appText.replace(/[,]$/, ''),
            words: computeWordTimings(spec.appText, appDur),
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${spec.idx}_app.mp3`,
          };
        }

        // 3. Child segment (reinforcement target) if defined
        if (spec.childText) {
          const childMp3 = path.join(voiceDir, `sentence_${spec.idx}_child.mp3`);
          const tmpChild = `/tmp/raw_child_${voice.id}_l${lvl}_s${spec.idx}.mp3`;
          synthesizeRaw(pythonBin, spec.childText, voice.name, tmpChild);
          postProcessAudio(tmpChild, childMp3);
          try { fs.unlinkSync(tmpChild); } catch {}
          const childDur = getAudioDurationSec(childMp3);

          meta[`sentence_${spec.idx}_child`] = {
            text: spec.childText,
            words: computeWordTimings(spec.childText, childDur),
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${spec.idx}_child.mp3`,
          };
        }

        // 4. Suffix segment if defined (Level 2 S0, S2, S4)
        if (spec.suffixText) {
          const suffixMp3 = path.join(voiceDir, `sentence_${spec.idx}_suffix.mp3`);
          const tmpSuffix = `/tmp/raw_suffix_${voice.id}_l${lvl}_s${spec.idx}.mp3`;
          synthesizeRaw(pythonBin, spec.suffixText, voice.name, tmpSuffix);
          postProcessAudio(tmpSuffix, suffixMp3);
          try { fs.unlinkSync(tmpSuffix); } catch {}
          const suffixDur = getAudioDurationSec(suffixMp3);

          meta[`sentence_${spec.idx}_suffix`] = {
            text: spec.suffixText,
            words: computeWordTimings(spec.suffixText, suffixDur),
            file: `/audio/stories/level-${lvl}/theme_forest_ep01/voices/${voice.id}/sentence_${spec.idx}_suffix.mp3`,
          };
        }
      }

      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

      // Copy Katja files to root folder for backward compatibility
      if (voice.id === 'katja') {
        const rootDir = path.resolve(REPO_ROOT, `public/audio/stories/level-${lvl}/theme_forest_ep01`);
        fs.mkdirSync(rootDir, { recursive: true });

        for (const spec of levelSpecs) {
          const fullSrc = path.join(voiceDir, `sentence_${spec.idx}_full.mp3`);
          fs.copyFileSync(fullSrc, path.join(rootDir, `sentence_${spec.idx}_full.mp3`));

          if (spec.appText) {
            const appSrc = path.join(voiceDir, `sentence_${spec.idx}_app.mp3`);
            fs.copyFileSync(appSrc, path.join(rootDir, `sentence_${spec.idx}_app.mp3`));
          }
          if (spec.childText) {
            const childSrc = path.join(voiceDir, `sentence_${spec.idx}_child.mp3`);
            fs.copyFileSync(childSrc, path.join(rootDir, `sentence_${spec.idx}_child.mp3`));
          }
          if (spec.suffixText) {
            const suffixSrc = path.join(voiceDir, `sentence_${spec.idx}_suffix.mp3`);
            fs.copyFileSync(suffixSrc, path.join(rootDir, `sentence_${spec.idx}_suffix.mp3`));
          }
        }
        fs.writeFileSync(path.join(rootDir, 'metadata.json'), JSON.stringify(meta, null, 2), 'utf8');
      }
    }
  }

  console.log('\n🎉 Finished generating natural segment audio across Levels 1-4 for Klara & Konrad!');
}

generateAll().catch(console.error);

