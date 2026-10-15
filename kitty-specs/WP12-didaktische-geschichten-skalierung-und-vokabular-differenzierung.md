# Work Package 12: Stufengerechte & Skalierende Geschichten-Generierung (WP-StoryScaling)

**ID:** `WP12`  
**Status:** `spec`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Background & Didactic Vision

Currently, story generation and templates (introduced in WP08) use a rigid, relatively short format across the lower levels. Additionally, earlier story validation rules applied child-level vocabulary restrictions globally to all words in a story, which prevented the app from reading richer, more engaging narrative texts.

### Key Objectives:
1. **Didaktische Wortschatz-Trennung (Kind-Zielwörter vs. App-Vorlesen):**
   - Beim gemeinsamen Tandem- und Vorlesen darf die App grundsätzlich auch anspruchsvollere, atmosphärisch reichere Wörter flüssig vorlesen.
   - Einzige didaktische Bedingung: Im Text bzw. in den Sätzen müssen **genügend einfache Wörter für das Kind** vorhanden sein, die exakt den didaktischen Kriterien der jeweiligen Stufe (z.B. Komplexität = 0 in Stufe 1, Wortpaare in Stufe 2, Halbsätze in Stufe 3) entsprechen.
   - Vorlese-Wörter der App dürfen die Lese-Validierung nicht blockieren, solange für die Kind-Rolle geeignete Wörter zur Verfügung stehen.

2. **Skalierende Textlänge & Spannungsbogen pro Stufe:**
   - Die Geschichten sollen mit jeder Stufe kontinuierlich wachsen und einen echten narrativen Bogen bieten:
     - **Stufe 1 (Einzelwort-Entdecker):** 4-5 Sätze (ca. 20-25 Wörter), klare S-P-O Strukturen, spannende Mini-Erlebnisse.
     - **Stufe 2 (Wortpaare-Forscher):** 5-6 Sätze (ca. 30-35 Wörter), Einbau von Nomen-Phrasen.
     - **Stufe 3 (Halbsatz-Meister):** 6-7 Sätze (ca. 35-45 Wörter), flüssigere Satzverbindungen.
     - **Stufe 4 (Satz-Häppchen / Tandem 1:2):** 7-8 Sätze (ca. 45-55 Wörter).
     - **Stufe 5 (Ping-Pong-Tandem 1:1):** 8-10 Sätze (ca. 60-75 Wörter).
     - **Stufe 6 (Solo-Pionier):** 10-12 Sätze (ca. 75-90 Wörter).
     - **Stufe 7 (Mini-Abenteuer):** 12-14 Sätze (ca. 90-110 Wörter).
     - **Stufe 8 (Mittlere Geschichte):** 14-16 Sätze (ca. 110-140 Wörter).
     - **Stufe 9 (Meisterleser):** 16-20+ Sätze (150-200+ Wörter).

3. **Narrative Qualität der Geschichten:**
   - Lebendigere Interaktion zwischen Kind und gewähltem Begleiter (z.B. Hund, Katze, Drache, Roboter).
   - Motivierende Wendungen, Dialoge und kindgerechte Sprache statt steriler Fibelsätze.

---

## 2. Technical Specification

### 2.1 Story Validation Refinement (`src/lib/utils/levelValidator.ts`)
- Im Modul `validateStoryForLevel`:
  - Nicht mehr pauschal jedes Wort des gesamten Textes auf Level-1-Kind-Restriktionen prüfen.
  - Stattdessen wird über die Tokenisierung geprüft:
    - Enthält jeder Satz (bzw. die nach Stufen-Verteilung geforderten Kind-Sätze) mindestens ein valides Zielwort (Level 1: `score === 0`) für das Kind?
    - Sind die quantitativen Schwellenwerte (Wortanzahl, Satzanzahl) stufengerecht erfüllt?
  - Vorlese-Wörter der App werden von den strikten phonetischen Filtern ausgenommen.

### 2.2 Prompt Templates & Stufen-Skalierung (`src/lib/utils/promptTemplates.ts`)
- Anpassung von `getLevelPromptRules`:
  - Explizite Anweisung für das LLM: App-Vorlesewörter dürfen anspruchsvoller sein, solange pro Satz mindestens 1-2 absolut einfache Wörter (Level 1: Dauerlaute, Score 0) für das Kind vorkommen.
  - Präzise Längen- und Satzvorgaben für Stufe 1 bis 9 mit stetigem Längenzuwachs.
  - Berücksichtigung des Begleiters mit aktiver Rolle in der Handlung.

### 2.3 Mock Story Generator & Fallback-Templates (`src/lib/utils/mockStoryGenerator.ts`)
- Überarbeitung der Template-Sammlungen für alle Themen:
  - Aktualisierung der Geschichten auf die neuen, längeren Satzstrukturen.
  - Sicherstellung, dass in Stufe 1 jeder Satz mindestens ein Zielwort mit Komplexitäts-Score `0` bereitstellt, während der restliche Satz flüssig und kindgerecht formuliert ist.

### 2.4 Reading Level Constraints (`src/lib/data/readingLevels.ts`)
- Aktualisierung der `ReadingLevelInfo`-Definitionen und Min/Max-Wortgrenzen für Stufe 1 bis 9, um die stetige Längenskalierung widerzuspiegeln.

---

## 3. Acceptance Criteria

- [ ] Geschichten für Stufen 1 bis 9 weisen einen konsistenten Längenzuwachs auf (Stufe 1 ~20-25 Wörter, Stufe 9 150-200+ Wörter).
- [ ] In Stufe 1 enthält jeder Satz mindestens ein Kind-Zielwort mit Komplexitäts-Score 0; Vorlese-Wörter dürfen reichhaltiger sein.
- [ ] `validateStoryForLevel` validiert erfolgreich Geschichten, in denen die App anspruchsvollere Vorlesewörter nutzt, solange die Kind-Wörter stufenkonform sind.
- [ ] Der Mock-Generator erzeugt für jedes Thema stufengerechte, längere und lebendigere Geschichten.
- [ ] Die Prompt-Templates spiegeln die neuen Längenvorgaben und die Differenzierung zwischen Vorlese- und Kind-Wortschatz wider.
- [ ] Sämtliche Vitest-Tests und Typisierungsprüfungen (`npm test`, `npm run build`) sind grün.

---

## 4. Evidence Vorgabe (for `in_review`)
- Vitest-Testergebnisse zur Validierung der neuen Längen- und Wortschatzregeln.
- Beispiel-Generierungen für Stufe 1, Stufe 5 und Stufe 9.
