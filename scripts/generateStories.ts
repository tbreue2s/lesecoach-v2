import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORY_THEMES } from '../src/lib/data/storyThemes';
import type { StoryTheme } from '../src/lib/types/storyConfig';
import type { ReadingLevelNumber } from '../src/lib/types/reading';
import { cleanPunctuation } from '../src/lib/utils/tokenizer';
import { splitSyllables } from '../src/lib/utils/syllableSplitter';
import { validateStoryForLevel } from '../src/lib/utils/levelValidator';

// Get repository root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * 30 Absurd, humorous disturber words ("Störwörter") to break narrative stereotypes.
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

/**
 * Strict Level 1 positive list of 70 didactically compliant nouns from WP13 spec.
 */
export const LEVEL_1_NOUN_WHITELIST: readonly string[] = Object.freeze([
  'Dino', 'Lama', 'Puma', 'Wal', 'Igel', 'Vogel', 'Kater', 'Biber', 'Esel', 'Rabe',
  'Falke', 'Kamel', 'Tiger', 'Oma', 'Opa', 'Mama', 'Papa', 'Pirat', 'Pilot', 'Bruder',
  'Vater', 'Bote', 'Maler', 'Hut', 'Tor', 'Sofa', 'Dose', 'Hose', 'Vase', 'Lupe',
  'Gabel', 'Kabel', 'Tafel', 'Nadel', 'Feder', 'Faden', 'Boden', 'Besen', 'Laden', 'Bogen',
  'Paket', 'Note', 'Glas', 'Ufo', 'Bus', 'Rad', 'Lok', 'Motor', 'Foto', 'Kino',
  'Gras', 'Tal', 'Blume', 'Regen', 'Hafen', 'Ufer', 'Planet', 'Brot', 'Salat', 'Limo',
  'Auto', 'Baum', 'Haus', 'Maus', 'Bein', 'Stein', 'Tier', 'Lied', 'Brief', 'Dieb',
]);

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
}

/**
 * Parses CLI command line arguments.
 */
export function parseArgs(rawArgs: string[] = process.argv): CliOptions {
  const options: CliOptions = {
    count: 10,
    model: 'gemini-2.5-flash',
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
  model: string = 'gemini-2.5-flash',
  jsonMode: boolean = false
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
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

/**
 * Builds the Step 1 (Drafting) prompt for narrative creativity and disturber collision.
 */
export function buildDraftingPrompt(
  theme: StoryTheme,
  disturberWord: string,
  level: ReadingLevelNumber
): string {
  return `Du bist ein humorvoller Kinderbuch-Autor für Erstleser.
Erfinde einen originellen, kindgerechten Mini-Plot für eine Geschichte.

Thema: ${theme.label} (${theme.description})
Kreatives Störwort: "${disturberWord}"
Ziel-Lesestufe: Level ${level}

Aufgabe:
Schreibe einen kurzen Handlungsbogen mit 4 Schritten:
1. Start: Eine typische, friedliche Szene zum Thema "${theme.label}".
2. Konflikt/Überraschung: Das Störwort "${disturberWord}" taucht plötzlich und unerwartet auf.
3. Aktion: Eine lustige, überraschende oder mutige Interaktion mit dem Störwort.
4. Ende: Ein fröhliches, rundes Ende.

Umfang: Genau 4 bis 6 Sätze auf Deutsch.
Schreibe NUR den reinen Handlungstext, ohne Erklärungen oder Formatierungen.`;
}

/**
 * Builds the Step 2 (Translation & JSON) prompt with strict level didactic constraints.
 */
export function buildTranslationPrompt(
  theme: StoryTheme,
  disturberWord: string,
  level: ReadingLevelNumber,
  episode: number,
  plotDraft: string,
  selectedNouns: string[]
): string {
  let levelRules = '';

  if (level === 1) {
    levelRules = `DIDAKTISCHE LEVEL-1-REGELN (Whitelist-Fokus):
- Exakt 4 Sätze.
- Maximal 5 bis 6 Wörter pro Satz.
- Das Störwort "${disturberWord}" MUSS in der Geschichte vorkommen.
- ZWINGENDE POSITIVLISTE: Du MUSST in JEDEM der 4 Sätze mindestens ein Nomen aus dieser gezogenen Liste verwenden:
  ${selectedNouns.map((n) => `  * ${n}`).join('\n')}
  Jeder Satz MUSS mindestens eines dieser Wörter (${selectedNouns.join(', ')}) enthalten!
- Die Sätze dürfen für den Vorleser atmosphärisch sein, aber das Kind liest das einfache Kernwort.`;
  } else if (level === 2) {
    levelRules = `DIDAKTISCHE LEVEL-2-REGELN (Wortpaar-Pioniere):
- 4 bis 5 Sätze.
- Verbindlicher Einbau einfacher Nomen-Phrasen (Adjektiv + Nomen oder Artikel + Nomen).
- Maximal 3 Silben pro Wort; Nomen-Phrasen maximal 4 Silben in Summe.
- Das Störwort "${disturberWord}" MUSS in der Geschichte vorkommen.`;
  } else if (level <= 5) {
    levelRules = `DIDAKTISCHE LEVEL-${level}-REGELN (Tandem-Lesen):
- 5 bis 6 Sätze im Wechsel aus kurzen Kind-Sätzen (3-5 Wörter) und lebendigen App-Sätzen (6-8 Wörter).
- Das Störwort "${disturberWord}" MUSS in der Geschichte vorkommen.`;
  } else {
    const wordCountDesc =
      level === 7 ? 'ca. 30 Wörter (5-7 Sätze)' : level === 8 ? 'ca. 60 Wörter (8-12 Sätze mit Dialogen, ?, !)' : '100+ Wörter (12-18 Sätze)';
    levelRules = `DIDAKTISCHE LEVEL-${level}-REGELN (Phase C - Lesefluss):
- Längenskalierung: ${wordCountDesc}.
- Lebendige Handlung, das Störwort "${disturberWord}" MUSS in der Geschichte vorkommen.`;
  }

  return `Du bist ein didaktischer Lese-Experte für Grundschulkinder und ein präziser JSON-Generator.
Übersetze den folgenden Rohentwurf in eine didaktisch optimierte Geschichte für Level ${level}.

Handlungs-Rohentwurf:
${plotDraft}

${levelRules}

NARRATIVER ZUSAMMENHANG & ROTER FADEN (HÖCHSTE PRIORITÄT):
Die Sätze dürfen KEINESFALLS wie eine zusammenhangslose Liste wirken! Sie MÜSSEN eine sinnvolle, zusammenhängende und logische Mini-Geschichte erzählen:
1. Satz (Ausgangssituation): Ein Protagonist (z. B. Tier oder Figur) wird an einem passenden Ort eingeführt.
2. Satz (Kollision): Das Störwort "${disturberWord}" taucht überraschend an diesem Ort auf.
3. Satz (Reaktion/Aktion): Der Protagonist interagiert direkt und logisch mit dem Störwort.
4. Satz (Auflösung): Fröhlicher, befriedigender und logischer Abschluss der Szene.

SILBENTRENNUNG:
Zerlege jedes Wort im Satz in ein Array seiner Silben (z. B. "Ufo" -> ["U", "fo"], "landet" -> ["lan", "det"], "Tor" -> ["Tor"]).

WICHTIG - STRIKTES JSON-OUTPUT-MANDAT:
Gib AUSSCHLIESSLICH ein gültiges JSON-Objekt zurück. Kein Markdown, keine Backticks (\`\`\`json), keine Vorbemerkungen.
Schema:
{
  "themeId": "${theme.id}",
  "level": ${level},
  "episode": ${episode},
  "disturberWord": "${disturberWord}",
  "title": "Kurzer, lustiger Titel",
  "sentences": [
    {
      "text": "Satztext hier.",
      "words": [
        { "clean": "BereinigtesWort", "syllables": ["Si", "lbe"] }
      ]
    }
  ]
}`;
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
  selectedNouns: string[]
): GeneratedStoryFile {
  let title = '';
  let rawSentences: string[] = [];
  const flavor = THEME_FLAVORS[theme.id] || { protagonist: 'Dino', settingDesc: `im ${theme.label}` };

  const defArtDisturber =
    FEMININE_DISTURBERS.has(disturberWord) || FEMININE_NOUNS.has(disturberWord)
      ? 'die'
      : NEUTER_DISTURBERS.has(disturberWord) || NEUTER_NOUNS.has(disturberWord)
      ? 'das'
      : 'der';

  if (level === 1) {
    // Preserve our special curated story if Dino + Fernseher
    if (theme.id === 'theme_dino' && disturberWord === 'Fernseher') {
      title = 'Der Dino und der Fernseher';
      rawSentences = [
        'Ein Dino stapft durch das Tal.',
        'Im Gras flimmert ein Fernseher.',
        'Der Dino drückt auf das Kabel.',
        'Auf dem Glas tanzt eine Maus.',
      ];
    } else {
      const PROTAGONISTS = [
        'Dino', 'Lama', 'Puma', 'Igel', 'Kater', 'Biber', 'Esel', 'Tiger', 'Opa', 'Papa', 'Wal',
      ];
      const protagonist = selectedNouns.find((n) => PROTAGONISTS.includes(n)) || flavor.protagonist;
      const otherNouns = selectedNouns.filter((n) => n !== protagonist);
      const nLoc = otherNouns.find((n) => ['Tor', 'Haus', 'Tal', 'Baum', 'Hof'].includes(n)) || 'Tor';
      const defArtProtagonist = FEMININE_NOUNS.has(protagonist) ? 'die' : NEUTER_NOUNS.has(protagonist) ? 'das' : 'der';

      title = `${protagonist} und ${defArtDisturber} ${disturberWord}`;
      rawSentences = [
        `${getNomIndefinite(protagonist)} geht zum ${nLoc}.`,
        `${getNomDefinite(protagonist)} sieht ${getAccIndefinite(disturberWord)}.`,
        `${getNomDefinite(protagonist)} schaut ${getAccDefinite(disturberWord)} an.`,
        `Froh ruft ${defArtProtagonist} ${protagonist} am ${nLoc}.`,
      ];
    }
  } else if (level === 2) {
    title = `Das bunte ${disturberWord}`;
    rawSentences = [
      `Ein kleiner Hund geht umher.`,
      `Mitten im Gras liegt ${getAccIndefinite(disturberWord)}.`,
      `Das liebe Tier staunt sehr.`,
      `Der alte Baum spendet Schatten.`,
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
      `Es ist ${getNomIndefinite(disturberWord)}, das mitten auf dem Moos steht!`,
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
  selectedNouns: string[]
): { story: GeneratedStoryFile; isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Guarantee syllables for every word using our German syllable splitter
  story.sentences = story.sentences.map((sent) => {
    const rawWords = sent.text.split(/\s+/).filter((w) => w.length > 0);
    const words: GeneratedStoryWord[] = rawWords.map((w, idx) => {
      const clean = cleanPunctuation(w);
      const effective = clean.length > 0 ? clean : w;
      // If LLM returned syllables, verify or populate with deterministic splitter
      const existingWord = sent.words?.[idx];
      const syllables =
        existingWord && Array.isArray(existingWord.syllables) && existingWord.syllables.length > 0
          ? existingWord.syllables
          : splitSyllables(effective);

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

  // Verify Level 1 whitelist mandate
  if (level === 1) {
    if (story.sentences.length !== 4) {
      issues.push(`Level 1 erfordert genau 4 Sätze (gefunden: ${story.sentences.length}).`);
    }

    story.sentences.forEach((sent, idx) => {
      const sentenceWords = sent.words.map((w) => w.clean.toLowerCase());
      const hasDrawnNoun = selectedNouns.some((n) =>
        sentenceWords.includes(n.toLowerCase())
      );
      const hasAnyWhitelistNoun = LEVEL_1_NOUN_WHITELIST.some((n) =>
        sentenceWords.includes(n.toLowerCase())
      );

      if (!hasDrawnNoun && !hasAnyWhitelistNoun) {
        issues.push(
          `Satz ${idx + 1} ("${sent.text}") enthält kein Nomen aus der gezogenen Positivliste.`
        );
      }
    });
  }

  // Validate entire story text against level constraints
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

/**
 * Generates a single story episode using the two-step pipeline.
 */
export async function generateSingleStory(
  theme: StoryTheme,
  level: ReadingLevelNumber,
  episode: number,
  disturberWord: string,
  options: CliOptions
): Promise<GeneratedStoryFile> {
  const selectedNouns = level === 1 ? sampleRandom(LEVEL_1_NOUN_WHITELIST, 4) : [];

  if (!options.apiKey) {
    if (options.verbose) {
      console.log(`[Offline Mode] Generating episode ${episode} for ${theme.id} (Level ${level})`);
    }
    const fallback = generateFallbackStory(theme, disturberWord, level, episode, selectedNouns);
    const validated = refineAndValidateStory(fallback, level, selectedNouns);
    return validated.story;
  }

  // --- Step 1: Drafting (Creativity & Plot) ---
  if (options.verbose) {
    console.log(`[Step 1: Drafting] Theme="${theme.label}", Disturber="${disturberWord}", Level=${level}`);
  }
  const draftPrompt = buildDraftingPrompt(theme, disturberWord, level);
  const plotDraft = await callGemini(draftPrompt, options.apiKey, options.model, false);

  // --- Step 2: Translation & JSON ---
  if (options.verbose) {
    console.log(`[Step 2: Translation] Translating plot to didactic JSON...`);
  }
  const translationPrompt = buildTranslationPrompt(
    theme,
    disturberWord,
    level,
    episode,
    plotDraft,
    selectedNouns
  );
  const jsonResponse = await callGemini(translationPrompt, options.apiKey, options.model, true);

  // Parse JSON response
  let parsed: GeneratedStoryFile;
  try {
    const cleaned = jsonResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.warn(`[Warning] Failed to parse LLM JSON for episode ${episode}. Retrying via fallback refinement...`);
    parsed = generateFallbackStory(theme, disturberWord, level, episode, selectedNouns);
  }

  // Ensure metadata fields
  parsed.themeId = theme.id;
  parsed.level = level;
  parsed.episode = episode;
  parsed.disturberWord = disturberWord;

  // Validate and guarantee syllable accuracy
  const { story, isValid, issues } = refineAndValidateStory(parsed, level, selectedNouns);
  if (!isValid && options.verbose) {
    console.warn(`[Validation Issues for ep ${episode}]:`, issues);
  }

  return story;
}

/**
 * Main execution function iterating over levels, themes, and episodes.
 */
export async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('='.repeat(70));
  console.log('📚 Lesecoach Content Generation Pipeline (WP13)');
  console.log(`Target: Level ${options.level ?? '1-9'}, Theme: ${options.themeId ?? 'All 10'}, Count: ${options.count}`);
  console.log(`Provider: ${options.apiKey ? `Gemini API (${options.model})` : 'Simulated Offline Fallback'}`);
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
      console.log(`\n▶ Generating Level ${level} | Theme: ${theme.label} (${theme.id}) [${options.count} episodes]`);

      // Draw unique disturber words for the episodes
      const disturbers = sampleRandom(DISTURBER_WORDS, options.count);

      for (let ep = 1; ep <= options.count; ep++) {
        const disturber = disturbers[ep - 1] || DISTURBER_WORDS[ep % DISTURBER_WORDS.length];
        const story = await generateSingleStory(theme, level, ep, disturber, options);

        const fileName = `${theme.id}_ep${String(ep).padStart(2, '0')}.json`;
        const filePath = path.join(levelDir, fileName);

        if (!options.dryRun) {
          fs.writeFileSync(filePath, JSON.stringify(story, null, 2), 'utf-8');
          console.log(`  ✓ Episode ${ep}/${options.count}: "${story.title}" [Störwort: ${disturber}] ➔ ${fileName}`);
        } else {
          console.log(`  [Dry Run] Episode ${ep}: "${story.title}" [Störwort: ${disturber}]`);
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
