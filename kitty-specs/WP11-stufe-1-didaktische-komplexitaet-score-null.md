# Work Package 11: Stufe 1 Didaktische Komplexitätsgrenze (Score = 0)

**ID:** `WP11`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Background & Didactic Objectives

In Reading Level 1 (*Einzelwort-Entdecker*), children decode their very first words letter by letter. Any phonological irregularity or hurdle—such as diphthongs (`au`, `ei`, `eu`, `äu`, `ie`), simple umlauts (`ä`, `ö`, `ü`), or lengthening-h (`Dehnungs-h`)—increases cognitive load and can hinder initial reading success.

Under the WP07 didactic scoring matrix:
- Diphthongs, simple umlauts, and Dehnungs-h contribute `+1` penalty point (`calculateWordComplexity = 1`).
- Completely regular phonemes (e.g. `Hut`, `Rose`, `Tor`, `Bus`, `Oma`, `Mama`, `Ruf`, `Limo`, `Name`) receive a complexity score of `0`.

Previously, Level 1 permitted words with complexity score `score <= 1`.
**New Objective:** Level 1 target words for the child must strictly have a complexity score of **exactly 0** (`score === 0`). Words with `score >= 1` (including `Auto`, `Baum`, `Tür`, `Reh`) are no longer eligible as Level 1 child target words.

---

## 2. Technical Specification

### 2.1 Tokenizer Word Selection (`src/lib/utils/tokenizer.ts`)
- In `selectLevelWordIndices`, update the Level 1 cutoff:
  - Previously: `bestBaseScore <= 1`
  - Updated: `bestBaseScore <= 0` (or `bestBaseScore === 0`)
  - If no word in a sentence achieves a base complexity score of 0, no child word is selected and the sentence is read entirely by the app (`role: "app"`).

### 2.2 Level Validator Rule (`src/lib/utils/levelValidator.ts`)
- In `validateWordForLevel`:
  - When `level === 1`, reject words where `calculateWordComplexity(clean, syllables) > 0` (previously `> 1`).
  - Error reason: `"Wort \"${word}\" hat eine zu hohe Komplexität für Level 1 (Score > 0)."`

### 2.3 Test Suite & Acceptance Verification (`src/lib/utils/*.test.ts`)
- Update `levelValidator.test.ts`:
  - Assert that score-0 words (`Hut`, `Rose`, `Tor`) pass.
  - Assert that score-1 words (`Auto`, `Baum`, `Tür`, `Reh`) are rejected in Level 1.
- Update `tokenizer.test.ts`:
  - Verify that Level 1 candidate selection skips words with score 1 (`Baum`) and only selects score 0 words.

---

## 3. Acceptance Criteria

- [x] `validateWordForLevel(word, syl, 1)` returns `isValid: true` ONLY for words with `calculateWordComplexity === 0`.
- [x] Words with score 1 (e.g., `Auto`, `Baum`, `Tür`) are marked invalid for Level 1 child words.
- [x] `tokenizeStory` for Level 1 selects child words with `bestBaseScore === 0`. Sentences without score-0 words fallback to `role: "app"`.
- [x] All Vitest tests pass without regressions (`npm test`).
- [x] Production build succeeds (`npm run build`).

---

## 4. Technical Evidence Vorgabe
- Vitest execution logs verifying Level 1 score-0 cutoff and score-1 rejection.
- TypeScript build verification log.
