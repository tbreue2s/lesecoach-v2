# Technical Evidence: Work Package 02 (PWA-Basisgerüst, Screen-Routing & Reader-Layout)

**WP-ID:** `WP02`  
**Datum:** 2026-10-08  
**Status:** `in_review`  
**Ziel:** Nachweis des PWA-Fundaments (`vite-plugin-pwa`), des reaktiven 3-Screen-Routings mit Route Guard, des Reader-Layouts und des buchseiten-cremeweißen Designsystems (kein Reinweiß `#FFFFFF`).

---

## 1. PWA & Service Worker Build-Nachweis (`npm run build`)

Der Production-Build generiert erfolgreich das Web App Manifest, den Service Worker und das Offline-Precache-Bundle:

```text
> lesecoach-v2@0.1.0 build
> vite build

vite v5.4.21 building for production...
✓ 127 modules transformed.                     
dist/registerSW.js               0.13 kB
dist/manifest.webmanifest        0.42 kB
dist/index.html                  1.13 kB │ gzip:  0.59 kB
dist/assets/index-D-hfufH4.css  13.59 kB │ gzip:  2.77 kB
dist/assets/index-RxYG9GXv.js   58.21 kB │ gzip: 21.87 kB
✓ built in 546ms

PWA v2.0.0
mode      generateSW
precache  7 entries (72.24 KiB)
files generated
  dist/sw.js
  dist/workbox-835c8c05.js
```

### 1.1 Web App Manifest (`dist/manifest.webmanifest`)
- **Display:** `standalone`
- **Theme Color:** `#FBF9F5` (sanftes Buchseiten-Cremeweiß)
- **Background Color:** `#FBF9F5`
- **Icons:** SVG Maskable App-Icon (`/pwa-icon.svg`)

---

## 2. Screen-Routing & Route Guard Nachweis (Vitest)

Die Unit- und Integrationstests in `src/lib/stores/routerStore.test.ts` bestätigen das deterministische Umschalten zwischen allen 3 Screens sowie das Greifen des Route Guards:

```text
✓ src/lib/stores/routerStore.test.ts (2 tests)
  ✓ Screen-Routing & Route Guard (WP02)
    ✓ enforces Route Guard: unconfigured profile redirects to settings screen
    ✓ allows full navigation between Home, Reader, and Settings when profile is configured

Test Files  3 passed (3)
Tests       13 passed (13)
Duration    1.29s
```

### 2.1 Screen-Architektur:
1. **`Home` ([HomeScreen.svelte](file:///home/thomas/projects/lesecoach-v2/src/lib/components/screens/HomeScreen.svelte)):**
   - Begrüßung durch den Otter ("Hallo [Kind]! 🦦") mit Audio-Ausgabe.
   - Hero-Card mit gewähltem Begleiter-Icon, Name und Kind-Badge.
   - Großer, kindgerechter Aktions-Button 📖 *"Jetzt Geschichte lesen!"* ➔ Wechsel zu `Reader`.
   - Sekundärer Button ⚙️ *"Begleiter oder Name ändern"* ➔ Wechsel zu `Settings`.

2. **`Settings` ([SettingsScreen.svelte](file:///home/thomas/projects/lesecoach-v2/src/lib/components/screens/SettingsScreen.svelte)):**
   - Nahtlose Integration der Profil- und Begleiterverwaltung (WP01).
   - "Zurück zur Übersicht"-Navigation.
   - Automatisches Weiterleiten zu `Home` nach erfolgreichem Speichern.

3. **`Reader` ([ReaderScreen.svelte](file:///home/thomas/projects/lesecoach-v2/src/lib/components/screens/ReaderScreen.svelte)):**
   - Zentrierter Buchseiten-Container (`#F5EFE6` / `#FBF9F5`).
   - Große Fibel-Typografie (Lexend / Andika, 28px+, Zeilenabstand 1.8).
   - Header mit Begleiter-Pille (`🐶 Bello liest mit`) und "← Übersicht"-Button.
   - Vorlese-Demo-Button für Audio-Testing.

---

## 3. Styling- & Farbsystem-Nachweis
- **Kein Dark-Mode-Umschalter**
- **Kein Reinweiß (`#FFFFFF`)** im gesamten Designsystem.
- **Feste Farb-Tokens:**
  - Hintergrund: `#FBF9F5` (Augenfreundliches Buchseiten-Creme)
  - Textfarbe: `#2D3748` (Dunkles Schiefergrau)
  - Akzentfarbe / Buttons: `#2B6CB0` (Kindgerechtes Petrol / Warm-Blau)
  - Card-Surface: `#F5EFE6` / `#FAF7F0`
  - Rahmen: `#E2D9CC`
