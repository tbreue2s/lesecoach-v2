# Work Package 02: PWA-Basisgerüst & Routing

**ID:** `WP02`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Ziel & Umfang
Erstellung des Projektfundaments mit Vite und Svelte, Integration von `vite-plugin-pwa` zur Erzeugung eines validen PWA-Manifests und Service Workers, sowie Bereitstellung eines schlanken, reaktiven Screen- bzw. View-Routings (z. B. Onboarding, Dashboard/Story-Auswahl, Lese-Ansicht, Belohnungen).

---

## 2. Technische Spezifikation

### 2.1 PWA Konfiguration (`vite.config.ts`)
- **Plugin:** `vite-plugin-pwa`
- **Manifest:**
  - Name: "Lese-Coach: Dein interaktiver Lese-Begleiter"
  - Short Name: "LeseCoach"
  - Theme Color: `#4F46E5` / `#38BDF8` (kindgerechte Farbpalette)
  - Background Color: `#F8FAFC`
  - Display: `standalone`
  - Orientation: `portrait` / `any`
  - Icons: SVG und maskierbare PNGs (192x192, 512x512).
- **Service Worker:** Cache-First Strategie für Fonts, Audio-Assets und Icons.

### 2.2 Routing-Architektur
- Schlankes, store-basiertes View-Routing (ohne schwergewichtige Router-Bibliotheken):
  ```typescript
  type AppView = 'profile-setup' | 'dashboard' | 'reader' | 'rewards';
  ```
- Automatischer Guard: Wenn kein Profil im Store vorhanden ist, Weiterleitung zu `profile-setup`.

### 2.3 Design-System & Typography
- Integration von gut lesbaren Fonts für Leseanfänger (z. B. Lexend / Comic Neue / Inter).
- CSS Custom Properties für Farb-Tokens, Schriftgrößen (Skalierung für 1./2. Klasse min. 24px im Fließtext) und Animationen.

---

## 3. Akzeptanzkriterien
- [ ] Vite + Svelte Projekt kompiliert fehlerfrei mit TypeScript.
- [ ] `vite-plugin-pwa` generiert `manifest.webmanifest` und Service Worker.
- [ ] Lighthouse PWA Audit Kriterien (Installability, Theme-Color, Icons) sind erfüllt.
- [ ] Reaktiver Navigation-Store schaltet zuverlässig zwischen Views um.
- [ ] Route Guard greift: Ohne Profil landet der Nutzer immer im Onboarding.

---

## 4. Review- & Evidence-Vorgabe (für `in_review`)
- Build-Log mit erfolgreicher PWA-Asset-Generierung.
- Überprüfung des Manifest-Outputs via JSON-Snapshot.
- Test-Nachweis der Routing-Logik und des Route Guards.
