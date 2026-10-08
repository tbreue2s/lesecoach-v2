# Technical Evidence: Work Package 06 (Speech-to-Text Listener & Tolerante Lückentext-Validierung)

**WP-ID:** `WP06`  
**Datum:** 2026-10-08  
**Status:** `in_review`  
**Ziel:** Nachweis des Speech-to-Text Listeners mit Web Speech API, strikter Mikrofon-Hygiene, toleranter Fuzzy-Validierung (Levenshtein-Toleranz + Substring-/Token-Inclusion), kindgerechter Scaffolding-Timeout-Steuerung (Geduldiger Otter) und Fallback-Mechanismen.

---

## 1. Architektur & Mikrofon-Hygiene

1. **Exklusivität in `CHILD_TURN`:**
   - Der `SpeechRecognition`-Dienst wird ausschließlich im Zustand `CHILD_TURN` scharf geschaltet.
   - Vor jedem Start einer TTS-Sprachausgabe (`speakSentence`, `speakAppSegment`, `startRepeatedReading`) wird der Mikrofon-Stream augenblicklich stummgeschaltet (`stopListening()`), um akustische Rückkopplungen und Echo-Effekte auszuschließen.
2. **Locale-Konfiguration:**
   - Sprachauswahl ist strikt auf `'de-DE'` konfiguriert.
3. **Automatisches Error-Handling:**
   - Abfangen von `'not-allowed'`, `'no-speech'`, `'audio-capture'`, `'aborted'`. Benutzerfreundlicher visueller Hinweis bei verweigerter Berechtigung ohne Blockade des Leseflusses.

---

## 2. Tolerante Validierungs-Logik (`validateSpokenWord`)

Die Funktion `validateSpokenWord(spokenText, targetWord)` in `src/lib/utils/spokenWordMatcher.ts` garantiert höchste didaktische Fehlertoleranz für Leseanfänger der 1. und 2. Klasse:

- **Bereinigung:** Umwandlung in Kleinbuchstaben, Entfernung sämtlicher deutscher Satz- und Sonderzeichen (`.`, `,`, `!`, `?`, `„`, `“`, etc.), Trimmen und Konsolidierung von Leerzeichen.
- **Substring / Token-Inklusion:** Sagt das Kind einen Begleitartikel oder eine kleine Phrase (z. B. *"der Baum"* oder *"ein kleiner Hund"* statt nur *"Baum"* / *"Hund"*), wird das Zielwort im Token-Array erkannt.
- **Levenshtein-Toleranz:**
  - Bei Wörtern ab 4 Buchstaben ($\ge 4$) wird eine Edit-Distanz von $\le 1$ toleriert (z. B. *"Hunde"* vs. *"Hund"*, *"gros"* vs. *"groß"*).
  - Bei kurzen Wörtern ($< 4$ Buchstaben, z. B. *"in"*, *"an"*, *"wo"*) gilt strikte Exaktheit, um falsch-positive Treffer zu vermeiden.

### Unit-Test-Nachweis der Grenzfalle (`spokenWordMatcher.test.ts`):
19 Unit-Tests decken alle geforderten Grenzfälle und Normalisierungen ab:
- Exakter Wortabgleich: `"Hund!"` vs. `"Hund"` $\rightarrow$ `isValid: true` (matchType: `exact`)
- Multi-Wort-Transkript / Teilstring: `"der Baum"` vs. `"Baum"` $\rightarrow$ `isValid: true` (matchType: `token_exact`)
- Levenshtein-Toleranz $\ge 4$ Buchstaben: `"Hunde"` vs. `"Hund"` $\rightarrow$ `isValid: true` (matchType: `levenshtein`, dist: 1)
- Levenshtein-Toleranz Umlaut/Ersatz: `"gros"` vs. `"groß"` $\rightarrow$ `isValid: true` (matchType: `levenshtein`, dist: 1)
- Fuzzy Token in Satz: `"das ist ein hunde"` vs. `"Hund"` $\rightarrow$ `isValid: true` (matchType: `levenshtein`)
- Abgrenzung bei Kurzwörtern: `"an"` vs. `"in"` $\rightarrow$ `isValid: false`
- Völlig verschiedene Wörter: `"Katze"` vs. `"Hund"` $\rightarrow$ `isValid: false`

---

## 3. Child-Turn Lifecycle & Echtzeit-Feedback

1. **Aktivierung in `CHILD_TURN`:**
   - Sobald ein Kindeswort an der Reihe ist, wird der Status auf `CHILD_TURN` gesetzt und das Zielwort gelb hervorgehoben (`.status-active`).
   - Die Benutzeroberfläche signalisiert aktive Aufnahmebereitschaft (*„Ich höre dir zu! 🦦👂“*) mit animierten Audio-Wellen.
   - Das Mikrofon hört mit `lang: 'de-DE'` auf die Stimme des Kindes.

2. **Erfolgspfad & Mikrofon-Hygiene:**
   - Sobald das Kind das Wort ausspricht (validiert durch `validateSpokenWord` mit Tipp-/Teilstring-Toleranz) oder das Wort antippt:
     * Das Mikrofon wird sofort stummgeschaltet (`stopListening()`), um Audio-Echo zu vermeiden.
     * Das Wort leuchtet grün auf (`.flash-success`).
     * Der angenehme C6-G6 Chime-Sound ertönt via Web Audio API (`playSuccessChime()`).
     * Der Session-Store vergibt Sterne und setzt die TTS-Sprachausgabe für den restlichen Satz nahtlos fort.

3. **Entwickler- & Barrierefreiheits-Fallback:**
   - Dev-Button `[⭐ Dev: Simuliere Wort]` zum direkten Testen ohne Audioeingabe.
   - Barrierefreier Notfall-Klick direkt auf das aktive Wort.
   - *(Hinweis: Erweiterte didaktische Interventions- und Hilfestufen werden in einem separaten Work Package spezifiziert.)*

---

## 4. Test-Zusammenfassung

- **74 Tests in 12 Testdateien** erfolgreich bestanden.
- **Type-Check (`svelte-check`):** 0 Fehler, 0 Warnungen.
