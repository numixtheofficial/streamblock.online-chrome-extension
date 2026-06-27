/**
 * cosmetic.js — Generic cosmetic filtering (ISOLATED world, ALL websites)
 *
 * Hides known ad-bait elements via CSS (EasyList style). Runs on every
 * http/https page and makes display ads & ad-bait containers collapse
 * (height/width 0) — which is what adblock testers count as "blocked".
 *
 * Control:
 * - "cosmetic" method (chrome.storage.sync -> methods.cosmetic)
 * - Master switch "enabled"
 * - Reacts live to setting changes (no reload needed)
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
    // Flash ad banners (Flash is dead — hiding these is generally safe)
    'object[type="application/x-shockwave-flash"]',
    'embed[type="application/x-shockwave-flash"]',
    // Banner ad assets with ad keywords in the path (e.g. adblock-tester.com)
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

  // Apply immediately (default on) — prevents flicker before settings arrive.
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
    // chrome.storage unavailable -> style stays active (default)
  }
})();
