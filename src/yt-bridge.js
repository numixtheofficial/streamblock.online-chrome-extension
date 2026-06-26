/**
 * yt-bridge.js — YouTube Bridge (ISOLATED World)
 *
 * Gegenstück zu youtube.js (MAIN World), analog zu content.js<->inject.js bei Twitch:
 * 1. Spiegelt Einstellungen (enabled + methods) nach localStorage, damit
 * youtube.js sie beim Seitenladen synchron lesen kann.
 * 2. Zählt übersprungene YouTube-Ads (Event von youtube.js -> background.js).
 */

(function () {
  'use strict';

  const DISABLED_KEY = '__tabp_disabled';
  const METHODS_KEY = '__tabp_methods';
  const DEFAULT_METHODS = {
    streamSwap: true, strip: true, spoof: true,
    network: true, dom: true, cosmetic: true, youtube: true, youtubeDai: true
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
      // Force-Update (gesperrte Version) -> Schutz komplett aus, egal welche Einstellung.
      chrome.storage.local.get(['sbForceUpdate'], (f) => {
        const blocked = !chrome.runtime.lastError && f && f.sbForceUpdate && f.sbForceUpdate.blocked;
        chrome.storage.sync.get(['enabled', 'methods'], (s) => {
          if (chrome.runtime.lastError) return;
          mirror(!blocked && s.enabled !== false, Object.assign({}, DEFAULT_METHODS, s.methods || {}));
        });
      });
    } catch (e) {}
  }

  // Initial spiegeln + bei Änderungen aktualisieren (greift beim nächsten Laden).
  syncFromStorage();
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && ('enabled' in changes || 'methods' in changes)) syncFromStorage();
      if (area === 'local' && 'sbForceUpdate' in changes) syncFromStorage();
    });
  } catch (e) {}

  // Statistik: MAIN-World (youtube.js) kann kein chrome.runtime nutzen → Event-Brücke.
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
