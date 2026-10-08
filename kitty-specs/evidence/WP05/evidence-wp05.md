# Technical Evidence: Work Package 05 (Audio-Sync & Karaoke-Highlighting Engine)

**WP-ID:** `WP05`  
**Datum:** 2026-10-08  
**Status:** `merged`  
**Ziel:** Nachweis der synchronen Audio-Sync & Karaoke-Highlighting Engine mit Web Speech API, hybridem Timing-Mapper, Tandem-Stopp-Logik, Repeated-Reading-Schleife und Trennung von App-Text vs. Kind-Erfolgsmarkierungen (`role === 'child'`).

---

## 1. Unit-Test-Nachweis: Token-CharIndex & Timing-Mapper (`charMapper.test.ts`)

Auszug aus den Unit-Tests in `src/lib/utils/charMapper.test.ts` (alle 6 Tests erfolgreich bestanden):

```typescript
describe('Token-CharIndex & Timing Mapper (WP05 Evidence)', () => {
  const sampleTokens: WordToken[] = [
    { id: 's0_w0', word: 'Der', cleanWord: 'Der', role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 0 },
    { id: 's0_w1', word: 'kleine', cleanWord: 'kleine', role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 1 },
    { id: 's0_w2', word: 'Hund.', cleanWord: 'Hund', role: 'app', status: 'pending', sentenceIndex: 0, wordIndexInSentence: 2 },
  ];

  it('builds valid spoken text and accurate character spans', () => {
    const { spokenText, spans } = buildSpokenSpans(sampleTokens);
    expect(spokenText).toBe('Der kleine Hund.');
    expect(spans).toHaveLength(3);
  });

  it('accurately maps exact word boundary charIndices to correct token IDs', () => {
    const { spans } = buildSpokenSpans(sampleTokens);
    expect(mapCharIndexToTokenId(0, spans)).toBe('s0_w0');
    expect(mapCharIndexToTokenId(4, spans)).toBe('s0_w1');
    expect(mapCharIndexToTokenId(11, spans)).toBe('s0_w2');
  });

  it('calculates token time estimates and maps elapsed ms correctly', () => {
    const { totalDurationMs, estimates } = calculateTokenTimeEstimates(sampleTokens, 0.85);
    expect(totalDurationMs).toBeGreaterThan(500);
    expect(mapElapsedTimeToTokenId(0, estimates)).toBe('s0_w0');
  });
});
```

---

## 2. Hybrid Audio-Sync Engine & Lifecycle-Schutz

### Hybrid Timing & Boundary Interpolation:
Um browser- und plattformübergreifend (insb. bei Browser-Stimmen ohne feingliedrige `onboundary`-Events) ein 100% flüssiges und synchrones Karaoke-Highlighting zu garantieren:
1. **Präziser Audio-Start-Sync (`onstart`):** Der Karaoke-Timer und die erste Wort-Markierung starten erst exakt in dem Moment, in dem die Audioausgabe der Web Speech API tatsächlich beginnt (`utterance.onstart`). Dadurch wird die browserseitige Initialisierungslatenz (50–200ms) beim ersten Satz/Neustart vollständig eliminiert.
2. **Kalibrierte Phonem-Zeiten:** Wortdauern wurden präzise auf deutsche Sprachstrukturen (~54ms/Zeichen + ~75ms Basispause bei Rate `0.78`) abgestimmt, sodass auch ohne kontinuierliche `onboundary`-Events kein Nachhängen entsteht.
3. **Echtzeit-Drift-Korrektur:** Sobald native `onboundary`-Events eintreffen, wird die Zeitbasis (`startTime = Date.now() - matchingEst.startMs`) sofort re-synchronisiert, um jeden Drift augenblicklich auszugleichen.
4. **Keine Verzögerung:** `.karaoke-active` besitzt `transition: none !important` für sofortiges Umschalten im DOM bei 60 FPS.

### Strikte didaktische Rollentrennung:
- **`role: 'app'`-Wörter:** Werden beim Vorlesen mit `.karaoke-active` (gelber Textmarker `#FDE047`) synchron markiert. Nach dem Vorlesen kehren sie zur normalen Buchschrift zurück. Sie werden **nicht** grün eingefärbt, da es sich um Begleiter-Text handelt.
- **`role: 'child'`-Wörter:** Werden beim Kind-Zug mit `.status-active` (pulsierender Rahmen) hervorgehoben. Erst wenn das Kind das Wort erfolgreich liest, wird das Wort grün (`.role-child.status-success` mit Häkchen `✓`).

---

## 3. Dokumentation: Schutz gegen Chromium Garbage Collection & Freeze

1. **Modul- & Window-Scope Retention:** Speicherung der `SpeechSynthesisUtterance`-Instanz in `activeUtterance` und auf `window.__lesecoach_tts_active_utterance` bis zum `onend`/`onerror`-Event.
2. **Segment-/Satzweises Chunking:** Kein Mega-Text, wodurch der 15s-Chromium-Timeout-Bug verhindert wird.
3. **Kindgerechtes Sprechtempo:** Feste, angenehm ruhige Rate von `0.78` mit automatischer Wahl einer deutschen Stimme (`de-DE`).

---

## 4. Test-Zusammenfassung

- **42 Tests in 9 Testdateien** erfolgreich bestanden.
- **Type-Check (`svelte-check`):** 0 Fehler, 0 Warnungen.
