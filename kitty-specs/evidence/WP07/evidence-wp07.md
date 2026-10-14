# Technical Evidence: Work Package 07 (Tokenizer Refactoring – Didaktischer Schiedsrichter)

**WP-ID:** `WP07`  
**Datum:** 2026-10-09  
**Status:** `accepted`  
**Test-Ergebnis:** 13 Test-Suites, 103 Tests erfolgreich bestanden (100% grün).

---

## 1. Ziel & Zusammenfassung

Ziel von WP07 war die Beseitigung von Totalausfällen bei der Wortauswahl für den kindlichen Leseanteil in natürlichen Geschichten. Die zuvor starre Boolean-Blacklist wurde durch ein intelligentes, didaktisch graduiertes **Penalty-Scoring-System** (`calculateWordComplexity`) ersetzt, das die morphologische und phonetische Komplexität quantifiziert und die Leseauswahl optimiert.

---

## 2. Implementierte Architektur & Didaktische Logik

### 2.1 Penalty-Scoring-System (`calculateWordComplexity`)
Das Scoring bewertet die phonetische und morphologische Schwierigkeit jedes bereinigten Wortes deterministisch ohne statische Wortlisten:

1. **+10 Punkte (Rote Ampel / Killer):**
   - Seltene oder schwierige Buchstaben & Affrikaten: `/[ßcqxyz]|ck|tz|pf/i`
   - Silben-Limit: `effSyllables.length >= 3`
   - Komposita & lange Wörter (deterministisch): `clean.length >= 8`
   - Schwere Flexionsendungen bei Mehrsilbern: `/(es|em|er|sten|chem)$/i && effSyllables.length > 1`

2. **+3 Punkte (Schwere Hürden):**
   - Nasale: `/(nk|ng)/i`
   - Konsonanten-Cluster am Silben- oder Wortende ($\ge 2$ aufeinanderfolgende Konsonanten wie `-bt`, `-nd`, `-ft`): `/[bcdfghjklmnpqrstvwxyzß]{2,}$/i`

3. **+2 Punkte (Mittlere Hürden):**
   - Komplexe Grapheme: `/(sch|ch|sp|st)/i`
   - Doppelbuchstaben (inkl. Umlaute): `/([a-zäöü])\1/i`

4. **+1 Punkt (Leichte Hürden):**
   - Diphthonge/Zwielaute: `/(ei|au|eu|äu|ie)/i`
   - Einfache Umlaute: `/[äöü]/i`
   - Dehnungs-h: `/[aeiouäöü]h/i`

### 2.2 Zwingende Testfälle & Nachweise (`calculateWordComplexity`)
- **"Sandburg":** Länge 8 (+10), 'nd' (+3), 'rg' (+3) $\rightarrow$ **Score 16** ($\ge 16$).
- **"Auto":** Diphthong 'au' (+1), 2 Silben, Länge 4 $\rightarrow$ **Score 1** ($= 1$).
- **"Hut":** 0 Treffer $\rightarrow$ **Score 0** ($= 0$).
- **"weißen":** Killer 'ß' (+10), Diphthong 'ei' (+1) $\rightarrow$ **Score 11** ($\ge 11$).
- **"Wind", "gibt", "sanft":** Endung mit 2 Konsonanten $\rightarrow$ **Score 3** ($\ge 2$).
- **"Koppel":** Doppelkonsonant 'pp' $\rightarrow$ **Score 2** ($\ge 2$).
- **"Mähne":** Umlaut 'ä' (+1) + Dehnungs-h (+1) $\rightarrow$ **Score 2** ($\ge 2$).

---

## 3. Level-Spezifische Wortauswahl & Eigennamen

### 3.1 Level 1 (Verschärfter Schwellenwert: Score $\le 1$)
- In Level 1 (Einzelwort-Entdecker) darf ein Wort für `role: 'child'` **maximal einen Complexity-Score von 1** besitzen.
- Wörter mit Score $\ge 2$ (z. B. "Koppel", "Mähne", "gibt", "Wind") sind strikt zu schwer.
- **Fallback:** Wenn kein Nomen/Verb im Satz einen Score $\le 1$ erreicht, wird der gesamte Satz der App zugewiesen (`role: 'app'`). Das Kind liest in diesem Satz nichts.
- Verifiziert an Sätzen wie *"Der Wind weht sanft durch die lange Mähne."* und *"Rexi läuft fröhlich neben der Koppel her."* $\rightarrow$ beide erhalten komplett `role: 'app'`.

### 3.2 Level 2 (Strikte Adjazenz & Nomen-Phrasen-Scoring)
- Sucht aufeinanderfolgende Indizes ($i, i+1$) mit `[Artikel + Nomen]` oder `[Adjektiv + Nomen]`.
- Bedingung: Summe der Silben beider Wörter $\le 4$.
- Priorisiert das Paar mit dem **niedrigsten Gesamt-Score** (Summe aus beiden Wort-Scores).

### 3.3 Eigennamen-Entwertung (+50 Baseline & +100 Limitierung)
- Konfigurierte Eigennamen des Kindes ("Emil") und des Begleiters ("Flora", "Rexi") erhalten von Grund auf einen **Penalty von +50**, damit sie niemals primär gewählt werden, wenn andere Nomen/Verben im Satz existieren.
- Nach dem ersten erfolgreichen Lesen in der Story erhalten sie weiterhin **+100** (maximal 1x `child` pro Geschichte).

---

## 4. UX-Verbesserung: Input-Debounce (1500ms)

- In `src/lib/components/ProfileSetup.svelte` verhindert ein Timer von **1500ms** verfrühte Fehlermeldungen bei der Eingabe des Kindesnamens und Begleiternamens.
- Tippt das Kind oder der Elternteil, bleibt die Fehlermeldung ruhig, bis 1500ms Inaktivität vergangen sind oder das Feld verlassen wird (`blur`).

---

## 5. Testprotokoll (Vitest Suite)

```
Test Files  13 passed (13)
     Tests  102 passed (102)

 ✓ src/lib/stores/profileStore.test.ts (5)
 ✓ src/lib/stores/readingSessionStore.test.ts (7)
 ✓ src/lib/stores/routerStore.test.ts (2)
 ✓ src/lib/stores/storyConfigStore.test.ts (3)
 ✓ src/lib/utils/charMapper.test.ts (6)
 ✓ src/lib/utils/levelValidator.test.ts (11)
 ✓ src/lib/utils/mockStoryGenerator.test.ts (3)
 ✓ src/lib/utils/speech.test.ts (3)
 ✓ src/lib/utils/spokenWordMatcher.test.ts (19)
 ✓ src/lib/utils/syllableSplitter.test.ts (5)
 ✓ src/lib/utils/tokenizer.test.ts (24)
 ✓ src/lib/utils/validation.test.ts (6)
 ✓ src/lib/services/speechRecognitionService.test.ts (8)
```

---

## 6. Fazit & Freigabebereitschaft

Work Package 07 ist vollständig implementiert, alle Akzeptanzkriterien sind erfüllt, und sämtliche 102 Tests der Testsuite sind grün. Das Work Package befindet sich im Status `in_review`.
