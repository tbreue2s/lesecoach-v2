# Work Package 15: TTS Voice Quality & Natural Audio Pipeline (WP-NaturalTTS)

**ID:** `WP15`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`


---

## 1. Problemstellung & Didaktische Notwendigkeit

1. **Pixel 8 Pro / Android Web Speech Einschränkung:** Auf vielen Mobilgeräten (wie Google Pixel) liefert die Web Speech API standardmäßig nur eine einzelne vorinstallierte Offline-Systemstimme aus, die metallisch und blechern klingt.
2. **Unnatürliche Betonung bei abgebrochenen Satzfragmenten:** Wenn nur der App-Anteil eines Satzes (z. B. *„Paul wandert leise über den feuchten“* ohne *„Boden.“*) an eine TTS-Engine übergeben wird, interpretiert die Prosodie-Vorhersage das letzte Wort fälschlicherweise als Satzende (fallende Satzmelodie oder Frage-Intonation mitten im Satz).
3. **Thorsten (Piper WASM) CDN-Versionskonflikt:** `@mintplex-labs/piper-tts-web` verwies hartcodiert auf ein veraltetes Cloudflare-CDN (`onnxruntime-web@1.18.0`), während `onnxruntime-web@1.30.0` installiert war (HTTP 404 für `ort-wasm-simd-threaded.mjs`), wodurch Thorsten stillschweigend auf System-TTS zurückfiel.
4. **Karaoke-Synchronisation:** Wort-Highlighting muss sowohl bei vorberechnetem Studio-Audio (exakte Millisekunden-WordBoundaries) als auch bei lokalem WAV-Audio (Thorsten) flüssig ohne Rücksprünge in Wortpausen mitlaufen.

---

## 2. Umgesetzte Architektur & Verbesserungen

### 2.1 Vollsatz-Synthese mit Audio-Schnitt (Full-Sentence Prosody Slicing)
Damit alle drei Audio-Engines den Satz **exakt so betonen, als würden sie ihn komplett vorlesen**, wird immer der vollständige Satz inkl. Satzzeichen synthetisiert und unmittelbar vor dem Zielwort des Kindes sauber abgeschnitten:
- **Studio-Audio (`ffmpeg` + `WordBoundary`):** Jeder Satz von *„Konzert im Moos“* (`sentence_0..4`) wurde als ganzer Satz synthetisiert (`sentence_X_full.mp3`), die exakten Wortgrenzen (`WordBoundary`) in `metadata.json` erfasst und `sentence_X_app.mp3` direkt aus der Vollsatz-Aufnahme mit einem weichen 25ms-Fade-Out (`afade`) unmittelbar vor dem Kinder-Wort geschnitten.
- **Thorsten PWA (`sliceWavBlobForSegment`):** Synthetisiert den kompletten Satz als 16-Bit Mono PCM WAV, erkennt aktive Sprachgrenzen (Stille-Trimmung am Anfang/Ende), sucht im Zeitfenster vor dem Kinder-Wort das lokale RMS-Energieminimum (Sprechpause zwischen vorletztem und letztem Wort) und schneidet den WAV-Buffer mit einem sanften 20ms-Fade-Out exakt dort ab.
- **System-TTS (`playSystemTts`):** Übergibt den gesamten Satz an `SpeechSynthesisUtterance` (für natürliche Satzmelodie) und stoppt im `onboundary`-Event exakt beim Erreichen des Kinder-Wortes (`charIndex >= cutCharIndex`).

### 2.2 Dreifache Audio-Engine & Multi-Stimmen-Katalog (`src/lib/services/audioEngineService.ts`)
1. 👦👧 **PWA Offline (Piper WebAssembly):**
   - Integrierte ONNX-Runtime WebAssembly & Piper Phonemize mit lokal gebündelten Binaries in `public/wasm/`.
   - **4 Offline-Stimmen:**
     - 👦 **Thorsten** (`de_DE-thorsten-medium`, 61 MB) – Männlich, warm, Standard
     - ⚡ **Eva K** (`de_DE-eva_k-x_low`, **20 MB**) – Weiblich, extrem schnelle Ladezeit (~70% kleiner), ideal für Mobilgeräte
     - 👧 **Ramona** (`de_DE-ramona-low`, 61 MB) – Weiblich, freundlich
     - 👧 **Kerstin** (`de_DE-kerstin-low`, 61 MB) – Weiblich, sanft
   - Web Audio API (`AudioContext` / `AudioBufferSourceNode`) mit mobilem Unlock-Handler (`setupMobileAudioUnlock`) gegen Autoplay-Sperren auf Android Chrome / Pixel 8 Pro nach asynchroner Inferenz.
   - Per-Voice WASM Session Caching und dedizierte Fortschrittsanzeige (`piperProgressStore`).

2. 🎙️ **Studio-Audio (Precomputed Neural Audio für Referenz-Geschichte):**
   - Vorberechnetes 24-kHz Studio-Audio für alle 5 Sätze (`0..4`) der Geschichte *„Konzert im Moos“* (`theme_forest_ep01`).
   - **3 Studio-Stimmen:**
     - 👨 **Conrad** (`de-DE-ConradNeural`) – Männlich, Standard
     - 👩 **Katja** (`de-DE-KatjaNeural`) – Weiblich, klar, hochdeutsch
     - 👩 **Amala** (`de-DE-AmalaNeural`) – Weiblich, herzlich, didaktisch
   - Exakte Millisekunden-Wort-Zeitstempel (`words: [{ word, startMs, endMs }]`) in `metadata.json` für 100 % synchrones Karaoke-Highlighting.

3. 📱 **System-TTS (Web Speech API):**
   - Intelligentes Stimmen-Ranking (`rankGermanVoice`), optimiertes Erzähltempo (`rate: 0.90`, `pitch: 1.04`) und phonetische Textbereinigung (`preprocessGermanText`).

### 2.3 Karaoke-Synchronisation & UI-Stimmenwahl
- `mapElapsedTimeToTokenId` durchsucht die Wort-Intervalle rückwärts und hält in Mikro-Sprechpausen das zuletzt gesprochene Wort aktiv markiert, statt auf Wort 0 zurückzuspringen.
- `playHtmlAudioWithSync` behält den 25ms-Sync-Timer über das `onloadedmetadata`-Event hinweg stabil aktiv.
- **Profil-Einstellungen (`ProfileSetup.svelte`):** Direkte Stimmenauswahl-Karten mit „🔊 Probe“-Hör-Button für alle Piper- und Studio-Stimmen.
- **Lesedock (`MockReadingControls.svelte`):** Ergonomische Stimm-Pills direkt unter der Engine-Auswahl für sofortigen Stimmenwechsel während des Lesens.

---

## 3. Akzeptanzkriterien

- [x] Piper TTS WebAssembly mit lokalen WASM-Assets (`public/wasm/`) ohne CDN-Abhängigkeit oder Fallback-Fehler lauffähig.
- [x] 4 Piper WASM Offline-Stimmen (Thorsten, Eva K 20MB, Ramona, Kerstin) und 3 Studio-Stimmen (Conrad, Katja, Amala) verfügbar und testbar.
- [x] Vollsatz-Prosodie-Schnitt (`Full-Sentence Prosody Slicing`) für Studio-Audio, Piper WAV und System-TTS umgesetzt.
- [x] Vorberechnetes Studio-Audio inkl. exakter `WordBoundary`-Metadaten für alle Stimmen von *„Konzert im Moos“* hinterlegt.
- [x] Karaoke-Wort-Synchronisation markiert Wörter in allen Audio-Engines flüssig parallel zum Vorlesen.
- [x] Mobile Autoplay-Sperre auf Pixel 8 Pro / Android Chrome per Web Audio API Unlock gelöst.
- [x] 100 % aller Unit-Tests (`165 Tests in 18 Test-Dateien`) und der Produktions-Build laufen fehlerfrei durch.
