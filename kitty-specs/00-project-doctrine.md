# Projekt-Doctrine: Lese-Coach (PWA)

## 1. Vision & Didaktisches Konzept
Der **Lese-Coach** ist eine hochgradig interaktive, didaktisch fundierte Progressive Web App (PWA) für Grundschulkinder der 1. und 2. Klasse. Ziel ist es, Lesefreude und Lesekompetenz spielerisch zu stärken – durch auditive Unterstützung, visuelle Synchronisation (Karaoke-Highlighting) und interaktive Lese-Challenges (Lückentext-Lesen mit Spracherkennung).

### Zielgruppen-Anforderungen (1. & 2. Klasse):
- **Visuell & Klar:** Große, gut lesbare Schriftarten (z. B. Schulschriften/moderne serifenlose Fonts mit klaren Buchstabenformen wie 'a' und 'l'), hohe Kontraste, selbsterklärende Icons.
- **Auditive & Emotionale Bindung:** Ein wählbarer Begleiter (z. B. 🐶 Hund, 🐱 Katze, 🦉 Eule) motiviert das Kind, gibt Feedback und begleitet durch die Lese-Einheiten.
- **Sicher & Barrierearm:** Keine offenen Freitext-Eingaben für Dritte, lokaler Speicher (Datenschutz nach DSGVO), absolut kinderfreundlich und ohne Ablenkungen.

---

## 2. Technologischer Stack & Architektur-Entscheidungen

### 2.1 Frontend-Framework: Svelte + Vite
- **Rationale:** Svelte kompiliert deklarativen Code zu hochoptimiertem Vanilla JavaScript ohne Virtual DOM. Dadurch werden Frame-Drops und Mikroruckler beim schnellen, wortweisen DOM-Highlighting (Karaoke-Sync via Web Speech API Events) vollständig eliminiert.
- **Vite:** Garantiert ultraschnelle Entwicklungszyklen (HMR) und optimierte Produktions-Bundles.

### 2.2 PWA & Offline-Fähigkeit
- **`vite-plugin-pwa`:** Automatische Generierung von Service Worker (Workbox) und Web App Manifest.
- **Offline-First:** Nach dem ersten Laden muss die Kernanwendung (inklusive Texten, Audio-Assets und Profilen) offline auf Tablets oder Smartphones im Klassenzimmer oder zu Hause funktionieren.

### 2.3 Sprachtechnologie: Lokale Web Speech API
- **Text-to-Speech (SpeechSynthesis):** Lokale Sprachausgabe mit genauen `boundary`-Events zur Wort-Synchronisation.
- **Speech-to-Text (SpeechRecognition / webkitSpeechRecognition):** Erkennung des laut gesprochenen Kindesworts bei interaktiven Lückentexten mit flexiblen Toleranzschwellen (Kinder-Aussprache).

### 2.4 Sicherheit & Input-Sanitization
- **Profil-Name:** Striktes 1-Wort-Regex (`^[a-zA-ZäöüÄÖÜß]+$`). Keine Sonderzeichen, Zahlen oder Leerzeichen (Prävention von Injections und Missbrauch).
- **Inhaltsfilter:** Lokaler Abgleich mit einer kuratierten Bad-Word-Liste für deutsche Kindermedien.

---

## 3. Governance, Git-Strategie & Spec-Kitty State Machine

Wir entwickeln strikt nach dem **Trunk-Based Development**-Prinzip auf `main`/`master`. Jedes Work Package (WP) durchläuft einen deterministischen Lebenszyklus. Der Code verbleibt während der Arbeitsphase uncommitted, bis Tests und Nachweise erbracht wurden und die finale Freigabe erfolgt.

```
[ spec ] ➔ [ plan ] ➔ [ tasks ] ➔ [ in_review ] ➔ [ accept ] ➔ [ merge ]
                                        │               │          │
                                   Unit-Tests &       User      Atomarer
                                 Evidence-Ablage    Freigabe   Trunk-Commit
```

### Phasen-Definitionen:
1. **`spec`:** Fachliche und technische Definition der Anforderungen, Akzeptanzkriterien und Grenzfälle.
2. **`plan`:** Detaillierter Architektur- und Implementierungsplan (Komponenten, Stores, Schnittstellen).
3. **`tasks`:** Ausführung der atomaren Programmier- und Testaufgaben (lokal im Working Tree).
4. **`in_review`:** Bereitstellung von technischen Nachweisen (Evidence) in `kitty-specs/evidence/<WP_ID>/` (Unit-Tests, Build-Logs, Snapshots).
5. **`accept`:** Formale Prüfung und Abnahme durch den User/Lead.
6. **`merge`:** Erstellung von genau **1 atomaren Git-Commit** auf dem Trunk (`main`), der das gesamte Work Package abschließt.

---

## 4. Übersicht der Work Packages

| WP-ID | Titel | Status | Fokus |
|---|---|---|---|
| **WP01** | Sichere Profil- und Begleiter-Verwaltung | `merged` | Svelte Store, 1-Wort-Regex, Bad-Word-Filter, Avatar-Wahl |
| **WP02** | PWA-Basisgerüst & Routing | `merged` | Vite + Svelte Setup, `vite-plugin-pwa`, Manifest, View-Router |
| **WP03** | State-Management & Lese-Stufen | `merged` | Didaktische 9-Stufen-Matrix, Story-Tokenisierung, Progress-Store |
| **WP04** | Themen- und Charakter-Auswahl | `spec` | 10 Themen-Kacheln, Payload-Bündelung, lokaler Mock-Generator |
| **WP05** | Audio-Sync & Karaoke-Highlighting | `spec` | Web Speech TTS, Boundary Events, 60fps DOM Word Highlighting |
| **WP06** | Lückentext & Echtzeit-Spracherkennung | `accepted` | Web Speech STT, Audio-Pause, Aussprache-Validierung, Feedback |
