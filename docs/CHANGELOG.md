# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
und das Projekt folgt grob [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Geändert
- **Repository umstrukturiert**: Der Extension-Code liegt jetzt in `src/`
  (Popup/Detail-Ansicht in `src/ui/`), Entwickler-Tools in `scripts/`, Zusatz-
  Dokumentation in `docs/`. Beim Laden als entpackte Erweiterung den Ordner
  `src/` auswählen. Keine funktionalen Änderungen an der Extension selbst.

## [2.4.15]

### Behoben
- **Telemetrie: doppelt gezählte Installationen.** Beim allerersten Start konnten
  durch eine Race-Condition kurzzeitig zwei zufällige Install-IDs erzeugt werden,
  wodurch eine Installation im Dashboard doppelt zählte. Die ID-Erzeugung wird
  jetzt geteilt (eine gemerkte Promise), sodass parallele Aufrufe dieselbe ID
  erhalten. Rein interne Statistik-Korrektur — keine Auswirkung auf das Blocken.

## [2.4.14]

### Hinzugefügt
- **YouTube Anti-Adblock-Abwehr**: Das harte Enforcement-Popup ("Werbeblocker
  erkannt"), das das Video pausiert, wird jetzt sofort entfernt (CSS + aktives
  Aufräumen) und die Wiedergabe automatisch fortgesetzt. Zusätzlich wird der
  weiche Hinweis ("Experiencing interruptions?" / Toast unten links), der die
  Wiedergabe künstlich verzögert, per Text erkannt und weggeräumt.
- **YouTube Anti-Adblock auf Daten-Ebene unterbunden**: Der Auslöser des Popups
  (`enforcementMessageViewModel` & Co.) wird jetzt schon aus den Netzwerk-/Seiten-
  Daten (`ytInitialData`, Player-/Next-Antworten) geschnitten — das Popup entsteht
  gar nicht erst, die daran hängende Verzögerung entfällt. Zusätzlich wird ein
  harter `playabilityStatus`-Block mit Adblock-Bezug auf `OK` zurückgesetzt
  (streng text-gated, echte Fehler wie Geo-Sperre bleiben unberührt).

### Geändert
- **YouTube schnellerer Videostart**: Der `fetch`-Hook puffert nur noch
  Player-Antworten vollständig statt jeder InnerTube-Antwort. Feed-/Browse-/
  Search-Antworten verzögern den kritischen Pfad nicht mehr (werden weiterhin
  über die `JSON.parse`-/`Response.json`-/`XHR`-Hooks gesäubert).

## [2.4.13]

### Enthalten
- **Stream-Swap** für Twitch (Worker-Hook + werbefreier Backup-Stream), inkl.
  Ad-Segment-Stripping und `player_type`-Spoof.
- **YouTube Ad-Block** (Ad-Stripping aus der Player-Antwort + Auto-Skip).
- **Network-Blocking** mit ~336 Regeln (generiert aus `build-rules.js`).
- **Cosmetic-Filter** auf allen Webseiten (im Popup abschaltbar).
- **Popup** mit Live-Statistik, Methoden-Schaltern und Mehrsprachigkeit (DE/EN).
- **Detail-Ansicht** mit Live-Block-Log.
- Anonyme, aggregierte **Telemetrie** (opt-out) — nur Install-ID, Version,
  Browser-Typ und Block-Summe; keine URLs oder personenbezogenen Daten.

---

<!--
Pflege-Hinweis: Beim Release einer neuen Version oben einen Abschnitt
[x.y.z] - JJJJ-MM-TT mit den Kategorien Hinzugefügt / Geändert / Behoben /
Entfernt anlegen und die Version in manifest.json gleichziehen.
-->

[Unreleased]: ../../compare/v2.4.14...HEAD
[2.4.14]: ../../releases/tag/v2.4.14
[2.4.13]: ../../releases/tag/v2.4.13
