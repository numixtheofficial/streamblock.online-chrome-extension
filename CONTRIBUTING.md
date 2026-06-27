# Contributing

Thanks for wanting to contribute to **Streamblock**! 💜

## Development setup

There is **no build step** — the extension is loaded directly from the source
folder:

1. Open `chrome://extensions/` → enable **Developer mode**
2. **"Load unpacked"** → select the `src/` folder
3. After changes: click **↺** in `chrome://extensions/`, then reload the
   Twitch/YouTube tab (F5)

> Tip: the three Twitch methods and the YouTube ad block hook into code that
> only runs on page load — so always reload the tab after code changes.

## Code style

- Vanilla JavaScript (ES2020+), no frameworks, no build tools.
- 2-space indentation, semicolons, single quotes (see `.editorconfig`).
- Write code that matches the surrounding code (naming, comment density).
- No new dependencies without a good reason.

## Before the pull request

- [ ] `node --check` passes for changed `.js` files.
- [ ] `manifest.json` and `rules.json` are valid JSON.
- [ ] Tested in Chromium **and** (if possible) Firefox.
- [ ] No secrets, no personal data, no `*.zip`/`*.crx` committed.
- [ ] For new block domains: added to `build-rules.js` and ran
      `node scripts/build-rules.js` (don't edit `rules.json` by hand).

## Extending the block lists

`rules.json` is **generated**. Always add new domains in `build-rules.js` and
regenerate:

```bash
node scripts/build-rules.js
```

Never block Twitch playback domains (`ttvnw.net`, `jtvnw.net`, …) — there is a
safety net in the generator for that.

## Commits

Short, meaningful commit messages in the imperative, e.g.:

```
fix: repair Stream-Swap after Twitch worker change
feat: add cosmetic filter for example.com
```

## Note

Streamblock is an educational project. Contributions that block the CDN
(`googlevideo.com`, `ttvnw.net`) or break playback will not be accepted.
