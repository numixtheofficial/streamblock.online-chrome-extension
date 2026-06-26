/**
 * content.js — Content Script (ISOLATED World)
 *
 * inject.js laeuft als MAIN-World Content-Script und uebernimmt die Stream-Swap-Logik.
 * content.js ist zustaendig fuer:
 * 1. CSS-basiertes Verstecken von Banner-/Display-Ads (Methode "dom")
 * 2. Statistik (Events von inject.js -> background.js)
 * 3. Methoden-Einstellungen in localStorage spiegeln (damit inject.js sie liest)
 * 4. Kommunikation mit dem Popup (An/Aus, einzelne Methoden, Stats)
 */

(function () {
  'use strict';

  const DISABLED_KEY = '__tabp_disabled';
  const METHODS_KEY = '__tabp_methods';

  const DEFAULT_METHODS = { streamSwap: true, strip: true, spoof: true, network: true, dom: true, cosmetic: true, youtube: true, youtubeDai: true };

  // Ad-CSS: Banner-/Display-Werbung unsichtbar machen
  const AD_CSS = `
    [data-a-target="banner-ad-container"],
    [data-a-target="side-nav-card-ad"],
    [class*="ad-banner"],
    [class*="tw-ad"],
    div[data-test-selector="ad-banner"],
    div[class*="BannerAd"],
    div[class*="adSlot"],
    .player-ad-notice,
    .stream-chat-ad,
    .ad-overlay,
    [class*="AdOverlay"],
    [class*="tw-tower"] > div[class*="Ad"],
    div[class*="SurveyPanel"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;

  function applyDomRemover(on) {
    const existing = document.getElementById('tabp-ad-css');
    if (on) {
      if (!existing) {
        const style = document.createElement('style');
        style.id = 'tabp-ad-css';
        style.textContent = AD_CSS;
        (document.head || document.documentElement).appendChild(style);
      }
    } else if (existing) {
      existing.remove();
    }
  }

  // Methoden in localStorage spiegeln (inject.js liest beim naechsten Laden)
  function writeMethodsFlag(methods) {
    try { localStorage.setItem(METHODS_KEY, JSON.stringify(methods)); } catch (e) {}
  }

  function writeDisabledFlag(enabled) {
    try {
      if (enabled) localStorage.removeItem(DISABLED_KEY);
      else localStorage.setItem(DISABLED_KEY, '1');
    } catch (e) {}
  }

  // Statistik
  let sessionBlocked = 0;

  function incrementBlocked(type) {
    sessionBlocked++;
    chrome.runtime.sendMessage({
      type: 'AD_BLOCKED',
      payload: { adType: type, url: location.href }
    }).catch(() => {});
  }

  window.addEventListener('tab-ad-blocked', (e) => {
    let type = 'stream-ad';
    try { if (e && e.detail && e.detail.type) type = e.detail.type; } catch (err) {}
    incrementBlocked(type);
  });

  // Aktuelle Einstellungen anwenden
  function applySettings(settings) {
    const enabled = settings.enabled !== false;
    const methods = Object.assign({}, DEFAULT_METHODS, settings.methods || {});

    writeDisabledFlag(enabled);
    writeMethodsFlag(methods);
    applyDomRemover(enabled && methods.dom);
  }

  // Initial: gespeicherte Einstellungen holen und anwenden
  function refreshSettings() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (chrome.runtime.lastError || !settings) {
        applyDomRemover(true);
        return;
      }
      applySettings(settings);
    });
  }
  refreshSettings();

  // Force-Update (gesperrte Version) live übernehmen — voller Effekt beim nächsten Laden.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'sbForceUpdate' in changes) refreshSettings();
    });
  } catch (e) {}

  // Popup-Kommunikation
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_TAB_STATS') {
      sendResponse({ blocked: sessionBlocked, url: location.href });
      return true;
    }

    if (msg.type === 'APPLY_SETTINGS') {
      const settings = msg.payload || {};
      applySettings(settings);
      const reload = !!msg.payload?.reload;
      sendResponse({ ok: true, reloaded: reload });
      if (reload) setTimeout(() => location.reload(), 150);
      return true;
    }
  });

})();
