# Work Package 07: Tokenizer Refactoring (Didaktischer Schiedsrichter)

**ID:** `WP07`  
**Status:** `accepted`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` (mit Evidence) ➔ `accept` (done) ➔ `merge`

---

## 1. Ziel & Umfang
Robuste Wortauswahl für den kindlichen Leseanteil ohne Totalausfall bei natürlichen Texten. Umbau der starren Boolean-Blacklist (true/false) auf ein intelligentes "Penalty-Scoring-System" (`calculateWordComplexity`).

---

## 2. Technische Spezifikation

### 2.1 Penalty-Scoring-System (`calculateWordComplexity`)
Das Scoring bewertet die phonetische und morphologische Schwierigkeit jedes Wortes (das Wort wird vor der Prüfung in Kleinbuchstaben umgewandelt und von Satzzeichen bereinigt, `syllables` kommt als externes Array vom LLM-Generator):

1. **+10 Punkte (Rote Ampel / Killer):**
   - Regex-Match: `/[ßcqxyz]|ck|tz|pf/i.test(word)`
   - Silben-Limit: `syllables.length >= 3`
   - Komposita-Schutz (Länge): `word.length >= 8`
   - Schwere Endungen bei Mehrsilbern: `/(es|em|er|sten|chem)$/i.test(word) && syllables.length > 1`

2. **+3 Punkte (Schwere Hürden):**
   - Nasale: `/(nk|ng)/i.test(word)`
   - Konsonanten-Cluster am Wortende: `/[bdfghjklmnpqrstvwxyz]{2,}$/i.test(word)`

3. **+2 Punkte (Mittlere Hürden):**
   - Komplexe Grapheme: `/(sch|ch|sp|st)/i.test(word)`
   - Doppelbuchstaben (inkl. Umlaute): `/([a-zäöü])\1/i.test(word)`

4. **+1 Punkt (Leichte Hürden):**
   - Diphthonge/Zwielaute: `/(ei|au|eu|äu|ie)/i.test(word)`
   - Einfache Umlaute: `/[äöü]/i.test(word)`
   - Dehnungs-h: `/[aeiouäöü]h/i.test(word)`

### 2.2 Level-Spezifische Wortauswahl
- **Level 1:** Wählt im Satz das Nomen/Vollverb mit dem **niedrigsten Score**. Ein Satz wird nur übersprungen (komplett von der App gelesen), wenn das leichteste wählbare Wort einen Score `>= 5` hat.
- **Level 2:** Strikte Adjazenz (Index `i` und `i+1`) für `[Artikel + Nomen]` oder `[Adjektiv + Nomen]`. Die Kombination darf in Summe `<= 4` Silben haben und wird nach dem niedrigsten Gesamt-Score priorisiert.

### 2.3 Eigennamen-Limitierung (Kind & Begleiter)
- Eigennamen (Kind, Begleiter) erhalten nach dem 1. Vorkommen in der Geschichte einen **Score-Penalty von +100**.
- **Ziel:** Maximal 1x "Kind-Rolle" für Eigennamen pro Geschichte.

### 2.4 UX-Verbesserung: Input-Debounce
- **Input-Fix:** Implementierung eines Debounces von `1500ms` bei der Namenseingabe.
- **Ziel:** Verhindert Sofort-Fehlermeldungen beim ersten getippten Buchstaben.

---

## 3. Akzeptanzkriterien
- [x] `calculateWordComplexity` berechnet korrekte Scores für Test-Wörter.
- [x] Level 1 wählt stets das Wort mit dem niedrigsten Score und überspringt bei Score >= 5.
- [x] Level 2 wählt korrekte Bigramme <= 4 Silben nach Score aus.
- [x] Eigennamen-Penalty von +100 greift ab dem 2. Vorkommen.
- [x] Namenseingabe wirft Fehler/Validierung erst nach 1500ms.
- [x] **Zwingende Testfälle (`calculateWordComplexity`):**
  - "Sandburg" (Länge 8 -> +10, 'nd' -> +3, 'rg' -> +3) = Score >= 16.
  - "Auto" ('au' -> +1, Länge 4, 2 Silben) = Score 1.
  - "Hut" (0 Treffer) = Score 0.
  - "weißen" ('ß' -> +10, 'ei' -> +1) = Score >= 11.
