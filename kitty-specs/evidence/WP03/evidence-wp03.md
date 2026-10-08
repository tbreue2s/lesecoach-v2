# Technical Evidence: Work Package 03 (State-Management & Didaktische 9-Stufen-Matrix)

**WP-ID:** `WP03`  
**Datum:** 2026-10-08  
**Status:** `in_review`  
**Ziel:** Nachweis des didaktischen 9-Stufen-State-Managements, der Satz- und Wort-Tokenisierung, der visuellen Rollen-Differenzierung (`app` vs. `child`) und der Test-Mock-Controls.

---

## 1. Nachweis: Exakte Zielwort-Zuweisung (Level 1 & Level 2)

Auszug aus den Unit-Tests in `src/lib/utils/tokenizer.test.ts`:

### 1.1 Level 1 (Genau 1 Zielwort pro Satz fürs Kind)
```typescript
it('LEVEL 1: sets EXACTLY 1 word per sentence to role: "child"', () => {
  const sentences = tokenizeStory(sampleText, 1, 'Bello');
  for (const sentence of sentences) {
    const childWords = sentence.words.filter((w) => w.role === 'child');
    expect(childWords.length).toBe(1);

    const appWords = sentence.words.filter((w) => w.role === 'app');
    expect(appWords.length).toBe(sentence.words.length - 1);
  }
});
```

### 1.2 Level 2 (Genau 2 Zielwörter pro Satz fürs Kind)
```typescript
it('LEVEL 2: sets EXACTLY 2 words per sentence to role: "child"', () => {
  const sentences = tokenizeStory(sampleText, 2, 'Bello');
  for (const sentence of sentences) {
    const childWords = sentence.words.filter((w) => w.role === 'child');
    expect(childWords.length).toBe(2);

    const appWords = sentence.words.filter((w) => w.role === 'app');
    expect(appWords.length).toBe(sentence.words.length - 2);
  }
});
```

### 1.3 Phase B: Repeated Reading Flag (`requiresRepeatedReading: true`)
```typescript
it('LEVEL 4, 5, 6: sets requiresRepeatedReading = true on all sentences', () => {
  for (const lvl of [4, 5, 6] as const) {
    const sentences = tokenizeStory(sampleText, lvl, 'Bello');
    for (const sentence of sentences) {
      expect(sentence.requiresRepeatedReading).toBe(true);
    }
  }
});
```

---

## 2. Vitest Testsuite-Ergebnis (28/28 Tests grün)

```text
✓ src/lib/stores/profileStore.test.ts (5 tests)
✓ src/lib/stores/readingSessionStore.test.ts (3 tests)
  ✓ loads story and activates the first child token
  ✓ advances word success and awards stars
  ✓ completes sentence immediately via completeCurrentSentence
✓ src/lib/stores/routerStore.test.ts (2 tests)
✓ src/lib/utils/speech.test.ts (3 tests)
✓ src/lib/utils/tokenizer.test.ts (9 tests)
  ✓ splits text into correct sentences and cleans punctuation
  ✓ Phase A (Wort-Entdecker): Exact Target Word Counts
    ✓ LEVEL 1: sets EXACTLY 1 word per sentence to role: "child"
    ✓ LEVEL 2: sets EXACTLY 2 words per sentence to role: "child"
    ✓ LEVEL 3: sets 3 to 4 words (half-sentence) per sentence to role: "child"
  ✓ Phase B (Satz-Pionier): Repeated Reading & Sentence Roles
    ✓ LEVEL 4, 5, 6: sets requiresRepeatedReading = true on all sentences
    ✓ LEVEL 1-3 & LEVEL 7-9: sets requiresRepeatedReading = false
    ✓ LEVEL 5 (Lese-Tandem): alternates sentences between App (even) and Child (odd)
    ✓ LEVEL 6: sets all sentences and words to role: "child"
  ✓ Phase C (Lese-Kapitän): Free Reading
    ✓ LEVEL 7, 8, 9: sets all words to role: "child" for free reading
✓ src/lib/utils/validation.test.ts (6 tests)

Test Files  6 passed (6)
Tests       28 passed (28)
```

---

## 3. UI-Komponenten & Test-Controls
1. **[LevelSelector.svelte](file:///home/thomas/projects/lesecoach-v2/src/lib/components/LevelSelector.svelte):** 9 Stufen übersichtlich gegliedert nach den 3 didaktischen Phasen (Wort-Entdecker, Satz-Pionier, Lese-Kapitän).
2. **[ReadingSessionView.svelte](file:///home/thomas/projects/lesecoach-v2/src/lib/components/ReadingSessionView.svelte):** Visuelle Rollen-Kennzeichnung:
   - App-Wörter: Normaler Fließtext.
   - Kind-Wörter: Umrahmte Badges (`role-child`) mit Kennzeichnung (`👶`).
   - Aktives Wort: Warm-gelber Fokus-Puls (`status-active`).
   - Richtig gelesene Wörter: Sanftes Grün mit Häkchen (`status-success`).
   - Repeated-Reading-Tag bei Stufen 4–6.
3. **[MockReadingControls.svelte](file:///home/thomas/projects/lesecoach-v2/src/lib/components/MockReadingControls.svelte):** Interaktive Testleiste zum Simulieren von Wort-Erfolgen, Satz-Abschlüssen und Stufenwechseln.
