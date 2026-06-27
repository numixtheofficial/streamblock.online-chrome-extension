# Security Policy

## Supported versions

Only the **latest** version is maintained. Please update to the newest version
before reporting an issue.

| Version | Supported |
|--------:|:---------:|
| 2.4.x   | ✅ |
| < 2.4   | ❌ |

## Reporting a vulnerability

Please do **not** report security issues via public GitHub issues.

Instead use the **[GitHub Security Advisories](../../security/advisories/new)**
("Report a vulnerability") or contact the maintainers privately. Please include:

- affected version & browser,
- a description of the issue and its potential impact,
- steps to reproduce (if available).

You'll usually get a response within a few days.

## Security notes about the project

- **Permissions:** the extension needs access to *all websites*, solely for the
  **cosmetic filter**. It can be turned off in the popup at any time. Stream
  logic only runs on `twitch.tv` and `youtube.com`.
- **Telemetry:** sends only anonymous, aggregated values (random install ID,
  version, browser type, total block count). No URLs, no visited pages, no
  personal data. Can be turned off at any time via **opt-out** in the popup.
  The bundled HMAC secret is not a real secret (it inevitably ships in every
  extension); protection against abuse comes from a server-side rate limit and
  a time window.
- **Own backend:** if you run your own telemetry server, replace the endpoint &
  secret in `telemetry.js` with your own values.
