/**
 * yt-bridge.js — YouTube bridge (ISOLATED world)
 *
 * Counterpart to youtube.js (MAIN world), analogous to content.js<->inject.js on Twitch:
 * 1. Mirrors settings (enabled + methods) into localStorage so youtube.js
 * can read them synchronously on page load.
 * 2. Counts skipped YouTube ads (event from youtube.js -> background.js).
 */

(function () {
  'use strict';

  const DISABLED_KEY = '__tabp_disabled';
  const METHODS_KEY = '__tabp_methods';
  const DEFAULT_METHODS = {
    streamSwap: true, strip: true, spoof: true,
    network: true, dom: true, cosmetic: true, youtube: true, youtubeDai: true,
    youtubeNet: false
  };

  function mirror(enabled, methods) {
    try {
      if (enabled) localStorage.removeItem(DISABLED_KEY);
      else localStorage.setItem(DISABLED_KEY, '1');
    } catch (e) {}
    try { localStorage.setItem(METHODS_KEY, JSON.stringify(methods)); } catch (e) {}
  }

  function syncFromStorage() {
    try {
      // Force update (blocked version) -> protection fully off, regardless of setting.
      chrome.storage.local.get(['sbForceUpdate'], (f) => {
        const blocked = !chrome.runtime.lastError && f && f.sbForceUpdate && f.sbForceUpdate.blocked;
        chrome.storage.sync.get(['enabled', 'methods'], (s) => {
          if (chrome.runtime.lastError) return;
          mirror(!blocked && s.enabled !== false, Object.assign({}, DEFAULT_METHODS, s.methods || {}));
        });
      });
    } catch (e) {}
  }

  // Mirror initially + update on changes (takes effect on the next load).
  syncFromStorage();
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && ('enabled' in changes || 'methods' in changes)) syncFromStorage();
      if (area === 'local' && 'sbForceUpdate' in changes) syncFromStorage();
    });
  } catch (e) {}

  // Stats: MAIN world (youtube.js) can't use chrome.runtime → event bridge.
  document.addEventListener('sb-youtube-ad', function (e) {
    try {
      chrome.runtime.sendMessage({
        type: 'AD_BLOCKED',
        label: 'YouTube Video-Werbung',
        payload: {
          adType: 'youtube',
          source: (e && e.detail && e.detail.source) || 'youtube',
          url: location.href
        }
      }).catch(function () {});
    } catch (err) {}
  });
})();
