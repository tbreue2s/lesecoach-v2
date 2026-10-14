# Technical Evidence: Work Package 08 (Level-basierte Text-Generierung & Prompt-Templates)

**WP-ID:** `WP08`  
**Datum:** 2026-10-14  
**Status:** `accepted`  
**Test-Ergebnis:** 15 Test-Suites, 128 Tests erfolgreich bestanden (100% grün).

---

## 1. Ziel & Zusammenfassung

Ziel von WP08 war die Implementierung von level-spezifischen Prompt-Templates und Generatoren für die 9-Stufen-Matrix. Anstatt beliebigen Text in den didaktischen Tokenizer zu speisen, erzeugt das System nun gezielt stufengerechte Fibel-Texte. Ein striktes JSON-Output-Mandat nimmt dem Frontend zudem die fehleranfällige Silbentrennung ab, indem Silben (`syllables`) direkt im strukturierten Format geliefert werden.

---

## 2. Technische Spezifikation & Architektur

### 2.1 Prompt-Templates (`promptTemplates.ts`)
Die Funktion `generateStoryPrompt(level, theme, childName, companionName)` bzw. `buildStoryPrompt` generiert hochgradig deterministische Prompts für LLMs mit folgenden Vorgaben:

- **Level 1:**
  - Exakt 4 Sätze.
  - Maximal 4–5 Wörter pro Satz.
  - Ausschließlich einfache Hauptsätze (S-P-O). Keine Nebensätze, keine Kommas.
  - Nur 1- bis 2-silbige Wörter.
  - Harte Verbote: Keine Komposita (keine "Sandburg", "Zauberschule" etc.), keine `ß`, `ck`, `tz`, `pf` und keine Konsonanten-Cluster (`sch`, `sp`, `st`).
  - Basis-Nomen: Hund, Hut, Ball, See, Bus, Baum, Haus, Kind, Tag, Tier, Boot etc.
- **Level 2:**
  - 4–5 Sätze.
  - Nomen-Phrasen mit Adjektiven/Artikeln (z.B. "der rote Ball", "ein lieber Hund").
  - Maximal 3 Silben pro Wort; Wortpaar in Summe $\le 4$ Silben.
- **Level 3:**
  - 4–6 Sätze mit Mini-Phrasen (2–3 Wörter), rhythmische Strukturen.
- **Level 4–5 (Tandem-Lesen):**
  - Abwechselnde Kind-Sätze (3–5 Wörter, Level 1–2 Wortschatz) und App-Sätze (6–8 Wörter, reichhaltigerer Wortschatz).
  - Level 4: Kind liest jeden 3. Satz.
  - Level 5: Streng abwechselnder Satz-Dialog.
- **Level 6:**
  - 5–6 Sätze (5–7 Wörter) mit Repeated Reading.
- **Phase C (Level 7–9):**
  - Textlängen-Skalierung: Level 7 (~30 Wörter), Level 8 (~60 Wörter), Level 9 (100+ Wörter).

### 2.2 Globales JSON-Schema Mandat
Jedes Prompt erzwingt das JSON-Format:
```json
{
  "sentences": [
    {
      "text": "Emil sieht einen Hund.",
      "words": [
        { "clean": "Emil", "syllables": ["E", "mil"] },
        { "clean": "sieht", "syllables": ["sieht"] },
        { "clean": "einen", "syllables": ["ei", "nen"] },
        { "clean": "Hund", "syllables": ["Hund"] }
      ]
    }
  ]
}
```
`parseGeneratedStoryJson` parst das JSON robust (inkl. Bereinigung von Markdown-Code-Fences ` ```json `) und validiert alle Pflichtfelder.

### 2.3 Didaktischer Mock-Generator & Service-Layer
- In `src/lib/utils/mockStoryGenerator.ts` wurden alle 10 Themen für alle 9 Level implementiert.
- In Level 1 erfüllen alle 10 Themen ausnahmslos die harten Verbote (keine Kommas, 4 Sätze, 4–5 Wörter, keine verbotenen Grapheme oder Cluster).
- In `src/lib/services/storyGeneratorService.ts` steht eine saubere Service-Fassade für die Story- und Prompt-Generierung zur Verfügung.
- `src/lib/utils/tokenizer.ts` nimmt optionales `structuredOutput` entgegen: Wenn vor-getrennte `syllables` vorhanden sind, werden diese direkt verwendet.

---

## 3. Akzeptanzkriterien-Nachweis

| Akzeptanzkriterium | Status | Nachweis |
|---|---|---|
| Valides JSON-Schema inkl. vorab separierter Silben (`syllables`) | Erfüllt | `parseGeneratedStoryJson`, `generateStoryJson`, `buildStructuredStoryOutput` in `promptTemplates.test.ts` & `mockStoryGenerator.test.ts` |
| Harte Wortschatz-Restriktionen in Prompt-Templates (Verbot von `ß/ck/tz/pf/sch/sp/st` in Level 1) | Erfüllt | `getLevelPromptRules(1)` verifiziert in `promptTemplates.test.ts` |
| Theme- & Charakter-Picker UI ist implementiert und verwendbar | Erfüllt | `StoryTopicPicker.svelte` mit 10 Themen, Begleiter-Toggle und Level-Steuerung |
| Korrekte Parameterübergabe an Generator-Objekt | Erfüllt | `storyConfigStore.ts` und `storyGeneratorService.test.ts` |
| Strikte Einhaltung der Längen- & Strukturvorgaben pro Level in Templates | Erfüllt | Unit Tests in `mockStoryGenerator.test.ts` prüfen alle 10 Themen für Level 1, 2, 4/5 und Phase C (7-9) |

---

## 4. Testprotokoll (Vitest Suite)

```
Test Files  15 passed (15)
     Tests  128 passed (128)

 ✓ src/lib/stores/profileStore.test.ts (5)
 ✓ src/lib/stores/readingSessionStore.test.ts (7)
 ✓ src/lib/stores/routerStore.test.ts (2)
 ✓ src/lib/stores/storyConfigStore.test.ts (3)
 ✓ src/lib/services/speechRecognitionService.test.ts (8)
 ✓ src/lib/services/storyGeneratorService.test.ts (3)
 ✓ src/lib/utils/charMapper.test.ts (6)
 ✓ src/lib/utils/levelValidator.test.ts (11)
 ✓ src/lib/utils/mockStoryGenerator.test.ts (15)
 ✓ src/lib/utils/promptTemplates.test.ts (10)
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/utils/syllableSplitter.test.ts (5)
 ✓ src/lib/utils/tokenizer.test.ts (24)
 ✓ src/lib/utils/validation.test.ts (7)
```
