# Tasks: Work Package 08 – Level-basierte Text-Generierung & Prompt-Templates (WP-StoryGen)

**ID:** `WP08-TASKS`  
**Parent Spec:** [WP08-story-gen.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP08-story-gen.md)  
**Lifecycle Status:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` (mit Evidence) ➔ `accept` (done) ➔ `merge`

---

## Task-Übersicht

```
[Task 1: Definition der Prompt-Templates (Level 1-9)]
      │
      ▼
[Task 2: Generator-Service / Mock-Integration]
      │
      ▼
[Task 3: Theme- & Charakter-Picker UI-Grid]
      │
      ▼
[Task 4: Integration in den Story-Flow]
      │
      ▼
[Task 5: Unit Tests & Evidence]
```

---

## Detaillierte Aufgabenpakete

### Task 1: Definition der Prompt-Templates (Level 1-9)
- **Ziel:** Erstellung deterministischer Anweisungen zur LLM-Textgenerierung.
- **Details:**
  - `Level 1`: Template zwingt auf 4 Sätze, 4-5 Wörter, nur Hauptsätze (S-P-O), inkludiert Basissubstantive.
  - `Level 2`: Template zwingt auf 4-5 Sätze, inkludiert Nomen-Phrasen.
  - `Level 4-5`: Template definiert abwechselnde Struktur (Kind-Satz 3-5 Wörter, App-Satz 6-8 Wörter).
  - `Phase C (7-9)`: Template definiert Länge (~30, ~60, 100+ Wörter).

### Task 2: Generator-Service
- **Ziel:** Logik zur Kombination von Template, Thema, Kind, und Begleiter-Namen.
- **Details:**
  - `generateStoryPrompt(level, theme, childName, companionName)` erstellt den finalen String.
  - Vorerst als Mock-Generator ausführen, der deterministisch Texte ausgibt, passend zu den Prompt-Regeln.

### Task 3: Theme- & Charakter-Picker UI-Grid
- **Ziel:** Visuelles Menü für die Abenteuer-Zusammenstellung.
- **Details:**
  - Ein Grid mit Icons (Wald 🌲, Zauberer 🧙, Dinos 🦕, etc.).
  - Auswahl des Themas updatet den State.

### Task 4: Integration in den Story-Flow
- **Ziel:** Verbindung von UI und Generator.
- **Details:**
  - Nach Auswahl von Thema im UI, wird das Generator-Objekt aufgerufen.
  - Das Ergebnis (Story-Text) wird an den Tokenizer (aus WP07) übergeben.

### Task 5: Unit Tests & Evidence
- **Ziel:** Absicherung der Generator-Logik.
- **Details:**
  - Tests für Prompt-String-Generierung mit korrekten Injektionen von Variablen.
  - Tests für korrekte Weitergabe der UI-Parameter an den Generator.
