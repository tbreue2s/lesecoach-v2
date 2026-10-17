# Work Package 14: Ergonomisches Kinder-UI & Lesefluss-Redesign (WP-ChildErgonomics)

**ID:** `WP14`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge` [COMPLETED]

---

## 1. Analyse des Ist-Zustands & Didaktische Motivation

Für Kinder der 1. und 2. Klasse (6–8 Jahre) muss eine Lese-App radikal geradlinig, visuell ruhig und ohne motorische Hürden (wie manuelles Suchen von verschwundenen Buttons oder Scrollen mitten im Vorlesen) bedienbar sein.

### Identifizierte Schwachstellen im aktuellen GUI:
1. **Redundante Screens (`home` vs. `adventure-setup`):**
   - `HomeScreen.svelte` und `StoryAdventureScreen.svelte` (`StoryTopicPicker.svelte`) bieten nahezu exakt dieselbe Funktionalität (Stufenwahl + 10 Themen-Kacheln + Start-Button).
   - Je nachdem, ob das Kind im Reader auf „Übersicht“ oder „Neues Abenteuer“ tippt, landet es auf zwei unterschiedlichen, aber fast gleich aussehenden Screens.
2. **Zu viele Buttons & kognitive Überfrachtung im Reader:**
   - Im `ReaderScreen` konkurrieren über **15 interaktive Elemente** und **3 gestapelte Kopfleisten** (`reader-nav-header`, `level-stepper-bar`, `session-status-bar` mit doppelter Stufenanzeige).
   - `MockReadingControls.svelte` zeigt **8 gleichrangige Buttons**, darunter Entwickler-Funktionen (`[Dev: Simuliere Wort]`, `Satz geschafft`) und englische Fachbegriffe (`Repeated Reading`).
3. **Wichtige Bedien-Buttons verschwinden aus dem Sichtfeld:**
   - Durch das herkömmliche Seiten-Layout (`min-height: 100vh`) wandert die Button-Leiste (`MockReadingControls`) bei längeren Geschichten (Stufe 3–9 mit 6 bis 20 Sätzen) weit unter den unteren Bildschirmrand.
   - Auf kleineren Bildschirmen/Tablets rutscht auch der große Start-Button auf dem `HomeScreen` unter die Falz („below the fold“).
4. **Fehlendes Mitscrollen beim Lesen:**
   - `ReadingSessionView.svelte` besitzt keinerlei Auto-Scroll-Logik (`scrollIntoView`). Wandert der Lesefokus weiter nach unten, liest das Kind aus dem sichtbaren Fenster heraus und müsste während des Sprechens manuell nachscrollen.

---

## 2. Ziel-Architektur & UX-Redesign

### 2.1 Weniger Screens: 3-Screen-Architektur
- **Entfall des separaten `adventure-setup`-Screens:**
  - Es gibt nur noch **3 klare Ansichten**:
    1. **`home` (`HomeScreen.svelte`):** Kompaktes Abenteuer-Start-Deck (Kompakter Profil-/Stufen-Header + 10 Themen-Kacheln + permanent sichtbarer Start-Button).
    2. **`reader` (`ReaderScreen.svelte`):** Fokus-Lesebuch mit fester Kopfzeile, zentriert mitscrollender Lesebühne und permanent sichtbarem Steuerpult am unteren Rand.
    3. **`settings` (`SettingsScreen.svelte` / `ProfileSetup.svelte`):** Name & Begleiter-Auswahl (nur beim Erststart oder gezieltem Klick auf `⚙️`).
  - `routerStore.goToAdventureSetup()` leitet nahtlos auf `'home'` weiter (volle Abwärtskompatibilität für bestehende Store-Tests).

### 2.2 Weniger Buttons: Fokus auf maximal 3 kindgerechte Kern-Aktionen
- **Kopfzeile im Reader (1 Leiste statt 3):**
  - Verschmelzung von Navigation (`← Themen`), Begleiter-Badge, kompakter Stufen-Wahl (`◀ Stufe X ▶`) und Sterne-Zähler (`⭐ X`) in **eine einzige, ruhige Top-Bar**.
- **Kindgerechtes Steuerpult (`MockReadingControls.svelte`):**
  - **Während des Lesens (`!isSessionComplete`):** Nur **3 große, selbsterklärende Kinder-Buttons** in der Hauptleiste:
    1. `🔊 Vorlesen` / `⏸️ Pause` (Primärer Start-/Pausen-Button, `#mock-start-audio-btn` / `#mock-pause-audio-btn`)
    2. `💡 Silben-Hilfe` (Aktiviert Silbenbögen/Farben für das aktuelle Wort, `#mock-syllable-help-btn`)
    3. `👉 Wort weiter` (Hilft sofort weiter, falls das Mikrofon ein Wort nicht erkennt, `#mock-word-success-btn`)
  - **Bei geschaffter Geschichte (`isSessionComplete === true`):**
    - Fokus auf **2 große Belohnungs-Buttons**: `✨ Nächste Geschichte` (`#mock-next-story-btn`) und `🔄 Nochmal lesen` (`#mock-restart-btn`).
  - **Auslagerung der Dev-Buttons:**
    - Die 3 technischen Test-Buttons (`⭐ [Dev: Simuliere Wort]`, `🔄 Satz nochmal hören`, `✅ Satz überspringen`) werden standardmäßig ausgeblendet und sind nur über einen kleinen, dezenten **`🛠️`**-Toggle für Entwickler/Eltern aufklappbar.

### 2.3 Immer sichtbare Buttons: Fixed Viewport Shell (`100dvh`) & Sticky Action Bars
- **Reader-Viewport (`100dvh` Flex-Shell):**
  - `ReaderScreen` nutzt ein festes Viewport-Layout (`height: 100dvh; display: flex; flex-direction: column; overflow: hidden`).
  - **Oben:** Feste `reader-top-bar` (`flex-shrink: 0`).
  - **Mitte:** Scrollbare Lese-Bühne (`flex: 1; overflow-y: auto`).
  - **Unten:** Fest verankertes **Control Dock** (`flex-shrink: 0`), das den aktuellen Sprech-/Hör-Status (`🦦 Ich höre dir zu!`) und die 3 großen Bedien-Buttons **immer sichtbar** am unteren Rand hält.
- **Home & Settings Sticky-Footer:**
  - Auf `HomeScreen` und `ProfileSetup` bleibt der große Haupt-Button (`#start-reading-btn` bzw. `#save-profile-btn`) per `position: sticky; bottom: 0` immer im sichtbaren Bereich.

### 2.4 Bessere Lese-Ergonomie & Teleprompter-Auto-Scroll
- **Automatisches Zentrieren (`scrollIntoView`):**
  - In `ReadingSessionView.svelte` beobachtet eine reaktive Scroll-Funktion Änderungen an `activeSentenceIndex`, `activeWordTokenId` und `karaokeWordTokenId`.
  - Der jeweils aktive Satz (`#sentence-row-{activeSentenceIndex}`) wird automatisch sanft in die vertikale Mitte der Lese-Bühne gescrollt (`scrollIntoView({ behavior: 'smooth', block: 'center' })`).
- **Visuelle Fokus-Hierarchie (Focus Dimming):**
  - Der **aktive Satz** ist groß, kontrastreich und optisch hervorgehoben.
  - **Bereits gelesene** sowie **kommende Sätze** werden sanft abgedunkelt (`opacity: 0.45`), sodass die Augen des Kindes niemals die Zeile verlieren.
  - Großzügiges vertikales Scroll-Padding (`padding-block: 15vh`) ermöglicht, dass auch der erste und letzte Satz mittig im Lesefokus stehen können.
  - Englische Begriffe wie „Repeated Reading“ werden durch kindgerechte deutsche Formulierungen ersetzt (*„🔄 Gemeinsam-Satz“*).

---

## 3. Akzeptanzkriterien

- [ ] **Screen-Konsolidierung:** `App.svelte` und `routerStore.ts` nutzen `HomeScreen` als einzigen Themen-Auswahlscreen (`goToAdventureSetup` navigiert auf `'home'`).
- [ ] **Immer sichtbare Buttons:** Im `ReaderScreen` sind Kopfzeile und unteres Bedien-Dock (`🔊 Vorlesen/Pause`, `💡 Silben-Hilfe`, `👉 Wort weiter`) bei jeder Geschichtenlänge (Stufe 1 bis 9) ohne Scrollen permanent sichtbar.
- [ ] **Sticky Start-Button auf Home & Settings:** `#start-reading-btn` auf `HomeScreen` ist durch kompaktere Header-Gestaltung und Sticky-Footer sofort sichtbar.
- [ ] **Weniger Buttons:** Kinder sehen beim Lesen maximal 3 große Haupt-Buttons; technische Dev-Buttons sind standardmäßig hinter einem `🛠️`-Toggle eingeklappt.
- [ ] **Automatisches Mitscrollen beim Lesen:** Beim Wechsel des aktiven Satzes oder Wortes scrollt die Lese-Bühne den aktiven Satz sanft in die Bildschirmmitte (`block: 'center'`).
- [ ] **Visueller Zeilenfokus:** Nicht-aktive Sätze sind optisch abgedämpft (`opacity`), der aktive Satz sticht klar hervor; englischer Jargon („Repeated Reading“) ist kindgerecht eingedeutscht.
- [ ] **Volle Test- & Build-Kompatibilität:** Alle bestehenden und neuen Vitest-Tests (`npm test`) sowie der Produktions-Build (`npm run build`) laufen fehlerfrei durch.
