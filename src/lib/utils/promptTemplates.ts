import type { ReadingLevelNumber, GeneratedStoryOutput } from '../types/reading';
import type { StoryTheme } from '../types/storyConfig';

export interface PromptTemplateOptions {
  level: ReadingLevelNumber;
  theme: StoryTheme | string;
  childName: string;
  companionName?: string;
}

/**
 * Returns detailed didactic instruction rules for each reading level (1 to 9).
 */
export function getLevelPromptRules(level: ReadingLevelNumber): string {
  switch (level) {
    case 1:
      return `Lese-Stufe 1 (Einzelwort-Entdecker):
- Länge: Exakt 4 Sätze.
- Satzlänge: Maximal 4-5 Wörter pro Satz.
- Syntax: Ausschließlich einfache Hauptsätze (Subjekt-Prädikat-Objekt). Keine Nebensätze, kein Komma.
- Wortschatz-Restriktion: Verwende AUSSCHLIESSLICH 1- bis 2-silbige Wörter.
- Harte Verbote:
  * KEINE Komposita (keine zusammengesetzten Nomen wie "Sandburg", "Zauberschule" oder "Seifenblasen").
  * KEINE Wörter mit 'ß', 'ck', 'tz' oder 'pf'.
  * KEINE Konsonanten-Cluster ('sch', 'sp', 'st').
- Bevorzugte Phonetik: Priorisiere Dauerlaute (m, l, s, n, f, r) und offene Silben (z. B. Mama, Oma, Limo, Ruf, Nase, Fee, Name, See).
- Erlaubte Basis-Nomen (Beispiele): Hund, Hut, Ball, See, Bus, Baum, Haus, Kind, Tag, Reh, Tier, Boot, Tor, Bild.
- Didaktische Differenzierung (Vorlese- vs. Kind-Wortschatz): Die App liest den Hauptteil des Satzes flüssig vor. Im Satz dürfen atmosphärische Wörter vorkommen, solange für das Kind mindestens 1 absolut einfaches Zielwort mit Komplexität 0 (Dauerlaute/reguläre Laute) vorhanden ist.`;

    case 2:
      return `Lese-Stufe 2 (Wortpaar-Pioniere):
- Länge: 4-5 Sätze.
- Syntax: Einbau einfacher Nomen-Phrasen mit Adjektiven oder Artikeln (z.B. "der rote Ball", "ein lieber Hund").
- Wortschatz-Restriktion: Maximal 3 Silben pro Wort.
- Nomen-Phrasen: In Summe maximal 4 Silben für die 2 zusammengehörigen Wörter.
- Einfache Komposita erlaubt, jedoch ohne schwere Konsonantenhäufungen.
- Didaktische Differenzierung: Begleitende Vorlesewörter der App dürfen reichhaltiger sein, solange in jedem Satz ein für das Kind lösbares Wortpaar vorkommt.`;

    case 3:
      return `Lese-Stufe 3 (Mini-Phrasen-Meister):
- Länge: 4-6 Sätze.
- Satzlänge: Maximal 5-6 Wörter pro Satz.
- Syntax: Kurze Sätze mit 2- bis 3-Wort-Phrasen.
- Wortschatz: Maximal 3 Silben pro Wort, klare Handlungen und motivierende Satzrhythmen.
- Didaktische Differenzierung: Lebendige Handlung mit Begleiter; Kind liest Halbsätze von 3 bis 4 Wörtern (max. 7 Silben), App unterstützt beim Vorlesen.`;

    case 4:
      return `Lese-Stufe 4 (Tandem-Starter):
- Struktur: Tandem-Lesen zwischen App und Kind. Das Kind liest jeden 3. Satz (Satz 2, 5, etc.).
- Kind-Sätze: Kurz (3-5 Wörter), strikt nach einfachen Regeln (1-2 Silben, keine schwierigen Lautgruppen).
- App-Sätze: Länger (6-8 Wörter), natürlicherer und reichhaltigerer Erzähl-Wortschatz erlaubt.
- Gesamtlänge: 5-6 Sätze.
- Didaktik: Geschichten werden schrittweise länger und erzählen ein zusammenhängendes Erlebnis.`;

    case 5:
      return `Lese-Stufe 5 (Tandem-Profi):
- Struktur: Streng abwechselndes Tandem-Lesen (Satz 1: App, Satz 2: Kind, Satz 3: App, Satz 4: Kind, ...).
- Kind-Sätze: Kurz (3-5 Wörter), didaktisch altersgerecht.
- App-Sätze: 6-8 Wörter, spannend erzählt.
- Gesamtlänge: 6 Sätze.
- Didaktik: Bereitet auf flüssiges Wiederholungslesen vor. Flüssige Interaktion zwischen App und Kind.`;

    case 6:
      return `Lese-Stufe 6 (Satz-Held):
- Struktur: Alle Sätze werden vom Kind gelesen, gefolgt von Vorlese-Bestätigung zur Satzmelodie.
- Länge: 5-6 Sätze.
- Satzlänge: 5-7 Wörter pro Satz.
- Didaktik: Fokus auf vollständige Satzstrukturen und flüssige Phrasierung. Harmonische, motivierende Handlung.`;

    case 7:
      return `Lese-Stufe 7 (Flüssig-Leser I - Phase C):
- Längen-Skalierung: Zusammenhängender Text mit ca. 30 Wörtern (~5-7 Sätze).
- Didaktik: Flüssiges Lesen zusammenhängender Sinnabschnitte, abwechslungsreicher Wortschatz und spannende Abenteuer.`;

    case 8:
      return `Lese-Stufe 8 (Flüssig-Leser II - Phase C):
- Längen-Skalierung: Zusammenhängender Text mit ca. 60 Wörtern (~8-12 Sätze).
- Didaktik: Erhöhte Lesegeschwindigkeit und Textverständnis bei längeren Geschichten mit wörtlicher Rede und Ausrufen (?, !).`;

    case 9:
      return `Lese-Stufe 9 (Lese-Champion - Phase C):
- Längen-Skalierung: Vollständige Mini-Geschichte mit 100+ Wörtern.
- Didaktik: Freies, flüssiges Lesen mit Dialogen, lebendiger Erzählstruktur und befriedigendem Höhepunkt.`;
  }
}

/**
 * Builds the full LLM prompt instructing the model to generate a level-compliant German story
 * with the strict JSON output mandate including syllables.
 */
export function buildStoryPrompt(options: PromptTemplateOptions): string {
  const { level, theme, childName, companionName } = options;

  const safeChildName = (childName || 'Lese-Held').trim().replace(/[\r\n\t"]/g, '').slice(0, 20) || 'Lese-Held';
  const safeCompanionName = companionName
    ? companionName.trim().replace(/[\r\n\t"]/g, '').slice(0, 20)
    : undefined;

  const themeLabel = typeof theme === 'string' ? theme : theme.label;
  const themeDescription = typeof theme === 'string' ? '' : theme.description || '';

  const companionInstruction = safeCompanionName
    ? `Begleiter des Kindes: "${safeCompanionName}". Der Begleiter soll als treuer Freund in der Geschichte mitwirken.`
    : `Kein Begleiter ausgewählt. Das Kind ${safeChildName} erlebt das Abenteuer allein oder mit anderen Nebenfiguren.`;

  const levelRules = getLevelPromptRules(level);

  return `Du bist ein didaktischer Lese-Coach für Grundschüler (1. und 2. Klasse) im deutschen Erstleseunterricht.
Deine Aufgabe ist es, eine kurze, motivierende Geschichte passend zu den didaktischen Fähigkeiten des Kindes zu verfassen.

KONTEXT & PARAMETER:
- Thema: ${themeLabel} (${themeDescription})
- Hauptperson (Kind): "${safeChildName}"
- ${companionInstruction}
- Didaktische Stufe: ${level}

DIDAKTISCHE REGELN FÜR STUFE ${level}:
${levelRules}

GLOBALES JSON-SCHEMA MANDAT:
Du darfst KEINEN reinen Fließtext zurückgeben und KEINE Erklärungen verfassen.
Die Antwort MUSS ein einziges, valides JSON-Objekt sein, das für jedes Wort die Silbentrennung ("syllables") vorab liefert:
\`\`\`json
{
  "sentences": [
    {
      "text": "${safeChildName} sieht einen Hund.",
      "words": [
        { "clean": "${safeChildName}", "syllables": ["${safeChildName}"] },
        { "clean": "sieht", "syllables": ["sieht"] },
        { "clean": "einen", "syllables": ["ei", "nen"] },
        { "clean": "Hund", "syllables": ["Hund"] }
      ]
    }
  ]
}
\`\`\`

REGELN ZUM JSON-FORMAT:
1. "clean": Das bereinigte Wort in Original-Groß-/Kleinschreibung ohne Satzzeichen (. , ! ? " ' : ;).
2. "syllables": Array von Silben nach deutscher Standard-Silbentrennung (z. B. ["E", "mil"], ["ei", "nen"]).
3. "text": Der vollständige Satz inklusive Satzzeichen.
4. Gib AUSSCHLIESSLICH das reine JSON zurück.`;
}

/**
 * Backward-compatible helper with positional arguments:
 * generateStoryPrompt(level, theme, childName, companionName)
 */
export function generateStoryPrompt(
  level: ReadingLevelNumber,
  theme: StoryTheme | string,
  childName: string,
  companionName?: string
): string {
  return buildStoryPrompt({ level, theme, childName, companionName });
}

/**
 * Parses and validates an LLM output string as GeneratedStoryOutput.
 * Strips optional markdown code block fences and verifies required fields.
 */
export function parseGeneratedStoryJson(jsonText: string): GeneratedStoryOutput {
  if (!jsonText || typeof jsonText !== 'string') {
    throw new Error('Invalid JSON input: text is empty or not a string');
  }

  // Strip Markdown code block wrappers like ```json ... ```
  let cleaned = jsonText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse LLM JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!parsed || typeof parsed !== 'object' || !('sentences' in parsed)) {
    throw new Error('Invalid story JSON: Missing root "sentences" property');
  }

  const rawSentences = (parsed as { sentences: unknown }).sentences;
  if (!Array.isArray(rawSentences) || rawSentences.length === 0) {
    throw new Error('Invalid story JSON: "sentences" must be a non-empty array');
  }

  const validSentences = rawSentences.map((sent, sIdx) => {
    if (!sent || typeof sent !== 'object') {
      throw new Error(`Invalid sentence at index ${sIdx}: expected object`);
    }

    const text = typeof sent.text === 'string' ? sent.text.trim() : '';
    if (!text) {
      throw new Error(`Invalid sentence at index ${sIdx}: missing or empty "text"`);
    }

    const words = Array.isArray(sent.words)
      ? sent.words.map((w: unknown, wIdx: number) => {
          if (!w || typeof w !== 'object') {
            throw new Error(`Invalid word at sentence ${sIdx}, word ${wIdx}`);
          }
          const clean = typeof (w as { clean?: unknown }).clean === 'string'
            ? (w as { clean: string }).clean.trim()
            : '';
          const syllables = Array.isArray((w as { syllables?: unknown }).syllables)
            ? ((w as { syllables: unknown[] }).syllables as string[]).map((s) => String(s).trim())
            : [clean];

          return { clean, syllables };
        })
      : [];

    return { text, words };
  });

  return { sentences: validSentences };
}

/**
 * Complete Level 1 positive list of 70 didactically compliant nouns (WP13 backward-compatible export).
 */
export const FULL_LEVEL1_WHITELIST: readonly string[] = Object.freeze([
  'Dino', 'Lama', 'Puma', 'Wal', 'Igel', 'Vogel', 'Kater', 'Biber', 'Esel', 'Rabe',
  'Falke', 'Kamel', 'Tiger', 'Oma', 'Opa', 'Mama', 'Papa', 'Pirat', 'Pilot', 'Bruder',
  'Vater', 'Bote', 'Maler', 'Hut', 'Tor', 'Sofa', 'Dose', 'Hose', 'Vase', 'Lupe',
  'Gabel', 'Kabel', 'Tafel', 'Nadel', 'Feder', 'Faden', 'Boden', 'Besen', 'Laden', 'Bogen',
  'Paket', 'Note', 'Glas', 'Ufo', 'Bus', 'Rad', 'Lok', 'Motor', 'Foto', 'Kino',
  'Gras', 'Tal', 'Blume', 'Regen', 'Hafen', 'Ufer', 'Planet', 'Brot', 'Salat', 'Limo',
  'See', 'Meer', 'Boot', 'Moos', 'Insel', 'Perle', 'Krone', 'Ruder', 'Segel', 'Dieb',
]);

/**
 * Theme-specific 100% Score-0 verified Level 1 anchor nouns.
 * Every noun in this map is 1-2 syllables, has calculateWordComplexity === 0, and isLevel1EligibleWord === true.
 */
export const THEME_LEVEL1_ANCHOR_WORDS: Record<string, readonly string[]> = Object.freeze({
  theme_forest: [
    'Igel', 'Esel', 'Vogel', 'Rabe', 'Hase', 'Falke', 'Biber', 'Kater',
    'Moos', 'Gras', 'Tal', 'See', 'Ufer', 'Blume', 'Rose', 'Klee',
    'Regen', 'Nebel', 'Boden', 'Tor', 'Feder', 'Hut', 'Lupe', 'Note',
    'Dose', 'Sofa', 'Ufo', 'Brot', 'Limo', 'Dino',
  ],
  theme_ocean: [
    'See', 'Meer', 'Boot', 'Ruder', 'Segel', 'Wal', 'Krake', 'Hai',
    'Ufer', 'Hafen', 'Insel', 'Perle', 'Krone', 'Vogel', 'Lupe', 'Glas',
    'Dose', 'Bote', 'Pirat', 'Nase', 'Tag', 'Bad', 'Limo', 'Foto',
    'Paket', 'Hut', 'Tor', 'Sofa', 'Dino',
  ],
  theme_horse: [
    'Hof', 'Huf', 'Hafer', 'Gras', 'Moos', 'Klee', 'Rasen', 'Boden',
    'Tor', 'Tal', 'See', 'Ufer', 'Regen', 'Blume', 'Rose', 'Esel',
    'Vogel', 'Rabe', 'Hase', 'Kater', 'Pudel', 'Besen', 'Laden', 'Bogen',
    'Hut', 'Mut', 'Ruf', 'Tag', 'Nase', 'Haar', 'Paar', 'Brot', 'Salat',
  ],
  theme_unicorn: [
    'Fee', 'Moos', 'See', 'Ufer', 'Tal', 'Gras', 'Blume', 'Rose',
    'Klee', 'Nebel', 'Regen', 'Krone', 'Perle', 'Kugel', 'Bogen', 'Feder',
    'Note', 'Saal', 'Tor', 'Vogel', 'Hase', 'Lama', 'Sofa', 'Torte',
    'Limo', 'Tee', 'Nase', 'Haar', 'Mut', 'Ruf',
  ],
  theme_wizard: [
    'Hut', 'Fee', 'Rabe', 'Kater', 'Besen', 'Feder', 'Kugel', 'Lupe',
    'Glas', 'Dose', 'Vase', 'Tafel', 'Nadel', 'Faden', 'Note', 'Saal',
    'Tor', 'Nebel', 'Moos', 'Paket', 'Sofa', 'Torte', 'Tee', 'Limo',
    'Bote', 'Maler', 'Nase', 'Mut', 'Ruf', 'Dino',
  ],
  theme_treasure: [
    'Lupe', 'Krone', 'Perle', 'Kugel', 'Glas', 'Dose', 'Vase', 'Paket',
    'Laden', 'Boden', 'Faden', 'Boot', 'Ruder', 'Insel', 'Hafen', 'Ufer',
    'See', 'Meer', 'Tal', 'Moos', 'Tor', 'Biber', 'Rabe', 'Kater',
    'Pirat', 'Hut', 'Mut', 'Ruf', 'Tag', 'Foto',
  ],
  theme_pirate: [
    'Pirat', 'Boot', 'Ruder', 'Segel', 'Meer', 'See', 'Hafen', 'Ufer',
    'Insel', 'Wal', 'Krake', 'Hai', 'Vogel', 'Rabe', 'Kater', 'Lupe',
    'Krone', 'Perle', 'Paket', 'Dose', 'Glas', 'Hut', 'Mut', 'Ruf',
    'Tag', 'Nase', 'Brot', 'Limo', 'Torte', 'Sofa',
  ],
  theme_dino: [
    'Dino', 'Tal', 'Moos', 'Gras', 'See', 'Ufer', 'Regen', 'Nebel',
    'Boden', 'Vogel', 'Falke', 'Biber', 'Tiger', 'Puma', 'Lama', 'Kamel',
    'Feder', 'Blume', 'Tag', 'Ruf', 'Mut', 'Nase', 'Hut', 'Salat',
    'Brot', 'Limo', 'Ufo', 'Sofa', 'Tor',
  ],
  theme_space: [
    'Ufo', 'Planet', 'Komet', 'Pilot', 'Motor', 'Kabel', 'Kugel', 'Lupe',
    'Glas', 'Foto', 'Paket', 'Note', 'Bote', 'Tor', 'Hut', 'Mut',
    'Ruf', 'Tag', 'Dino', 'Lama', 'Kater', 'Pudel', 'Sofa', 'Brot',
    'Limo', 'Tee', 'Torte', 'Kino', 'Rad', 'Bus',
  ],
  theme_superhero: [
    'Mut', 'Ruf', 'Tag', 'Pilot', 'Bote', 'Tiger', 'Puma', 'Falke',
    'Rabe', 'Kater', 'Pudel', 'Igel', 'Esel', 'Bus', 'Rad', 'Lok',
    'Motor', 'Ufo', 'Tor', 'Hof', 'Hafen', 'Ufer', 'See', 'Paket',
    'Lupe', 'Foto', 'Hut', 'Hose', 'Nase', 'Brot', 'Limo', 'Torte',
  ],
});

export interface SurpriseSeed {
  tag: string;
  hint: string;
}

/**
 * 10 varied surprise impulses per theme (combining magical/thematic twists and humorous contrasts).
 */
export const THEME_SURPRISE_SEEDS: Record<string, readonly SurpriseSeed[]> = Object.freeze({
  theme_forest: [
    { tag: 'Klavier', hint: 'Mitten auf der stillen Waldlichtung steht plötzlich ein altes Klavier im weichen Moos, und ein kleiner Igel drückt neugierig eine helle Note.' },
    { tag: 'Ufo', hint: 'Ein winziges, rundes Ufo landet leise im grünen Gras der Lichtung, und ein freundlicher Gast aus dem All winkt.' },
    { tag: 'Waldfee', hint: 'Am verborgenen Waldsee sitzt plötzlich eine winzige Fee am Ufer und schenkt den Waldtieren ein glitzerndes Licht.' },
    { tag: 'Lupe', hint: 'Ein kluger Rabe trägt eine glänzende Lupe im Schnabel und entdeckt im Moos eine geheimnisvolle Spur.' },
    { tag: 'Sofa', hint: 'Unter einer uralten Eiche steht plötzlich ein rotes Sofa mitten im Wald, perfekt für ein gemütliches Picknick mit frischem Brot.' },
    { tag: 'Baumtor', hint: 'Hinter dichtem Moos entdecken die Tiere ein winziges rundes Tor im Baumstamm, das in eine warme Zwergenstube führt.' },
    { tag: 'Seifenblasen', hint: 'Aus einer kleinen Waldquelle im Tal steigen plötzlich schillernde bunte Seifenblasen auf, die nach Beeren duften.' },
    { tag: 'Pinguin', hint: 'Ein kleiner Pinguin mit Sonnenhut watschelt überraschend über den Waldpfad und fragt den Falken nach dem Weg zum See.' },
    { tag: 'Musikblume', hint: 'Als ein sanfter Regen fällt, öffnet sich eine riesige Blume im Tal und summt eine wunderschöne Melodie.' },
    { tag: 'Paket', hint: 'Mitten auf der Lichtung liegt ein bunt verschnürtes Paket mit einer Überraschung für das große Waldfest.' },
  ],
  theme_ocean: [
    { tag: 'Nixe', hint: 'Beim Rudern im kleinen Boot auf dem glitzernden See taucht plötzlich eine freundliche Nixe auf und zeigt eine schimmernde Perle.' },
    { tag: 'Eisboot', hint: 'Mitten auf dem blauen Meer schaukelt plötzlich ein buntes Boot, auf dem ein Pinguin kühle Limo im Glas verteilt.' },
    { tag: 'Krone', hint: 'Eine sanfte Welle spült eine kleine goldene Krone ans Ufer, und ein gutmütiger Wal hilft bei der Suche nach dem Meereskönig.' },
    { tag: 'Krake', hint: 'Ein fröhlicher Krake findet am Meeresgrund ein altes Musikinstrument und spielt mit allen acht Armen ein Konzert.' },
    { tag: 'Flaschenpost', hint: 'Am Hafen treibt ein verschlossenes Glas ans Ufer, in dem eine geheimnisvolle Schatzkarte zu einer nahen Insel steckt.' },
    { tag: 'Sofa', hint: 'Auf einer winzigen Sandbank mitten im Meer steht plötzlich ein gemütliches Sofa, auf dem eine Robbe mit Hut sonnenbadet.' },
    { tag: 'Riesenperle', hint: 'In einer stillen Bucht öffnet sich unter Wasser eine Riesenmuschel, deren leuchtende Perle das ganze Ufer erhellt.' },
    { tag: 'Flugboot', hint: 'Ein magischer Windstoß hebt das kleine Segelboot sanft an, sodass es wie ein Vogel über die Wellen zur Insel schwebt.' },
    { tag: 'Foto-Hai', hint: 'Ein zahmer kleiner Hai taucht neugierig neben dem Boot auf und lächelt breit für ein lustiges Erinnerungs-Foto.' },
    { tag: 'Singmuschel', hint: 'Am Ufer liegt eine bunte Muschel, die beim Hineinhorchen leise Seemannslieder über das weite Meer singt.' },
  ],
  theme_horse: [
    { tag: 'Einhorn', hint: 'Während das Pony im grünen Klee am Hof grast, tritt plötzlich ein weißes Einhorn aus dem feinen Morgen-Nebel ans Tor.' },
    { tag: 'Ufo', hint: 'Auf der weiten Pferdekoppel landet lautlos ein kleines Ufo, weil der winzige Besucher einmal frischen Hafer riechen möchte.' },
    { tag: 'Goldhuf', hint: 'Beim Ausritt durch das Tal blitzt im weichen Moos am Ufer ein goldenes Hufeisen auf, das dem Pony großen Mut schenkt.' },
    { tag: 'Zirkusesel', hint: 'Am Tor vom Hof steht plötzlich ein lustiger kleiner Esel mit einem bunten Hut, der beim Wettlauf mitmachen will.' },
    { tag: 'Rabe', hint: 'Ein schlauer Rabe landet auf dem Zaun und bringt den Reitern den verlorenen Schlüssel für die Futterkammer zurück.' },
    { tag: 'Klavier', hint: 'In der alten Scheune am Hof klingt plötzlich Musik, weil der Hofkater vergnügt über ein altes Klavier spaziert.' },
    { tag: 'Geheimsee', hint: 'Hinter einer dichten Rosenhecke entdecken Pony und Reiter einen geheimen Bogen aus Ästen, der zu einem stillen See führt.' },
    { tag: 'Känguru', hint: 'Beim Springtraining auf dem Rasen hüpft plötzlich ein fröhliches Känguru neben dem Pony über das Hindernis.' },
    { tag: 'Bergecho', hint: 'Als das Pony im grünen Tal wiehert, antwortet aus dem Wald ein freundlicher kleiner Kobold mit einem lustigen Ruf.' },
    { tag: 'Hafertorte', hint: 'Mitten auf dem Hof steht als Überraschung eine riesige Torte aus Hafer, Äpfeln und Karotten für die Pferde.' },
  ],
  theme_unicorn: [
    { tag: 'Torte', hint: 'Am Ende des Regenbogens steht mitten im weichen Moos plötzlich ein kleiner Tisch mit einer glitzernden Wolken-Torte.' },
    { tag: 'Klavier', hint: 'Auf einer schwebenden rosa Wolke steht ein weißes Klavier, das beim Berühren mit dem Horn bunte Sterne in die Luft zaubert.' },
    { tag: 'Nixe', hint: 'Am kristallklaren Zaubersee taucht eine kleine Nixe auf und tauscht mit dem Einhorn eine schimmernde Perle gegen eine Blume.' },
    { tag: 'Lama', hint: 'Ein flauschiges Lama mit einer goldenen Papier-Krone spaziert ins Tal und möchte auch lernen, über den Regenbogen zu laufen.' },
    { tag: 'Sofa', hint: 'Mitten auf der Glitzerwiese steht ein himmelblaues Sofa aus weichem Moos, auf dem eine kleine Fee gemütlich Tee trinkt.' },
    { tag: 'Spiegelsee', hint: 'Als das Einhorn in den stillen See blickt, zwinkert sein Spiegelbild plötzlich zurück und zeigt ein geheimes Tor.' },
    { tag: 'Ufo', hint: 'Ein winziges Sternen-Ufo landet im Klee, weil es seinen Glitzer-Tank mit Regenbogenlicht auffüllen muss.' },
    { tag: 'Singvogel', hint: 'Ein bunter Zaubervogel setzt sich direkt zwischen die Ohren des Einhorns und pfeift eine Melodie, die alle Blumen öffnet.' },
    { tag: 'Zauberkugel', hint: 'Unter einer großen Rose rollt eine leuchtende Kugel hervor, in der kleiner goldener Sommerregen tanzt.' },
    { tag: 'Wunschbrief', hint: 'Mit dem Morgenwind segelt ein gefaltetes Blatt ans Ufer, das zu einem geheimen Fest im großen Kristall-Saal einlädt.' },
  ],
  theme_wizard: [
    { tag: 'Sprechhut', hint: 'Der alte Zauberhut auf dem Tisch fängt plötzlich an zu kichern und hüpft von allein durch den großen Saal.' },
    { tag: 'Riesentorte', hint: 'Durch ein verwechseltes Zauberwort verwandelt sich der graue Stein auf dem Tisch plötzlich in eine duftende Beeren-Torte.' },
    { tag: 'Flugbesen', hint: 'Der neue Besen will heute nicht kehren, sondern tanzt im Walzertakt mit dem Kater quer durch das Zimmer.' },
    { tag: 'Drachenbaby', hint: 'Aus der runden Glaskugel im Regal schlüpft mit einem leisen Plopp ein winziger, zahmer Drache, der nach warmem Tee verlangt.' },
    { tag: 'Sofa', hint: 'Das gemütliche Sofa im Zauberturm hebt plötzlich sanft vom Boden ab und schwebt wie eine Wolke zum hohen Fenster.' },
    { tag: 'Ufo', hint: 'Vor dem Turmfenster bremst ein kleines silbernes Ufo ab, weil der Pilot nach dem Rezept für Sternen-Limo fragt.' },
    { tag: 'Zaubermaler', hint: 'Alles, was der kleine Zauberer mit seinem Pinsel auf die Tafel malt, wird plötzlich lebendig und winkt.' },
    { tag: 'Froschkönig', hint: 'Aus der Teedose hüpft ein kleiner grüner Frosch mit einer winzigen Krone und hilft beim Suchen der verlorenen Lupe.' },
    { tag: 'Singfeder', hint: 'Die bunte Schreibfeder schreibt die Zaubersprüche nicht nur auf, sondern singt jede Note laut und fröhlich vor.' },
    { tag: 'Schneewolke', hint: 'Mitten im warmen Turmzimmer schwebt eine winzige weiße Wolke unter der Decke und lässt weiche Zuckerflocken rieseln.' },
  ],
  theme_treasure: [
    { tag: 'Schlafdrache', hint: 'Als die alte Schatztruhe aufgeht, liegt darin neben einer Perle ein winziger, freundlich schnarchender Babydrache.' },
    { tag: 'Sofa', hint: 'Tief in der geheimnisvollen Höhle steht vor der Schatzwand plötzlich ein gemütliches Sofa für müde Schatzsucher.' },
    { tag: 'Krake', hint: 'In der Lagune an der Insel reicht ein hilfsbereiter Krake den Kindern den rostigen Schlüssel direkt aus dem See ins Boot.' },
    { tag: 'Klavier', hint: 'An der Felswand sind steinerne Klaviertasten versteckt: Erst wenn man die richtige Note drückt, öffnet sich das geheime Tor.' },
    { tag: 'Papagei', hint: 'Ein bunter Vogel mit einer kleinen Lupe fliegt voraus und verrät mit einem klugen Ruf das Versteck unter dem Moos.' },
    { tag: 'Keksdose', hint: 'In der vergrabenen Kiste am Ufer steckt statt Gold eine magische Dose, die sich immer wieder mit frischen Keksen und Limo füllt.' },
    { tag: 'Nixe', hint: 'Am flachen Ufer der Schatzinsel sitzt eine Nixe und tauscht eine funkelnde Krone gegen ein lustiges Foto.' },
    { tag: 'Maulwurf', hint: 'Ein kleiner Maulwurf mit Bergbau-Hut schaut aus dem Boden und zeigt stolz den geheimen Tunnel zur Schatzkammer.' },
    { tag: 'Leuchtperle', hint: 'Als es in der Höhle dunkel wird, beginnt eine runde Kugel im Sand von selbst wie eine helle Lampe zu leuchten.' },
    { tag: 'Ufo', hint: 'Über der einsamen Insel schwebt kurz ein kleines Ufo und hilft mit seinem Suchstrahl, das Paket im hohen Gras zu finden.' },
  ],
  theme_pirate: [
    { tag: 'Nixe', hint: 'Neben dem Piratenboot taucht plötzlich eine fröhliche Nixe aus dem Meer auf und zeigt den sicheren Weg durch den Nebel in den Hafen.' },
    { tag: 'Pinguin', hint: 'Auf dem Ausguck sitzt plötzlich ein kleiner Pinguin mit Piratenhut, der auf einer Eisscholle bis zum Schiff gereist ist.' },
    { tag: 'Sofa', hint: 'Statt einer Holzkiste fischen die Piraten ein wasserfestes rotes Sofa aus dem Meer, das der Schiffskater sofort als Thron nutzt.' },
    { tag: 'Wal-Taxi', hint: 'Als der Wind einschläft und das Segel schlaff herunterhängt, schiebt ein freundlicher Wal das Boot sanft bis zur Insel.' },
    { tag: 'Torte', hint: 'In der erbeuteten Schatzkiste steckt kein Gold, sondern das geheime Rezept der Meeresoma für die beste Schoko-Torte der Welt.' },
    { tag: 'Krake', hint: 'Ein verspielter Krake kitzelt mit seinen langen Armen das Ruder und trommelt einen lustigen Rhythmus auf das Holzdeck.' },
    { tag: 'Flaschengeist', hint: 'Aus einer alten grünen Flasche am Ufer steigt bunter Duftnebel auf, und ein kleiner Wassergeist erfüllt der Crew einen Wunsch.' },
    { tag: 'Klavier', hint: 'Auf der einsamen Schatzinsel steht unter Palmen ein altes Schiffsklavier, auf dem die Affen fröhlich Musik machen.' },
    { tag: 'Flugfisch', hint: 'Ein glitzernder fliegender Fisch landet kurz auf dem Hut vom Kapitän und hinterlässt eine echte Perle.' },
    { tag: 'Badeinsel', hint: 'Die gefürchtete Nebelinsel entpuppt sich als sonniges Badeparadies mit warmem See und süßer Limo für alle.' },
  ],
  theme_dino: [
    { tag: 'Ufo', hint: 'Im grünen Urwald-Tal landet ein winziges Ufo direkt neben dem großen Dino, und die beiden vergleichen neugierig ihre Fußspuren.' },
    { tag: 'Riesenblume', hint: 'Eine riesige Urwald-Blume öffnet ihre Blätter, und darin sitzt ein kleiner Vogel, der dem Dino die Nase kitzelt.' },
    { tag: 'Sofa', hint: 'Aus weichem Moos und großen Farnblättern ist am Ufer ein riesiges grünes Sofa gewachsen, auf dem der Dino ein Nickerchen macht.' },
    { tag: 'Hut', hint: 'Der Wind weht einen bunten Entdecker-Hut ins Tal, den der kleine Dino stolz wie eine Krone auf dem Kopf trägt.' },
    { tag: 'See-Fontäne', hint: 'Beim Baden im warmen See niest der große Langhals-Dino ins Wasser und zaubert einen glitzernden Regenbogen über das Ufer.' },
    { tag: 'Klavier', hint: 'Hohle Baumstämme am Boden klingen wie ein großes Holz-Klavier, als der Dino mit dem Schwanz im Takt darauf klopft.' },
    { tag: 'Schildkröte', hint: 'Ein runder Felsen im Gras bewegt sich plötzlich: Es ist eine uralte Riesenschildkröte, die den Dino ein Stück mitnimmt.' },
    { tag: 'Foto', hint: 'Ein kleiner Zeitreise-Pilot landet im Moos und knipst mit seiner Kamera ein fröhliches Foto mit dem lächelnden Dino.' },
    { tag: 'Ei-Überraschung', hint: 'Aus einem bunten Ei im Nest schlüpft ein winziger Flugsaurier, der sofort frech auf Dinos Nase landet.' },
    { tag: 'Salat-Fest', hint: 'Hinter dem Wasserfall am See entdeckt der Dino einen geheimen Garten voller riesiger, knackiger Urzeit-Blätter wie in einem Laden.' },
  ],
  theme_space: [
    { tag: 'Sternenwal', hint: 'Draußen vor dem Raketenfenster gleitet plötzlich ein sanft leuchtender Weltraum-Wal durch das Sternenmeer.' },
    { tag: 'Mond-Sofa', hint: 'Mitten auf einem kleinen runden Planeten steht ein gemütliches rotes Sofa, auf dem ein freundlicher Alien-Bote warmen Tee anbietet.' },
    { tag: 'Kometen-Eis', hint: 'Ein glitzernder kleiner Komet zieht vorbei und lässt süßen bunten Sternenstaub schneien, der wie Limo und Eis schmeckt.' },
    { tag: 'Ufo-Panne', hint: 'Ein winziges grünes Ufo blinkt am Wegesrand, und das Kind hilft dem kleinen Piloten mit einem neuen Kabel für den Motor.' },
    { tag: 'Mondhase', hint: 'Bei der Landung auf dem Mond hüpft ein weißer Mondhase mit Raumanzug herbei und zeigt seine geheime Höhle.' },
    { tag: 'Schwebetorte', hint: 'Durch die Schwerelosigkeit schwebt die Geburtstags-Torte samt Gabel quer durch die Kabine, bis der Bordkater sie fängt.' },
    { tag: 'Musikplanet', hint: 'Auf einem bunten Ringplaneten klingen die Steine beim Auftreten wie ein Klavier und spielen eine helle Note nach der anderen.' },
    { tag: 'Weltraumpaket', hint: 'Ein silberner Post-Roboter klopft an die Luke und überreicht ein Paket mit frischem Brot und einem Gruß von Oma.' },
    { tag: 'Sternenlupe', hint: 'Durch das große runde Glas der Sternenlupe entdeckt die Crew einen winzigen Planeten, der genau wie ein lachendes Gesicht aussieht.' },
    { tag: 'Dino-Planet', hint: 'Auf einem grünen fernen Planeten stapft tatsächlich ein freundlicher kleiner Weltraum-Dino durch das blaue Moos.' },
  ],
  theme_superhero: [
    { tag: 'Kater-Held', hint: 'Beim Einsatz am Hafen bekommt das Kind plötzlich Hilfe von einem mutigen Kater mit kleinem rotem Umhang.' },
    { tag: 'Ufo', hint: 'Oben auf dem Dach landet ein winziges Ufo, dessen kleiner Pilot sich verflogen hat und Hilfe beim Lesen der Karte braucht.' },
    { tag: 'Eiswagen', hint: 'Der große Lärm in der Straße ist gar keine Gefahr, sondern ein bunter Bus, der zur Feier des Tages gratis Limo und Torte verteilt.' },
    { tag: 'Riesenblase', hint: 'Ein verrückter Windstoß trägt den Hut vom Bäcker hoch auf das Tor, und ein zahmer Falke hilft bei der lustigen Rettung.' },
    { tag: 'Igel-Stopp', hint: 'Der große rote Bus hält mitten auf der Straße an, weil eine kleine Igel-Familie gemütlich im Gänsemarsch zum See spaziert.' },
    { tag: 'Klavier', hint: 'Ein schweres Klavier rollt auf Rädern den Hügel hinab, doch mit Geschick und Mut wird daraus ein fröhliches Straßenkonzert.' },
    { tag: 'Flugsofa', hint: 'Beim Aufräumen im Park schwebt plötzlich ein verhextes Sofa an bunten Luftballons davon, auf dem ein kleiner Pudel sitzt.' },
    { tag: 'Geheimbote', hint: 'Eine kluge Taube landet mit einem geheimen Brief am Fenster und führt den jungen Helden zu einem versteckten Schatz im Hof.' },
    { tag: 'Regenbogenstrahl', hint: 'Mit einer besonderen Taschenlampe zaubert der kleine Held bei grauem Regenwetter einen leuchtenden Bogen über den ganzen Hafen.' },
    { tag: 'Helden-Foto', hint: 'Nachdem das verlorene Paket der Oma wiedergefunden ist, erscheint das Helden-Team stolz mit großem Foto in der Zeitung.' },
  ],
});

/**
 * Returns the verified Score-0 anchor words for a given theme.
 */
export function getThemeLevel1Anchors(theme: StoryTheme | string): readonly string[] {
  const themeId = typeof theme === 'string' ? theme : theme.id;
  return THEME_LEVEL1_ANCHOR_WORDS[themeId] || FULL_LEVEL1_WHITELIST;
}

/**
 * Returns a specific surprise seed for a theme and 1-based episode index.
 */
export function getEpisodeSurpriseSeed(
  theme: StoryTheme | string,
  episode: number = 1,
  fallbackTag?: string
): SurpriseSeed {
  const themeId = typeof theme === 'string' ? theme : theme.id;
  const seeds = THEME_SURPRISE_SEEDS[themeId] || THEME_SURPRISE_SEEDS.theme_forest;
  const seed = seeds[(Math.max(1, episode) - 1) % seeds.length];
  if (fallbackTag && fallbackTag !== seed.tag) {
    return {
      tag: fallbackTag,
      hint: `${seed.hint} (Oder baue alternativ eine charmante Überraschung rund um "${fallbackTag}" ein.)`,
    };
  }
  return seed;
}

/**
 * Simple, funny disturber/surprise tags for early reader levels 1 and 2 (backward-compatible export).
 */
export const LEVEL_1_2_DISTURBER_WORDS: readonly string[] = Object.freeze([
  'Ufo', 'Sofa', 'Torte', 'Pirat', 'Lama', 'Lupe', 'Hose', 'Bus', 'Dino', 'Keks',
]);

/**
 * Builds the Step 1 (Drafting) prompt for the story pipeline.
 */
export function buildDraftingPrompt(
  theme: StoryTheme | string,
  disturberWord: string,
  level: ReadingLevelNumber = 1,
  episode: number = 1
): string {
  const themeLabel = typeof theme === 'string' ? theme : theme.label;
  const themeDesc = typeof theme === 'string' ? '' : theme.description || '';
  const anchors = getThemeLevel1Anchors(theme);
  const surprise = getEpisodeSurpriseSeed(theme, episode, disturberWord);

  const level1Note =
    level === 1
      ? `\nWICHTIG (FÜR LEVEL 1) - Vorlese-App mit Einzelwort-Lückentext:
- Die App (TTS) liest jeden Satz flüssig vor; das Kind liest pro Satz NUR EIN EINZIGES einfaches Zielwort selbst.
- Deshalb darf und soll der Satz natürlich, bildhaft und erzählerisch rund klingen (5 bis 8 Wörter pro Satz, z. B. mit Wörtern wie "glitzert", "plötzlich", "Nixe", "Klavier", "rudert").
- Gib der Hauptfigur einen lebendigen Namen mit Doppelkonsonant, Zwielaut oder Cluster (z. B. Lilly, Paul, Kalle, Finja, Bello, Poldi, Krümel, Max, Finn), damit die App den Namen vorliest.
- Baue in JEDEN Satz genau ein einfaches, lautgetreues Ziel-Nomen (Score 0, z. B. Dino, Tor, See, Moos) aus dieser passenden Themen-Auswahl ein (am besten ans Satzende, und in jedem Satz ein ANDERES Zielwort!): [${anchors.join(', ')}].`
      : level === 2
      ? `\nWICHTIG (FÜR LEVEL 2 - Vorlese-App mit Wortpaar-Lückentext):
- Die App (TTS) liest den Satz vor; das Kind liest pro Satz genau EIN einfaches Wortpaar (2 aufeinanderfolgende Wörter: [Artikel + Nomen] oder [Adjektiv + Nomen]).
- Die 2 Wörter des Kind-Wortpaars dürfen zusammen maximal 4 Silben haben (jedes Wort max. 2 Silben) und KEIN 'ß', KEIN 'ck'/'tz' und KEINE Doppelkonsonanten (ll, mm, nn, pp, tt, ff, ss) enthalten (gute Paare sind z. B.: "das Boot", "der See", "ein Wal", "die Perle", "rotes Boot", "blauer See", "kleiner Igel", "grünes Moos", "alter Baum", "bunter Vogel", "feiner Sand", "gelber Mond").
- Verwende in jedem Satz ein anderes Nomen für das Wortpaar!`
      : '';

  const lengthHint =
    level <= 2
      ? '4 bis 5 Sätze'
      : level <= 6
      ? '5 bis 6 Sätze'
      : level === 7
      ? 'ca. 30 Wörter (4 Sätze)'
      : level === 8
      ? 'ca. 60 Wörter (7 bis 9 Sätze mit wörtlicher Rede und ?, !)'
      : '100 bis 130 Wörter (10 bis 14 Sätze)';

  return `Du bist ein preisgekrönter deutscher Kinderbuch-Autor für Erstklässler.
Schreibe eine wirklich runde, warmherzige und zusammenhängende kleine Geschichte (${lengthHint}).

Thema / Welt: ${themeLabel}${themeDesc ? ` (${themeDesc})` : ''}
Überraschungs-Impuls der Episode (${disturberWord}): ${surprise.hint}

Erzählerische Leitlinien:
- Die Geschichte muss sich wie aus einem Guss lesen (ein echter kleiner Erzählbogen mit klarem Zusammenhang zwischen den Sätzen, KEINE abgehackte Aufzählung von Ausrufen wie "Hui! Plumps! Schwupps!").
- Die Überraschung darf je nach Impuls wunderbar magisch in die Themenwelt passen (z. B. beim Rudern auf dem See taucht plötzlich eine freundliche Nixe auf) oder ein humorvoller Kontrast sein (z. B. mitten im stillen Wald steht plötzlich ein altes Klavier oder Ufo im Moos).
- Satz 1 führt atmosphärisch in die Szene ein.
- Satz 2 bringt den kleinen Staun- oder Überraschungsmoment.
- Satz 3 bis 4 (bzw. 5) erzählen eine charmante, sinnvolle Interaktion und ein warmes, schmunzelndes Ende.${level1Note}
Schreibe natürlich, warmherzig und bildhaft. Gib nur den reinen Geschichtentext aus.`;
}

/**
 * Builds the Step 2 (Translation, Didactic Verification & JSON) prompt for WP13 story pipeline.
 */
export function buildTranslationPrompt(
  theme: StoryTheme | string,
  disturberWord: string,
  level: ReadingLevelNumber,
  episode: number = 1,
  draftText: string = '',
  validationIssues: string[] = []
): string {
  const themeId = typeof theme === 'string' ? theme : theme.id;
  const anchors = getThemeLevel1Anchors(theme);
  let levelRules = '';

  if (level === 1) {
    levelRules = `REGELN FÜR LEVEL 1:
- Behalte den natürlichen Erzählfluss, den Zusammenhang und den Charme des Entwurfs unbedingt bei!
- 4 bis 5 Sätze. Jeder Satz hat 5 bis 8 Wörter (damit es natürlich, grammatikalisch vollständig und flüssig klingt).
- Da eine Vorlese-App (TTS) den Satz vorliest und das Kind NUR EIN WORT pro Satz selbst liest, darf der Satz reichhaltige Vorlesewörter (z. B. Nixe, Klavier, glitzert, rudert, flüstert) enthalten, MUSS aber ZWINGEND in jedem Satz mindestens ein einfaches Ziel-Nomen (Score 0) aus dieser Liste enthalten: [${anchors.join(', ')}, ${FULL_LEVEL1_WHITELIST.slice(0, 15).join(', ')}].
- Wichtig: Verwende in jedem der 4–5 Sätze ein ANDERES Ziel-Nomen aus der Liste (keine Wortwiederholung beim Zielwort!) und stelle es möglichst ans Satzende.
- Die Hauptfigur soll einen Namen wie Lilly, Paul, Kalle, Finja, Bello, Poldi, Krümel, Max oder Finn tragen (wird von der App vorgelesen).`;
  } else if (level === 2) {
    levelRules = `REGELN FÜR LEVEL 2 (Wortpaar-Pioniere):
- Behalte den natürlichen Erzählfluss und den Charme des Entwurfs unbedingt bei!
- 4 bis 5 Sätze. Jeder Satz hat 5 bis 8 Wörter.
- Die Vorlese-App (TTS) liest den Satz vor; das Kind liest pro Satz genau EIN einfaches Wortpaar (2 direkt aufeinanderfolgende Wörter: [Artikel + Nomen] oder [Adjektiv + Nomen]).
- Harte Bedingung für das 2-Wort-Paar in JEDEM Satz:
  * Jedes der 2 Wörter im Paar hat maximal 2 Silben (zusammen maximal 4 Silben).
  * Beide Wörter im Paar dürfen KEIN 'ß', KEIN 'ck', KEIN 'tz' und KEINE Doppelkonsonanten (ll, mm, nn, pp, tt, ff, ss) enthalten!
  * Beispiele für perfekte Paare: "das Boot", "der See", "ein Wal", "eine Perle", "am Ufer", "im Moos", "rotes Boot", "blauer See", "kleiner Igel", "grünes Moos", "alter Baum", "bunter Vogel", "feiner Sand", "gelber Mond", "leiser Wind", "kluger Rabe", "hohe Düne", "altes Tor".
  * Verwende in jedem Satz ein ANDERES Nomen im Wortpaar!`;
  } else if (level <= 5) {
    levelRules = `REGELN FÜR LEVEL ${level} (Tandem-Lesen):
- 5 bis 6 Sätze im Wechsel aus kurzen Kind-Sätzen (3-5 Wörter) und lebendigen App-Sätzen (6-8 Wörter).
- Die Überraschung ("${disturberWord}") soll organisch in die Handlung eingebettet sein.`;
  } else {
    const wordCountDesc =
      level === 7
        ? 'ca. 30 Wörter (3-4 Sätze)'
        : level === 8
        ? 'ca. 60 Wörter (7-10 Sätze mit Dialogen, ?, !)'
        : '100+ Wörter (12-16 Sätze)';
    levelRules = `REGELN FÜR LEVEL ${level} (Phase C - Lesefluss):
- Längenskalierung: ${wordCountDesc}.
- Lebendige, runde Handlung mit der Überraschung ("${disturberWord}").`;
  }

  const feedbackBlock =
    validationIssues.length > 0
      ? `\nACHTUNG - AUTOMATISCHES VALIDIERUNGS-FEEDBACK (BITTE GEZIELT KORRIGIEREN):
Bei der Prüfung fielen folgende Punkte auf, die du in den betroffenen Sätzen beheben musst:
${validationIssues.map((iss) => `- ${iss}`).join('\n')}\n`
      : '';

  return `Du bist Kinderbuch-Lektor und präziser JSON-Konverter. Nimm diese Geschichte und stelle sicher, dass sie sprachlich wunderbar rund klingt und alle Regeln für Lesestufe ${level} erfüllt:

Entwurf:
${draftText}

${levelRules}${feedbackBlock}

SILBENTRENNUNG & JSON-SCHEMA:
Prüfe jedes Wort sorgfältig und zerlege es sauber in Sprechsilben (z.B. 'Sofa' -> ['So', 'fa'], 'Boot' -> ['Boot']).
Gib AUSSCHLIESSLICH valides JSON ohne Markdown-Backticks im definierten Schema zurück.
Schema:
{
  "themeId": "${themeId}",
  "level": ${level},
  "episode": ${episode},
  "disturberWord": "${disturberWord}",
  "title": "Kurzer, schöner Titel",
  "sentences": [
    {
      "text": "Satztext hier.",
      "words": [
        { "clean": "BereinigtesWort", "syllables": ["Sil", "be"] }
      ]
    }
  ]
}`;
}

/**
 * Builds a batch prompt to generate multiple distinct, cohesive episodes for a theme and level in one pass.
 */
export function buildBatchThemePrompt(
  theme: StoryTheme,
  level: ReadingLevelNumber,
  count: number
): string {
  const anchors = getThemeLevel1Anchors(theme);
  const seeds = (THEME_SURPRISE_SEEDS[theme.id] || THEME_SURPRISE_SEEDS.theme_forest).slice(0, count);

  const seedLines = seeds
    .map((s, idx) => `  - Episode ${idx + 1} (Überraschungs-Stichwort "${s.tag}"): ${s.hint}`)
    .join('\n');

  let didacticMandate = '';
  if (level === 1) {
    didacticMandate = `DIDAKTISCHE VORGABEN FÜR LESESTUFE 1 (Einzelwort-Entdecker):
- Umfang pro Geschichte: 4 bis 5 Sätze. Jeder Satz hat 5 bis 8 Wörter.
- Vorlese-Prinzip: Die App (TTS) liest den Satz flüssig und ausdrucksstark vor; das Kind liest in jedem Satz NUR EIN EINZIGES einfaches Zielwort selbst.
- Deshalb darf und soll der Satz reichhaltige Vorlesewörter enthalten (z. B. "glitzert", "Nixe", "Klavier", "rudert", "plötzlich", "lauscht", "schaukelt").
- Hauptfigur: Nutze Namen mit Doppelkonsonant, Zwielaut oder Cluster wie Lilly, Paul, Kalle, Finja, Bello, Poldi, Krümel, Max, Finn oder Anton (diese liest immer die App vor!).
- ZWINGENDE REGEL FÜR DAS KIND-ZIELWORT:
  In JEDEM Satz muss genau ein einfaches, lautgetreues Nomen (Score 0) aus dieser Liste vorkommen (ideal am Satzende!):
  [${anchors.join(', ')}]
- WICHTIG: Verwende innerhalb einer Geschichte in jedem Satz ein ANDERES Ziel-Nomen aus dieser Liste (keine Wiederholung desselben Ziel-Nomens in einer Geschichte!).`;
  } else if (level === 2) {
    didacticMandate = `DIDAKTISCHE VORGABEN FÜR LESESTUFE 2 (Wortpaar-Pioniere):
- Umfang pro Geschichte: 4 bis 5 Sätze. Jeder Satz hat 5 bis 8 Wörter.
- Vorlese-Prinzip: Die App (TTS) liest den Satz vor; das Kind liest in jedem Satz genau EIN einfaches Wortpaar (2 unmittelbar aufeinanderfolgende Wörter: [Artikel + Nomen] oder [Adjektiv + Nomen]).
- ZWINGENDE REGEL FÜR DAS 2-WORT-PAAR DES KINDES IN JEDEM SATZ:
  * Jedes der 2 Wörter im Paar hat maximal 2 Silben (zusammen maximal 4 Silben).
  * Beide Wörter im Paar dürfen KEIN 'ß', KEIN 'ck', KEIN 'tz' und KEINE Doppelkonsonanten (ll, mm, nn, pp, tt, ff, ss) enthalten!
  * Vermeide im Paar also Wörter wie "Sonne", "Wasser", "Katze", "Ball", "Schloss", "große", "weiße", "helle", "dicke", "schnelle", "stille", "nasse".
  * Nutze stattdessen für das Paar Wörter wie: "das Boot", "der See", "ein Wal", "die Perle", "das Moos", "am Ufer", "rotes Boot", "blauer See", "kleiner Igel", "grünes Moos", "alter Baum", "bunter Vogel", "feiner Sand", "gelber Mond", "leiser Wind", "kluger Rabe", "hohe Düne", "altes Tor", "rote Blume", "tiefer Wald", "kleine Fee", "grauer Esel", "buntes Ufo", "weiches Sofa".
  * Verwende innerhalb einer Geschichte in jedem Satz ein ANDERES Nomen im Wortpaar!`;
  } else if (level <= 5) {
    didacticMandate = `DIDAKTISCHE VORGABEN FÜR LESESTUFE ${level} (Tandem-Lesen):
- Umfang pro Geschichte: 5 bis 6 Sätze im Wechsel aus kurzen Kind-Sätzen (3-5 Wörter) und längeren App-Sätzen (6-8 Wörter).`;
  } else {
    const wordCountDesc =
      level === 7
        ? 'ca. 30 Wörter (3-4 Sätze)'
        : level === 8
        ? 'ca. 60 Wörter (7-10 Sätze mit wörtlicher Rede, ?, !)'
        : '100+ Wörter (12-16 Sätze)';
    didacticMandate = `DIDAKTISCHE VORGABEN FÜR LESESTUFE ${level}:
- Umfang pro Geschichte: ${wordCountDesc}.`;
  }

  return `Du bist ein preisgekrönter deutscher Kinderbuch-Autor und Erstlese-Pädagoge.
Verfasse ${count} eigenständige, sprachlich runde und warmherzige Erstlesergeschichten für das Thema "${theme.label}" (${theme.description}) auf Lesestufe ${level}.

QUALITÄTS-ANFORDERUNGEN AN JEDE GESCHICHTE:
1. Jede Geschichte muss wirklich rund und zusammenhängend erzählt sein – mit Atmosphäre, klarem rotem Faden von Satz zu Satz und einem schönen, schmunzelnden Abschluss.
2. KEINE abgehackten Ausrufe-Ketten (vermeide "Hui! Plumps! Schwupps! Klatsch!"-Staccato) und KEINE künstlich zusammengewürfelten Sätze!
3. Jede Episode hat eine eigene kleine Überraschung (mal magisch-thematisch passend, mal ein witziger Kontrast):
${seedLines}

${didacticMandate}

AUSGABE-FORMAT (STRIKTES JSON):
Gib AUSSCHLIESSLICH ein valides JSON-Objekt ohne Erklärungen zurück (die Silbentrennung übernimmt unser System automatisch):
{
  "episodes": [
    {
      "episode": 1,
      "disturberWord": "${seeds[0]?.tag || 'Überraschung'}",
      "title": "Kurzer, bildhafter Titel",
      "sentences": [
        { "text": "Vollständiger Satz 1." },
        { "text": "Vollständiger Satz 2." },
        { "text": "Vollständiger Satz 3." },
        { "text": "Vollständiger Satz 4." }
      ]
    }
  ]
}`;
}
