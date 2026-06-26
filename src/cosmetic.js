/**
 * cosmetic.js — Generisches Cosmetic-Filtering (ISOLATED World, ALLE Webseiten)
 *
 * Blendet bekannte Ad-Bait-Elemente per CSS aus (EasyList-Stil). Greift auf
 * jeder http/https-Seite und sorgt dafür, dass Display-Ads & Ad-Bait-Container
 * kollabieren (Höhe/Breite 0) — das ist es, was Adblock-Tests als "geblockt" werten.
 *
 * Steuerung:
 * - Methode "cosmetic" (chrome.storage.sync -> methods.cosmetic)
 * - Master-Schalter "enabled"
 * - Reagiert live auf Einstellungsänderungen (kein Reload nötig)
 */

(function () {
  'use strict';

  const STYLE_ID = 'streamblock-cosmetic';

  const SELECTORS = [
    'ins.adsbygoogle', '.adsbygoogle',
    '[data-ad-client]', '[data-ad-slot]', '[data-ad-format]',
    '[data-ads]', 'div[data-ads]', '[data-adv]',
    '.adsbox', '.ad-placeholder', '.ad-placement', '.ad-placard',
    '.ad-banner', '.ad_banner', '.ad-leaderboard', '.ad-slot', '.ad-unit', '.ad-wrapper',
    '.banner-ad', '.banner_ad', '.bannerad', '.banner-ads',
    '.pub_300x250', '.pub_300x250m', '.pub_728x90',
    '.text-ad', '.text-ads', '.text_ad', '.text_ads', '.text-ad-links', '.textAd', '.textads',
    '.advertisement', '.advertising', '.adsense', '.google-ad', '.googlead',
    '#ad-banner', '#adBanner', '#ad_banner', '#ad-container', '#adContainer', '#AdContainer',
    '#ad-slot', '#ads-banner', '#adsense',
    '[id^="div-gpt-ad"]', '[id^="google_ads_"]', '[id^="ad-slot-"]',
    'iframe[id^="google_ads_iframe"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="adnxs.com"]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="adservice."]',
    // Flash-Werbebanner (Flash ist tot — Ausblenden ist generell unbedenklich)
    'object[type="application/x-shockwave-flash"]',
    'embed[type="application/x-shockwave-flash"]',
    // Banner-Werbemittel mit Ad-Keywords im Pfad (z.B. adblock-tester.com)
    'img[src*="_advertising_ads_banner"]',
    'object[data*="_advertising_ads_banner"]',
    'embed[src*="_advertising_ads_banner"]'
  ];

  const CSS = SELECTORS.join(',\n') + ` {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }`;

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeStyle() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  // Sofort anwenden (Default an) — verhindert Flackern, bevor Settings da sind.
  addStyle();

  function apply(enabled, methods) {
    const on = enabled !== false && (!methods || methods.cosmetic !== false);
    if (on) addStyle();
    else removeStyle();
  }

  try {
    chrome.storage.sync.get(['enabled', 'methods'], (s) => {
      if (chrome.runtime.lastError) return;
      apply(s.enabled, s.methods || {});
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (!('enabled' in changes) && !('methods' in changes)) return;
      chrome.storage.sync.get(['enabled', 'methods'], (s) => {
        if (chrome.runtime.lastError) return;
        apply(s.enabled, s.methods || {});
      });
    });
  } catch (e) {
    // chrome.storage nicht verfügbar -> Style bleibt aktiv (Default)
  }
})();
