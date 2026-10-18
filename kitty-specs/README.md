# Spec-Kitty Dashboard: Lese-Coach (PWA)

Willkommen in der Spezifikations- und Aufgabensteuerung für das Projekt **Lese-Coach**.

---

## 📜 Projekt-Doctrine
- [00-project-doctrine.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/00-project-doctrine.md) – Grundregeln, Architektur (Svelte, PWA, Web Speech), didaktisches Leitbild und Governance.

---

## 🚦 Work Packages (Sequenzieller Ablauf)

| WP-ID | Paket-Name | Status | Spezifikation |
|---|---|---|---|
| **WP01** | Sichere Profil- und Begleiter-Verwaltung | `merged` | [WP01-profil-begleiter-verwaltung.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP01-profil-begleiter-verwaltung.md) |
| **WP02** | PWA-Basisgerüst & Routing | `merged` | [WP02-pwa-basisgeruest-routing.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP02-pwa-basisgeruest-routing.md) |
| **WP03** | State-Management & Lese-Stufen (9-Stufen-Matrix) | `merged` | [WP03-state-management-lesestufen.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP03-state-management-lesestufen.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP03-tasks.md) |
| **WP04** | Themen- und Charakter-Auswahl für Geschichten | `merged` | [WP04-themen-charakter-auswahl-geschichten.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP04-themen-charakter-auswahl-geschichten.md) |
| **WP05** | Audio-Sync & Karaoke-Highlighting im DOM | `merged` | [WP05-audio-sync-karaoke-highlighting.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP05-audio-sync-karaoke-highlighting.md) |
| **WP06** | Lückentext & Echtzeit-Spracherkennung | `accepted` | [WP06-lueckentext-echtzeit-spracherkennung.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP06-lueckentext-echtzeit-spracherkennung.md) |
| **WP07** | Tokenizer Refactoring (Didaktischer Schiedsrichter) | `accepted` | [WP07-tokenizer-refactor.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP07-tokenizer-refactor.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP07-tasks.md) |
| **WP08** | Level-basierte Text-Generierung & Prompt-Templates | `accepted` | [WP08-story-gen.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP08-story-gen.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP08-tasks.md) |
| **WP09** | Didaktische Phonem-Gewichtung (Dauerlaute vs. Plosive) | `merged` | [WP09-phoneme-scoring-refinement.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP09-phoneme-scoring-refinement.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP09-tasks.md) |
| **WP10** | Name-Längenbegrenzung (20 Zeichen) & Prompt Injection Guard | `merged` | [WP10-name-length-limit-prompt-injection-guard.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP10-name-length-limit-prompt-injection-guard.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP10-tasks.md) |
| **WP11** | Stufe 1 Didaktische Komplexitätsgrenze (Score = 0) | `merged` | [WP11-stufe-1-didaktische-komplexitaet-score-null.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP11-stufe-1-didaktische-komplexitaet-score-null.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP11-tasks.md) |
| **WP12** | Stufengerechte & Skalierende Geschichten-Generierung | `merged` | [WP12-didaktische-geschichten-skalierung-und-vokabular-differenzierung.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP12-didaktische-geschichten-skalierung-und-vokabular-differenzierung.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP12-tasks.md) |
| **WP13** | Hybride Content-Pipeline zur Massengenerierung | `merged` | [WP13-Content-Pipeline.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP13-Content-Pipeline.md) |
| **WP14** | Ergonomisches Kinder-UI & Lesefluss-Redesign | `merged` | [WP14-ergonomisches-kinder-ui-redesign.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP14-ergonomisches-kinder-ui-redesign.md) / [Tasks](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP14-tasks.md) |
| **WP15** | TTS Voice Quality & Natural Audio Pipeline | `merged` | [WP15-tts-voice-quality.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP15-tts-voice-quality.md) |
---

## 🔄 Lifecycle-Phasen
`spec` ➔ `plan` ➔ `tasks` ➔ `in_review` (mit Evidence) ➔ `accept` ➔ `merge`
