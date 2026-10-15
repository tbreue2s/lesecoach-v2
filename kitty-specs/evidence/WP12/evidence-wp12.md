# Technical Evidence: Work Package 12 (Stufengerechte & Skalierende Geschichten-Generierung)

**WP-ID:** `WP12`  
**Datum:** 2026-10-15  
**Status:** `in_review`  
**Test-Ergebnis:** 15 Test-Suites, 140 Tests erfolgreich bestanden (100% grün).

---

## 1. Ziel & Zusammenfassung

Ziel von WP12 war die didaktische Weiterentwicklung der Geschichten-Generierung und Story-Validierung für alle 9 Lese-Stufen:

1. **Wortschatz-Differenzierung (Kind-Zielwörter vs. App-Vorlesetext):**
   - Beim gemeinsamen Lesen darf die App anspruchsvollere, atmosphärisch reichere Wörter flüssig vorlesen.
   - Einzige didaktische Bedingung: Im Text bzw. in den Sätzen müssen **genügend einfache Zielwörter für das Kind** vorhanden sein, die exakt den didaktischen Kriterien der jeweiligen Stufe (z.B. Komplexität = 0 in Stufe 1, Wortpaare in Stufe 2, Halbsätze in Stufe 3) entsprechen.
   - Vorlese-Wörter der App blockieren die Story-Validierung (`validateStoryForLevel`) nicht mehr pauschal.
2. **Längenskalierung & didaktische Progression:**
   - Geschichten wachsen von Stufe zu Stufe (Stufe 1 mit 4 Sätzen / ~16-22 Wörtern bis zu Stufe 9 mit 14-16+ Sätzen / 130-160+ Wörtern).
   - Stufe 6 (*Solo-Pionier*) besitzt nun eigene, dedizierte 6-Satz-Vorlagen (5–7 Wörter pro Satz) für das vollständige Selbstlesen.
3. **Optimierte Prompt-Templates & Begleiter-Einbindung:**
   - LLM-Prompts instruieren das Modell klar über die Differenzierung zwischen Vorlese- und Kind-Wortschatz sowie lebendige Interaktion mit dem gewählten Begleiter.

---

## 2. Technische Umsetzung

### 2.1 Story-Validierung ([`src/lib/utils/levelValidator.ts`](file:///home/thomas/projects/lesecoach-v2/src/lib/utils/levelValidator.ts))
- `validateStoryForLevel` prüft nicht mehr pauschal jedes Wort des gesamten Fließtextes auf Level-1-Restriktionen.
- Stattdessen wird die Tokenisierung herangezogen:
  - In Stufe 1 wird verifiziert, dass jeder Satz mindestens ein valides Zielwort mit Komplexitäts-Score `0` für das Kind enthält (`role: 'child'`).
  - Vorlese-Wörter der App (`role: 'app'`) dürfen komplexere Phoneme und Wortstrukturen nutzen.

### 2.2 LLM Prompt-Templates ([`src/lib/utils/promptTemplates.ts`](file:///home/thomas/projects/lesecoach-v2/src/lib/utils/promptTemplates.ts))
- `getLevelPromptRules` wurde mit didaktischen Hinweisen zur Differenzierung Vorlese- vs. Kind-Wortschatz und spannender Handlung mit dem Begleiter für alle Stufen 1 bis 9 erweitert.

### 2.3 Mock Story Generator ([`src/lib/utils/mockStoryGenerator.ts`](file:///home/thomas/projects/lesecoach-v2/src/lib/utils/mockStoryGenerator.ts))
- Einführung von dedizierten `LEVEL_6_TEMPLATES` für alle 10 Themen (Wald, Zauberer, Pferde, Einhörner, Superhelden, Meer, Schatzsuche, Piraten, Dinosaurier, Weltall).

### 2.4 ReaderScreen Live-Generierung bei Stufenwechsel ([`src/lib/components/screens/ReaderScreen.svelte`](file:///home/thomas/projects/lesecoach-v2/src/lib/components/screens/ReaderScreen.svelte))
- Bei Wechsel der Lesestufe direkt im Reader (über ◀ / ▶ oder das Dropdown) wird nun automatisch `storyConfigStore.startAdventure()` aufgerufen, sodass sofort die neue, stufengerechte Geschichte geladen und angezeigt wird.

---

## 3. Testprotokoll (Vitest Suite)

In `src/lib/utils/levelValidator.test.ts`, `src/lib/utils/mockStoryGenerator.test.ts` und `src/lib/utils/promptTemplates.test.ts` wurden neue Testfälle implementiert:
1. `validateStoryForLevel`:
   - Erlaubt komplexe Wörter im App-Vorlesetext in Stufe 1, sofern in jedem Satz ein Score-0-Zielwort für das Kind existiert (`isSuitable: true`).
   - Schlägt fehl (`isSuitable: false`), wenn in einem Satz kein geeignetes einfaches Kind-Zielwort vorhanden ist.
2. `mockStoryGenerator.test.ts`:
   - Generiert dedizierte 6-Satz-Geschichten für Stufe 6 mit 5–7 Wörtern pro Satz und vollständiger Kind-Rolle.
   - Skaliert Textlängen konsistent von Stufe 1 bis Stufe 9.
3. `promptTemplates.test.ts`:
   - Verifiziert die didaktischen Differenzierungsanweisungen (Vorlese- vs. Kind-Wortschatz).

```
 RUN  v2.1.9 /home/thomas/projects/lesecoach-v2

 ✓ src/lib/services/speechRecognitionService.test.ts (8)
 ✓ src/lib/services/storyGeneratorService.test.ts (3)
 ✓ src/lib/stores/profileStore.test.ts (5)
 ✓ src/lib/stores/readingSessionStore.test.ts (7)
 ✓ src/lib/stores/routerStore.test.ts (2)
 ✓ src/lib/stores/storyConfigStore.test.ts (3)
 ✓ src/lib/utils/charMapper.test.ts (6)
 ✓ src/lib/utils/levelValidator.test.ts (13)
 ✓ src/lib/utils/mockStoryGenerator.test.ts (16)
 ✓ src/lib/utils/promptTemplates.test.ts (13)
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/utils/syllableSplitter.test.ts (5)
 ✓ src/lib/utils/tokenizer.test.ts (29)
 ✓ src/lib/utils/validation.test.ts (8)

 Test Files  15 passed (15)
      Tests  140 passed (140)
   Duration  2.35s
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
dist/assets/index-B1icLcRO.js   134.17 kB │ gzip: 46.81 kB
✓ built in 656ms

PWA v2.0.0
mode      generateSW
precache  7 entries (165.50 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
```
