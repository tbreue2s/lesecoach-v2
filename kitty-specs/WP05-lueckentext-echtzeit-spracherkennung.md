# Work Package 05: Lückentext & Echtzeit-Spracherkennung

**ID:** `WP05`  
**Status:** `spec`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Ziel & Umfang
Umsetzung des interaktiven Lückentext-Lesens. Die TTS-Stimme liest einen Satz bis zu einem Zielwort vor, stoppt automatisch und schaltet das Mikrofon via Web Speech API (`SpeechRecognition`) ein. Das Kind spricht das fehlende Wort. Nach erfolgreicher Erkennung (inkl. kindgerechter Aussprache-Toleranz) lobt der Begleiter und die Geschichte wird fortgesetzt.

---

## 2. Technische Spezifikation

### 2.1 Speech-to-Text (STT) Service (`sttService.ts`)
- Initialisierung von `webkitSpeechRecognition` / `SpeechRecognition` mit `lang: 'de-DE'`.
- Kontinuierliches oder On-Demand Listening mit Timeout (z. B. 6 Sekunden).
- Interims-Ergebnisse für direktes visuelles Feedback (z. B. pulsierendes Mikrofon-Icon oder visuelle Schallwellen).

### 2.2 Aussprache- & Ähnlichkeitsabgleich (Fuzzy Matching)
- **Normalisierung:** Kleinbuchstaben, Entfernung von Satzzeichen (`.` `,` `!` `?`).
- **Levenshtein-Distanz / Phonetische Toleranz:**
  - Da Leseanfänger gelegentlich leicht undeutlich artikulieren, wird eine Ähnlichkeit von $\ge 80\%$ (bzw. Levenshtein-Distanz $\le 1-2$ je nach Wortlänge) als Treffer gewertet.
  - Sofortiges positives Feedback bei Erfolg (z. B. Begleiter jubelt, Konfetti-Effekt, Sound-Effekt).

### 2.3 Didaktisches Fehlertoleranz- & Hilfesystem
- **1. Fehlversuch:** Ermutigendes Feedback ("Fast geschafft! Versuch es noch einmal.").
- **2. Fehlversuch / Timeout:** Begleiter gibt phonetischen Tipp (z. B. liest das Wort leise vor oder blendet den Anfangsbuchstaben groß ein).
- **Notfall-Klick:** Kind kann das Wort auch antippen, um Frustration zu vermeiden.

---

## 3. Akzeptanzkriterien
- [ ] TTS stoppt präzise an Lückenwörtern (`isGap: true`).
- [ ] STT startet automatisch nach dem TTS-Stopp und signalisiert Aufnahmebereitschaft.
- [ ] Gesprochenes Kindeswort wird gegen das Zielwort mit Fuzzy-Matching verglichen.
- [ ] Erfolgreiche Erkennung schaltet das Wort frei und setzt den Satz fort.
- [ ] Timeout und Fehlversuche führen zu kindgerechten Hinweisen statt harten Abbrüchen.
- [ ] Manuelles Antippen als barrierefreier Fallback ist verfügbar.

---

## 4. Review- & Evidence-Vorgabe (für `in_review`)
- Unit-Tests für Fuzzy-Matching / Wort-Normalisierungs-Algorithmus.
- Integrationstest mit simulierter SpeechRecognition für Erfolgs- und Timeout-Pfade.
- Nachweis der UI-Zustände (Aufnahme aktiv, Erfolg, Tipp-Anzeige).
