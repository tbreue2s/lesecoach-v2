# Tasks: Work Package 10 – Name Length Restriction & Prompt Injection Guard

**ID:** `WP10-TASKS`  
**Parent Spec:** [WP10-name-length-limit-prompt-injection-guard.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP10-name-length-limit-prompt-injection-guard.md)  
**Lifecycle Status:** `merged`

---

## Task Overview

```
[Task 1: MAX_NAME_LENGTH = 20 & Error Message in validation.ts]
      │
      ▼
[Task 2: UI Input Limits (maxlength=20) in ProfileSetup.svelte]
      │
      ▼
[Task 3: Defense-in-Depth Sanitization in promptTemplates.ts]
      │
      ▼
[Task 4: Unit Tests for 20-char validation & Prompt Protection]
      │
      ▼
[Task 5: Technical Evidence & Review Verification]
```

---

## Detailed Tasks

### Task 1: Update Validation Constraints (`src/lib/utils/validation.ts`)
- Set `MAX_NAME_LENGTH = 20`.
- Verify error message outputs `${MAX_NAME_LENGTH}` (20).

### Task 2: Update UI Input Elements (`src/lib/components/ProfileSetup.svelte`)
- Update `maxlength={20}` for child name input.
- Update `maxlength={20}` for custom companion name input.

### Task 3: Defense-in-Depth in Prompt Templates (`src/lib/utils/promptTemplates.ts`)
- In `buildStoryPrompt`, ensure `childName` and `companionName` are clamped to max 20 characters.

### Task 4: Unit Tests & Regression Verification
- In `src/lib/utils/validation.test.ts`:
  - Assert 20-character valid names pass.
  - Assert 21-character names fail with max 20 error.
  - Test injection attempts (e.g. system commands, script tags) fail.
- In `src/lib/utils/promptTemplates.test.ts`:
  - Assert names exceeding 20 characters are clamped to 20 chars in the prompt.
- Run complete test suite (`npm test`).

### Task 5: Technical Evidence & Review
- Record execution and test evidence in `kitty-specs/evidence/WP10/evidence-wp10.md`.
- Update lifecycle status to `in_review`.
