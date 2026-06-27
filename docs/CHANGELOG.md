# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project loosely follows [Semantic Versioning](https://semver.org/).

## [2.4.15]

### Fixed
- **Telemetry: installations counted twice.** On the very first start a race
  condition could briefly generate two random install IDs, which made a single
  installation count twice in the dashboard. ID generation is now shared (a
  memoized promise) so concurrent calls receive the same ID. Purely an internal
  stats correction — no effect on ad blocking.

## [2.4.14]

### Added
- **YouTube anti-adblock defense**: the hard enforcement popup ("ad blocker
  detected") that pauses the video is now removed immediately (CSS + active
  cleanup) and playback resumes automatically. The soft notice
  ("Experiencing interruptions?" / toast at the bottom left) that artificially
  delays playback is also detected by text and cleared.
- **YouTube anti-adblock blocked at the data level**: the trigger of the popup
  (`enforcementMessageViewModel` & co.) is now cut out of the network/page data
  (`ytInitialData`, player/next responses) — the popup is never built in the
  first place and the delay attached to it is gone. In addition, a hard
  `playabilityStatus` block related to adblocking is reset to `OK` (strictly
  text-gated; genuine errors such as geo blocks are left untouched).

### Changed
- **Faster YouTube video start**: the `fetch` hook now fully buffers only
  player responses instead of every InnerTube response. Feed/browse/search
  responses no longer delay the critical path (they are still cleaned via the
  `JSON.parse` / `Response.json` / `XHR` hooks).

## [2.4.13]

### Included
- **Stream-Swap** for Twitch (worker hook + ad-free backup stream), including
  ad-segment stripping and `player_type` spoofing.
- **YouTube ad block** (ad stripping from the player response + auto-skip).
- **Network blocking** with ~336 rules (generated from `build-rules.js`).
- **Cosmetic filter** on all websites (can be turned off in the popup).
- **Popup** with live stats, per-method toggles and multilingual UI (DE/EN).
- **Detail view** with a live block log.
- Anonymous, aggregated **telemetry** (opt-out) — only install ID, version,
  browser type and total block count; no URLs or personal data.

---

<!--
Maintenance note: when releasing a new version, add a section
[x.y.z] - YYYY-MM-DD at the top with the categories Added / Changed / Fixed /
Removed, and bump the version in manifest.json to match.
-->

[2.4.15]: ../../releases/tag/v2.4.15
[2.4.14]: ../../releases/tag/v2.4.14
[2.4.13]: ../../releases/tag/v2.4.13
