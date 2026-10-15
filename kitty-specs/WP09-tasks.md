# Tasks: Work Package 09 – Didaktische Phonem-Gewichtung (Dauerlaute vs. Plosive)

**ID:** `WP09-TASKS`  
**Parent Spec:** [WP09-phoneme-scoring-refinement.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP09-phoneme-scoring-refinement.md)  
**Lifecycle Status:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge` (done)

---

## Task-Übersicht

```
[Task 1: Phonem-Tiebreaker-Funktion (calculatePhonemeTiebreaker)]
      │
      ▼
[Task 2: Integrierung in selectPhaseAChildIndices (Level 1 & 2)]
      │
      ▼
[Task 3: Didaktische Verfeinerung im Level 1 Prompt-Template]
      │
      ▼
[Task 4: Unit Tests für Dauerlaute vs. Plosive & Regressionsabsicherung]
      │
      ▼
[Task 5: Technical Evidence erstellen & Lifecycle auf in_review setzen]
```

---

## Detaillierte Aufgabenpakete

### Task 1: Phonem-Tiebreaker (`calculatePhonemeTiebreaker`)
- **Datei:** `src/lib/utils/tokenizer.ts`
- **Ziel:** Implementierung einer leichtgewichtigen Bewertungsfunktion, die Plosive (`p, t, k, b, d, g`) zählt und als fraktionalen Penalty (`count * 0.1`) zurückgibt.

### Task 2: Integrierung in `selectPhaseAChildIndices`
- **Datei:** `src/lib/utils/tokenizer.ts`
- **Ziel:** 
  - Für Level 1: `selectionScore = baseScore + calculatePhonemeTiebreaker(w.cleanWord)`.
  - Harter Cutoff: `baseScore <= 1` bleibt strikt erhalten.
  - Für Level 2: Einbezug des Tiebreakers bei der Wortpaar-Bewertung.

### Task 3: Didaktische Prompt-Verfeinerung
- **Datei:** `src/lib/utils/promptTemplates.ts`
- **Ziel:** Empfehlung dehnbarer Konsonanten (`m, l, s, n, f, r`) im `Level 1` Template verankern.

### Task 4: Unit Tests & Regression
- **Datei:** `src/lib/utils/tokenizer.test.ts`
- **Ziel:**
  - Testfälle für `calculatePhonemeTiebreaker`.
  - Testfälle für Positions-Unabhängigkeit: "Am Tor steht Oma." wählt "Oma", "Oma steht am Tor." wählt "Oma".
  - Testfall: Reine Plosiv-Wörter (z. B. "Hier liegt ein roter Hut.") wählen weiterhin zuverlässig "Hut".
  - Ausführung aller Unit-Tests (`npm test`).

### Task 5: Technical Evidence & Review
- **Datei:** `kitty-specs/evidence/WP09/evidence-wp09.md`
- **Ziel:** Dokumentation der Testergebnisse und Vorbereitung für Abnahme durch den User.
