# Work Package 03: State-Management & Didaktische Lese-Stufen (9-Stufen-Matrix)

**ID:** `WP03`  
**Status:** `merged`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Ziel & Didaktische Vision
Implementierung einer didaktisch fundierten 9-Stufen-Matrix (3 Entwicklungsphasen à 3 Stufen) für Grundschulkinder der 1. und 2. Klasse. Das System passt visuelles Scaffolding (Silbenfärbung), Interaktionsformen (Lückenwort, Tandem/Ping-Pong, Solo mit Wiederholung, freies Lesen) und Textkomplexität (Lauttreue, Silbenanzahl, Satzlänge, Satzstrukturen) dynamisch an die jeweilige Lese-Stufe an.

---

## 2. Didaktische 9-Stufen-Matrix & Phonologische Constraints

### 2.1 Übersicht der Phasen

| Phase | Titel | Fokus | Visuelle Standard-Regel (role: 'child') | Repeated Reading |
|---|---|---|---|---|
| **Phase A** (Level 1–3) | **Wort-Entdecker** | Mechanisches Dekodieren & Phonologische Bewusstheit | **Standardmäßig zweifarbig** in Silben gefärbt (#2B6CB0 blau, #C53030 rot). Einsilber einfarbig (#2B6CB0). | Nein |
| **Phase B** (Level 4–6) | **Satz-Pionier** | Lesefluss, Prosodie & Intonation | **Standardmäßig einfarbig** (Schiefergrau-Buchtext). Silbenfärbung (#2B6CB0/#C53030) wird **nur bei Hänger/Intervention** aktiviert. | Ja (Level 5 & 6) |
| **Phase C** (Level 7–9) | **Lese-Kapitän** | Leseausdauer, Textverständnis & Sinnentnahme | **Standardmäßig einfarbig**. Silbenfärbung nur bei Hänger/Intervention. | Nein |

---

### 2.2 Detaillierte Stufen-Spezifikation & Harte Silben-Limits

#### Phase A: Wort-Entdecker (Mechanisches Dekodieren)
- **Visuelles Scaffolding:** Wörter mit `role: 'child'` werden standardmäßig zweifarbig gerendert (1. Silbe `#2B6CB0` blau, 2. Silbe `#C53030` rot, 3. Silbe `#2B6CB0` blau). Reine Einsilber werden einfarbig blau (`#2B6CB0`) hervorgehoben.
- **Generelles Phasen-Verbot:** Wörter mit **4 oder mehr Silben** (z. B. *wun-der-schö-nes*, *Lok-o-mo-ti-ve*) sowie komplexe Lautverbindungen sind für das Kind in Phase A strikt verboten und verbleiben bei der App (`role: 'app'`).

- **Level 1: Einzelnes Zielwort (Lautgetreue 1–2-Silber)**
  - *Interaktion:* Genau 1 Zielwort pro Satz fürs Kind (`role: 'child'`), restlicher Satz wird von der App gelesen (`role: 'app'`).
  - *Silben-Limit:* Ausschließlich 1 oder 2 Silben (z. B. *Hund*, *Au-to*, *Baum*, *Ro-se*). Absolutes Verbot von Wörtern mit $\ge 3$ Silben.
  - *Restriktion:* Keine komplexen Konsonanten-Cluster (*sch*, *ch*, *sp*, *st*, *pfl*, *str*).

- **Level 2: Wortpaare (Silben-Summen-Limit: max. 4 Silben)**
  - *Interaktion:* Genau 2 aufeinanderfolgende Wörter pro Satz fürs Kind (z. B. *"am Him-mel"*, *"ro-tes Au-to"*, *"den Pfad"*).
  - *Silben-Summen-Limit:* Die beiden Wörter dürfen **ZUSAMMEN maximal 4 Silben** haben (z. B. $1+2=3$, $2+2=4$, $1+3=4$).
  - *Restriktion:* Kein Einzelwort darf $\ge 4$ Silben haben.

- **Level 3: Halbsätze (Silben-Summen-Limit: max. 7 Silben)**
  - *Interaktion:* 3 bis 4 aufeinanderfolgende Wörter am Stück fürs Kind (Halbsatz).
  - *Silben-Summen-Limit:* Die gesamte Wortgruppe darf **ZUSAMMEN maximal 7 Silben** umfassen.
  - *Didaktik:* Erste Sinnentnahme durch einfache Prädikate und Präpositionen (z. B. *"hüpft auf den Baum"*).

#### Phase B: Satz-Pionier (Lesefluss & Intonation)
- **Visuelles Scaffolding (Stützräder ab):** Wörter mit `role: 'child'` werden im Standardzustand einfarbig im regulären Buchtext-Design (Schiefergrau) dargestellt. Die zweifarbige Silbenfärbung wird dynamisch nur als Interventions-Stufe aktiviert (z. B. bei Hängern/Hilfeanforderung).
- **Level 4: Satz-Häppchen (Geringe Eigenlese-Last)**
  - *Interaktion:* Kind liest ca. jeden 3. Satz der Geschichte (sehr kurz, maximal 4–5 Wörter pro Kind-Satz). App liest die umgebenden Hauptsätze.
  - *Repeated Reading:* `requiresRepeatedReading: false`.
- **Level 5: Ping-Pong-Lesen (Tandem-Dialog)**
  - *Interaktion:* Kind und App wechseln sich Satz für Satz ab (5–7 Wörter pro Satz).
  - *Repeated Reading:* `requiresRepeatedReading: true`. Sobald das Kind den Satz erfolgreich gelesen hat, liest die TTS-Stimme den gesamten Satz flüssig vor, um Sprachmelodie und Satzklang zu festigen.
- **Level 6: Solo-Lesen mit Modell-Vorlesen**
  - *Interaktion:* Kind liest jeden Satz der Geschichte eigenständig (bis zu 8 Wörter pro Satz). Die App liest keinen neuen Text mehr voraus.
  - *Repeated Reading:* `requiresRepeatedReading: true`. Nach jedem Satz wiederholt die TTS-Stimme den Satz flüssig zur Festigung.

#### Phase C: Lese-Kapitän (Ausdauer & Textverständnis)
- **Visuelles Scaffolding:** Buchtext (einfarbig). Silbenfärbung nur auf expliziten Abruf oder bei wiederholter Erkennungsverzögerung (Intervention).
- **Repeated Reading:** Standardmäßig deaktiviert (`requiresRepeatedReading: false`), um den Lesefluss längerer Geschichten nicht zu hemmen.
- **Level 7: Mini-Abenteuer**
  - *Umfang:* Kurzer Gesamttext (ca. 25–35 Wörter gesamt, maximal 3–4 Sätze).
  - *Fokus:* Erste vollständige Kurzgeschichten mit Anfang, Mitte und Ende.
- **Level 8: Mittlere Geschichte**
  - *Umfang:* Mittellange Geschichten (ca. 50–70 Wörter).
  - *Struktur:* Einführung von Satzzeichen (?, !), wörtlicher Rede und Dialogen.
- **Level 9: Meisterleser**
  - *Umfang:* Lange Geschichten (100–150+ Wörter).
  - *Struktur:* Komplexere Nomen, Nebensätze, anspruchsvolleres Vokabular.

---

## 3. Didaktischer Fallback- & Zielwort-Selektor

Bei der Generierung von `WordToken`s im Tokenizer prüft ein intelligenter Selektor (`selectChildTokenIndices`) alle Kandidaten-Wortfenster im Satz:
1. **Silbenprüfung vor Zuweisung:** Berechnung der exakten Silbenanzahl jedes Worts via `splitSyllables`.
2. **Ausschluss zu schwerer Wörter:** Wörter mit $\ge 4$ Silben (z. B. "wunderschönes") werden in Phase A grundsätzlich niemals dem Kind zugeteilt (`role: 'child'`).
3. **Optimierungsstrategie:**
   - **Level 1:** Wählt das am weitesten hinten liegende Wort mit $\le 2$ Silben ohne Konsonanten-Cluster.
   - **Level 2:** Sucht ein aufeinanderfolgendes 2-Wort-Fenster mit Einzelsilben $\le 3$ und **Summe $\le 4$**. Findet der Algorithmus kein solches Paar, wählt er das phonetisch leichteste Paar.
   - **Level 3:** Sucht ein 3–4-Wort-Fenster mit Einzelsilben $\le 3$ und **Summe $\le 7$**.

---

## 4. Akzeptanzkriterien

- [x] Vollständige Definition aller 9 Level mit zugeordneten Phasen A, B und C in den zentralen Types und Metadaten-Konstanten.
- [x] Harte Silben-Obergrenzen in Phase A:
  - Level 1: Genau 1 Wort, 1–2 Silben, Verbot von Wörtern $\ge 3$ Silben und Konsonanten-Clustern.
  - Level 2: Genau 2 aufeinanderfolgende Wörter, Silben-Summe maximal 4, kein Wort $\ge 4$ Silben.
  - Level 3: 3 bis 4 Wörter, Silben-Summe maximal 7, kein Wort $\ge 4$ Silben.
  - Kein Wort mit $\ge 4$ Silben erhält jemals `role: 'child'` in Phase A.
- [x] Automatischer Fallback-Selector im Tokenizer implementiert.
- [x] Silben-Scaffolding-Logik:
  - Phase A rendert Kinder-Tokens standardmäßig zweifarbig (blau `#2B6CB0` / rot `#C53030`) bzw. einfarbig blau für Einsilber.
  - Phase B und C rendern Kinder-Tokens standardmäßig einfarbig; zweifarbige Silben werden nur bei `hasInterventionActive = true` aktiviert.
- [x] Tokenisierungs- und Session-Contract:
  - Jedes `WordToken` enthält `word`, `cleanWord`, `syllables: string[]`, `role`, `status`.
  - `SentenceToken` setzt `requiresRepeatedReading: true` für Level 5 und 6.
- [x] Validierungsfunktion (`validateSentenceForLevel` / `validateWordForLevel` / `validateStoryLevelSuitability`):
  - Prüft Wortpaare und Halbsätze auf Einhaltung der Silben-Summen-Limits (L2: $\le 4$, L3: $\le 7$).
- [x] Unit-Test-Suite:
  - Automatisierter Vitest-Test verifiziert, dass kein Wortpaar in Level 2 die Summe von 4 Silben überschreitet und kein 4-Silber in Phase A an das Kind geht.
