# Work Package 04: Themen- und Charakter-Auswahl für Geschichten

**ID:** `WP04`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merged`

---

## 1. Ziel & Umfang
Bereitstellung eines interaktiven, kindgerechten Konfigurationsmoduls ("Neues Lese-Abenteuer"), in dem das Kind vor dem Lesen sein Lieblingsthema, seine Lese-Stufe und seinen Begleiter auswählt. Die Konfiguration wird in einem strukturierten `StoryConfigPayload`-Objekt gebündelt, an einen lokalen Mock-Story-Generator übergeben und startet direkt im Reader-Screen.

---

## 2. Technische Spezifikation

### 2.1 Datenmodell & Story-Request-Payload
```typescript
export interface StoryTheme {
  id: string;
  label: string;
  icon: string;
}

export interface StoryConfigPayload {
  level: number; // 1 bis 9 (aus WP03 Level-Matrix)
  childName: string; // fest gesetzt aus WP01 Profil
  companion: {
    id: string;
    name: string;
    type: string;
    icon: string;
  } | null;
  theme: StoryTheme;
}
```

### 2.2 Vordefinierte Themen-Kacheln (10 Themen)
1. 🌲 **Wald & Bäume** (`theme_forest`)
2. 🧙 **Zauberer** (`theme_wizard`)
3. 🐴 **Pferde** (`theme_horse`)
4. 🦄 **Einhörner** (`theme_unicorn`)
5. 🦸 **Superhelden** (`theme_superhero`)
6. 🌊 **Wasser & Meer** (`theme_ocean`)
7. 💎 **Schatzsuche** (`theme_treasure`)
8. 🏴‍☠️ **Piraten** (`theme_pirate`)
9. 🦕 **Dinosaurier** (`theme_dino`)
10. 🚀 **Weltall & Sterne** (`theme_space`)

*Regel:* Maximal **1 aktives Thema** wählbar (Single-Select).

### 2.3 Lokaler Mock-Story-Generator
- Noch **kein** externer LLM-Aufruf.
- Deterministische Generierung oder Auswahl einer didaktisch passenden Geschichte für jedes der 10 Themen.
- Dynamische Einbettung von `childName` und `companion.name` in die Textbausteine.
- Automatische Tokenisierung passend zum gewählten Level (1–9).

### 2.4 Store & Routing Integration
- Svelte-Store `storyConfigStore`: Verwaltet die aktive Themenwahl und das generierte Payload-Objekt.
- Neuer Screen oder Flow `story-picker` / Modal "Neues Lese-Abenteuer".
- Klick auf *"🚀 Los geht's – Abenteuer starten!"* erzeugt die Geschichte und wechselt nahtlos zum `Reader`-Screen.

---

## 3. UI/UX Anforderungen (1./2. Klasse)
- **Große, farbenfrohe Themen-Kacheln:** 10 interaktive Buttons mit großen Emojis und gut lesbarer Fibel-Schrift.
- **Aktive Auswahl:** Klar sichtbarer goldener/blauer Fokus-Rahmen (`selected`) mit Häkchen.
- **Charakter-Vorschau:** Anzeige von Kind-Name und Begleiter-Icon.
- **Stufen-Wahl:** Integrierter Schnellwähler für die Lese-Stufe (1–9).
- **Farbschema:** Konsequente Einhaltung des augenfreundlichen Buchseiten-Designs (#FBF9F5, kein #FFFFFF).

---

## 4. Akzeptanzkriterien
- [ ] Alle 10 Themen (Wald, Zauberer, Pferde, Einhörner, Superheld, Meer, Schatz, Pirat, Dino, Weltall) sind wählbar.
- [ ] Genau 1 Thema ist aktiv (Single-Select).
- [ ] Kind-Name wird fest aus dem `profileStore` übernommen; Begleiter ist konfigurierbar.
- [ ] `StoryConfigPayload` wird mit Level, Kind-Name, Begleiter und Thema vollständig erzeugt.
- [ ] Lokaler Mock-Generator erzeugt für jedes Thema eine kindgerechte, tokenisierbare Geschichte.
- [ ] Klick auf den Start-Button leitet mit der konfigurierten Geschichte in den `Reader`-Screen weiter.
- [ ] Unit-Tests für `storyConfigStore`, Payload-Erzeugung und Mock-Story-Generator sind vorhanden und grün.

---

## 5. Review- & Evidence-Vorgabe (für `in_review`)
- Unit-Test-Nachweis für alle 10 Themen-Story-Generierungen und Payload-Validierung.
- Build-Log (`npm run build`) ohne Fehler.
- Nachweis der nahtlosen Navigation von Themen-Auswahl zu Reader.
