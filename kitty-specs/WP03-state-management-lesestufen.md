# Work Package 03: State-Management & Lese-Stufen

**ID:** `WP03`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Ziel & Umfang
Konzeption und Implementierung der didaktischen Lese-Stufen sowie des zentralen State-Managements für Geschichten, Fortschritte und Lese-Modi.

---

## 2. Technische Spezifikation

### 2.1 Didaktische Lese-Stufen
1. **Stufe 1 (Zuhören & Mitlesen / Solo-Vorlesen):**
   - TTS liest vor, Text wird synchron markiert.
   - Kind liest still mit und gewöhnt sich an Wortbilder.
2. **Stufe 2 (Lese-Tandem / Wechselseitiges Lesen):**
   - App und Kind wechseln sich Satz für Satz ab ("Ich lese einen Satz vor, dann liest du den nächsten!").
3. **Stufe 3 (Lese-Profi / Lückentext-Interaktion):**
   - Ausgewählte Wörter werden im Text verborgen/hervorgehoben; App wartet auf die Aussprache des Kindes.

### 2.2 Datenmodell für Lesetexte
```typescript
interface StoryWord {
  id: string;
  text: string;
  isGap?: boolean;
  syllables?: string[]; // Optional für Silben-Färbung
}

interface StorySentence {
  id: string;
  words: StoryWord[];
  reader: 'app' | 'child'; // Für Tandem-Modus
}

interface Story {
  id: string;
  title: string;
  level: 1 | 2; // 1. Klasse vs. 2. Klasse
  sentences: StorySentence[];
  coverEmoji: string;
}

interface ReadingProgress {
  storyId: string;
  completedLevels: number[];
  starsEarned: number;
}
```

### 2.3 Svelte Store Architektur
- `storyStore`: Verwaltet die aktive Geschichte, aktuelle Satz- und Wortindizes.
- `readingModeStore`: Hält den aktuellen Modus (`solo` | `tandem` | `gap-fill`).
- `progressStore`: Speichert absolvierte Geschichten und Sterne in `localStorage`.

---

## 3. Akzeptanzkriterien
- [ ] Stories können mit Metadaten (Klasse 1/2, Sätze, Wörter, Gaps) geladen werden.
- [ ] Store schaltet sauber zwischen den Stufen (Solo, Tandem, Challenge) um.
- [ ] Satzweise Fortschrittskontrolle mit Index-Tracking.
- [ ] Fortschritte und gesammelte Sterne werden lokal persistiert.
- [ ] Unit-Tests für State-Transitionen und Store-Logik.

---

## 4. Review- & Evidence-Vorgabe (für `in_review`)
- Unit-Test-Suite für `storyStore` und `readingModeStore`.
- Dokumentation der Datenstrukturen mit Beispiel-Stories für Klasse 1 & 2.
