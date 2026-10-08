# Technical Evidence: Work Package 04 (Themen- und Charakter-Auswahl für Geschichten)

**WP-ID:** `WP04`  
**Datum:** 2026-10-08  
**Status:** `in_review`  
**Ziel:** Nachweis der Themen- und Charakterauswahl (10 vordefinierte Themen), der `StoryConfigPayload`-Erzeugung, des lokalen Mock-Story-Generators und der direkten Integration in den Home-Screen.

---

## 1. Nachweis: 10 vordefinierte Themen & Story-Generierung

Auszug aus den Unit-Tests in `src/lib/utils/mockStoryGenerator.test.ts`:

```typescript
describe('Mock Story Generator for 10 Themes (WP04)', () => {
  it('contains exactly 10 distinct predefined themes', () => {
    expect(STORY_THEMES.length).toBe(10);
    const themeIds = STORY_THEMES.map((t) => t.id);
    const uniqueIds = new Set(themeIds);
    expect(uniqueIds.size).toBe(10);
  });

  it('generates a valid, readable story for EACH of the 10 themes', () => {
    for (const theme of STORY_THEMES) {
      const payload: StoryConfigPayload = {
        level: 1,
        childName: 'Emma',
        companion: {
          id: 'dog',
          name: 'Bello',
          type: 'dog',
          icon: '🐶',
        },
        theme,
      };

      const story = generateStoryFromConfig(payload);

      expect(story.id).toBeTruthy();
      expect(story.title).toContain('Emma');
      expect(story.text).toBeTruthy();
      expect(story.text).toContain('Emma');
      expect(story.text).toContain('Bello');
      expect(story.coverEmoji).toBeTruthy();

      const tokens = tokenizeStory(story.text, 1, 'Bello');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    }
  });
});
```

### Die 10 implementierten Themen:
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

---

## 2. Nachweis: `StoryConfigPayload` & Direkte Home-Screen Integration

### Erzeugtes Payload-Schema:
```typescript
interface StoryConfigPayload {
  level: number; // 1..9
  childName: string; // z.B. "Emil"
  companion: {
    id: string;
    name: string;
    type: string;
    icon: string;
  } | null;
  theme: {
    id: string;
    label: string;
    icon: string;
    description: string;
    defaultCoverEmoji: string;
  };
}
```

### UI-Struktur auf dem Home-Screen ([HomeScreen.svelte](file:///home/thomas/projects/lesecoach-v2/src/lib/components/screens/HomeScreen.svelte)):
1. **Otter-Begrüßung:** *"Hallo Emil! Dein Lese-Begleiter 👦 Ben ist bereit!"* mit Audio-Vorlesen.
2. **Profil- & Begleiter-Badge** mit Schnell-Button `⚙️ Ändern`.
3. **Lese-Stufen-Wähler:** Stufe 1–9.
4. **10 Themen-Kacheln:** Single-Select mit visueller Auswahl-Kennzeichnung.
5. **Start-Button:** *"🚀 Los geht's – Geschichte lesen!"* ➔ Erzeugt die themenbezogene Geschichte und startet direkt im Reader.

---

## 3. Vitest Testsuite-Ergebnis (34/34 Tests grün)

```text
✓ src/lib/stores/profileStore.test.ts (5 tests)
✓ src/lib/stores/readingSessionStore.test.ts (3 tests)
✓ src/lib/stores/routerStore.test.ts (2 tests)
✓ src/lib/stores/storyConfigStore.test.ts (3 tests)
✓ src/lib/utils/mockStoryGenerator.test.ts (3 tests)
✓ src/lib/utils/speech.test.ts (3 tests)
✓ src/lib/utils/tokenizer.test.ts (9 tests)
✓ src/lib/utils/validation.test.ts (6 tests)

Test Files  8 passed (8)
Tests       34 passed (34)
```

---

## 4. Production Build
```text
vite v5.4.21 building for production...
✓ 145 modules transformed.
dist/index.html                  1.13 kB │ gzip:  0.59 kB
dist/assets/index-CX0a5KHt.css  27.79 kB │ gzip:  4.44 kB
dist/assets/index-BmPRYAMg.js   86.15 kB │ gzip: 30.85 kB
✓ built in 566ms
```
