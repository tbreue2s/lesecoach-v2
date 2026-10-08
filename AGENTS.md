# Project Guidelines & Agent Rules

## 1. Language & Coding Standards
- **Code Language:** English only. All variable names, functions, classes, interfaces, types, and file names must be in English.
- **Code Comments & Docstrings:** English only.
- **Git Commits:** All git commit messages, branch names, and PR titles/descriptions must be in English (e.g., following Conventional Commits). Commits must NOT be made automatically after raw code generation; they should only be made after tests pass, technical evidence is gathered, and the user gives approval (during the `accept` / `merge` stage) to keep the git history clean.
- **Communication:** Conversations with the user can take place in German (or the user's preferred language), but all code artifacts, internal documentation within code, commit messages, and technical specs written in code must strictly remain in English.

## 2. Architecture & Stack
- **Framework:** Svelte + Vite (TypeScript)
- **PWA:** `vite-plugin-pwa`
- **Speech Integration:** Web Speech API (SpeechSynthesis & SpeechRecognition)
- **Styling:** Vanilla CSS / Modern CSS variables and design tokens
- **Target Audience:** 1st and 2nd grade elementary school students (German reading coach)

## 3. Git Strategy & Spec-Kitty Workflow
- **Trunk-Based Development:** All development is done directly on the main/master branch. No feature branch overhead.
- **Commit Policy:** Commits must NOT be made automatically during raw code generation or task iterations. The working tree remains uncommitted while a work package is in progress (`plan` -> `tasks`).
- **Atomic Commits:** Exactly 1 clean, atomic commit (using Conventional Commits, e.g. `feat(WP01): ...`) is created on the main branch upon reaching the `accept` / `merge` phase, after automated tests pass, technical evidence is recorded in `kitty-specs/evidence/`, and the user gives explicit approval.
- **Spec-Kitty State Machine:** `spec` -> `plan` -> `tasks` -> `in_review` -> `accept` -> `merge`.
