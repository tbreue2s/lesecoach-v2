import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

interface CalibratedSentenceCut {
  lvl: number;
  idx: number;
  prefixText: string;
  childText: string;
  suffixText: string;
  katja: {
    t1: number; // End of prefix / start of child
    t2?: number; // End of child / start of suffix (if suffixText exists)
  };
  conrad: {
    t1: number;
    t2?: number;
  };
}

const CALIBRATED_CUTS: CalibratedSentenceCut[] = [
  // --- LEVEL 1 ---
  {
    lvl: 1,
    idx: 0,
    prefixText: 'Paul wandert leise über das weiche',
    childText: 'Moos.',
    suffixText: '',
    katja: { t1: 2.44 },
    conrad: { t1: 2.64 },
  },
  {
    lvl: 1,
    idx: 1,
    prefixText: 'Mitten im Wald steht ein rotes',
    childText: 'Sofa.',
    suffixText: '',
    katja: { t1: 2.11 },
    conrad: { t1: 2.50 },
  },
  {
    lvl: 1,
    idx: 2,
    prefixText: 'Darauf schläft friedlich ein kleiner dicker',
    childText: 'Igel.',
    suffixText: '',
    katja: { t1: 3.32 },
    conrad: { t1: 3.80 },
  },
  {
    lvl: 1,
    idx: 3,
    prefixText: 'Kichernd rollt der Igel vom weichen',
    childText: 'Sofa.',
    suffixText: '',
    katja: { t1: 2.63 },
    conrad: { t1: 2.50 },
  },

  // --- LEVEL 2 ---
  {
    lvl: 2,
    idx: 0,
    prefixText: 'Ein',
    childText: 'leiser Wind',
    suffixText: 'weht über den Pfad.',
    katja: { t1: 0.52, t2: 1.25 },
    conrad: { t1: 0.40, t2: 1.25 },
  },
  {
    lvl: 2,
    idx: 1,
    prefixText: 'Dort steht plötzlich ein',
    childText: 'altes Klavier.',
    suffixText: '',
    katja: { t1: 1.78 },
    conrad: { t1: 1.45 },
  },
  {
    lvl: 2,
    idx: 2,
    prefixText: 'Ein',
    childText: 'kleiner Igel',
    suffixText: 'schleicht neugierig heran.',
    katja: { t1: 0.56, t2: 1.51 },
    conrad: { t1: 0.46, t2: 1.40 },
  },
  {
    lvl: 2,
    idx: 3,
    prefixText: 'Vorsichtig drückt er eine',
    childText: 'hohe Note.',
    suffixText: '',
    katja: { t1: 2.34 },
    conrad: { t1: 2.01 },
  },
  {
    lvl: 2,
    idx: 4,
    prefixText: 'Ein',
    childText: 'bunter Vogel',
    suffixText: 'singt vergnügt mit.',
    katja: { t1: 0.54, t2: 1.18 },
    conrad: { t1: 0.35, t2: 1.55 },
  },

  // --- LEVEL 3 ---
  {
    lvl: 3,
    idx: 1,
    prefixText: 'Alte Bäume wiegen',
    childText: 'sich sanft im Wind.',
    suffixText: '',
    katja: { t1: 1.66 },
    conrad: { t1: 1.48 },
  },
  {
    lvl: 3,
    idx: 3,
    prefixText: 'Es ruht mitten',
    childText: 'im weichen, grünen Moos.',
    suffixText: '',
    katja: { t1: 1.50 },
    conrad: { t1: 1.08 },
  },
  {
    lvl: 3,
    idx: 4,
    prefixText: 'Ein',
    childText: 'kleiner Igel drückt mutig.',
    suffixText: '',
    katja: { t1: 0.48 },
    conrad: { t1: 0.58 },
  },
  {
    lvl: 3,
    idx: 5,
    prefixText: 'Der helle',
    childText: 'Ton kitzelt alle seine Stacheln.',
    suffixText: '',
    katja: { t1: 0.92 },
    conrad: { t1: 0.80 },
  },
];

function getAudioDuration(file: string): number {
  const out = execFileSync('ffprobe', [
    '-i', file, '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

function sliceAudio(source: string, dest: string, startSec: number, durSec: number, fadeMs = 10) {
  const filters: string[] = [];
  if (fadeMs > 0 && startSec > 0) filters.push(`afade=t=in:st=0:d=${(fadeMs / 1000).toFixed(3)}`);
  if (fadeMs > 0) {
    const fadeOutStart = Math.max(0, durSec - fadeMs / 1000);
    filters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${(fadeMs / 1000).toFixed(3)}`);
  }
  const args = ['-y'];
  if (startSec > 0) args.push('-ss', startSec.toFixed(3));
  args.push('-i', source, '-t', durSec.toFixed(3));
  if (filters.length > 0) args.push('-af', filters.join(','));
  args.push(dest);
  execFileSync('ffmpeg', args, { stdio: 'ignore' });
}

export function applyAllSlices() {
  console.log('Applying calibrated audio slices across all stories and voices...\n');

  for (const item of CALIBRATED_CUTS) {
    for (const voice of ['katja', 'conrad'] as const) {
      const timing = voice === 'katja' ? item.katja : item.conrad;
      const baseDir = path.resolve(REPO_ROOT, `public/audio/stories/level-${item.lvl}/theme_forest_ep01/voices/${voice}`);
      const fullMp3 = path.join(baseDir, `sentence_${item.idx}_full.mp3`);
      const appMp3 = path.join(baseDir, `sentence_${item.idx}_app.mp3`);
      const childMp3 = path.join(baseDir, `sentence_${item.idx}_child.mp3`);
      const suffixMp3 = path.join(baseDir, `sentence_${item.idx}_suffix.mp3`);
      const metaJsonPath = path.join(baseDir, 'metadata.json');

      if (!fs.existsSync(fullMp3)) {
        console.warn(`[Skip] ${fullMp3} does not exist`);
        continue;
      }

      const totalDur = getAudioDuration(fullMp3);
      const t1 = timing.t1;
      const t2 = timing.t2 ?? totalDur;

      console.log(`[L${item.lvl} S${item.idx} ${voice.toUpperCase()}]`);
      console.log(`  Prefix (App): 0 to ${t1}s`);
      sliceAudio(fullMp3, appMp3, 0, t1, 8);

      const childDur = Math.max(0.2, t2 - t1);
      console.log(`  Child: ${t1}s to ${t2}s (dur ${childDur.toFixed(2)}s)`);
      sliceAudio(fullMp3, childMp3, t1, childDur, 8);

      if (item.suffixText && timing.t2) {
        const suffixDur = Math.max(0.2, totalDur - t2);
        console.log(`  Suffix: ${t2}s to ${totalDur}s (dur ${suffixDur.toFixed(2)}s)`);
        sliceAudio(fullMp3, suffixMp3, t2, suffixDur, 8);
      }

      // Update metadata.json
      if (fs.existsSync(metaJsonPath)) {
        const meta = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8'));

        if (meta[`sentence_${item.idx}_app`]) {
          meta[`sentence_${item.idx}_app`].cutMs = Math.round(t1 * 1000);
          const appWords = meta[`sentence_${item.idx}_app`].words;
          if (appWords && appWords.length > 0) {
            appWords[appWords.length - 1].endMs = Math.round(t1 * 1000);
          }
        }
        if (meta[`sentence_${item.idx}_child`]) {
          meta[`sentence_${item.idx}_child`].startMs = Math.round(t1 * 1000);
          const childWords = meta[`sentence_${item.idx}_child`].words;
          if (childWords && childWords.length > 0) {
            childWords[0].startMs = Math.round(t1 * 1000);
            if (!item.suffixText) {
              childWords[childWords.length - 1].endMs = Math.round(totalDur * 1000);
            } else if (timing.t2) {
              childWords[childWords.length - 1].endMs = Math.round(t2 * 1000);
            }
          }
        }
        if (meta[`sentence_${item.idx}_suffix`] && timing.t2) {
          meta[`sentence_${item.idx}_suffix`].startMs = Math.round(t2 * 1000);
          const suffixWords = meta[`sentence_${item.idx}_suffix`].words;
          if (suffixWords && suffixWords.length > 0) {
            suffixWords[0].startMs = Math.round(t2 * 1000);
          }
        }

        fs.writeFileSync(metaJsonPath, JSON.stringify(meta, null, 2), 'utf8');
      }

      // Copy Katja files to root level folder for backwards compatibility
      if (voice === 'katja') {
        const rootDir = path.resolve(REPO_ROOT, `public/audio/stories/level-${item.lvl}/theme_forest_ep01`);
        fs.copyFileSync(appMp3, path.join(rootDir, `sentence_${item.idx}_app.mp3`));
        fs.copyFileSync(childMp3, path.join(rootDir, `sentence_${item.idx}_child.mp3`));
        if (item.suffixText && fs.existsSync(suffixMp3)) {
          fs.copyFileSync(suffixMp3, path.join(rootDir, `sentence_${item.idx}_suffix.mp3`));
        }

        const rootMetaPath = path.join(rootDir, 'metadata.json');
        if (fs.existsSync(rootMetaPath)) {
          const rootMeta = JSON.parse(fs.readFileSync(rootMetaPath, 'utf8'));
          if (rootMeta[`sentence_${item.idx}_app`]) {
            rootMeta[`sentence_${item.idx}_app`].cutMs = Math.round(t1 * 1000);
          }
          if (rootMeta[`sentence_${item.idx}_child`]) {
            rootMeta[`sentence_${item.idx}_child`].startMs = Math.round(t1 * 1000);
          }
          if (rootMeta[`sentence_${item.idx}_suffix`] && timing.t2) {
            rootMeta[`sentence_${item.idx}_suffix`].startMs = Math.round(t2 * 1000);
          }
          fs.writeFileSync(rootMetaPath, JSON.stringify(rootMeta, null, 2), 'utf8');
        }
      }
    }
  }

  console.log('\n✅ All calibrated audio slices applied successfully!');
}

applyAllSlices();

