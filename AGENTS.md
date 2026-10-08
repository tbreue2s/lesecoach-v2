# Project Guidelines & Agent Rules

## 1. Language & Coding Standards
- **Code Language:** English only. All variable names, functions, classes, interfaces, types, and file names must be in English.
- **Code Comments & Docstrings:** English only.
- **Git Commits:** All git commit messages, branch names, and PR titles/descriptions must be in English (e.g., following Conventional Commits).
- **Communication:** Conversations with the user can take place in German (or the user's preferred language), but all code artifacts, internal documentation within code, commit messages, and technical specs written in code must strictly remain in English.

## 2. Architecture & Stack
- **Framework:** Svelte + Vite (TypeScript)
- **PWA:** `vite-plugin-pwa`
- **Speech Integration:** Web Speech API (SpeechSynthesis & SpeechRecognition)
- **Styling:** Vanilla CSS / Modern CSS variables and design tokens
- **Target Audience:** 1st and 2nd grade elementary school students (German reading coach)

## 3. Spec-Kitty Workflow
- Follow the lifecycle state machine for all work packages: `spec` -> `plan` -> `tasks` -> `in_review` -> `accept` -> `merge`.
- Technical evidence (tests, logs, snapshots) must be provided in `kitty-specs/` before moving to `in_review` / `accept`.
