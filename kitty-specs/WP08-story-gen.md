# Work Package 08: Level-basierte Text-Generierung & Prompt-Templates (WP-StoryGen)

**ID:** `WP08`  
**Status:** `spec`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Ziel & Umfang
LLM-Prompts erzeugen gezielt einfache Fibel-Texte passend zur 9-Stufen-Matrix, anstatt beliebigen Text in den Tokenizer zu werfen. Ein UI-Grid zur Themen- & Charakterauswahl liefert die Basis-Parameter für den LLM-Generator.

---

## 2. Technische Spezifikation

### 2.1 System-Prompts & JSON-Output-Mandat

**1. Globales JSON-Format für alle Level:**
Das LLM darf keinen reinen Text zurückgeben, sondern MUSS strikt folgendes JSON-Schema erfüllen, um dem Frontend die fehleranfällige Silbentrennung abzunehmen:
```json
{
  "sentences": [
    {
      "text": "Emil sieht einen Hund.",
      "words": [
        { "clean": "Emil", "syllables": ["E", "mil"] },
        { "clean": "sieht", "syllables": ["sieht"] },
        { "clean": "einen", "syllables": ["ei", "nen"] },
        { "clean": "Hund", "syllables": ["Hund"] }
      ]
    }
  ]
}
```

**2. Strikte didaktische Prompts nach Lese-Stufe:**
Um komplexe Wörter wie "Zauberschule" oder "Seifenblasen" zu verhindern, erhalten die Prompts harte Verbote und genaue Vorgaben:

- **Level 1 Prompt:**
  - **Länge:** Exakt 4 Sätze. Max. 4-5 Wörter pro Satz.
  - **Syntax:** Nur einfache Hauptsätze (Subjekt-Prädikat-Objekt). Keine Nebensätze, kein Komma.
  - **Wortschatz-Restriktion:** Verwende AUSSCHLIESSLICH 1- bis 2-silbige Wörter. KEINE Komposita (zusammengesetzten Nomen). KEINE Wörter mit `ß`, `ck`, `tz`, `pf` oder Konsonanten-Clustern (`sch`, `sp`, `st`).
  - **Erlaubte Basis-Nomen (Beispiele):** Hund, Hut, Ball, See, Bus, Baum, Haus, Kind, Tag.

- **Level 2 Prompt:**
  - **Länge:** 4-5 Sätze.
  - **Syntax:** Einbau einfacher Nomen-Phrasen mit Adjektiven/Artikeln.
  - **Wortschatz-Restriktion:** Max. 3 Silben pro Wort. Einfache Komposita erlaubt, aber ohne schwere Konsonanten-Häufungen.

- **Level 4-5 Prompt (Tandem-Lesen):**
  - **Struktur:** Abwechselnd kurze Kind-Sätze (3-5 Wörter, strikte Level 1-2 Regeln) und längere Vorlese-Sätze für die App (6-8 Wörter, natürlicherer Wortschatz erlaubt).

- **Phase C (Level 7-9) Prompt:**
  - **Längen-Skalierung:** Level 7 (~30 Wörter), Level 8 (~60 Wörter), Level 9 (100+ Wörter).
  - **Ziel:** Flüssiges Lesen längerer Textpassagen, freierer Wortschatz.

### 2.2 Theme- & Charakter-Picker (UI)
- **UI-Grid:** Visuelles Grid zur Auswahl des Abenteuer-Themas (Icons: Wald 🌲, Zauberer 🧙, Dinos 🦕 etc.).
- **Generator-Objekt:** Die UI übergibt die ausgewählten Parameter (Thema, Kind, Begleiter, Level) an ein zentrales Generator-Objekt/Service, welches den finalen Prompt zusammenbaut und das LLM ansteuert (bzw. gemockt textgeneriert).

---

## 3. Akzeptanzkriterien
- [ ] LLM-Generator (oder Mock) liefert ausschließlich valides JSON nach dem vorgegebenen Schema (inkl. vorab separierter `syllables`).
- [ ] Prompt-Templates enthalten harte Wortschatz-Restriktionen (z.B. Verbot von `ß/ck/tz/pf` in Level 1).
- [ ] Das Theme- & Charakter-Picker UI ist implementiert und verwendbar.
- [ ] Die Parameter aus dem UI (Thema, Level, Namen) werden korrekt in das Generator-Objekt übergeben.
- [ ] Generierte Texte der Templates halten sich strikt an die vorgegebenen Längen- und Strukturvorgaben pro Level.
