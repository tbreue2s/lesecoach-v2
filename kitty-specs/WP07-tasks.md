# Tasks: Work Package 07 – Tokenizer Refactoring (Didaktischer Schiedsrichter)

**ID:** `WP07-TASKS`  
**Parent Spec:** [WP07-tokenizer-refactor.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP07-tokenizer-refactor.md)  
**Lifecycle Status:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` (mit Evidence) ➔ `accept` (done) ➔ `merge`

---

## Task-Übersicht

```
[Task 1: Penalty-Scoring-System (calculateWordComplexity)]
      │
      ▼
[Task 2: Level 1 & Level 2 Selektions-Logik implementieren]
      │
      ▼
[Task 3: Eigennamen-Limitierung integrieren]
      │
      ▼
[Task 4: UX: Input-Debounce für Namenseingabe]
      │
      ▼
[Task 5: Unit Tests & Evidence]
```

---

## Detaillierte Aufgabenpakete

### Task 1: Penalty-Scoring-System (`calculateWordComplexity`)
- **Ziel:** Refactoring der Tokenizer-Filterlogik von Boolean-Blacklist zu einem Penalty-Score.
- **Details:**
  - Implementiere `calculateWordComplexity(word: string, syllables: string[]): number`.
  - Logik-Punkte vergeben für Killer (+10), Schwer (+3), Mittel (+2), Leicht (+1).
  - Einbau in den `tokenizer.ts`.

### Task 2: Level 1 & Level 2 Selektions-Logik
- **Ziel:** Die Wortauswahl an das neue Scoring anpassen.
- **Details:**
  - **Level 1:** Finde das Wort mit dem niedrigsten Score. Wenn `lowestScore >= 5`, wird der Satz komplett der App-Rolle zugewiesen.
  - **Level 2:** Finde Bigramme (`i` und `i+1`) bestehend aus `[Artikel/Adjektiv + Nomen]`. Berechne Gesamt-Score. Nur erlauben, wenn Summe der Silben `<= 4`. Wähle das Paar mit dem niedrigsten Gesamt-Score.

### Task 3: Eigennamen-Limitierung (Kind & Begleiter)
- **Ziel:** Vermeidung von repetitiver Nennung des Kind-Namens als Lese-Aufgabe.
- **Details:**
  - Tracking der bereits gelesenen Wörter im Tokenizer-State.
  - Wenn `word === childName` oder `word === companionName` UND bereits vorher zugewiesen, addiere `+100` zum Score.

### Task 4: UX-Verbesserung (Input-Debounce)
- **Ziel:** Verhindern einer sofortigen Fehleranzeige bei der Texteingabe im Profil.
- **Details:**
  - Füge einen Debounce von `1500ms` für das Profil-Setup Formular hinzu, bevor Validierungsfehler gerendert werden.

### Task 5: Unit Tests & Evidence
- **Ziel:** Absicherung des Refactorings.
- **Details:**
  - Tests für `calculateWordComplexity` mit verschiedenen Wort-Typen.
  - Tests für Level 1 & Level 2 Selektion mit Penalty-Score.
  - Tests für Eigennamen-Limitierung.
