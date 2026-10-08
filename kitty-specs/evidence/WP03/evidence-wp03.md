# Evidence: Work Package 03 – State-Management & Didaktische Lese-Stufen (9-Stufen-Matrix)

**Work Package:** `WP03`  
**Datum:** 2026-10-08  
**Status:** `in_review`  
**Test-Ergebnis:** 13 Test-Suites, 90 Tests erfolgreich bestanden (100% grün).

---

## 1. Übersicht der umgesetzten Architektur & Didaktischen Regeln

### 1.1 Level 1 – Einzelwort-Regeln (`role: 'child'`)
- Genau 1 Zielwort pro Satz fürs Kind.
- **Wortart:** Ausschließlich Nomen (Großgeschrieben) oder finite Vollverben.
- **Strikte Verbote:**
  - Keine isolierten Verbzusätze / Partikeln (z. B. *"her"*, *"hin"*, *"auf"*, *"mit"*, *"ab"*).
  - Keine Genitiv-Formen (z. B. *"Pferdes"*, *"des"*).
  - Keine Wörter mit Dehnungs-h (*"Mähne"*, *"Zahn"*, *"Kuh"*) oder komplexen Anfangsclustern (*"Pferd"*, *"Schaf"*, *"Straße"*).
  - Maximal 2 Silben pro Wort.

### 1.2 Level 2 – Wortpaar-Regeln (`role: 'child'`)
- Genau 2 Wörter pro Satz.
- **Harte Adjazenz-Pflicht:** Die beiden Wörter folgen im Satz immer unmittelbar aufeinander (Indizes $i$ und $i+1$).
- **Harte Phrasen-Pflicht:** Ausschließlich grammatikalische Nomen-Phrasen:
  - `[Artikel + Nomen]` (z. B. *"die Wiese"*, *"ein Apfel"*, *"den Pfad"*)
  - `[Adjektiv + Nomen]` (z. B. *"grüne Wiese"*, *"roten Apfel"*, *"rotes Auto"*)
- **Silben-Budget:** Maximal 4 Silben in Summe, kein Einzelwort mit $\ge 3$ Silben.
- **UI-Darstellung:** Wortpaare werden optisch in einer zusammenhängenden, einheitlichen Box gerendert (durchgehendes Border-Radius- und Rand-Styling).

### 1.3 Phasen-Matrix Übersicht
- **Phase A (Level 1–3):** Zweifarbiges Silben-Scaffolding (#2B6CB0 blau, #C53030 rot, Einsilber blau). Striktes Verbot von $\ge 4$-Silbern.
- **Phase B (Level 4–6):** Standardmäßig Buchtext, dynamische Silbenhilfe auf Abruf/Hänger; Repeated Reading aktiv bei Level 5 & 6.
- **Phase C (Level 7–9):** Freies Lesen zusammenhängender Geschichten (25–150+ Wörter).

---

## 2. Testprotokoll (Vitest Suite)

```
 RUN  v2.1.9 /home/thomas/projects/lesecoach-v2

 ✓ src/lib/utils/tokenizer.test.ts (14)
 ✓ src/lib/utils/levelValidator.test.ts (9)
 ✓ src/lib/stores/readingSessionStore.test.ts (7)
 ✓ src/lib/services/speechRecognitionService.test.ts (8)
 ✓ src/lib/stores/profileStore.test.ts (5)
 ✓ src/lib/stores/routerStore.test.ts (2)
 ✓ src/lib/stores/storyConfigStore.test.ts (3)
 ✓ src/lib/utils/charMapper.test.ts (6)
 ✓ src/lib/utils/mockStoryGenerator.test.ts (3)
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/utils/syllableSplitter.test.ts (5)
 ✓ src/lib/utils/validation.test.ts (6)

 Test Files  13 passed (13)
      Tests  90 passed (90)
```

---

## 3. Production Build Nachweis

```
> lesecoach-v2@0.1.0 build
> vite build

vite v5.4.21 building for production...
✓ 151 modules transformed.
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.42 kB
dist/index.html                   1.13 kB │ gzip:  0.59 kB
dist/assets/index-CO_xV2Mn.css   32.51 kB │ gzip:  5.45 kB
dist/assets/index-BGBXbnv7.js   111.02 kB │ gzip: 38.01 kB
✓ built in 690ms
```

---

## 4. Fazit
Die didaktischen Vorgaben für Level 1 & 2 wurden vollständig korrigiert, validiert und testtechnisch nachgewiesen.
