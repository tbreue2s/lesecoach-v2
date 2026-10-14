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
- Erlaubte Basis-Nomen (Beispiele): Hund, Hut, Ball, See, Bus, Baum, Haus, Kind, Tag, Reh, Tier, Boot, Tor, Bild.`;

    case 2:
      return `Lese-Stufe 2 (Wortpaar-Pioniere):
- Länge: 4-5 Sätze.
- Syntax: Einbau einfacher Nomen-Phrasen mit Adjektiven oder Artikeln (z.B. "der rote Ball", "ein lieber Hund").
- Wortschatz-Restriktion: Maximal 3 Silben pro Wort.
- Nomen-Phrasen: In Summe maximal 4 Silben für die 2 zusammengehörigen Wörter.
- Einfache Komposita erlaubt, jedoch ohne schwere Konsonantenhäufungen.`;

    case 3:
      return `Lese-Stufe 3 (Mini-Phrasen-Meister):
- Länge: 4-6 Sätze.
- Satzlänge: Maximal 5-6 Wörter pro Satz.
- Syntax: Kurze Sätze mit 2- bis 3-Wort-Phrasen.
- Wortschatz: Maximal 3 Silben pro Wort, klare Handlungen und motivierende Satzrhythmen.`;

    case 4:
      return `Lese-Stufe 4 (Tandem-Starter):
- Struktur: Tandem-Lesen zwischen App und Kind. Das Kind liest jeden 3. Satz (Satz 2, 5, etc.).
- Kind-Sätze: Kurz (3-5 Wörter), strikt nach einfachen Regeln (1-2 Silben, keine schwierigen Lautgruppen).
- App-Sätze: Länger (6-8 Wörter), natürlicherer und reichhaltigerer Erzähl-Wortschatz erlaubt.
- Gesamtlänge: 5-6 Sätze.`;

    case 5:
      return `Lese-Stufe 5 (Tandem-Profi):
- Struktur: Streng abwechselndes Tandem-Lesen (Satz 1: App, Satz 2: Kind, Satz 3: App, Satz 4: Kind, ...).
- Kind-Sätze: Kurz (3-5 Wörter), didaktisch altersgerecht.
- App-Sätze: 6-8 Wörter, spannend erzählt.
- Gesamtlänge: 6 Sätze.
- Didaktik: Bereitet auf flüssiges Wiederholungslesen vor.`;

    case 6:
      return `Lese-Stufe 6 (Satz-Held):
- Struktur: Alle Sätze werden vom Kind gelesen, gefolgt von Vorlese-Bestätigung zur Satzmelodie.
- Länge: 5-6 Sätze.
- Satzlänge: 5-7 Wörter pro Satz.
- Didaktik: Fokus auf vollständige Satzstrukturen und flüssige Phrasierung.`;

    case 7:
      return `Lese-Stufe 7 (Flüssig-Leser I - Phase C):
- Längen-Skalierung: Zusammenhängender Text mit ca. 30 Wörtern (~5-7 Sätze).
- Didaktik: Flüssiges Lesen zusammenhängender Sinnabschnitte, abwechslungsreicher Wortschatz.`;

    case 8:
      return `Lese-Stufe 8 (Flüssig-Leser II - Phase C):
- Längen-Skalierung: Zusammenhängender Text mit ca. 60 Wörtern (~8-12 Sätze).
- Didaktik: Erhöhte Lesegeschwindigkeit und Textverständnis bei längeren Geschichten.`;

    case 9:
      return `Lese-Stufe 9 (Lese-Champion - Phase C):
- Längen-Skalierung: Vollständige Mini-Geschichte mit 100+ Wörtern.
- Didaktik: Freies, flüssiges Lesen mit Dialogen und lebendiger Erzählstruktur.`;
  }
}

/**
 * Builds the full LLM prompt instructing the model to generate a level-compliant German story
 * with the strict JSON output mandate including syllables.
 */
export function buildStoryPrompt(options: PromptTemplateOptions): string {
  const { level, theme, childName, companionName } = options;

  const themeLabel = typeof theme === 'string' ? theme : theme.label;
  const themeDescription = typeof theme === 'string' ? '' : theme.description || '';

  const companionInstruction = companionName
    ? `Begleiter des Kindes: "${companionName}". Der Begleiter soll als treuer Freund in der Geschichte mitwirken.`
    : `Kein Begleiter ausgewählt. Das Kind ${childName} erlebt das Abenteuer allein oder mit anderen Nebenfiguren.`;

  const levelRules = getLevelPromptRules(level);

  return `Du bist ein didaktischer Lese-Coach für Grundschüler (1. und 2. Klasse) im deutschen Erstleseunterricht.
Deine Aufgabe ist es, eine kurze, motivierende Geschichte passend zu den didaktischen Fähigkeiten des Kindes zu verfassen.

KONTEXT & PARAMETER:
- Thema: ${themeLabel} (${themeDescription})
- Hauptperson (Kind): "${childName}"
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
      "text": "${childName} sieht einen Hund.",
      "words": [
        { "clean": "${childName}", "syllables": ["${childName}"] },
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
