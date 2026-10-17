# Tasks: Work Package 14 – Ergonomisches Kinder-UI & Lesefluss-Redesign

**ID:** `WP14-TASKS`  
**Parent Spec:** [WP14-ergonomisches-kinder-ui-redesign.md](file:///home/thomas/projects/lesecoach-v2/kitty-specs/WP14-ergonomisches-kinder-ui-redesign.md)  
**Lifecycle Status:** `merged`

---

## Task Overview

```
[Task 1: Screen-Konsolidierung (Entfall des redundanten Adventure-Setup-Screens in routerStore & App.svelte)]
      │
      ▼
[Task 2: Kompaktes HomeScreen-Design mit vereintem Top-Header & Sticky Start-Button]
      │
      ▼
[Task 3: ReaderScreen 100dvh App-Shell (Vereinte Kopfzeile + Scroll-Bühne + Sticky Bottom Dock)]
      │
      ▼
[Task 4: ReadingSessionView – Automatisches Mitscrollen (Teleprompter) & Visueller Zeilen-Fokus]
      │
      ▼
[Task 5: Kindgerechtes 3-Button-Steuerpult & Einklappbares Dev-Menü in MockReadingControls]
      │
      ▼
[Task 6: Kompaktes ProfileSetup mit Sticky Save-Button]
      │
      ▼
[Task 7: Vitest Unit Tests, Build-Verifikation & Technical Evidence]
```

---

## Detailed Tasks

### Task 1: Screen-Konsolidierung (`src/lib/stores/routerStore.ts`, `src/App.svelte`)
- Konsolidieren der redundanten Themen-Auswahlansichten (`home` und `adventure-setup`):
  - In `routerStore.ts`: `goToAdventureSetup()` und `navigate('adventure-setup')` routen direkt auf `'home'` (bei aktivem Route-Guard auf `'settings'`, falls das Profil noch nicht konfiguriert ist).
  - In `App.svelte`: Entfernen der doppelten `StoryAdventureScreen`-Weiche und Anpassung des `.app-viewport` für ein sauberes Full-Viewport-Verhalten ohne unnötige Außenabstände im Reader-Modus.

### Task 2: Ergonomischer `HomeScreen` ohne Scroll-Zwang (`src/lib/components/screens/HomeScreen.svelte`)
- Zusammenlegen der bisherigen 3 oberen Boxen (`OtterFeedback`, `hero-card`, `level-bar-section`) zu einer **einzigen, kompakten Top-Leiste**:
  - Links: Begleiter-Avatar + kurze Sprechblasen-Begrüßung mit Vorlese-Button (`🔊`) + Kind-Name (`⭐`).
  - Rechts: Stufen-Button (`🎯 Stufe X ▼`) und kompakter Profil-Ändern-Button (`⚙️`).
- Darunter direkt das 10er-Themen-Grid mit großen, kontraststarken Kacheln.
- Verankerung des großen Start-Buttons (`#start-reading-btn`, *„Los geht's – Geschichte lesen!“*) in einem **Sticky Bottom Footer**, damit er auf jedem Bildschirm (auch Tablet-Querformat) immer sofort sichtbar und bedienbar ist.

### Task 3: `ReaderScreen` als feste `100dvh` App-Shell (`src/lib/components/screens/ReaderScreen.svelte`)
- Umbau des `.reader-screen` auf ein festes Viewport-Layout (`height: 100dvh; max-height: 100dvh; display: flex; flex-direction: column; overflow: hidden`):
  - **Feste Kopfzeile (`reader-top-bar`):** Vereint `← Themen` (`#reader-back-btn`), die kompakte Stufen-Steuerung (`#prev-level-btn`, `#toggle-level-btn`, `#next-level-btn`), das Begleiter-Badge und den Sterne-Zähler (`⭐`) in **einer einzigen Leiste**.
  - **Scrollbare Lese-Bühne (`book-scroll-stage`):** Nimmt den mittleren Bereich ein (`flex: 1; overflow-y: auto; scroll-behavior: smooth`).
  - **Festes Bottom Control Dock (`reader-bottom-dock`):** Hält die Steuer-Buttons am unteren Bildschirmrand permanent sichtbar (`flex-shrink: 0`).

### Task 4: Automatisches Mitscrollen & Lesefokus (`src/lib/components/ReadingSessionView.svelte`)
- **Entfernen redundanter Statusleisten:** Die doppelte Stufen-/Sterne-Leiste innerhalb von `ReadingSessionView` entfällt (da bereits in der festen Kopfzeile von `ReaderScreen` sichtbar).
- **Teleprompter Auto-Scroll:**
  - Jede Satz-Zeile erhält eine deterministische ID (`sentence-row-{sIndex}`).
  - Reaktiver Auto-Scroll (`afterUpdate` / reaktiver Block auf `session.activeSentenceIndex` und `session.activeWordTokenId` / `session.karaokeWordTokenId`): Scrollt den aktuellen Satz sanft in die vertikale Mitte der Lese-Bühne (`scrollIntoView({ behavior: 'smooth', block: 'center' })`), inklusive sicherem Fallback für Test-Umgebungen (jsdom).
- **Visuelle Fokus-Hierarchie & Kindgerechte Sprache:**
  - Aktiver Satz (`current-sentence`): Volle Deckkraft (`opacity: 1`), leicht vergrößert, warme Hervorhebung.
  - Bereits gelesene (`completed-sentence`) und kommende Sätze (`upcoming-sentence`): Sanft gedimmt (`opacity: 0.45`), bei Klick/Fokus jederzeit zentrierbar.
  - Ausreichend vertikaler Scroll-Freiraum (`padding-block: 14vh`), damit auch der erste und letzte Satz mittig im Lesefokus stehen.
  - Ersetzen des englischen Begriffs „Repeated Reading“ durch kindgerechtes Deutsch (*„🔄 Gemeinsam-Satz“*).

### Task 5: Entschlacktes 3-Button-Steuerpult (`src/lib/components/MockReadingControls.svelte`)
- Integration des kompakten Turn-Hinweises (*„🦦 Ich höre dir zu – lies das gelbe Wort!“* bzw. *„🔊 Dein Begleiter liest vor...“*) direkt in das feste untere Steuer-Dock.
- Reduktion der primären Kinder-Buttons während des Lesens (`!session.isSessionComplete`) auf **maximal 3 große, immer sichtbare Buttons**:
  1. `🔊 Vorlesen` (`#mock-start-audio-btn`) bzw. `⏸️ Pause` (`#mock-pause-audio-btn`)
  2. `💡 Silben-Hilfe` (`#mock-syllable-help-btn`)
  3. `👉 Wort weiter` (`#mock-word-success-btn`)
- Wenn `session.isSessionComplete === true`:
  - Anzeige von **2 großen Abschluss-Buttons**: `✨ Nächste Geschichte` (`#mock-next-story-btn`) und `🔄 Nochmal lesen` (`#mock-restart-btn`).
- **Einklappbares Dev-Menü (`🛠️`):**
  - Die Entwickler-/Test-Buttons (`#mock-simulate-correct-word-btn`, `#mock-repeat-btn`, `#mock-sentence-success-btn`) werden hinter einem kleinen `🛠️`-Toggle versteckt, sodass Kinder nicht abgelenkt werden, aber alle IDs/Funktionen für manuelle Tests erhalten bleiben.

### Task 6: Kompaktes `ProfileSetup` mit Sticky Save-Button (`src/lib/components/ProfileSetup.svelte`)
- Kompakteres Spacing der Eingabefelder und des Begleiter-Grids.
- Verankerung des Speichern-Buttons (`#save-profile-btn`) in einem `position: sticky; bottom: 0`-Footer, damit er ohne Scrollen immer sichtbar bleibt.

### Task 7: Vitest Unit Tests & Technical Evidence
- Anpassung/Erweiterung von `src/lib/stores/routerStore.test.ts` (Prüfung der Screen-Konsolidierung).
- Ausführung aller Unit-Tests (`npm test -- --run`) und des Produktions-Builds (`npm run build`).
- Dokumentation der Ergebnisse in `kitty-specs/evidence/WP14/evidence-wp14.md`.
