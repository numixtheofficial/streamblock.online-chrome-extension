/**
 * youtube.js — YouTube ad block (MAIN world)
 *
 * YouTube embeds video ads in the same player response as the real video.
 * Pure network blocking is therefore not enough. This method (like uBlock/AdGuard):
 * 1. Cuts ad fields (adPlacements, playerAds, adSlots) out of the
 * player responses (fetch /youtubei/v1/player + ytInitialPlayerResponse).
 * 2. Automatically skips any ads that still show up (skip button,
 * fast-forward + 16x speed-up of unskippable ads, closing overlays) and
 * meanwhile lays a loading shield over the player so that while
 * skipping no black screen (ad/transition frames) becomes visible.
 * 3. Hides display/feed ads via CSS.
 *
 * Control via localStorage flags (mirrored by yt-bridge.js):
 * __tabp_disabled = '1'      -> fully off
 * __tabp_methods.youtube     -> this method on/off
 * __tabp_methods.youtubeDai  -> SSAI strip (remove daiConfig) on/off (beta)
 */

(function () {
  'use strict';

  // Kill switch
  try { if (localStorage.getItem('__tabp_disabled') === '1') return; } catch (e) {}

  let METHODS = { youtube: true };
  try {
    const raw = localStorage.getItem('__tabp_methods');
    if (raw) METHODS = Object.assign(METHODS, JSON.parse(raw));
  } catch (e) {}
  if (METHODS.youtube === false) return;

  // SSAI strip (beta): remove YouTube's "Dynamic Ad Insertion" config.
  const STRIP_DAI = METHODS.youtubeDai !== false;

  const TAG = '[Streamblock/YT]';

  // Player responses (where the video ads live) -> targeted body rewrite.
  const PLAYER_RE = /\/youtubei\/v1\/(player|reel_item_watch|reel_watch_sequence)/;
  const YTI_RE = /\/youtubei\/v1\//;

  const AD_KEYS = [
    'adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams',
    'adServingData', 'adParams', 'adBreakServiceUrl', 'adAllowedConfig',
    'adsEngagementPanel',
    'adBreaks', 'adBreakParams', 'adBreakRenderer', 'playerAdParams',
    'adInfoRenderer', 'adNotificationRenderer'
  ];

  const ENFORCE_KEYS = [
    'enforcementMessageViewModel', 'enforcementMessageRenderer',
    'adBlockOnboardingRenderer'
  ];

  // Counts how many ad fields were removed in the last run.
  let _removed = 0;

  function pruneAds(obj, seen) {
    if (!obj || typeof obj !== 'object') return obj;
    seen = seen || new WeakSet();
    if (seen.has(obj)) return obj;
    seen.add(obj);
    try {
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) pruneAds(obj[i], seen);
        return obj;
      }
      for (const key of AD_KEYS) {
        if (key in obj) { delete obj[key]; _removed++; }
      }
      // Anti-Adblock-Renderer entfernen, BEVOR YouTube sie rendert.
      for (const key of ENFORCE_KEYS) {
        if (key in obj) { delete obj[key]; _removed++; }
      }
      const ps = obj.playabilityStatus;
      if (ps && ps.status && ps.status !== 'OK') {
        let blob = '';
        try { blob = JSON.stringify(ps); } catch (e) {}
        if (/ad[- ]?block|adblock|werbeblocker/i.test(blob)) {
          ps.status = 'OK';
          delete ps.errorScreen;
          delete ps.reason;
          delete ps.messages;
          _removed++;
        }
      }
      if (STRIP_DAI && 'daiConfig' in obj) { delete obj.daiConfig; _removed++; }
      if (obj.playerConfig && obj.playerConfig.adConfig) {
        delete obj.playerConfig.adConfig; _removed++;
      }
      if (obj.playabilityStatus && 'adInterruptCheckLeftMs' in obj.playabilityStatus) {
        delete obj.playabilityStatus.adInterruptCheckLeftMs; _removed++;
      }
      // Recursively clean all remaining children.
      for (const key in obj) {
        const v = obj[key];
        if (v && typeof v === 'object') pruneAds(v, seen);
      }
    } catch (e) {}
    return obj;
  }

  const _nativeParse = JSON.parse;

  function pruneText(text) {
    try {
      const obj = _nativeParse(text);
      _removed = 0;
      pruneAds(obj);
      if (_removed === 0) return null;
      return JSON.stringify(obj);
    } catch (e) {
      return null;
    }
  }

  const _MARKERS = ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams',
                    'adServingData', 'adBreaks', 'adBreakParams', 'adNotificationRenderer',
                    'enforcementMessageViewModel', 'enforcementMessageRenderer'];
  if (STRIP_DAI) _MARKERS.push('daiConfig');
  const AD_MARKER_RE = new RegExp('"(' + _MARKERS.join('|') + ')"');
  function containsAdMarker(text) {
    return typeof text === 'string' && text.length > 16 && AD_MARKER_RE.test(text);
  }
  function looksLikeAdObject(o) {
    if (!o || typeof o !== 'object') return false;
    return ('adPlacements' in o) || ('playerAds' in o) || ('adSlots' in o) ||
           ('adBreakRenderer' in o) || ('enforcementMessageViewModel' in o) ||
           (STRIP_DAI && 'daiConfig' in o);
  }

  // Diagnostics: limited reporting of WHERE & how many ads were removed.
  let _pruneLog = 0;
  let _lastAdReportAt = 0;
  const AD_REPORT_DEBOUNCE_MS = 2800;

  function notifyAdBlocked(source) {
    if (window !== window.top) return;
    const now = Date.now();
    if (now - _lastAdReportAt < AD_REPORT_DEBOUNCE_MS) return;
    _lastAdReportAt = now;
    try {
      document.dispatchEvent(new CustomEvent('sb-youtube-ad', { detail: { source } }));
    } catch (e) {}
  }

  function logPrune(where, url, n) {
    if (n > 0) notifyAdBlocked('prune:' + (where || 'unknown'));
  }

  // ytInitialPlayerResponse is set by YouTube as a global variable.
  try {
    let _ipr;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      get() { return _ipr; },
      set(v) { _ipr = pruneAds(v); }
    });
  } catch (e) {}

  try {
    let _idat;
    Object.defineProperty(window, 'ytInitialData', {
      configurable: true,
      get() { return _idat; },
      set(v) { _idat = pruneAds(v); }
    });
  } catch (e) {}

  // fetch hook: rewrite player/next responses.
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const res = await origFetch.apply(this, arguments);
    try {
      if (PLAYER_RE.test(url)) {
        const text = await res.clone().text();
        if (containsAdMarker(text)) {
          const body = pruneText(text);
          if (body !== null) {
            logPrune('fetch', url, _removed);
            const headers = new Headers(res.headers);
            headers.delete('content-encoding');
            headers.delete('content-length');
            return new Response(body, { status: res.status, statusText: res.statusText, headers });
          }
        }
      }
    } catch (e) { /* on error, return the original response */ }
    return res;
  };

  try {
    JSON.parse = function (text, reviver) {
      const data = _nativeParse(text, reviver);
      try {
        if (containsAdMarker(text)) {
          _removed = 0;
          pruneAds(data);
          if (_removed > 0) logPrune('JSON.parse', '', _removed);
        }
      } catch (e) {}
      return data;
    };
  } catch (e) {}

  try {
    const _origRespJson = Response.prototype.json;
    Response.prototype.json = function () {
      return _origRespJson.call(this).then((data) => {
        try {
          if (looksLikeAdObject(data)) {
            _removed = 0;
            pruneAds(data);
            if (_removed > 0) logPrune('Response.json', this.url || '', _removed);
          }
        } catch (e) {}
        return data;
      });
    };
  } catch (e) {}

  // XHR hook: YouTube still uses XMLHttpRequest for some InnerTube calls.
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__sbUrl = String(url || '');
      this.__sbIsYt = YTI_RE.test(this.__sbUrl);
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      if (this.__sbIsYt) {
        this.addEventListener('readystatechange', function () {
          if (this.readyState !== 4) return;
          try {
            const rt = this.responseType;
            if ((rt === '' || rt === 'text') && typeof this.responseText === 'string') {
              if (containsAdMarker(this.responseText)) {
                const cleaned = pruneText(this.responseText);
                if (cleaned !== null) {
                  Object.defineProperty(this, 'responseText', { value: cleaned, configurable: true });
                  Object.defineProperty(this, 'response', { value: cleaned, configurable: true });
                  logPrune('XHR', this.__sbUrl, _removed);
                }
              }
            } else if (rt === 'json' && this.response && typeof this.response === 'object') {
              // responseType 'json' returns an already-parsed object -> clean it directly.
              _removed = 0;
              pruneAds(this.response);
              if (_removed > 0) logPrune('XHR/json', this.__sbUrl, _removed);
            }
          } catch (e) {}
        });
      }
      return origSend.apply(this, arguments);
    };
  } catch (e) {}

  // 2. Auto-skip / fast-forward
  let adWasActive = false;
  let prevMuted = false;     // mute state of the real video before the ad
  let prevRate = 1;          // playback rate before the ad
  let pendingHideAt = 0;     // start of the ad->content transition (for hiding the shield)
  let contentDuration = 0;   // length of the REAL video (only after stable playback)
  let lastDur = -1;          // last seen duration (for the stability check)
  let stableTicks = 0;       // how many ticks the duration was stable without an ad
  let adTicks = 0;           // consecutive ticks an ad has been showing (seek guard)

  const SKIP_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-container button',
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-survey-answer-selector .ytp-ad-skip-button'
  ].join(', ');

  const OVERLAY_CLOSE_SELECTORS = [
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-overlay-close-container',
    '.ytp-ad-feedback-dialog-close-button',
    '.ytp-ad-image-overlay .ytp-ad-overlay-close-button'
  ].join(', ');

  function getActivePlayer() {
    const players = document.querySelectorAll('.html5-video-player');
    for (const p of players) if (p.classList.contains('ad-showing')) return p;
    for (const p of players) if (p.querySelector('video.html5-main-video')) return p;
    return players[0] || null;
  }

  let shieldEl = null;
  let shieldSpin = null;
  let shieldAnim = null;

  function buildShield() {
    shieldEl = document.createElement('div');
    shieldEl.setAttribute('data-sb-shield', '1');
    shieldEl.style.cssText = [
      'position:absolute', 'top:0', 'left:0', 'right:0', 'bottom:0',
      'z-index:2147483647',
      'display:flex', 'align-items:center', 'justify-content:center',
      'flex-direction:column', 'gap:14px', 'margin:0', 'padding:0',
      'background:#0f0f0f', 'color:#f1f1f1',
      'font-family:"Roboto","Segoe UI",Arial,sans-serif',
      'pointer-events:none', 'opacity:1'
    ].join(';');

    shieldSpin = document.createElement('div');
    shieldSpin.style.cssText = [
      'width:46px', 'height:46px', 'border-radius:50%', 'box-sizing:border-box',
      'border:3px solid rgba(255,255,255,.18)', 'border-top-color:#ff0033'
    ].join(';');

    const txt = document.createElement('div');
    txt.textContent = 'Werbung wird übersprungen…';
    txt.style.cssText = 'font-size:13px;letter-spacing:.3px;opacity:.85;margin:0';

    shieldEl.appendChild(shieldSpin);
    shieldEl.appendChild(txt);
  }

  function showShield() {
    const player = getActivePlayer();
    if (!player) return;
    // Ensure a positioning context so top/left/right/bottom:0 applies.
    try {
      const pos = getComputedStyle(player).position;
      if (!pos || pos === 'static') player.style.position = 'relative';
    } catch (e) {}

    if (!shieldEl || !shieldEl.isConnected) {
      buildShield();
      shieldAnim = null; // old animation belongs to the old (removed) spinner
    }
    if (shieldEl.parentElement !== player) player.appendChild(shieldEl);

    // Visible immediately (no fade-in -> no ad frames visible).
    shieldEl.style.transition = 'none';
    shieldEl.style.opacity = '1';

    // Spin the spinner via the Web Animations API (CSP-safe, no @keyframes needed).
    try {
      if (shieldSpin && shieldSpin.animate) {
        if (!shieldAnim) {
          shieldAnim = shieldSpin.animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            { duration: 800, iterations: Infinity }
          );
        } else {
          shieldAnim.play();
        }
      }
    } catch (e) {}
  }

  function hideShield() {
    if (!shieldEl) return;
    // Fade out gently.
    shieldEl.style.transition = 'opacity .28s ease';
    void shieldEl.offsetWidth; // force reflow so the transition applies
    shieldEl.style.opacity = '0';
    try { if (shieldAnim) shieldAnim.pause(); } catch (e) {}
  }

  const ENFORCE_SELECTORS = [
    'ytd-enforcement-message-view-model',
    'ytd-enforcement-message-renderer'
  ].join(',');

  const ADBLOCK_TEXT_RE = /experiencing interruptions|ad ?blockers? (?:are|aren.?t|violate|not allowed)|using an ad ?blocker|werbeblocker|ad ?blocker.*youtube|allowed on youtube|nicht erlaubt/i;
  const TRANSIENT_SELECTORS = [
    'tp-yt-paper-toast',
    'yt-mealbar-promo-renderer',
    'ytmusic-mealbar-promo-renderer',
    'ytd-popup-container tp-yt-paper-dialog'
  ].join(',');

  function resumePlayback() {
    try {
      const v = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (v && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) {}
  }

  function dismissAntiAdblock() {
    let hit = false;

    // (a) Hard enforcement popup — pauses the video + backdrop.
    let enforce = null;
    try { enforce = document.querySelector(ENFORCE_SELECTORS); } catch (e) {}
    if (enforce) {
      let dialog = null;
      try { dialog = enforce.closest('tp-yt-paper-dialog'); } catch (e) {}
      try { (dialog || enforce).remove(); } catch (e) {}
      // Remove the backdrop + make the page scrollable again.
      try { document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((b) => { try { b.remove(); } catch (e) {} }); } catch (e) {}
      try {
        document.documentElement && document.documentElement.style.removeProperty('overflow');
        document.body && document.body.style.removeProperty('overflow');
      } catch (e) {}
      hit = true;
    }

    // (b) Soft notice (toast/mealbar/dialog) — detect by text.
    try {
      const nodes = document.querySelectorAll(TRANSIENT_SELECTORS);
      for (const n of nodes) {
        const t = n.textContent || '';
        if (t.length > 400 || !ADBLOCK_TEXT_RE.test(t)) continue;
        if (n.tagName === 'TP-YT-PAPER-TOAST') {
          try { n.removeAttribute('opened'); } catch (e) {}
        } else {
          try { n.remove(); } catch (e) {}
        }
        hit = true;
      }
    } catch (e) {}

    if (hit) {
      resumePlayback();
      notifyAdBlocked('enforcement');
    }
    return hit;
  }

  function handleAds() {
    // First clear any anti-adblock popup that may have appeared.
    dismissAntiAdblock();

    const player = getActivePlayer();
    const video = document.querySelector('video.html5-main-video') ||
                  document.querySelector('.html5-video-container video') ||
                  document.querySelector('video');
    const adShowing = player && player.classList.contains('ad-showing');
    const d = video ? video.duration : NaN;

    if (!adShowing && isFinite(d) && d > 0) {
      if (d === lastDur) stableTicks++; else stableTicks = 0;
      lastDur = d;
      if (stableTicks >= 7) contentDuration = d;
    } else if (adShowing) {
      stableTicks = 0;
    }

    if (adShowing && video) {
      adTicks++;
      // Rising edge: save the real video's state + count the ad.
      if (!adWasActive) {
        adWasActive = true;
        prevMuted = video.muted;
        prevRate = video.playbackRate || 1;  // remember the rate
        showShield();                        // cover the player IMMEDIATELY (no black screen)
        notifyAdBlocked('player');
      } else {
        // Keep the shield up during the ad (in case it was hidden).
        showShield();
      }
      try {
        video.muted = true;
        if (video.playbackRate !== 16) video.playbackRate = 16;
        // Only seek to the end if ALL conditions are met. The adTicks>=2 guard
        // makes sure a single false 'ad-showing' flash at video start can never
        // seek the REAL video to its end (which looked like an instant pause).
        const safeToSeek = adTicks >= 2 && contentDuration > 0 &&
                           isFinite(d) && d > 0 &&
                           Math.abs(d - contentDuration) > 1;
        if (safeToSeek) {
          video.currentTime = d;
        }
      } catch (e) {}
    } else if (!adShowing) {
      adTicks = 0;
      // Falling edge: restore the original state after the ad.
      if (adWasActive && video) {
        try {
          video.muted = prevMuted;
          video.playbackRate = prevRate || 1;
        } catch (e) {}
        pendingHideAt = Date.now();  // keep covering the transition until the picture is back
      }
      adWasActive = false;

      if (pendingHideAt) {
        const ready = video && !video.paused && !video.seeking && video.readyState >= 3;
        if (ready || (Date.now() - pendingHideAt) > 1500) {
          hideShield();
          pendingHideAt = 0;
        }
      }
    }

    // Click skip buttons (various YouTube versions) immediately.
    const skip = document.querySelector(SKIP_SELECTORS);
    if (skip) { try { skip.click(); } catch (e) {} }

    // Close overlay/banner ads.
    const overlayClose = document.querySelector(OVERLAY_CLOSE_SELECTORS);
    if (overlayClose) { try { overlayClose.click(); } catch (e) {} }
  }

  // Fallback interval (frequent enough not to let ad frames through) ...
  setInterval(handleAds, 100);

  let playerObserver = null;
  function attachPlayerObserver() {
    const player = document.querySelector('.html5-video-player');
    if (!player || playerObserver) return;
    try {
      playerObserver = new MutationObserver(handleAds);
      playerObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
      handleAds();
    } catch (e) {}
  }
  // Wait for the player to appear (SPA navigation), then attach.
  const playerWait = setInterval(() => {
    if (playerObserver) { clearInterval(playerWait); return; }
    attachPlayerObserver();
  }, 500);

  // Reset the per-video state on SPA navigation, so a stale contentDuration from
  // the previous video can never trigger a seek on the freshly started one.
  function resetAdState() {
    contentDuration = 0;
    lastDur = -1;
    stableTicks = 0;
    adTicks = 0;
    adWasActive = false;
    pendingHideAt = 0;
    try { hideShield(); } catch (e) {}
  }
  try { document.addEventListener('yt-navigate-finish', resetAdState, true); } catch (e) {}
  try { document.addEventListener('yt-navigate-start', resetAdState, true); } catch (e) {}

  // 3. Hide display/feed ads via CSS
  const AD_CSS = `
    #player-ads, #masthead-ad,
    ytd-display-ad-renderer, ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer, ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer,
    ytd-statement-banner-renderer, ytd-companion-slot-renderer,
    ytd-action-companion-ad-renderer, ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    .ytp-ad-overlay-container, .ytp-ad-message-container,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    ytmusic-mealbar-promo-renderer,
    /* Hide in-player ad UI so nothing pops up while fast-forwarding */
    .ytp-ad-overlay-slot, .ytp-ad-overlay-image, .ytp-ad-text-overlay,
    .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout,
    .ytp-ad-player-overlay-instream-info, .ytp-ad-action-interstitial,
    .ytp-ad-image-overlay, .ytp-suggested-action,
    .video-ads.ytp-ad-module,
    /* Hide the anti-adblock popup immediately, before the interval removes it
       (prevents the brief flash on the first page load). */
    ytd-enforcement-message-view-model,
    ytd-enforcement-message-renderer,
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
    ytd-popup-container:has(ytd-enforcement-message-view-model) {
      display: none !important;
    }
  `;

  function injectCss() {
    try {
      if (document.getElementById('sb-youtube-css')) return;
      const root = document.head || document.documentElement;
      if (!root) return;
      const style = document.createElement('style');
      style.id = 'sb-youtube-css';
      style.textContent = AD_CSS;
      root.appendChild(style);
    } catch (e) {}
  }
  injectCss();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCss, { once: true });
  }
})();
