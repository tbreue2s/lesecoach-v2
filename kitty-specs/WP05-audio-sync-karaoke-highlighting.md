# Work Package 05: Audio-Sync & Karaoke-Highlighting im DOM

**ID:** `WP05`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merged`

---

## 1. Ziel & Umfang
Realisierung einer flüssigen, synchronen Text-Hervorhebung (Karaoke-Highlighting) während die Web Speech API (`SpeechSynthesis`) den Text vorliest. Durch die VDOM-freie Architektur von Svelte wird eine 60fps-Darstellung ohne Mikroruckler gewährleistet.

---

## 2. Technische Spezifikation

### 2.1 Web Speech TTS Service (`ttsService.ts`)
- Kapselung von `window.speechSynthesis` und `SpeechSynthesisUtterance`.
- Automatische Auswahl einer qualitativ hochwertigen deutschen Stimme (z. B. `de-DE`).
- Konfigurierbare Sprechgeschwindigkeit (Standard für Klasse 1: `rate: 0.85` bis `0.9` für optimale Verständlichkeit).
- Bindung an das `boundary`-Event (`event.name === 'word'`), um das aktuelle Wort und dessen Textoffset zu ermitteln.

### 2.2 DOM & Word-Index Mapping
- Jeder Satz wird in einzelne `<span>`-Elemente pro Wort gerendert:
  ```html
  <span class="word" class:active={currentWordIndex === index} class:read={index < currentWordIndex}>
    {word.text}
  </span>
  ```
- Sanfte visuelle Hervorhebung (gelber/goldener Glow, weiche Skalierung `scale(1.08)` mit CSS-Transitions).
- Automatischer Auto-Scroll, damit der aktive Satz immer im sichtbaren Bereich bleibt.

### 2.3 Audio-Player-Controls
- Play / Pause / Neustart.
- Satzweises Vor- und Zurückspringen.
- Fallback-Timer für Browser-Engines mit unzuverlässigen Speech-Boundary-Events.

---

## 3. Akzeptanzkriterien
- [ ] TTS liest deutsche Sätze flüssig und in kindgerechtem Tempo vor.
- [ ] `boundary`-Events markieren exakt das aktuell gesprochene Wort im DOM.
- [ ] Keine spürbaren Frame-Drops oder Latenzen beim Wortwechsel (60 FPS Performance).
- [ ] Pause- und Resume-Funktionalität hält die Markierung an der exakten Stelle an.
- [ ] Silben- oder Wortabstände sind für 1./2. Klässler optimiert.

---

## 4. Review- & Evidence-Vorgabe (für `in_review`)
- Video-/Animation-Aufzeichnung oder Performance-Trace (Frame-Rate-Nachweis beim Karaoke-Highlighting).
- Audio-Sync Test-Nachweis mit Event-Logging.
- Fallback-Mechanismus Verifikation.
