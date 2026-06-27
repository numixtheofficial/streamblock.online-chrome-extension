# Contributing

Danke, dass du zu **Streamblock** beitragen möchtest! 💜

## Entwicklungs-Setup

Es gibt **keinen Build-Schritt** — die Extension wird direkt aus dem Quellordner
geladen:

1. `chrome://extensions/` öffnen → **Entwicklermodus** an
2. **„Entpackte Erweiterung laden"** → diesen Ordner wählen
3. Nach Änderungen: in `chrome://extensions/` auf **↺** klicken, dann den
   Twitch-/YouTube-Tab neu laden (F5)

> Tipp: Die drei Twitch-Methoden und der YouTube-Ad-Block greifen in Hooks, die
> nur beim Seitenladen gesetzt werden — nach Code-Änderungen also immer den Tab
> neu laden.

## Codestil

- Vanilla JavaScript (ES2020+), keine Frameworks, keine Build-Tools.
- 2 Spaces Einrückung, Semikolons, einfache Anführungszeichen (siehe `.editorconfig`).
- Schreibe so, wie der umgebende Code aussieht (Namensgebung, Kommentar-Dichte).
- Keine neuen Abhängigkeiten ohne triftigen Grund.

## Vor dem Pull Request

- [ ] `node --check` läuft fehlerfrei für geänderte `.js`-Dateien.
- [ ] `manifest.json` und `rules.json` sind gültiges JSON.
- [ ] In Chromium **und** (wenn möglich) Firefox getestet.
- [ ] Keine Geheimnisse, keine persönlichen Daten, keine `*.zip`/`*.crx` committet.
- [ ] Bei neuen Block-Domains: in `build-rules.js` ergänzt und `node build-rules.js`
      ausgeführt (nicht `rules.json` von Hand editieren).

## Block-Listen erweitern

`rules.json` wird **generiert**. Neue Domains immer in `build-rules.js` eintragen
und neu generieren:

```bash
node build-rules.js
```

Twitch-Playback-Domains (`ttvnw.net`, `jtvnw.net`, …) niemals blocken — dafür
gibt es ein Sicherheitsnetz im Generator.

## Commits

Kurze, aussagekräftige Commit-Messages im Imperativ, z. B.:

```
fix: Stream-Swap nach Twitch-Worker-Änderung reparieren
feat: Cosmetic-Filter für Beispiel.de ergänzen
```

## Hinweis

Streamblock ist ein Bildungsprojekt. Beiträge, die das CDN (`googlevideo.com`,
`ttvnw.net`) blocken oder die Wiedergabe brechen, werden nicht akzeptiert.
