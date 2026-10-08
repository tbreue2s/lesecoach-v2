# Tasks: Work Package 03 – State-Management & Didaktische Lese-Stufen (9-Stufen-Matrix)

**ID:** `WP03-TASKS`  
**Parent Spec:** [WP03-state-management-lesestufen.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP03-state-management-lesestufen.md)  
**Lifecycle Status:** `spec` ➔ `plan` ➔ `tasks`

---

## Task-Übersicht

```
[Task 1: Type Definitions & Matrix Constants]
      │
      ▼
[Task 2: Level Constraint & Story Validator Engine]
      │
      ▼
[Task 3: Dynamic Tokenizer & Scaffolding Engine]
      │
      ▼
[Task 4: Svelte Stores & Repeated Reading State Machine]
      │
      ▼
[Task 5: UI Scaffolding & Dual-Color Syllable Rendering Component]
      │
      ▼
[Task 6: Unit Test Suite & Evidence Generation]
```

---

## Detaillierte Aufgabenpakete

### Task 1: TypeScript Typen & 9-Stufen-Matrix Metadaten
- **Datei:** `src/lib/types/reading.ts`, `src/lib/constants/readingLevels.ts`
- **Ziel:** Vollständige typisierte Abbildung aller 3 Phasen (A, B, C) und 9 Level.
- **Details:**
  - `ReadingPhaseId`: `'phase_a' | 'phase_b' | 'phase_c'`
  - `ReadingLevelNumber`: `1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9`
  - `WordToken`: Enthält `word`, `cleanWord`, `syllables: string[]`, `role: 'app' | 'child'`, `status`, `hasInterventionActive?: boolean`.
  - `SentenceToken`: Enthält `requiresRepeatedReading: boolean`, `role: 'app' | 'child' | 'mixed'`, `words: WordToken[]`.
  - Konstanten-Tabelle `READING_LEVELS_MATRIX` mit allen Beschreibungen, Restriktionen und Scaffolding-Parametern.

### Task 2: Validierungs-Engine für Lese-Stufen (`levelValidator.ts`)
- **Datei:** `src/lib/utils/levelValidator.ts`, `src/lib/utils/levelValidator.test.ts`
- **Ziel:** Prüffunktion für Geschichten und Wörter gegen die didaktischen Stufen-Kriterien.
- **Details:**
  - `validateWordForLevel(word: string, syllables: string[], level: ReadingLevelNumber): { isValid: boolean; reason?: string }`
    - Level 1: Genau 1–2 Silben, keine Konsonanten-Cluster (*sch*, *ch*, *sp*, *st*, *pfl*, *str*).
    - Level 2: Bis zu 3 Silben.
  - `validateSentenceForLevel(sentence: SentenceToken, level: ReadingLevelNumber): boolean`
    - Prüft Kinder-Wort-Anzahl pro Satz (Level 1 = 1, Level 2 = 2, Level 3 = 3-4, Level 4 = 4-5).
  - `validateStoryForLevel(story: StoryData, level: ReadingLevelNumber): { isValid: boolean; issues: string[] }`
    - Prüft Gesamtlänge und Satzanzahl (Level 7 = 25-35 Wörter/3-4 Sätze, Level 8 = 50-70 Wörter, Level 9 = 100-150+ Wörter).

### Task 3: Erweiterung des Tokenizers & Silben-Scaffolding
- **Datei:** `src/lib/utils/tokenizer.ts`, `src/lib/utils/tokenizer.test.ts`
- **Ziel:** Deterministische Generierung von `WordToken`s mit Silbentrennung und Rollen-Zuweisung passend zum Level.
- **Details:**
  - Integration von `syllableSplitter.ts` in die Token-Generierung.
  - Automatisches Setzen von `requiresRepeatedReading = true` auf Satzebene bei Level 5 & 6.
  - Zuweisung von `role: 'child'` passend zu Level-Regeln (Lückenwörter, Tandem-Sätze, Solo-Sätze).

### Task 4: Svelte State-Management & Turn-Steuerung
- **Datei:** `src/lib/stores/readingSessionStore.ts`, `src/lib/stores/readingSessionStore.test.ts`
- **Ziel:** Ablaufsteuerung für Scaffolding, Repeated Reading und Hänger-Intervention.
- **Details:**
  - Transition nach erfolgreichem Kind-Lesen:
    - Wenn `requiresRepeatedReading === true`: Wechsel in `TurnState = 'REPEATED_READING'`, TTS liest den gesamten Satz vor, danach nächster Satz.
    - Wenn `requiresRepeatedReading === false`: Direkter Übergang zum nächsten Satz/Wort.
  - Bereitstellung einer Store-Aktion `triggerIntervention(wordId: string)`, die `hasInterventionActive = true` setzt, um dynamisch Silbenhilfe zuzuschalten.

### Task 5: UI-Rendering & Silben-Styling-Logik
- **Datei:** `src/lib/components/WordTokenView.svelte` (oder `ReadingSessionView.svelte`)
- **Ziel:** Visuelle Differenzierung nach Phase und Interventions-Zustand.
- **Farb-Tokens:**
  - Phase A (oder `hasInterventionActive === true`):
    - 1. Silbe: `#2B6CB0` (Blau)
    - 2. Silbe: `#C53030` (Rot)
    - 3. Silbe: `#2B6CB0` (Blau)
    - Einsilber: `#2B6CB0` (Blau)
  - Phase B & C (Standard):
    - Regulärer Text (#2D3748) ohne Silbentrennung.

### Task 6: Test-Suite & Evidence-Protokoll
- **Datei:** `kitty-specs/evidence/WP03/evidence-wp03.md`
- **Ziel:** Vollständiger Nachweis aller Kriterien mit Vitest.
- **Details:**
  - Tests für alle 9 Level-Validierungsregeln.
  - Tests für Tokenisierungs- und Repeated-Reading-Transitionen.
  - Erfassung der Vitest-Ergebnisse als Evidence.
