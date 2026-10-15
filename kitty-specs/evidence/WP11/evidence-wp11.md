# Technical Evidence: Work Package 11 (Stufe 1 Didaktische Komplexitätsgrenze: Score = 0)

**WP-ID:** `WP11`  
**Datum:** 2026-10-15  
**Status:** `in_review`  
**Test-Ergebnis:** 15 Test-Suites, 136 Tests erfolgreich bestanden (100% grün).

---

## 1. Ziel & Zusammenfassung

Ziel von WP11 war die didaktische Verschärfung der Komplexitätsgrenze für Zielwörter des Kindes in Lese-Stufe 1 (*Einzelwort-Entdecker*).

Bisher durften Zielwörter in Stufe 1 eine Komplexitätsstrafe von `score <= 1` aufweisen. Dadurch konnten Wörter mit leichten Hürden wie Diphthongen (`Auto`, `Baum`, `Heu`), einfachen Umlauten (`Tür`) oder Dehnungs-h (`Reh`) dem Erstleser als Zielwort zugewiesen werden.

**Neue Anforderung:**
- In Stufe 1 darf die didaktische Komplexität für das Kind **ausschließlich 0** betragen (`score === 0`).
- Wörter mit `score >= 1` dürfen für das Kind in Stufe 1 nicht mehr ausgewählt werden.
- Wörter mit `score === 0` sind ausschließlich lautgetreue Wörter ohne Konsonanten-Cluster, ohne Doppelkonsonanten, ohne Diphthonge und ohne Umlaute/Dehnungs-h (z. B. `Hut`, `Rose`, `Tor`, `Bus`, `Oma`, `Mama`, `Ruf`, `Mut`, `Wal`, `Rad`).

---

## 2. Technische Umsetzung

### 2.1 Level-Validator (`src/lib/utils/levelValidator.ts`)
- In `validateWordForLevel` wurde die Bedingung für Stufe 1 angepasst:
  ```typescript
  // Level 1: Strict didactic complexity score threshold (score === 0)
  if (level === 1) {
    if (calculateWordComplexity(clean, syllables) > 0) {
      return {
        isValid: false,
        reason: `Wort "${word}" hat eine zu hohe Komplexität für Level 1 (Score > 0).`,
      };
    }
  }
  ```

### 2.2 Tokenizer (`src/lib/utils/tokenizer.ts`)
- In `selectLevelWordIndices` für Stufe 1:
  - Kandidatenfilter verschärft auf `if (baseScore > 0) continue;`.
  - Harter Cutoff: `if (bestIndex !== null && bestBaseScore === 0 && lowestSelectionScore < 50)`.
  - Sätze ohne echtes Score-0-Wort werden vollständig der App zugewiesen (`role: "app"`).

### 2.3 Mock Story Generator (`src/lib/utils/mockStoryGenerator.ts`)
- Die Stufe-1-Story-Templates aller 10 Themen wurden so überarbeitet, dass stets echte Score-0-Zielwörter (`Hut`, `Tor`, `Hof`, `Wal`, `Rad`, `Mut`, `Ruf`, `Ufo`) enthalten sind.

---

## 3. Testprotokoll (Vitest Suite)

In `src/lib/utils/levelValidator.test.ts` und `src/lib/utils/tokenizer.test.ts` wurden dedizierte Tests angepasst und verifiziert:
1. `validateWordForLevel`:
   - `Hut`, `Rose`, `Tor` (Score 0) sind valide (`isValid: true`).
   - `Auto` (Diphthong, Score 1) wird in Stufe 1 abgewiesen (`isValid: false`).
2. `tokenizeStory`:
   - `'Ein schöner Hut liegt im Park.'` wählt `'Hut'` als Kind-Zielwort.
   - `'Ein schöner Baum steht im Park.'` (Score 1 für Baum) wird übersprungen (`childTokens: 0`, `role: "app"`).
3. `mockStoryGenerator.test.ts`:
   - Alle 10 Themen-Generierungen erfüllen die strikten Stufe-1-Regeln mit echten Score-0-Zielwörtern.

```
 RUN  v2.1.9 /home/thomas/projects/lesecoach-v2

 ✓ src/lib/services/speechRecognitionService.test.ts (8)
 ✓ src/lib/services/storyGeneratorService.test.ts (3)
 ✓ src/lib/stores/profileStore.test.ts (5)
 ✓ src/lib/stores/readingSessionStore.test.ts (7)
 ✓ src/lib/stores/routerStore.test.ts (2)
 ✓ src/lib/stores/storyConfigStore.test.ts (3)
 ✓ src/lib/utils/charMapper.test.ts (6)
 ✓ src/lib/utils/levelValidator.test.ts (11)
 ✓ src/lib/utils/mockStoryGenerator.test.ts (15)
 ✓ src/lib/utils/promptTemplates.test.ts (12)
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/utils/syllableSplitter.test.ts (5)
 ✓ src/lib/utils/tokenizer.test.ts (29)
 ✓ src/lib/utils/validation.test.ts (8)

 Test Files  15 passed (15)
      Tests  136 passed (136)
   Duration  2.33s
```

## 4. Production Build

```
> lesecoach-v2@0.1.0 build
> vite build

vite v5.4.21 building for production...
✓ 151 modules transformed.
dist/registerSW.js                0.14 kB
dist/manifest.webmanifest         0.42 kB
dist/index.html                   1.14 kB │ gzip:  0.59 kB
dist/assets/index-CO_xV2Mn.css   32.51 kB │ gzip:  5.45 kB
dist/assets/index-B9NwkVcE.js   130.65 kB │ gzip: 45.90 kB
✓ built in 650ms

PWA v2.0.0
mode      generateSW
precache  7 entries (162.01 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
```
