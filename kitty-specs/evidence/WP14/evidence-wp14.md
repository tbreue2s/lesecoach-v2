# Technical Evidence: Work Package 14 – Ergonomisches Kinder-UI & Lesefluss-Redesign

**Work Package:** `WP14`  
**Status:** `in_review`  
**Date:** 2026-10-17  

---

## 1. Scope & Objective

Work Package 14 addresses child-centric UX, visual calm, button ergonomics, and reading flow for 1st and 2nd graders:
1. **Screen Consolidation:** Reduced from 4 routes to 3 dedicated screens (`home`, `reader`, `settings`). `adventure-setup` was merged into `home` as the unified story selection deck.
2. **Button Reduction:** In the reading interface, children see at most 3 clear, tactile action buttons (`🔊 Vorlesen / Pause`, `💡 Silben-Hilfe`, `👉 Wort weiter`). Technical test buttons (`[Dev: Simuliere Wort]`, `Satz geschafft`) are tucked into a collapsible `🛠️` developer drawer while preserving their full DOM IDs for test runners.
3. **Always-Visible Action Bars:** Built a `100dvh` flex-shell for `ReaderScreen` where the top navigation and bottom action dock are fixed, leaving the middle story canvas scrollable. On `HomeScreen` and `ProfileSetup`, the primary action button is fixed in a sticky bottom footer.
4. **Teleprompter Auto-Scroll & Reading Focus:** In `ReadingSessionView`, the active sentence automatically centers in the viewport on turn/sentence advance (`scrollIntoView({ behavior: 'smooth', block: 'center' })`). Active sentences are highlighted while previous and upcoming sentences are visually dimmed (`opacity: 0.45` / `0.55`) so young readers never lose their place.

---

## 2. Verified Changes

### 2.1 Route Consolidation (`routerStore.ts` & `App.svelte`)
- `goToAdventureSetup()` and `navigate('adventure-setup')` redirect directly to `'home'`.
- `App.svelte` configures a dedicated `.reader-mode` viewport with `height: 100dvh` and zero edge padding for full-bleed docking.

### 2.2 HomeScreen Compact Redesign (`HomeScreen.svelte`)
- Merged the 3 previously stacked header cards into one slim top-bar containing companion avatar, child name, voice greeting button (`🔊`), level selector toggle, and settings button (`⚙️`).
- Directly below sits the 10-theme grid.
- Anchored `#start-reading-btn` in a `position: sticky; bottom: 0.5rem` dock.

### 2.3 100dvh Reader App-Shell (`ReaderScreen.svelte`)
- Unified header bar combining `← Themen`, stepper buttons (`#prev-level-btn`, `#toggle-level-btn`, `#next-level-btn`), companion icon, and live star count (`⭐`).
- Middle scrollable reading canvas (`.reading-scroll-stage`) with smooth vertical scroll.
- Bottom docked control bar hosting `<MockReadingControls />`.

### 2.4 Teleprompter Auto-Scroll & Focus Mode (`ReadingSessionView.svelte`)
- Auto-scroll triggers smoothly whenever `session.activeSentenceIndex` changes.
- Dimming classes `.current-sentence`, `.completed-sentence`, and `.upcoming-sentence`.
- Bottom scroll padding (`25vh`) ensures even the last sentences comfortably center in the child's line of sight.
- English term "Repeated Reading" replaced with child-friendly German: *„🔄 Gemeinsam-Satz“*.

### 2.5 Child 3-Button Dock & Collapsible Dev Drawer (`MockReadingControls.svelte`)
- Real-time turn state banner with animated audio waves (`🦦👂 Ich höre dir zu!`) directly above the buttons.
- 3 primary buttons during reading (`🔊 Vorlesen / Pause`, `💡 Silben-Hilfe`, `👉 Wort weiter`).
- 2 big celebratory buttons when the story completes (`✨ Nächstes Abenteuer`, `🔄 Nochmal lesen`).
- Collapsible drawer for dev buttons preserving all test IDs (`#mock-simulate-correct-word-btn`, `#mock-repeat-btn`, `#mock-sentence-success-btn`, `#mock-restart-btn`, `#mock-next-story-btn`).

---

## 3. Automated Test Verification (`npm test -- --run`)

All 16 test suites (152 tests) pass with 0 failures:

```
 ✓ src/lib/utils/tokenizer.test.ts (29)
 ✓ src/lib/utils/levelValidator.test.ts (13)
 ✓ src/lib/utils/mockStoryGenerator.test.ts (16)
 ✓ src/lib/utils/promptTemplates.test.ts (13)
 ✓ src/lib/utils/generateStories.test.ts (10)
 ✓ src/lib/stores/readingSessionStore.test.ts (7)
 ✓ src/lib/utils/validation.test.ts (8)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/services/speechRecognitionService.test.ts (8)
 ✓ src/lib/utils/charMapper.test.ts (6)
 ✓ src/lib/stores/profileStore.test.ts (5)
 ✓ src/lib/stores/routerStore.test.ts (3)
 ✓ src/lib/services/storyGeneratorService.test.ts (3)
 ✓ src/lib/utils/syllableSplitter.test.ts (6)
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/stores/storyConfigStore.test.ts (3)

 Test Files  16 passed (16)
      Tests  152 passed (152)
   Duration  2.27s
```

---

## 4. Production Build Verification (`npm run build`)

Vite production build succeeds without warnings or errors:

```
> lesecoach-v2@0.1.0 build
> vite build

vite v5.4.21 building for production...
✓ 282 modules transformed.
dist/registerSW.js                0.14 kB
dist/manifest.webmanifest         0.42 kB
dist/index.html                   1.14 kB │ gzip:   0.59 kB
dist/assets/index-Cm59ZPKx.css   35.12 kB │ gzip:   6.12 kB
dist/assets/index-LRV4QSjB.js   548.94 kB │ gzip: 125.54 kB
✓ built in 903ms

PWA v2.0.0
mode      generateSW
precache  7 entries (575.36 KiB)
```
