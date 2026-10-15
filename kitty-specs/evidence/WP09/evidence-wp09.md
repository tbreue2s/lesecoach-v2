# Technical Evidence: Work Package 09 (Didaktische Phonem-Gewichtung – Dauerlaute vs. Plosive)

**WP-ID:** `WP09`  
**Datum:** 2026-10-15  
**Status:** `merged`  
**Test-Ergebnis:** 15 Test-Suites, 133 Tests erfolgreich bestanden (100% grün).

---

## 1. Ziel & Zusammenfassung

Ziel von WP09 war die didaktische Verfeinerung der Wortauswahl für den kindlichen Leseanteil in den Anfangsstufen (Phase A, insb. Level 1 & 2). 

Im Erstleseunterricht der 1. Klasse (Fibelstufe / Synthetischer Leselehrgang) ist das **akustische Verblenden** (Zusammenziehen von Lauten) für absolute Leseanfänger am einfachsten bei **Dauerlauten / dehnbaren Konsonanten (`m, l, s, n, f, r`)** und Vokalen, da diese ohne Stopp oder Knacklaut gehalten werden können (*Mmm-aaa-mmm-aaa*, *Rrr-uuu-f*). **Plosive / Verschlusslaute (`p, t, k, b, d, g`)** erfordern hingegen einen vollständigen Verschluss des Luftstroms und provozieren bei Leseanfängern oft störende Schwa-Laute ("Tö-a-gö" statt "Tag").

WP09 führt einen deterministischen **Phonem-Tiebreaker** (`calculatePhonemeTiebreaker`) ein, der Plosive mit einem minimalen Selektions-Penalty (+0.1 pro Verschlusslaut) belegt, während der unveränderte ganzzahlige Basisscore (`calculateWordComplexity`) für strikte Schwellenwertprüfungen erhalten bleibt.

---

## 2. Implementierte Architektur & Didaktische Logik

### 2.1 Phonem-Tiebreaker (`calculatePhonemeTiebreaker`)
- Funktion: `calculatePhonemeTiebreaker(cleanWord: string): number`
- Zählt Vorkommen von Verschlusslauten (`[ptkbdg]`) im bereinigten Wort und multipliziert mit 0.1:
  - Wörter rein aus Vokalen und Dauerlauten (*Mama, Oma, Limo, Ruf, Fee, Nase*) $\rightarrow$ **Tiebreaker 0.0**.
  - Wörter mit 1 Verschlusslaut (*Hut, Tor, Bus, Tag*) $\rightarrow$ **Tiebreaker 0.1**.
  - Wörter mit 2 Verschlusslauten (*Bad, Boot, Bild*) $\rightarrow$ **Tiebreaker 0.2**.

### 2.2 Selektions-Logik in `selectPhaseAChildIndices`
- **Level 1 (Einzelwort-Entdecker):**
  - Strikter Filter: Nur Wörter mit `baseScore <= 1` werden überhaupt berücksichtigt.
  - Aussteuerungs-Score: `selectionScore = baseScore + calculatePhonemeTiebreaker(w.cleanWord)`.
  - Bei gleichem Basisscore (z. B. Score 0 für "Oma" und "Tor") gewinnt stets das Wort mit den leichteren Dauerlauten – **unabhängig von der Satzposition**:
    - *"Am Tor steht Oma."* $\rightarrow$ "Oma" wird ausgewählt (früher wurde "Tor" gewählt, nur weil es an Position 1 stand).
    - *"Oma steht am Tor."* $\rightarrow$ "Oma" wird ausgewählt.
  - Wenn ein Satz ausschließlich Plosiv-Wörter enthält (z. B. *"Hier liegt ein roter Hut."*), wird weiterhin zuverlässig "Hut" gewählt, da $0.1 \le 1.0$ (Schwellenwert).
- **Level 2 (Wortpaare-Forscher):**
  - Kombinierter Tiebreaker für `[Artikel/Adjektiv + Nomen]`.
  - Bei gleichem Basisscore wird das Paar mit den geringeren Verschlusslauten bevorzugt (z. B. *"eine Limo"* vor *"ein Bad"*).

### 2.3 Prompt-Template-Verfeinerung (`promptTemplates.ts`)
- In `getLevelPromptRules(1)` wurde die LLM-Instruktion um eine explizite didaktische Empfehlung ergänzt:
  `Bevorzugte Phonetik: Priorisiere Dauerlaute (m, l, s, n, f, r) und offene Silben (z. B. Mama, Oma, Limo, Ruf, Nase, Fee, Name, See).`

---

## 3. Nachweise & Zwingende Testfälle (Vitest Suite)

In `src/lib/utils/tokenizer.test.ts` wurden 5 neue dedizierte Tests ergänzt:

1. **Reine Vokal- & Dauerlaut-Wörter:**
   - `calculatePhonemeTiebreaker('Mama') === 0`
   - `calculatePhonemeTiebreaker('Oma') === 0`
   - `calculatePhonemeTiebreaker('Limo') === 0`
   - `calculatePhonemeTiebreaker('Ruf') === 0`
   - `calculatePhonemeTiebreaker('Fee') === 0`
   - `calculatePhonemeTiebreaker('Nase') === 0`
2. **Plosiv-Zählung (+0.1 pro Plosiv):**
   - `calculatePhonemeTiebreaker('Hut') === 0.1` ('t')
   - `calculatePhonemeTiebreaker('Tor') === 0.1` ('t')
   - `calculatePhonemeTiebreaker('Bad') === 0.2` ('b', 'd')
   - `calculatePhonemeTiebreaker('Paket') === 0.3` ('p', 'k', 't')
3. **Positions-Unabhängigkeit in Level 1:**
   - `"Am Tor steht Oma."` $\rightarrow$ Kind-Wort: **"Oma"**
   - `"Oma steht am Tor."` $\rightarrow$ Kind-Wort: **"Oma"**
4. **Plosiv-Fallback in Level 1:**
   - `"Hier liegt ein roter Hut."` $\rightarrow$ Kind-Wort: **"Hut"**
5. **Level 2 Wortpaar-Präferenz:**
   - `"Hier ist eine Limo und ein Bad."` $\rightarrow$ Kind-Wortpaar: **"eine Limo"**

---

## 4. Testprotokoll (Vitest Run)

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
 ✓ src/lib/utils/promptTemplates.test.ts (10)        
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/utils/syllableSplitter.test.ts (5)
 ✓ src/lib/utils/tokenizer.test.ts (29)
 ✓ src/lib/utils/validation.test.ts (7)

 Test Files  15 passed (15)
      Tests  133 passed (133)
   Duration  2.38s
```

---

## 5. Fazit & Freigabebereitschaft

Alle 15 Test-Suites mit 133 Tests sind vollständig grün. Es gibt keinerlei Regressionen zu bestehenden Spezifikationen (WP01 bis WP08).
Das Work Package ist bereit für den Übergang in die Phasen `accept` und `merge`.
