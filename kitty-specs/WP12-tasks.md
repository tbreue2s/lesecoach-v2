# Tasks: Work Package 12 – Stufengerechte & Skalierende Geschichten-Generierung

**ID:** `WP12-TASKS`  
**Parent Spec:** [WP12-didaktische-geschichten-skalierung-und-vokabular-differenzierung.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP12-didaktische-geschichten-skalierung-und-vokabular-differenzierung.md)  
**Lifecycle Status:** `tasks`

---

## Task Overview

```
[Task 1: Reading Level Info Updates (Word Limits & Descriptions) in readingLevels.ts]
      │
      ▼
[Task 2: Story Validation Refinement (Child Word Availability vs. App Text) in levelValidator.ts]
      │
      ▼
[Task 3: Prompt Templates Scaling & Vocabulary Instructions in promptTemplates.ts]
      │
      ▼
[Task 4: Mock Story Templates Upgrade (Enhanced Stories for Levels 1-9) in mockStoryGenerator.ts]
      │
      ▼
[Task 5: Vitest Unit Tests & Regression Suite]
      │
      ▼
[Task 6: Technical Evidence & Review Verification]
```

---

## Detailed Tasks

### Task 1: Update Reading Level Constraints (`src/lib/data/readingLevels.ts`)
- Passen Sie die Wortgrenzen (`totalStoryWordsMin`, `totalStoryWordsMax`) und Beschreibungen für die Stufen 1 bis 9 an, um die stetige Längenskalierung abzubilden.

### Task 2: Refine Story Validation Logic (`src/lib/utils/levelValidator.ts`)
- Überarbeiten Sie `validateStoryForLevel`:
  - Erlauben Sie anspruchsvollere Vorlesewörter für die App.
  - Verifizieren Sie didaktisch, dass jeder für das Kind vorgesehene Satz mindestens ein geeignetes Kind-Zielwort (in Level 1: `score === 0`) enthält.

### Task 3: Update LLM Prompt Templates (`src/lib/utils/promptTemplates.ts`)
- Überarbeiten Sie `getLevelPromptRules`:
  - Klare Trennung: App darf komplexe Wörter flüssig vorlesen; im Satz müssen jedoch einfache Zielwörter für das Kind vorkommen.
  - Aktualisierte Längenskalierung je Stufe (von 4-5 Sätzen in Stufe 1 bis zu 16-20+ Sätzen in Stufe 9).
  - Anweisung zur spannenden narrativen Begleiter-Einbindung.

### Task 4: Upgrade Mock Story Generator (`src/lib/utils/mockStoryGenerator.ts`)
- Erweitern und verbessern Sie die Geschichten-Templates für alle Themen (Wald, Zauberer, Dinos, Weltraum etc.) für alle Stufen.
- Stellen Sie sicher, dass in Stufe 1 jeder Satz ein Score-0-Zielwort für das Kind hat, während der Vorlese-Kontext reichhaltiger formuliert ist.

### Task 5: Vitest Unit Tests
- Aktualisieren und erweitern Sie Tests in `src/lib/utils/mockStoryGenerator.test.ts`, `src/lib/utils/promptTemplates.test.ts` und `src/lib/utils/levelValidator.test.ts`.
- Vollständigen Testlauf ausführen (`npm test`).

### Task 6: Technical Evidence & Review
- Nachweise in `kitty-specs/evidence/WP12/evidence-wp12.md` ablegen.
- Status auf `in_review` aktualisieren.
