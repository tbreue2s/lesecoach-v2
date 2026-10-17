import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { STORY_THEMES } from '../src/lib/data/storyThemes';
import type { StoryTheme } from '../src/lib/types/storyConfig';
import type { ReadingLevelNumber } from '../src/lib/types/reading';
import { cleanPunctuation, tokenizeStory } from '../src/lib/utils/tokenizer';
import { splitSyllables } from '../src/lib/utils/syllableSplitter';
import { validateStoryForLevel } from '../src/lib/utils/levelValidator';
import {
  FULL_LEVEL1_WHITELIST,
  THEME_LEVEL1_ANCHOR_WORDS,
  THEME_SURPRISE_SEEDS,
  LEVEL_1_2_DISTURBER_WORDS,
  getThemeLevel1Anchors,
  getEpisodeSurpriseSeed,
  buildDraftingPrompt,
  buildTranslationPrompt,
  buildBatchThemePrompt,
} from '../src/lib/utils/promptTemplates';

export {
  FULL_LEVEL1_WHITELIST,
  THEME_LEVEL1_ANCHOR_WORDS,
  THEME_SURPRISE_SEEDS,
  LEVEL_1_2_DISTURBER_WORDS,
  getThemeLevel1Anchors,
  getEpisodeSurpriseSeed,
  buildDraftingPrompt,
  buildTranslationPrompt,
  buildBatchThemePrompt,
};

// Get repository root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * 30 surprise/disturber tags for backward-compatible exports.
 */
export const DISTURBER_WORDS: readonly string[] = Object.freeze([
  'Ufo',
  'Sofa',
  'Dino',
  'Kaktus',
  'Roboter',
  'Pinguin',
  'Trompete',
  'Regenschirm',
  'Zauberhut',
  'Keks',
  'Rakete',
  'Banane',
  'Roller',
  'Gitarre',
  'Zelt',
  'Luftballon',
  'Koffer',
  'Schatzkiste',
  'Ananas',
  'Skateboard',
  'Brille',
  'Rucksack',
  'Wecker',
  'Tuba',
  'Papagei',
  'Känguru',
  'Schlitten',
  'Taschenlampe',
  'Trampolin',
  'Drachen',
]);

// Backward-compatible alias
export const LEVEL_1_NOUN_WHITELIST = FULL_LEVEL1_WHITELIST;
export const LEVEL_1_TARGET_NOUNS = FULL_LEVEL1_WHITELIST;

export interface GeneratedStoryWord {
  clean: string;
  syllables: string[];
}

export interface GeneratedStorySentence {
  text: string;
  words: GeneratedStoryWord[];
}

export interface GeneratedStoryFile {
  themeId: string;
  level: ReadingLevelNumber;
  episode: number;
  disturberWord: string;
  title: string;
  sentences: GeneratedStorySentence[];
}

export interface CliOptions {
  level?: ReadingLevelNumber;
  themeId?: string;
  count: number;
  apiKey?: string;
  model: string;
  outDir: string;
  dryRun: boolean;
  verbose: boolean;
  offline?: boolean;
  skipExisting?: boolean;
}

const execFileAsync = promisify(execFile);

/**
 * Checks whether the Antigravity CLI ('agy') is installed and accessible in PATH.
 */
export function isAgyAvailable(): boolean {
  try {
    execFileSync('agy', ['--help'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Executes a prompt via the Antigravity CLI (agy -p) using high reasoning effort.
 */
export async function callAgy(prompt: string, model?: string): Promise<string> {
  const directPrompt = `SYSTEM-HINWEIS: Verwende KEINE Tools, lies KEINE Dateien und führe KEINE Befehle aus. Antworte sofort und ausschließlich mit dem angeforderten Text bzw. JSON.\n\n${prompt}`;
  const args = ['-p', directPrompt, '--output-format', 'text', '--disable-slash-commands', '--effort', 'high'];
  if (model && !model.startsWith('gemini-2.5')) {
    args.push('--model', model);
  }
  const { stdout } = await execFileAsync('agy', args, {
    cwd: '/tmp',
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout.trim();
}

/**
 * Parses CLI command line arguments.
 */
export function parseArgs(rawArgs: string[] = process.argv): CliOptions {
  const options: CliOptions = {
    count: 10,
    model: 'gemini-2.5-pro',
    outDir: path.resolve(REPO_ROOT, 'src/lib/data/stories'),
    dryRun: false,
    verbose: false,
  };

  // Filter out node binary and script path
  const args = rawArgs.filter((a) => !a.startsWith('/node') && !a.endsWith('generateStories.ts') && a !== '--script' && a !== '--');

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--level' && args[i + 1]) {
      const val = parseInt(args[++i], 10);
      if (val >= 1 && val <= 9) options.level = val as ReadingLevelNumber;
    } else if (arg === '--theme' && args[i + 1]) {
      options.themeId = args[++i];
    } else if (arg === '--count' && args[i + 1]) {
      options.count = Math.max(1, Math.min(10, parseInt(args[++i], 10)));
    } else if (arg === '--apiKey' && args[i + 1]) {
      options.apiKey = args[++i];
    } else if (arg === '--model' && args[i + 1]) {
      options.model = args[++i];
    } else if (arg === '--outDir' && args[i + 1]) {
      options.outDir = path.resolve(REPO_ROOT, args[++i]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--offline') {
      options.offline = true;
    } else if (arg === '--skip-existing' || arg === '--skipExisting') {
      options.skipExisting = true;
    }
  }

  if (!options.apiKey && process.env.GEMINI_API_KEY) {
    options.apiKey = process.env.GEMINI_API_KEY;
  }

  return options;
}

/**
 * Returns n unique random items from an array.
 */
export function sampleRandom<T>(items: readonly T[], count: number): T[] {
  const copy = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Executes a call to the Gemini REST API.
 */
export async function callGemini(
  prompt: string,
  apiKey: string,
  model: string = 'gemini-2.5-pro',
  jsonMode: boolean = false
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        thinkingConfig: {
          thinkingBudget: 2048,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API HTTP ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty or invalid content part.');
  }
  return text;
}

const FEMININE_NOUNS = new Set([
  'Oma', 'Mama', 'Dose', 'Hose', 'Vase', 'Lupe', 'Gabel', 'Tafel', 'Nadel',
  'Feder', 'Note', 'Lok', 'Blume', 'Limo', 'Maus',
]);

const NEUTER_NOUNS = new Set([
  'Lama', 'Kamel', 'Tor', 'Sofa', 'Kabel', 'Paket', 'Glas', 'Ufo', 'Rad',
  'Foto', 'Kino', 'Gras', 'Tal', 'Ufer', 'Planet', 'Brot', 'Auto', 'Haus',
  'Bein', 'Tier', 'Lied',
]);

function getNomIndefinite(noun: string): string {
  if (FEMININE_NOUNS.has(noun)) return `Eine ${noun}`;
  return `Ein ${noun}`;
}

function getNomDefinite(noun: string): string {
  if (FEMININE_NOUNS.has(noun)) return `Die ${noun}`;
  if (NEUTER_NOUNS.has(noun)) return `Das ${noun}`;
  return `Der ${noun}`;
}

function getBeiPhrase(noun: string): string {
  if (FEMININE_NOUNS.has(noun)) return `bei der ${noun}`;
  return `beim ${noun}`;
}

function getZuPhrase(noun: string): string {
  if (FEMININE_NOUNS.has(noun)) return `zur ${noun}`;
  return `zum ${noun}`;
}

const FEMININE_DISTURBERS = new Set([
  'Tuba', 'Trompete', 'Gitarre', 'Ananas', 'Brille', 'Banane', 'Taschenlampe', 'Schatzkiste',
]);

const NEUTER_DISTURBERS = new Set([
  'Ufo', 'Sofa', 'Zelt', 'Skateboard', 'Trampolin',
]);

function getAccIndefinite(word: string): string {
  if (FEMININE_DISTURBERS.has(word) || FEMININE_NOUNS.has(word)) return `eine ${word}`;
  if (NEUTER_DISTURBERS.has(word) || NEUTER_NOUNS.has(word)) return `ein ${word}`;
  return `einen ${word}`;
}

function getAccDefinite(word: string): string {
  if (FEMININE_DISTURBERS.has(word) || FEMININE_NOUNS.has(word)) return `die ${word}`;
  if (NEUTER_DISTURBERS.has(word) || NEUTER_NOUNS.has(word)) return `das ${word}`;
  return `den ${word}`;
}

interface ThemeFlavor {
  protagonist: string;
  settingDesc: string;
}

const THEME_FLAVORS: Record<string, ThemeFlavor> = {
  theme_forest: { protagonist: 'Igel', settingDesc: 'im grünen Wald' },
  theme_wizard: { protagonist: 'Kater', settingDesc: 'in der Zauberburg' },
  theme_horse: { protagonist: 'Pony', settingDesc: 'auf der weiten Wiese' },
  theme_unicorn: { protagonist: 'Lama', settingDesc: 'am bunten Regenbogen' },
  theme_superhero: { protagonist: 'Tiger', settingDesc: 'auf dem hohen Turm' },
  theme_ocean: { protagonist: 'Wal', settingDesc: 'im weiten Meer' },
  theme_treasure: { protagonist: 'Biber', settingDesc: 'in der tiefen Höhle' },
  theme_pirate: { protagonist: 'Pirat', settingDesc: 'auf dem großen Schiff' },
  theme_dino: { protagonist: 'Dino', settingDesc: 'im tiefen Urwald' },
  theme_space: { protagonist: 'Pilot', settingDesc: 'mitten im Weltall' },
};

/**
 * Deterministic fallback generator for offline testing or when no GEMINI_API_KEY is configured.
 */
export function generateFallbackStory(
  theme: StoryTheme,
  disturberWord: string,
  level: ReadingLevelNumber,
  episode: number,
  selectedNouns: string[] = []
): GeneratedStoryFile {
  let title = '';
  let rawSentences: string[] = [];
  const flavor = THEME_FLAVORS[theme.id] || { protagonist: 'Dino', settingDesc: `im ${theme.label}` };
  const anchors = getThemeLevel1Anchors(theme);

  const defArtDisturber =
    FEMININE_DISTURBERS.has(disturberWord) || FEMININE_NOUNS.has(disturberWord)
      ? 'die'
      : NEUTER_DISTURBERS.has(disturberWord) || NEUTER_NOUNS.has(disturberWord)
      ? 'das'
      : 'der';

  if (level === 1) {
    // Preserve curated story if Dino + Fernseher
    if (theme.id === 'theme_dino' && disturberWord === 'Fernseher') {
      title = 'Der Dino und der Fernseher';
      rawSentences = [
        'Ein Dino stapft durch das Tal.',
        'Im Gras flimmert ein Fernseher.',
        'Der Dino drückt auf das Kabel.',
        'Auf dem Glas tanzt eine Maus.',
      ];
    } else {
      const pool = selectedNouns.length >= 4 ? selectedNouns : [...anchors];
      const n1 = pool[0] || 'Vogel';
      const n2 = pool[1] || 'Dino';
      const n3 = pool[2] || 'Tor';

      title = `Überraschung am ${n3}`;
      rawSentences = [
        `Ein kleiner ${n1} fliegt fröhlich durch das Tal.`,
        `Plötzlich glitzert ${getNomIndefinite(disturberWord)} im weichen Moos.`,
        `Neugierig staunt der ${n2} am alten ${n3}.`,
        `Vergnügt winken alle am Abend am See.`,
      ];
    }
  } else if (level === 2) {
    title = `Das Wunder am See`;
    rawSentences = [
      `Lilly rudert heute vergnügt über den blauen See.`,
      `Am flachen Ufer wartet plötzlich ${getNomIndefinite(disturberWord)}.`,
      `Ein bunter Vogel singt dazu ein schönes Lied.`,
      `Im grünen Moos feiern alle ein warmes Fest.`,
    ];
  } else if (level === 3) {
    title = `${flavor.protagonist} und ${defArtDisturber} ${disturberWord}`;
    rawSentences = [
      `Der ${flavor.protagonist} läuft schnell zum Tor.`,
      `Da entdeckt er plötzlich ${getAccIndefinite(disturberWord)}.`,
      `Das neugierige Tier schaut genau hin.`,
      `Gemeinsam jubeln alle vor Freude.`,
    ];
  } else if (level === 4) {
    title = `Ein Fund ${flavor.settingDesc}`;
    rawSentences = [
      `Ein fröhlicher Tag beginnt ${flavor.settingDesc}.`,
      `Der ${flavor.protagonist} läuft über die Wiese.`,
      `Ganz plötzlich taucht ${getNomIndefinite(disturberWord)} auf dem Pfad auf.`,
      `Er staunt über den Fund.`,
      `Lachend nehmen sie das neue Abenteuer an.`,
    ];
  } else if (level === 5) {
    title = `Das Geheimnis ${flavor.settingDesc}`;
    rawSentences = [
      `Die Sonne scheint warm über der Landschaft.`,
      `Der ${flavor.protagonist} sucht einen Pfad.`,
      `Plötzlich versperrt ${getNomIndefinite(disturberWord)} den schmalen Weg.`,
      `Mutig geht er heran.`,
      `Zusammen rollen sie den Gegenstand zur Seite.`,
      `Alle klatschen laut Beifall.`,
    ];
  } else if (level === 6) {
    if (theme.id === 'theme_dino' && disturberWord === 'Fernseher') {
      title = 'Kino im Urwald';
      rawSentences = [
        'Ein riesiger Dinosaurier stapft durch den Urwald.',
        'Plötzlich entdeckt er einen alten, flimmernden Fernseher.',
        'Der Dino tippt neugierig auf den roten Knopf.',
        'Bunte Bilder leuchten hell im Urwald auf.',
        'Fröhlich tanzt der Riese über die Lichtung.',
      ];
    } else {
      title = `${flavor.protagonist} und ${defArtDisturber} ${disturberWord}`;
      rawSentences = [
        `Ein mutiger ${flavor.protagonist} wandert fröhlich ${flavor.settingDesc}.`,
        `Plötzlich entdeckt er ${getAccIndefinite(disturberWord)} am Wegesrand.`,
        `Neugierig tippt das Tier auf den Gegenstand.`,
        `Wunderbare Töne erklingen sanft in der Luft.`,
        `Begeistert tanzen alle Freunde im Kreis herum.`,
      ];
    }
  } else if (level === 7) {
    title = `Abenteuer ${flavor.settingDesc}`;
    rawSentences = [
      `Ein abenteuerlustiger ${flavor.protagonist} streift aufmerksam ${flavor.settingDesc}.`,
      `Unter einem dichten Busch liegt plötzlich ${getNomIndefinite(disturberWord)} verborgen.`,
      `Das neugierige Tier untersucht das seltsame Ding ganz genau.`,
      `Voller Stolz präsentiert er den spektakulären Fund allen Freunden.`,
    ];
  } else if (level === 8) {
    title = `Aufregung ${flavor.settingDesc}`;
    rawSentences = [
      `Was für ein herrlicher und sonniger Morgen!`,
      `Der ${flavor.protagonist} spaziert vergnügt ${flavor.settingDesc}.`,
      `Doch was glitzert da drüben so hell im Sonnenlicht?`,
      `Es ist ${getNomIndefinite(disturberWord)}, das mitten auf dem Moos wartet!`,
      `„Komm schnell her!“, ruft er aufgeregt seinem besten Freund zu.`,
      `Gemeinsam bewundern die beiden Tiere das sonderbare Schauspiel.`,
      `So einen aufregenden Tag werden sie sicher niemals vergessen!`,
    ];
  } else {
    // Level 9: Master reader, 100+ words
    title = `Das Meister-Abenteuer ${flavor.settingDesc}`;
    rawSentences = [
      `Tief ${flavor.settingDesc} herrschte an diesem friedlichen Morgen eine zauberhafte Stille.`,
      `Die ersten Sonnenstrahlen brachen durch das Blätterdach und tauchten die weite Landschaft in goldenes Licht.`,
      `Der weise ${flavor.protagonist} war schon früh auf den Beinen, um die geheimen Pfade der Umgebung zu erkunden.`,
      `Plötzlich bemerkte er etwas völlig Ungewöhnliches, das keineswegs hierher zu gehören schien.`,
      `Mitten im weichen Moos stand ${getNomIndefinite(disturberWord)} und zog alle Blicke magisch an.`,
      `Wie konnte dieser sonderbare Gegenstand nur an einen so abgelegenen Ort gelangen?`,
      `Schritt für Schritt näherte sich der neugierige Wanderer dem glänzenden Fundstück.`,
      `Vorsichtig berührte er die Oberfläche und lauschte gebannt auf die leisen Geräusche im Inneren.`,
      `Im nächsten Moment strömten Tiere aus allen Richtungen herbei und bestaunten das Schauspiel.`,
      `Ein freudiges Lachen hallte weit über das Tal, und eine spontane Feier begann.`,
      `Bis tief in die Dämmerung hinein tanzten sie ausgelassen um das neue Wunderwerk herum.`,
      `Dieses unvergessliche Abenteuer wird den Bewohnern noch lange Zeit ein Lächeln schenken.`,
    ];
  }

  // Build structured sentences with exact syllable splitter
  const sentences: GeneratedStorySentence[] = rawSentences.map((sentenceText) => {
    const rawWords = sentenceText.split(/\s+/).filter((w) => w.length > 0);
    const words: GeneratedStoryWord[] = rawWords.map((word) => {
      const clean = cleanPunctuation(word);
      const effective = clean.length > 0 ? clean : word;
      const syllables = splitSyllables(effective);
      return {
        clean: effective,
        syllables: syllables.length > 0 ? syllables : [effective],
      };
    });

    return {
      text: sentenceText,
      words,
    };
  });

  return {
    themeId: theme.id,
    level,
    episode,
    disturberWord,
    title,
    sentences,
  };
}

/**
 * Validates and refines a parsed story JSON, guaranteeing clean syllables and level compliance.
 */
export function refineAndValidateStory(
  story: GeneratedStoryFile,
  level: ReadingLevelNumber,
  _legacyNouns: string[] = []
): { story: GeneratedStoryFile; isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Guarantee syllables for every word using our deterministic German syllable splitter
  story.sentences = (story.sentences || []).map((sent) => {
    const rawWords = sent.text.split(/\s+/).filter((w) => w.length > 0);
    const words: GeneratedStoryWord[] = rawWords.map((w) => {
      const clean = cleanPunctuation(w);
      const effective = clean.length > 0 ? clean : w;
      const syllables = splitSyllables(effective);

      return {
        clean: effective,
        syllables: syllables.length > 0 ? syllables : [effective],
      };
    });

    return {
      text: sent.text,
      words,
    };
  });

  // Verify sentence count for Level 1 and Level 2 (4 to 5 sentences)
  if (level === 1 || level === 2) {
    if (story.sentences.length < 4 || story.sentences.length > 5) {
      issues.push(`Level ${level} erfordert 4 bis 5 Sätze (gefunden: ${story.sentences.length}).`);
    }
  }

  // Validate entire story text against level constraints (including child word eligibility)
  const fullText = story.sentences.map((s) => s.text).join(' ');
  const levelValidation = validateStoryForLevel(fullText, level);
  if (!levelValidation.isSuitable) {
    issues.push(...levelValidation.issues);
  }

  return {
    story,
    isValid: issues.length === 0,
    issues,
  };
}

function extractJsonBlock(raw: string): string {
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  const startIdx = raw.indexOf('{');
  const endIdx = raw.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return raw.substring(startIdx, endIdx + 1).trim();
  }
  return raw.trim();
}

/**
 * Generates a single story episode using the two-step pipeline + automatic validation repair.
 */
export async function generateSingleStory(
  theme: StoryTheme,
  level: ReadingLevelNumber,
  episode: number,
  disturberWord: string,
  options: CliOptions
): Promise<GeneratedStoryFile> {
  const useGeminiApi = Boolean(options.apiKey);
  const useAgy = !useGeminiApi && !options.offline && isAgyAvailable();

  if (!useGeminiApi && !useAgy) {
    if (options.verbose) {
      console.log(`[Offline Fallback Mode] Generating episode ${episode} for ${theme.id} (Level ${level})`);
    }
    const fallback = generateFallbackStory(theme, disturberWord, level, episode);
    const validated = refineAndValidateStory(fallback, level);
    return validated.story;
  }

  const queryLlm = async (prompt: string, jsonMode: boolean): Promise<string> => {
    if (useGeminiApi) {
      return callGemini(prompt, options.apiKey!, options.model, jsonMode);
    }
    return callAgy(prompt);
  };

  // --- Step 1: Drafting (Creativity & Plot) ---
  if (options.verbose) {
    const provider = useGeminiApi ? `Gemini API (${options.model})` : 'Google AI Subscription via agy CLI (Thinking: high)';
    console.log(`[Step 1: Drafting via ${provider}] Theme="${theme.label}", Surprise="${disturberWord}", Level=${level}, Ep=${episode}`);
  }
  let plotDraft = '';
  try {
    const draftPrompt = buildDraftingPrompt(theme, disturberWord, level, episode);
    plotDraft = await queryLlm(draftPrompt, false);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Warning] Drafting failed for ep ${episode} (${msg}). Using fallback refinement...`);
    const fallback = generateFallbackStory(theme, disturberWord, level, episode);
    return refineAndValidateStory(fallback, level).story;
  }

  // --- Step 2: Translation & Validation Repair Loop ---
  let validationIssues: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (options.verbose) {
      console.log(`[Step 2: Translation (Attempt ${attempt})] Translating plot to didactic JSON...`);
    }
    try {
      const translationPrompt = buildTranslationPrompt(
        theme,
        disturberWord,
        level,
        episode,
        plotDraft,
        validationIssues
      );
      const jsonResponse = await queryLlm(translationPrompt, true);
      const cleaned = extractJsonBlock(jsonResponse);
      const parsed: GeneratedStoryFile = JSON.parse(cleaned);

      parsed.themeId = theme.id;
      parsed.level = level;
      parsed.episode = episode;
      parsed.disturberWord = disturberWord;

      const { story, isValid, issues } = refineAndValidateStory(parsed, level);
      if (isValid) {
        return story;
      }

      validationIssues = issues;
      plotDraft = story.sentences.map((s) => s.text).join('\n');
      if (options.verbose) {
        console.warn(`[Validation Issues on Attempt ${attempt} for ep ${episode}]:`, issues);
      }
      if (attempt === 2) {
        return story;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Warning] Translation attempt ${attempt} failed for ep ${episode} (${msg}).`);
    }
  }

  const fallback = generateFallbackStory(theme, disturberWord, level, episode);
  return refineAndValidateStory(fallback, level).story;
}

/**
 * Generates multiple episodes for a single theme + level in one cohesive batch call,
 * then validates each episode and performs targeted repair if any sentence fails level constraints.
 */
export async function generateThemeBatch(
  theme: StoryTheme,
  level: ReadingLevelNumber,
  count: number,
  options: CliOptions
): Promise<GeneratedStoryFile[]> {
  const useGeminiApi = Boolean(options.apiKey);
  const useAgy = !useGeminiApi && !options.offline && isAgyAvailable();

  if (!useGeminiApi && !useAgy) {
    const results: GeneratedStoryFile[] = [];
    for (let ep = 1; ep <= count; ep++) {
      const surprise = getEpisodeSurpriseSeed(theme, ep);
      const fb = generateFallbackStory(theme, surprise.tag, level, ep);
      results.push(refineAndValidateStory(fb, level).story);
    }
    return results;
  }

  const queryLlm = async (prompt: string, jsonMode: boolean): Promise<string> => {
    if (useGeminiApi) {
      return callGemini(prompt, options.apiKey!, options.model, jsonMode);
    }
    return callAgy(prompt);
  };

  try {
    const batchPrompt = buildBatchThemePrompt(theme, level, count);
    const rawBatch = await queryLlm(batchPrompt, true);
    const cleaned = extractJsonBlock(rawBatch);
    const parsedBatch = JSON.parse(cleaned) as {
      episodes?: Array<{
        episode?: number;
        disturberWord?: string;
        title?: string;
        sentences?: Array<{ text: string; words?: GeneratedStoryWord[] }>;
      }>;
    };

    if (!parsedBatch.episodes || !Array.isArray(parsedBatch.episodes)) {
      throw new Error('Missing "episodes" array in batch JSON response');
    }

    const stories: GeneratedStoryFile[] = [];
    for (let ep = 1; ep <= count; ep++) {
      const rawEp = parsedBatch.episodes[ep - 1];
      const surprise = getEpisodeSurpriseSeed(theme, ep);
      if (!rawEp || !Array.isArray(rawEp.sentences) || rawEp.sentences.length === 0) {
        const single = await generateSingleStory(theme, level, ep, surprise.tag, options);
        stories.push(single);
        continue;
      }

      const candidate: GeneratedStoryFile = {
        themeId: theme.id,
        level,
        episode: ep,
        disturberWord: rawEp.disturberWord || surprise.tag,
        title: rawEp.title || `${theme.label} – Episode ${ep}`,
        sentences: rawEp.sentences.map((s) => ({
          text: s.text,
          words: s.words || [],
        })),
      };

      const validated = refineAndValidateStory(candidate, level);
      if (validated.isValid) {
        stories.push(validated.story);
      } else {
        if (options.verbose) {
          console.warn(`  [Batch Repair] Ep ${ep} had validation issues (${validated.issues.join('; ')}). Running targeted repair...`);
        }
        try {
          const repairPrompt = buildTranslationPrompt(
            theme,
            candidate.disturberWord,
            level,
            ep,
            candidate.sentences.map((s) => s.text).join('\n'),
            validated.issues
          );
          const repairedJson = await queryLlm(repairPrompt, true);
          const repairedParsed = JSON.parse(extractJsonBlock(repairedJson)) as GeneratedStoryFile;
          repairedParsed.themeId = theme.id;
          repairedParsed.level = level;
          repairedParsed.episode = ep;
          repairedParsed.disturberWord = candidate.disturberWord;
          const revalidated = refineAndValidateStory(repairedParsed, level);
          stories.push(revalidated.story);
        } catch {
          stories.push(validated.story);
        }
      }
    }

    return stories;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Warning] Batch generation failed for ${theme.id} Level ${level} (${msg}). Falling back to per-episode generation...`);
    const results: GeneratedStoryFile[] = [];
    for (let ep = 1; ep <= count; ep++) {
      const surprise = getEpisodeSurpriseSeed(theme, ep);
      const story = await generateSingleStory(theme, level, ep, surprise.tag, options);
      results.push(story);
    }
    return results;
  }
}

/**
 * Main execution function iterating over levels, themes, and episodes.
 */
export async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('='.repeat(70));
  console.log('📚 Lesecoach Content Generation Pipeline (WP13)');
  const providerLabel = options.apiKey
    ? `Gemini API (${options.model})`
    : !options.offline && isAgyAvailable()
    ? 'Google AI Subscription via Antigravity CLI (agy --effort high)'
    : 'Simulated Offline Fallback';

  console.log(`Target: Level ${options.level ?? '1-9'}, Theme: ${options.themeId ?? 'All 10'}, Count: ${options.count}`);
  console.log(`Provider: ${providerLabel}`);
  console.log(`Output Directory: ${options.outDir}`);
  console.log('='.repeat(70));

  const targetLevels: ReadingLevelNumber[] = options.level
    ? [options.level]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const targetThemes = options.themeId
    ? STORY_THEMES.filter((t) => t.id === options.themeId)
    : [...STORY_THEMES];

  if (targetThemes.length === 0) {
    console.error(`Error: Theme "${options.themeId}" not found in STORY_THEMES.`);
    process.exit(1);
  }

  let totalGenerated = 0;

  for (const level of targetLevels) {
    const levelDir = path.join(options.outDir, `level-${level}`);
    if (!options.dryRun) {
      fs.mkdirSync(levelDir, { recursive: true });
    }

    for (const theme of targetThemes) {
      if (options.skipExisting) {
        let allExist = true;
        for (let ep = 1; ep <= options.count; ep++) {
          const fn = `${theme.id}_ep${String(ep).padStart(2, '0')}.json`;
          const fp = path.join(levelDir, fn);
          if (!fs.existsSync(fp)) {
            allExist = false;
            break;
          }
        }
        if (allExist) {
          console.log(`\n⏭ Skipping Level ${level} | Theme: ${theme.label} (${theme.id}) - all ${options.count} episodes already exist.`);
          continue;
        }
      }

      console.log(`\n▶ Generating Level ${level} | Theme: ${theme.label} (${theme.id}) [${options.count} episodes]`);

      const stories = await generateThemeBatch(theme, level, options.count, options);

      for (const story of stories) {
        const ep = story.episode;
        const fileName = `${theme.id}_ep${String(ep).padStart(2, '0')}.json`;
        const filePath = path.join(levelDir, fileName);

        if (options.skipExisting && fs.existsSync(filePath)) {
          console.log(`  [Preserved existing] Episode ${ep} ➔ ${fileName}`);
          continue;
        }

        if (!options.dryRun) {
          fs.writeFileSync(filePath, JSON.stringify(story, null, 2), 'utf-8');
          console.log(`  ✓ Episode ${ep}/${options.count}: "${story.title}" [Überraschung: ${story.disturberWord}] ➔ ${fileName}`);
        } else {
          console.log(`  [Dry Run] Episode ${ep}: "${story.title}" [Überraschung: ${story.disturberWord}]`);
        }

        totalGenerated++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✨ Successfully generated ${totalGenerated} stories!`);
  console.log('='.repeat(70));
}

// Only auto-run if executed directly via CLI
if (process.argv.some((arg) => arg.includes('generateStories.ts'))) {
  main().catch((err) => {
    console.error('Fatal Pipeline Error:', err);
    process.exit(1);
  });
}
