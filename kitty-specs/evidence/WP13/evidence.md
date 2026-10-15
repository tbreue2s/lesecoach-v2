# Technical Evidence: WP13 - Hybride Content-Pipeline zur Massengenerierung

**ID:** `WP13`  
**Status:** `accepted`  
**Date:** 2026-10-16  

---

## 1. Übersicht

In Work Package 13 wurde die Content-Pipeline zur Massengenerierung von Geschichten implementiert. Die Pipeline basiert auf einem zweistufigen Modell:
1. **Step 1 (Drafting):** Kreativer Handlungsentwurf mit thematischem Einstieg und Störwort-Kollision.
2. **Step 2 (Translation & JSON):** Didaktische Ausformulierung nach den Regeln der jeweiligen Lese-Stufe (1–9) und Ausgabe eines standardisierten JSON-Schemas mit getrennten Silben.

---

## 2. Test- & Validierungs-Nachweis

### 2.1 Unit-Tests & Build
```
Test Files  16 passed (16)
     Tests  148 passed (148)
```
- `src/lib/utils/generateStories.test.ts` verifiziert CLI-Parsing, Whitelist-Ziehung, Störwörter-Pool (30 Wörter) und Silbentrennung.
- `npm run build` erzeugt die optimierten PWA-Bundles fehlerfrei.

### 2.2 Generierte Beispieldaten
- `src/lib/data/stories/level-1/theme_dino_ep01.json`: Dinosaurier-Geschichte mit Störwort *Fernseher* für Level 1 (Whitelist-Nomen: Dino, Tal, Gras, Kabel, Glas, Maus).
- `src/lib/data/stories/level-6/theme_dino_ep01.json`: Dinosaurier-Geschichte mit Störwort *Fernseher* für Level 6 (Phase B, Satz-Held, 5 Sätze, flüssige Erzählstruktur).
- Vollständige Matrix: 90 Geschichten (9 Level $\times$ 10 Themen) in `src/lib/data/stories/level-[1-9]/`.

---

## 3. Akzeptanz
Das Work Package wurde vom Benutzer explizit abgenommen (*„also das wp ist abgenommen. comitte bitte.“*).
