# Tasks: Work Package 11 – Stufe 1 Didaktische Komplexitätsgrenze (Score = 0)

**ID:** `WP11-TASKS`  
**Parent Spec:** [WP11-stufe-1-didaktische-komplexitaet-score-null.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP11-stufe-1-didaktische-komplexitaet-score-null.md)  
**Lifecycle Status:** `merged`

---

## Task Overview

```
[Task 1: Update Level 1 Threshold in levelValidator.ts]
      │
      ▼
[Task 2: Update Level 1 Selection Cutoff in tokenizer.ts]
      │
      ▼
[Task 3: Adapt & Expand Vitest Unit Tests]
      │
      ▼
[Task 4: Full Regression Suite & TypeScript Build]
      │
      ▼
[Task 5: Technical Evidence & Review Verification]
```

---

## Detailed Tasks

### Task 1: Update Level 1 Threshold in `src/lib/utils/levelValidator.ts`
- Change `calculateWordComplexity(clean, syllables) > 1` to `> 0`.
- Update error message reason to reflect `Score > 0`.

### Task 2: Update Level 1 Selection Cutoff in `src/lib/utils/tokenizer.ts`
- In `selectLevelWordIndices`, change `bestBaseScore <= 1` to `bestBaseScore <= 0` (or `bestBaseScore === 0`).
- Ensure sentences without any score-0 candidate words are assigned entirely to the app (`role: "app"`).

### Task 3: Adapt & Expand Vitest Unit Tests
- In `src/lib/utils/levelValidator.test.ts`:
  - Verify `Hut`, `Rose`, `Tor` pass for Level 1.
  - Verify `Auto` (diphthong, score 1) is rejected for Level 1.
- In `src/lib/utils/tokenizer.test.ts`:
  - Update Level 1 scoring test cases to reflect that words with score 1 are not selected.
  - Verify sentences with only score-0 words select the child token, whereas sentences without score-0 words remain app-only.

### Task 4: Full Regression Suite & TypeScript Build
- Run `npm test`.
- Run `npm run build`.

### Task 5: Technical Evidence & Review Verification
- Create evidence record at `kitty-specs/evidence/WP11/evidence-wp11.md`.
- Mark lifecycle status as `in_review`.
