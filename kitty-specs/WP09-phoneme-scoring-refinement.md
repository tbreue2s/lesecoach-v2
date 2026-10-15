# Work Package 09: Didaktische Phonem-Gewichtung (Dauerlaute vs. Plosive)

**ID:** `WP09`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge` (done)

---

## 1. Didaktischer Hintergrund & Zielsetzung

Im Erstleseunterricht der 1. Klasse (Synthetischer Leselehrgang / Fibelstufe) ist das **akustische Verblenden** (Zusammenziehen von Lauten) die größte Hürde für Leseanfänger. 
Dabei existiert ein fundamentaler didaktischer Unterschied zwischen zwei Konsonantengruppen:

1. **Dauerlaute / Dehnbare Konsonanten (`m, l, s, n, f, r`):**
   - Können kontinuierlich gehalten werden (`Mmmm-aaaa-m-aaaa`, `Rrr-uuu-f`).
   - Ermöglichen einen unterbrechungsfreien Übergang zum folgenden Vokal ohne störende Knacklaute.
2. **Plosive / Verschlusslaute (`p, t, k, b, d, g`):**
   - Bilden einen vollständigen Verschluss des Vokaltrakts mit anschließender plötzlicher Öffnung (Explosion).
   - Führen bei Leseanfängern häufig zum ungewollten Einfügen von Schwa-Lauten ("Tö-a-gö" statt "Tag", "Bö-a-dö" statt "Bad").

**Ziel von WP09:**
Verfeinerung des Tokenizers und der Prompt-Templates, sodass bei gleichem Komplexitäts-Basisscore (z. B. Score 0 oder Score 1) in Level 1 (und Level 2) Wörter mit Dauerlauten und Vokalen deterministisch gegenüber Wörtern mit Verschlusslauten (Plosiven) priorisiert werden.

---

## 2. Technische Spezifikation

### 2.1 Phonem-Tiebreaker (`calculatePhonemeTiebreaker`)
- Funktion: `calculatePhonemeTiebreaker(cleanWord: string): number`
- Zählt die Anzahl der enthaltenen Verschlusslaute / Plosive (`p, t, k, b, d, g`).
- Jeder Verschlusslaut addiert einen minimalen Auswahlabschlag von `+0.1` auf den Selektions-Score:
  $$\text{selectionScore} = \text{baseComplexityScore} + (\text{plosiveCount} \times 0.1)$$
- **Eigenschaften:**
  - `calculateWordComplexity` bleibt als deterministischer Basis-Score unverändert (Rückwärtskompatibilität für WP07-Zusicherungen: `Hut` bleibt Basis-Score 0).
  - Der Tiebreaker fungiert als feine Aussteuerungsachse: `Mama` ($\text{Score } 0.0$) sticht `Hut` ($\text{Score } 0.1$) und `Bad` ($\text{Score } 0.2$) aus, unabhängig von der Position im Satz.
  - Wenn ein Satz nur Plosiv-Wörter enthält (z. B. "Hier liegt ein roter Hut."), wird "Hut" weiterhin problemlos ausgewählt, da $0.1 \le 1.0$ (Level-1-Schwellenwert) gilt.

### 2.2 Selektions-Logik in `selectPhaseAChildIndices`
- **Level 1:** Wählt das Wort mit dem niedrigsten `selectionScore`. Bei Gleichstand entscheidet die Reihenfolge.
- **Level 2:** Bei der Auswahl von Wortpaaren (`[Artikel/Adjektiv + Nomen]`) wird der kombinierte `selectionScore` herangezogen, sodass Paare mit Dauerlauten bevorzugt werden.

### 2.3 Didaktische Prompt-Erweiterung (`promptTemplates.ts`)
- Ergänzung der Level-1-Promptregeln um eine explizite Empfehlung zur Bevorzugung dehnbarer Konsonanten (`m, l, s, n, f, r`) und offener Silben (*Mama, Oma, Limo, Ruf, Nase, Fee, Name, See*).

---

## 3. Akzeptanzkriterien
- [x] `calculatePhonemeTiebreaker` zählt Plosive (`p, t, k, b, d, g`) korrekt und liefert `plosiveCount * 0.1`.
- [x] In Level 1 wird ein Dauerlaut-Wort (z. B. "Oma" oder "Ruf") einem Plosiv-Wort (z. B. "Tor" oder "Hut") vorgezogen, selbst wenn das Plosiv-Wort früher im Satz steht.
- [x] Sätze, die ausschließlich Plosiv-Wörter mit Score 0 (z. B. "Hut") enthalten, wählen weiterhin valide das Zielwort für das Kind aus.
- [x] Alle bestehenden 128 Vitest-Tests laufen weiterhin fehlerfrei durch (volle Regression-Sicherheit).
- [x] Die Level-1-Promptregeln in `promptTemplates.ts` enthalten die Dauerlaut-Empfehlung.
