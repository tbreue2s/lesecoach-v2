# Work Package 06: Lückentext & Echtzeit-Spracherkennung

**ID:** `WP06`  
**Status:** `accepted`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Ziel & Umfang
Umsetzung des interaktiven Lückentext-Lesens. Die TTS-Stimme liest einen Satz bis zu einem Zielwort vor, stoppt automatisch und schaltet das Mikrofon via Web Speech API (`SpeechRecognition`) ein. Das Kind spricht das fehlende Wort. Nach erfolgreicher Erkennung (inkl. kindgerechter Aussprache-Toleranz) lobt der Begleiter und die Geschichte wird fortgesetzt.

---

## 2. Technische Spezifikation

### 2.1 Speech-to-Text (STT) Service (`speechRecognitionService.ts`)
- Initialisierung von `webkitSpeechRecognition` / `SpeechRecognition` mit `lang: 'de-DE'`.
- Mikrofon-Hygiene: Aktivierung ausschließlich in `CHILD_TURN`, sofortiges Stummschalten vor TTS-Ausgabe.
- Kontinuierliches oder On-Demand Listening mit 5-Sekunden-Timeout.
- Interims-Ergebnisse für direktes visuelles Feedback (z. B. pulsierendes Mikrofon-Icon oder visuelle Schallwellen).

### 2.2 Aussprache- & Ähnlichkeitsabgleich (Fuzzy Matching)
- **Normalisierung:** Kleinbuchstaben, Entfernung von Satzzeichen (`.` `,` `!` `?`, etc.), Trimmen.
- **Levenshtein-Distanz / Phonetische Toleranz:**
  - Toleriert Zielwort als Teilstring / Token in Phrasen (z. B. "der Baum" vs. "Baum").
  - Levenshtein-Toleranz von $\le 1$ bei Wörtern ab 4 Buchstaben (z. B. "Hunde" vs. "Hund", "gros" vs. "groß").
  - Sofortiges positives Feedback bei Erfolg (grünes Aufleuchten `.flash-success`, synthetisierter C6-G6 Chime-Sound).

### 2.3 Didaktisches Fehlertoleranz- & Hilfesystem
- **Barrierefreier Fallback & Dev-Button:** Kind kann das aktive Wort direkt antippen, um Frustration zu vermeiden; Entwickler können `[⭐ Dev: Simuliere Wort]` nutzen.
- *(Hinweis: Erweiterte didaktische Interventions- und Hilfestufen werden in einem separaten Work Package modular aufgebaut.)*

---

## 3. Akzeptanzkriterien
- [x] TTS stoppt präzise an Lückenwörtern (`role: 'child'`).
- [x] STT startet automatisch nach dem TTS-Stopp und signalisiert Aufnahmebereitschaft (`isListening: true`, animierte Schallwellen).
- [x] Gesprochenes Kindeswort wird gegen das Zielwort mit Fuzzy-Matching verglichen (`validateSpokenWord`).
- [x] Erfolgreiche Erkennung schaltet das Wort frei, spielt Chime-Sound und setzt den Satz fort.
- [x] Manuelles Antippen als barrierefreier Fallback ist verfügbar.

---

## 4. Review- & Evidence-Vorgabe (für `in_review`)
- Unit-Tests für Fuzzy-Matching / Wort-Normalisierungs-Algorithmus (`src/lib/utils/spokenWordMatcher.test.ts`).
- Integrationstest mit simulierter SpeechRecognition für Erfolgs- und Mikrofon-Hygiene-Pfade (`src/lib/stores/readingSessionStore.test.ts`).
- Nachweis der UI-Zustände und Dokumentation in `kitty-specs/evidence/WP06/evidence-wp06.md`.
