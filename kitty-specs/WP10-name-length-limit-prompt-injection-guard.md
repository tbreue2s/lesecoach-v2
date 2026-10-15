# Work Package 10: Name Length Restriction & Prompt Injection Guard

**ID:** `WP10`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`


---

## 1. Background & Security Objectives

In the interactive story adventure mode, the child's name and the selected companion's name are dynamically interpolated into:
1. UI greetings and feedback cards.
2. The LLM story generation prompt (`buildStoryPrompt` in `promptTemplates.ts`).

To prevent prompt injection, instruction smuggling, or UI layout overflow, user-supplied names must be strictly constrained:
- **Maximum Length:** Exactly **20 characters** for both child name and companion name.
- **Strict Character Policy:** Preserved 1-word German alphabetical character regex (`^[a-zA-ZäöüÄÖÜß]+$`), rejecting spaces, newlines, digits, quotation marks, curly braces, and code symbols.
- **Defense-in-Depth:** In `promptTemplates.ts`, all interpolated name inputs are sanitized and bounded to 20 characters before template injection.

---

## 2. Technical Specification

### 2.1 Validation Logic (`src/lib/utils/validation.ts`)
- Update constant: `MAX_NAME_LENGTH = 20;` (raised from 16 to 20).
- Validation error message: `"Der Name darf maximal 20 Buchstaben haben."`
- `validateName(name: string): ValidationResult` enforces `trimmed.length <= MAX_NAME_LENGTH`.

### 2.2 Profile Setup UI (`src/lib/components/ProfileSetup.svelte`)
- Update `maxlength={20}` attribute for `#child-name-input`.
- Update `maxlength={20}` attribute for `#companion-name-input`.

### 2.3 Prompt Construction Defense-in-Depth (`src/lib/utils/promptTemplates.ts`)
- In `buildStoryPrompt`, ensure `childName` and `companionName` are clamped to max 20 characters (`slice(0, 20)`) and trimmed of whitespace.

---

## 3. Acceptance Criteria

- [x] `MAX_NAME_LENGTH` is set to 20 in `src/lib/utils/validation.ts`.
- [x] A 20-character single-word name (e.g., `"Maximilianusjosephus"`) is validated as valid (`isValid: true`).
- [x] A 21-character name is rejected (`isValid: false`) with error `"Der Name darf maximal 20 Buchstaben haben."`.
- [x] Input fields in `ProfileSetup.svelte` restrict input to `maxlength={20}`.
- [x] In `buildStoryPrompt`, names longer than 20 characters are truncated to 20 characters as defense-in-depth.
- [x] All Vitest tests pass without regressions (`npm test`).
- [x] Production build succeeds (`npm run build`).

---

## 4. Review & Evidence Vorgabe (for `in_review`)
- Vitest test report covering 20-char validation, 21-char rejection, prompt template bounding, and full regression suite.
- Build log verifying TypeScript compilation.
