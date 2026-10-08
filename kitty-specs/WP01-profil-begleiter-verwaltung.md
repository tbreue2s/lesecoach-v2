# Work Package 01: Sichere Profil- und Begleiter-Verwaltung

**ID:** `WP01`  
**Status:** `spec`  
**Lifecycle:** `spec` ➔ `plan` ➔ `tasks` ➔ `in_review` ➔ `accept` ➔ `merge`

---

## 1. Ziel & Umfang
Bereitstellung eines kindgerechten Onboarding- und Profil-Verwaltungsmoduls. Das Kind wählt seinen Vornamen und einen tierischen Begleiter (z. B. 🐶 Hund, 🐱 Katze, 🦉 Eule, 🦁 Löwe). Die Eingabe muss technisch gegen Injections und unangemessene Begriffe abgesichert sein und persistent im lokalen Speicher (`localStorage`) vorgehalten werden.

---

## 2. Technische Spezifikation

### 2.1 Datenmodell
```typescript
interface Companion {
  id: 'dog' | 'cat' | 'owl' | 'lion';
  name: string;
  emoji: string;
  avatarUrl?: string;
  greetingText: string;
}

interface UserProfile {
  name: string;
  companionId: 'dog' | 'cat' | 'owl' | 'lion';
  createdAt: string;
  lastActiveAt: string;
}
```

### 2.2 Validierungs- & Sicherheitsregeln
1. **1-Wort-Regex:** `^[a-zA-ZäöüÄÖÜß]+$`
   - Maximale Länge: 16 Zeichen, minimale Länge: 2 Zeichen.
   - Leerzeichen, Zahlen, Sonderzeichen, HTML-Tags oder Steuerzeichen werden sofort abgefangen.
2. **Bad-Word-Filter:**
   - Lokale kuratierte Sperrliste im Modul (deutsche Schimpfwörter / ungeeignete Ausdrücke).
   - Case-insensitive Überprüfung.
3. **Persistenz:**
   - Reaktiver Svelte Store (`profileStore`) mit synchroner `localStorage`-Synchronisation.

---

## 3. UI/UX Anforderungen (1./2. Klasse)
- Große, gut lesbare Schrift.
- Große, interaktive Begleiter-Karten mit visueller Auswahl-Animation.
- Freundliche, verständliche Fehlermeldungen bei ungültigen Eingaben (z. B. "Bitte gib nur deinen Vornamen ein!").
- Sofortige Vorschau des Begleiters mit personalisierter Begrüßung ("Hallo Anna! Ich bin dein Lese-Hund Bello.").

---

## 4. Akzeptanzkriterien
- [ ] Profilname wird strikt mit `^[a-zA-ZäöüÄÖÜß]+$` validiert (Länge 2–16).
- [ ] Namen mit Leerzeichen, Zahlen oder Sonderzeichen werden abgewiesen.
- [ ] Wörter auf der Bad-Word-Liste werden abgefangen und führen zu einer kindgerechten Korrektur-Aufforderung.
- [ ] Begleiter-Auswahl aktualisiert den reaktiven Svelte-Store und speichert den Zustand in `localStorage`.
- [ ] Beim Neuladen der Seite wird das vorhandene Profil automatisch aus `localStorage` wiederhergestellt.
- [ ] Unit-Tests für Regex- und Filter-Validierung sind vorhanden und grün.

---

## 5. Review- & Evidence-Vorgabe (für `in_review`)
- Unit-Test-Report (z. B. Vitest) für `validateProfileName(name)` und Bad-Word-Prüfung.
- DOM-Snapshot / Screenshot des Profil-Setups mit Auswahl und aktiver Validierung.
- Nachweis der `localStorage`-Serialisierung.
