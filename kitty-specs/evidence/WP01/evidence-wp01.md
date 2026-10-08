# Technical Evidence: Work Package 01 (Sichere Profil- und Begleiter-Verwaltung)

**WP-ID:** `WP01`  
**Datum:** 2026-10-08  
**Status:** `in_review`  
**Ziel:** Nachweis der sicheren Profilverwaltung, erweiterten Jugendschutz-Blacklist, 1-Wort-Regex-Validierung, Begleiter-Vielfalt und TTS-Audio-Integration.

---

## 1. Nachweis: Blockieren von Leerzeichen ("Böser Wolf") & Jugendschutz-Blacklist

### 1.1 Regex & Validierungs-Implementierung
Die Validierungsfunktion `validateName` in `src/lib/utils/validation.ts` prüft explizit auf:
- Striktes 1-Wort-Format (keine Leerzeichen, Tabs, Zeilenumbrüche).
- Regex: `^[a-zA-ZäöüÄÖÜß]+$`
- Längenbeschränkung: 2 bis 16 Zeichen.
- Umfassende deutsche Jugendschutz-Blacklist (`src/lib/utils/badWords.ts`) gegen Vulgärsprache, Waffen (Messer, Pistole, Gewehr, Bombe, etc.), Gewalt, Drogen und Extremismus.

### 1.2 Vitest Testausführung
Auszug aus `src/lib/utils/validation.test.ts`:
```text
✓ src/lib/utils/validation.test.ts (6 tests)
  ✓ Strict 1-Word Regex & Character Rules
    ✓ accepts valid single-word German names with umlauts and ß
    ✓ STRICTLY REJECTS multi-word names with spaces (e.g., "Böser Wolf")
    ✓ rejects names with numbers, special characters, and HTML injections
    ✓ enforces length constraints (2 to 16 characters)
  ✓ Bad-Word-Filter & Content Sanitization
    ✓ detects and flags bad words and inappropriate terms including weapons and slurs (Messer, Pistole, Ficker, etc.)
    ✓ allows clean, innocent names
```

---

## 2. Nachweis: Begleiter-Auswahl (12 Charaktere) & TTS Audio-Feedback

### 2.1 Verfügbare Begleiter
1. 👩 Mama (Default: "Mama")
2. 👨 Papa (Default: "Papa")
3. 👧 Schwester (Default: "Lene")
4. 👦 Bruder (Default: "Ben")
5. 🧙‍♂️ Zauberer (Default: "Merlin")
6. 🧚‍♀️ Fee (Default: "Flora")
7. 🐶 Hund (Default: "Bello")
8. 🐱 Katze (Default: "Mimi")
9. 🐴 Pferd (Default: "Blitz")
10. 🦄 Einhorn (Default: "Sternchen")
11. 🦉 Eule (Default: "Lulu")
12. 🦖 Dino (Default: "Rexi")

### 2.2 Lautsprecher- & Vorlese-Funktion
- `OtterFeedback.svelte` enthält nun den Lautsprecher-Button (🔊).
- Bei Klick oder automatischem Textwechsel wird die deutsche Web Speech Synthesis mit kindgerechter Geschwindigkeit (`rate: 0.9`, `lang: 'de-DE'`) aufgerufen.

---

## 3. Vitest & Build-Nachweis
```text
Test Files  2 passed (2)
Tests       11 passed (11)
```
Production-Build mit Vite erfolgreich kompiliert.
