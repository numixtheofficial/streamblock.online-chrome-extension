# Security Policy

## Unterstützte Versionen

Es wird jeweils nur die **aktuellste** Version gepflegt. Bitte aktualisiere auf
die neueste Version, bevor du ein Problem meldest.

| Version | Unterstützt |
|--------:|:-----------:|
| 2.4.x   | ✅ |
| < 2.4   | ❌ |

## Eine Sicherheitslücke melden

Bitte melde Sicherheitslücken **nicht** über öffentliche GitHub-Issues.

Nutze stattdessen die **[GitHub Security Advisories](../../security/advisories/new)**
(„Report a vulnerability") oder kontaktiere die Maintainer privat. Bitte gib an:

- betroffene Version &amp; Browser,
- eine Beschreibung des Problems und der möglichen Auswirkung,
- Schritte zur Reproduktion (falls vorhanden).

Du erhältst in der Regel innerhalb weniger Tage eine Rückmeldung.

## Sicherheits-Hinweise zum Projekt

- **Berechtigungen:** Die Extension benötigt Zugriff auf *alle Websites*,
  ausschließlich für den **Cosmetic-Filter**. Dieser ist im Popup jederzeit
  abschaltbar. Stream-Logik läuft nur auf `twitch.tv` und `youtube.com`.
- **Telemetrie:** Sendet ausschließlich anonyme, aggregierte Werte (zufällige
  Install-ID, Version, Browser-Typ, Block-Summe). Keine URLs, keine besuchten
  Seiten, keine personenbezogenen Daten. Jederzeit per **Opt-out** im Popup
  abschaltbar. Das mitgelieferte HMAC-Secret ist kein echtes Geheimnis (es steckt
  zwangsläufig in jeder Extension); Schutz gegen Missbrauch bieten serverseitiges
  Rate-Limit und ein Zeitfenster.
- **Eigenes Backend:** Wer einen eigenen Telemetrie-Server betreibt, ersetzt
  Endpoint &amp; Secret in `telemetry.js` durch eigene Werte.
