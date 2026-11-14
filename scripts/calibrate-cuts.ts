import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const envPath = path.resolve(REPO_ROOT, '.env');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const apiKey = env.match(/GEMINI_API_KEY=(.*)/)?.[1]?.trim() || process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

interface BoundaryCut {
  lvl: number;
  idx: number;
  prefixText: string;
  childText: string;
  suffixText: string;
}

const MIXED_SENTENCES: BoundaryCut[] = [
  // Level 1
  { lvl: 1, idx: 0, prefixText: 'Paul wandert leise über das weiche', childText: 'Moos.', suffixText: '' },
  { lvl: 1, idx: 1, prefixText: 'Mitten im Wald steht ein rotes', childText: 'Sofa.', suffixText: '' },
  { lvl: 1, idx: 2, prefixText: 'Darauf schläft friedlich ein kleiner dicker', childText: 'Igel.', suffixText: '' },
  { lvl: 1, idx: 3, prefixText: 'Kichernd rollt der Igel vom weichen', childText: 'Sofa.', suffixText: '' },

  // Level 2
  { lvl: 2, idx: 0, prefixText: 'Ein', childText: 'leiser Wind', suffixText: 'weht über den Pfad.' },
  { lvl: 2, idx: 1, prefixText: 'Dort steht plötzlich ein', childText: 'altes Klavier.', suffixText: '' },
  { lvl: 2, idx: 2, prefixText: 'Ein', childText: 'kleiner Igel', suffixText: 'schleicht neugierig heran.' },
  { lvl: 2, idx: 3, prefixText: 'Vorsichtig drückt er eine', childText: 'hohe Note.', suffixText: '' },
  { lvl: 2, idx: 4, prefixText: 'Ein', childText: 'bunter Vogel', suffixText: 'singt vergnügt mit.' },

  // Level 3
  { lvl: 3, idx: 1, prefixText: 'Alte Bäume wiegen', childText: 'sich sanft im Wind.', suffixText: '' },
  { lvl: 3, idx: 3, prefixText: 'Es ruht mitten', childText: 'im weichen, grünen Moos.', suffixText: '' },
  { lvl: 3, idx: 4, prefixText: 'Ein', childText: 'kleiner Igel drückt mutig.', suffixText: '' },
  { lvl: 3, idx: 5, prefixText: 'Der helle', childText: 'Ton kitzelt alle seine Stacheln.', suffixText: '' },
];

async function transcribeSlice(sourcePath: string, startSec: number, durSec: number): Promise<string> {
  const tmp = `/tmp/slice_${Math.random().toString(36).slice(2)}.mp3`;
  try {
    const args = ['-y'];
    if (startSec > 0) args.push('-ss', startSec.toFixed(3));
    args.push('-i', sourcePath, '-t', durSec.toFixed(3), tmp);
    execFileSync('ffmpeg', args, { stdio: 'ignore' });

    const buf = fs.readFileSync(tmp);
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Transcribe the German words accurately in lowercase:' },
                { inlineData: { mimeType: 'audio/mp3', data: buf.toString('base64') } },
              ],
            },
          ],
        }),
      }
    );
    const data = await resp.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().toLowerCase();
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[.,!?;:"'«»]/g, '');
}

function isPrefixClean(
  transcribed: string,
  prefixWords: string[],
  firstChildWord: string
): { hasPrefix: boolean; isLastWord: boolean; hasChildBleed: boolean } {
  const lastPrefixWord = prefixWords[prefixWords.length - 1];
  const firstPrefixWord = prefixWords[0];
  const target = normalizeWord(lastPrefixWord);
  const firstTarget = normalizeWord(firstPrefixWord);
  const childTarget = normalizeWord(firstChildWord);
  const childStem = childTarget.length >= 4 ? childTarget.slice(0, 3) : childTarget;

  const rawWords = transcribed.toLowerCase().replace(/[.,!?;:"'«»]/g, '').split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return { hasPrefix: false, isLastWord: false, hasChildBleed: false };

  // 1. If we have fewer words than prefixWords, full prefix hasn't been spoken yet
  if (rawWords.length < prefixWords.length) {
    return { hasPrefix: false, isLastWord: false, hasChildBleed: false };
  }

  // 2. If we have more words than prefixWords, child word has already started
  if (rawWords.length > prefixWords.length) {
    return { hasPrefix: true, isLastWord: false, hasChildBleed: true };
  }

  // At this point: rawWords.length === prefixWords.length
  let hasFirst = false;
  if (firstTarget === 'ein') hasFirst = (rawWords[0] === 'ein' || rawWords[0] === 'eine' || rawWords[0] === 'eins');
  else hasFirst = rawWords[0].startsWith(firstTarget.slice(0, 3));

  if (!hasFirst) {
    return { hasPrefix: false, isLastWord: false, hasChildBleed: false };
  }

  const lastW = rawWords[rawWords.length - 1];

  let hasChildBleed = false;
  if (childTarget === 'im') {
    hasChildBleed = rawWords.some(w => w === 'im' || w === 'in');
  } else if (childTarget === 'ton') {
    hasChildBleed = rawWords.some(w => w === 'ton' || w.startsWith('ton'));
  } else {
    hasChildBleed = rawWords.some(
      w => w === childTarget || (childStem.length >= 3 && w.startsWith(childStem)) || (w.includes(childStem) && !w.startsWith(target))
    );
  }

  let isLast = false;
  if (target === 'ein') isLast = (lastW === 'ein' || lastW === 'eine' || lastW === 'eins');
  else if (target === 'weiche') isLast = (lastW === 'weiche' || lastW === 'weiße');
  else if (target === 'weichen') isLast = (lastW === 'weichen' || lastW === 'weißen');
  else if (target === 'eine') isLast = (lastW === 'eine' || lastW === 'einer');
  else if (target === 'plötzlich') isLast = lastW.startsWith('plötz');
  else if (target === 'wiegen') isLast = (lastW === 'wiegen' || lastW === 'wiegt');
  else if (target === 'mitten') isLast = (lastW === 'mitten' || lastW === 'mitte');
  else if (target === 'dicker') isLast = (lastW === 'dicker' || lastW === 'dicke');
  else if (target === 'rotes') isLast = (lastW === 'rotes' || lastW === 'rote');
  else if (target === 'helle') isLast = (lastW === 'helle' || lastW === 'heller');
  else isLast = (lastW === target);

  return { hasPrefix: true, isLastWord: isLast && !hasChildBleed, hasChildBleed };
}

function isSuffixClean(
  transcribed: string,
  firstSuffixWord: string,
  lastChildWord: string
): { hasSuffix: boolean; isFirstWord: boolean; hasChildBleed: boolean } {
  const target = normalizeWord(firstSuffixWord);
  const childTarget = normalizeWord(lastChildWord);
  const childStem = childTarget.length >= 4 ? childTarget.slice(0, 3) : childTarget;

  const rawWords = transcribed.toLowerCase().replace(/[.,!?;:"'«»]/g, '').split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return { hasSuffix: false, isFirstWord: false, hasChildBleed: false };

  const firstW = rawWords[0];
  const isFirst = (firstW === target || (target === 'weht' && (firstW === 'weht' || firstW === 'wehte')) || (target === 'singt' && firstW.startsWith('sing')) || (target === 'schleicht' && firstW.startsWith('schleich')));
  const hasS = rawWords.some(w => w === target || w.startsWith(target.slice(0, 4)));

  const hasChildBleed = rawWords.some(
    (w, idx) => w === childTarget || (childStem.length >= 3 && w.startsWith(childStem)) || (w === 'wind' || w === 'igel' || w === 'vogel' || w === 'klavier') || (idx === 0 && !isFirst)
  );

  return { hasSuffix: hasS, isFirstWord: isFirst && !hasChildBleed, hasChildBleed };
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

function getAudioDuration(file: string): number {
  const out = execFileSync('ffprobe', [
    '-i', file, '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'
  ], { encoding: 'utf-8' });
  return parseFloat(out.trim());
}

async function findPrefixCutSec(
  fullMp3: string,
  prefixText: string,
  childText: string,
  suffixText = ''
): Promise<number> {
  const totalDur = getAudioDuration(fullMp3);
  const prefixWords = prefixText.trim().split(/\s+/).filter(Boolean);
  const childWords = childText.trim().split(/\s+/).filter(Boolean);
  const suffixWords = suffixText.trim().split(/\s+/).filter(Boolean);
  const lastPrefixWord = prefixWords[prefixWords.length - 1];
  const firstChildWord = childWords[0];

  const totalWords = prefixWords.length + childWords.length + suffixWords.length;
  const estT = (prefixWords.length / totalWords) * totalDur;

  let bestCut = estT;
  let foundPrefix = false;

  for (let t = Math.max(0.15, estT - 0.75); t <= Math.min(totalDur - 0.1, estT + 0.75); t += 0.05) {
    const text = await transcribeSlice(fullMp3, 0, t);
    const { hasPrefix, isLastWord, hasChildBleed } = isPrefixClean(text, prefixWords, firstChildWord);

    if (hasPrefix && isLastWord) {
      bestCut = t;
      foundPrefix = true;
    }
    if (foundPrefix && (hasChildBleed || !isLastWord)) {
      break;
    }
  }

  return Math.round(bestCut * 100) / 100;
}

async function findSuffixStartSec(
  fullMp3: string,
  prefixText: string,
  childText: string,
  suffixText: string
): Promise<number> {
  const totalDur = getAudioDuration(fullMp3);
  const prefixWords = prefixText.trim().split(/\s+/).filter(Boolean);
  const childWords = childText.trim().split(/\s+/).filter(Boolean);
  const suffixWords = suffixText.trim().split(/\s+/).filter(Boolean);

  const firstSuffixWord = suffixWords[0];
  const lastChildWord = childWords[childWords.length - 1];
  const totalWords = prefixWords.length + childWords.length + suffixWords.length;
  const estT = ((prefixWords.length + childWords.length) / totalWords) * totalDur;

  let bestStart = estT;

  for (let t = Math.max(0.2, estT - 0.65); t <= Math.min(totalDur - 0.15, estT + 0.65); t += 0.05) {
    const dur = totalDur - t;
    const text = await transcribeSlice(fullMp3, t, dur);
    const { hasSuffix, isFirstWord, hasChildBleed } = isSuffixClean(text, firstSuffixWord, lastChildWord);

    if (hasSuffix && isFirstWord) {
      bestStart = t;
      break;
    }
  }

  return Math.round(bestStart * 100) / 100;
}

async function calibrateAll() {
  console.log('🚀 Starting Acoustic Stepping Calibration for Klara (katja) & Konrad (conrad)...');
  const voices = ['katja', 'conrad'];

  for (const voice of voices) {
    console.log(`\n======================================================`);
    console.log(`🎙️ Calibrating Voice: ${voice.toUpperCase()}`);
    console.log(`======================================================`);

    for (const item of MIXED_SENTENCES) {
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
      console.log(`\n[L${item.lvl} S${item.idx}] "${item.prefixText}" | "${item.childText}" ${item.suffixText ? '| "' + item.suffixText + '"' : ''}`);

      const t1 = await findPrefixCutSec(fullMp3, item.prefixText, item.childText, item.suffixText);
      console.log(`  -> Prefix Cut: 0 to ${t1}s`);

      // Slice App
      sliceAudio(fullMp3, appMp3, 0, t1, 10);

      let t2 = totalDur;
      if (item.suffixText) {
        t2 = await findSuffixStartSec(fullMp3, item.prefixText, item.childText, item.suffixText);
        console.log(`  -> Suffix Start: ${t2}s to ${totalDur}s`);
        sliceAudio(fullMp3, suffixMp3, t2, Math.max(0.2, totalDur - t2), 10);
      }

      // Slice Child
      const childStart = t1;
      const childDur = Math.max(0.25, t2 - childStart);
      console.log(`  -> Child: ${childStart}s to ${(childStart + childDur).toFixed(2)}s`);
      sliceAudio(fullMp3, childMp3, childStart, childDur, 10);

      // Verify App Slice transcription
      const appVerify = await transcribeSlice(appMp3, 0, t1);
      console.log(`  ✅ App Verify: "${appVerify}"`);

      // Verify Child Slice transcription
      const childVerify = await transcribeSlice(childMp3, 0, childDur);
      console.log(`  ✅ Child Verify: "${childVerify}"`);

      if (item.suffixText) {
        const suffixVerify = await transcribeSlice(suffixMp3, 0, totalDur - t2);
        console.log(`  ✅ Suffix Verify: "${suffixVerify}"`);
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
        }
        if (meta[`sentence_${item.idx}_suffix`]) {
          meta[`sentence_${item.idx}_suffix`].startMs = Math.round(t2 * 1000);
        }
        fs.writeFileSync(metaJsonPath, JSON.stringify(meta, null, 2), 'utf8');
      }

      if (voice === 'katja' && item.lvl === 1) {
        const rootDir = path.resolve(REPO_ROOT, 'public/audio/stories/level-1/theme_forest_ep01');
        fs.copyFileSync(appMp3, path.join(rootDir, `sentence_${item.idx}_app.mp3`));
        fs.copyFileSync(childMp3, path.join(rootDir, `sentence_${item.idx}_child.mp3`));
        const rootMetaPath = path.join(rootDir, 'metadata.json');
        if (fs.existsSync(rootMetaPath)) {
          const rootMeta = JSON.parse(fs.readFileSync(rootMetaPath, 'utf8'));
          if (rootMeta[`sentence_${item.idx}_app`]) {
            rootMeta[`sentence_${item.idx}_app`].cutMs = Math.round(t1 * 1000);
          }
          fs.writeFileSync(rootMetaPath, JSON.stringify(rootMeta, null, 2), 'utf8');
        }
      }
    }
  }

  console.log('\n🎉 Acoustic Stepping Calibration Complete Across All Levels & Voices!');
}

calibrateAll().catch(console.error);
