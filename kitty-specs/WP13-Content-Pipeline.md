# Work Package 13: Hybride Content-Pipeline zur Massengenerierung (WP-ContentPipeline)

**ID:** `WP13`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge` [COMPLETED]

---

## 1. Ziel & Vision

Aufbau eines eigenständigen, lokalen Node.js-Skripts zur didaktischen Massengenerierung von hochwertigen Geschichten für den Grundschul-Lese-Coach. Das Skript nutzt eine hybride Zwei-Schritt-Pipeline (LLM) und speichert die generierten Geschichten als vorab silbierte, fertige JSON-Dateien im Projekt ab.

Dadurch wird die App unabhängig von teuren oder langsamen Live-LLM-Aufrufen im Browser, bleibt 100 % offline-fähig (PWA) und bietet dennoch eine riesige Vielfalt an humorvollen, didaktisch validierten Geschichten.

---

## 2. Generierungs-Umfang & Matrix

- **Matrix:** 9 Lese-Stufen $\times$ 10 Themen $\times$ 10 Geschichten = **900 einzigartige Geschichten**.
- **Kreative Kollision durch Störwörter:**  
  Jede der 10 Geschichten pro Thema und Stufe MUSS ein anderes, zufälliges **„Störwort“** (z. B. *Ufo, Sofa, Dino, Keks, Roboter, Pinguin, Trompete, Regenschirm, Zauberhut, Kaktus*) integrieren.
  - Das Störwort bricht vorhersehbare Klischees auf (z. B. *„Ein Ufo landet mitten im Zauberwald“* oder *„Ein Lama sitzt auf dem Sofa im Rittersaal“*) und sorgt für kindgerechten Witz und Lesemotivation.

---

## 3. Hybride Zwei-Schritt-Pipeline (LLM)

Um narrative Qualität, Humor und strenge didaktische Strukturvorgaben deterministisch zu vereinen, arbeitet die Generierung strikt in zwei aufeinanderfolgenden Phasen:

```
[Thema + Störwort + Zielstufe]
              │
              ▼
  ┌───────────────────────┐
  │ Step 1: Drafting      │ ➔ 4-6 Sätze freier, witziger Handlungsbogen
  │ (Plot & Kreativität)  │   (Start ➔ Konflikt ➔ Aktion ➔ Ende)
  └───────────────────────┘
              │
              ▼
  ┌───────────────────────┐
  │ Step 2: Translation   │ ➔ Didaktische Wortschatz-Filterung nach Level
  │ (Didaktik & JSON)     │ ➔ Silbentrennung ("syllables")
  └───────────────────────┘ ➔ JSON-Schema Mandat
              │
              ▼
  ┌───────────────────────┐
  │ Lokale Validierung    │ ➔ Prüfen via levelValidator & tokenizer
  │ & JSON-Ablage         │ ➔ Speichern in src/lib/data/generated-stories/
  └───────────────────────┘
```

### 3.1 Step 1 (Drafting – Kreativer Plot)
- **Input:** Thema (z. B. *Wald & Bäume*), Störwort (z. B. *Ufo*), Zielstufe (z. B. *Level 1*).
- **Aufgabe:** Das LLM entwirft einen humorvollen, spannenden Mini-Plot in 4 bis 6 Sätzen mit klassischem Handlungsaufbau:
  1. *Start:* Einleitung der Situation mit dem Thema.
  2. *Konflikt/Überraschung:* Das Störwort tritt unerwartet auf.
  3. *Aktion:* Witzige oder mutige Handlung.
  4. *Ende:* Fröhlicher, befriedigender Abschluss.

### 3.2 Step 2 (Translation & JSON-Mandat)
- **Input:** Der Entwurf aus Step 1 sowie die harten didaktischen Regeln der Zielstufe.
- **Aufgabe:** Das LLM übersetzt und formuliert den Plot exakt nach den didaktischen Vorgaben der Stufe um und gibt ausschließlich das standardisierte JSON-Schema mit getrennten Silben zurück:
```json
{
  "themeId": "theme_forest",
  "level": 1,
  "episode": 1,
  "disturberWord": "Ufo",
  "title": "Das Ufo im Moos",
  "sentences": [
    {
      "text": "Ein Ufo landet am Tor.",
      "words": [
        { "clean": "Ein", "syllables": ["Ein"] },
        { "clean": "Ufo", "syllables": ["U", "fo"] },
        { "clean": "landet", "syllables": ["lan", "det"] },
        { "clean": "am", "syllables": ["am"] },
        { "clean": "Tor", "syllables": ["Tor"] }
      ]
    }
  ]
}
```

---

## 4. Didaktische Restriktionen je Lese-Stufe

### 4.1 Level 1 (Whitelist-Fokus & Vorlese-Toleranz)
- **Satzlänge:** Maximal 5–6 Wörter pro Satz.
- **Satzanzahl:** 4 Sätze.
- **Wortschatz:** Normales, spannendes und kindgerechtes Vokabular für den Satz ist erlaubt (wird von der App flüssig vorgelesen).
- **Zwingende Positivliste für Kind-Zielwörter:**  
  Das LLM **MUSS in jedem Satz mindestens ein Nomen** aus folgender Positivliste verwenden:
  > `[Dino, Lama, Puma, Wal, Igel, Vogel, Kater, Biber, Esel, Rabe, Falke, Kamel, Tiger, Oma, Opa, Mama, Papa, Pirat, Pilot, Bruder, Vater, Bote, Maler, Hut, Tor, Sofa, Dose, Hose, Vase, Lupe, Gabel, Kabel, Tafel, Nadel, Feder, Faden, Boden, Besen, Laden, Bogen, Paket, Note, Glas, Ufo, Bus, Rad, Lok, Motor, Foto, Kino, Gras, Tal, Blume, Regen, Hafen, Ufer, Planet, Brot, Salat, Limo, Auto, Baum, Haus, Maus, Bein, Stein, Tier, Lied, Brief, Dieb]`
- *Didaktische Regelung:* Andere Wörter im Satz sind erlaubt und werden im Reader der App (TTS) zugewiesen. Die Wörter aus der Positivliste garantieren, dass für das Kind immer ein lesbares Zielwort vorhanden ist.

### 4.2 Level 2 (Wortpaar-Forscher)
- **Länge:** 4–5 Sätze.
- **Syntax:** Verbindlicher Einbau einfacher Nomen-Phrasen (*Adjektiv + Nomen* oder *Artikel + Nomen*).
- **Wortschatz:** Maximal 3 Silben pro Wort; Nomen-Phrase darf in Summe maximal 4 Silben haben.

### 4.3 Level 3–5 (Tandem-Lesen)
- **Struktur:** Didaktischer Wechsel aus Vorlesen durch die App und Kind-Leseabschnitten.
- **Kind-Sätze:** Kurze, einfache Sätze bzw. Phrasen (3–5 Wörter, max. 7 Silben in Phase A).
- **App-Sätze:** Längere, atmosphärische Erzählsätze (6–8 Wörter, reichhaltiger Wortschatz).

### 4.4 Phase C (Level 7–9: Lesefluss & Ausdauer)
- **Längenskalierung:**
  - **Level 7 (Mini-Abenteuer):** ~30 Wörter (ca. 5–7 Sätze).
  - **Level 8 (Mittlere Geschichte):** ~60 Wörter (ca. 8–12 Sätze mit Dialogen, ?, !).
  - **Level 9 (Meisterleser):** 100+ Wörter (12–18 Sätze, vollständige Mini-Kapitel).

---

## 5. Atomare Tasks (Plan)

```
[Task 1: Störwort-Katalog & Generierungs-Matrix anlegen]
      │
      ▼
[Task 2: Prompt-Engineering für Step 1 (Drafting) & Step 2 (Translation + Whitelist)]
      │
      ▼
[Task 3: Node-Pipeline-Skript scripts/generate-stories.ts implementieren]
      │
      ▼
[Task 4: Automatisierte Validierungs-Schleife mit levelValidator & Tokenizer]
      │
      ▼
[Task 5: Speicherung & Dateistruktur unter src/lib/data/stories/]
      │
      ▼
[Task 6: Anbindung der generierten Geschichten an den storyConfigStore]
      │
      ▼
[Task 7: Test-Verifikation & Technical Evidence]
```

### Task 1: Störwort-Katalog & Themen-Konfiguration
- Definition eines Pools von mindestens 20 witzigen Störwörtern.
- Zuordnung von 10 eindeutigen Störwörtern pro Thema.

### Task 2: Prompt-Engineering (Drafting & Level-Regeln)
- System-Prompts für Step 1 (Plot-Entwurf mit Störwort-Kollision).
- System-Prompts für Step 2 mit striktem JSON-Schema und der Level-1-Positivliste.

### Task 3: Node-Pipeline-Skript (`scripts/generate-stories.ts`)
- Erstellung eines CLI-Skripts (mit Parametern für `--level`, `--theme`, `--count`).
- Einbindung eines LLM-Providers (z. B. Gemini API SDK / REST) mit Fehlerbehandlung und Rate-Limiting.

### Task 4: Lokale Validierungsschleife
- Nach jedem generierten JSON-Objekt automatischer Aufruf von `validateStoryForLevel` und `tokenizeStory`.
- Automatischer Retry, falls ein Satz in Level 1 kein Wort aus der Positivliste enthält.

### Task 5: JSON-Dateistruktur
- Strukturierte Ablage unter `src/lib/data/stories/level-[1-9]/[themeId].json`.

### Task 6: Store-Integration
- Anpassen von `storyConfigStore.ts`: Falls vorberechnete JSON-Dateien für das Thema existieren, wird zufällig eine der 10 Episoden geladen; Mock-Generator fungiert als Fallback.

### Task 7: Tests & Nachweiserbringung
- Vitest-Tests für die Story-Loader und die Validierung der generierten Dateien.
- Ablage der Technical Evidence unter `kitty-specs/evidence/WP13/`.

---

## 6. Akzeptanzkriterien

- [x] Das Skript `scripts/generateStories.ts` führt die Zwei-Schritt-Pipeline (Drafting ➔ Translation/JSON) aus.
- [x] In Level 1 enthält jeder Satz mindestens ein Nomen aus der didaktischen Positivliste.
- [x] Jede Geschichte bindet das zugewiesene Störwort narrativ ein.
- [x] Alle generierten Geschichten bestehen die interne Validierung (`validateStoryForLevel` & `tokenizeStory`).
- [x] Die generierten Geschichten sind als formatierte JSON-Dateien abgelegt und im Frontend abrufbar.
- [x] Beim Stufen- oder Episodenwechsel im Reader wird jedes Mal eine neue, abwechslungsreiche Episode angezeigt.
- [x] Alle Unit-Tests und Builds (`npm test`, `npm run build`) sind erfolgreich grün.
