/**
 * youtube.js — YouTube Ad-Block (MAIN World)
 *
 * YouTube bettet Video-Werbung in dieselbe Player-Antwort wie das echte Video.
 * Reines Netzwerk-Blocken reicht daher nicht. Diese Methode (wie uBlock/AdGuard):
 * 1. Schneidet Werbe-Felder (adPlacements, playerAds, adSlots) aus den
 * Player-Antworten (fetch /youtubei/v1/player + ytInitialPlayerResponse).
 * 2. Überspringt automatisch alle Ads, die trotzdem auftauchen (Skip-Button,
 * Vorspulen + 16x-Beschleunigung unskippbarer Ads, Overlay schließen) und
 * legt währenddessen einen Lade-Schild über den Player, damit beim
 * Durchspulen kein Blackscreen (Ad-/Übergangsframes) sichtbar wird.
 * 3. Versteckt Display-/Feed-Werbung per CSS.
 *
 * Steuerung über localStorage-Flags (von yt-bridge.js gespiegelt):
 * __tabp_disabled = '1'      -> komplett aus
 * __tabp_methods.youtube     -> diese Methode an/aus
 * __tabp_methods.youtubeDai  -> SSAI-Strip (daiConfig entfernen) an/aus (Beta)
 */

(function () {
  'use strict';

  // Aus-Schalter
  try { if (localStorage.getItem('__tabp_disabled') === '1') return; } catch (e) {}

  let METHODS = { youtube: true };
  try {
    const raw = localStorage.getItem('__tabp_methods');
    if (raw) METHODS = Object.assign(METHODS, JSON.parse(raw));
  } catch (e) {}
  if (METHODS.youtube === false) return;

  // SSAI-Strip (Beta): YouTubes "Dynamic Ad Insertion"-Konfig entfernen.
  const STRIP_DAI = METHODS.youtubeDai !== false;

  const TAG = '[Streamblock/YT]';

  // Player-Antworten (dort steckt die Video-Werbung) -> gezielter Body-Rewrite.
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

  // Zählt, wie viele Werbe-Felder beim letzten Lauf entfernt wurden.
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
      // Alle übrigen Kinder rekursiv säubern.
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

  // Diagnose: protokolliert begrenzt, WO & wie viel Werbung entfernt wurde.
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

  // ytInitialPlayerResponse wird von YouTube als globale Variable gesetzt.
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

  // fetch-Hook: Player-/Next-Antworten umschreiben.
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
    } catch (e) { /* bei Fehler Originalantwort zurückgeben */ }
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

  // XHR-Hook: YouTube nutzt für manche InnerTube-Calls noch XMLHttpRequest.
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
              // responseType 'json' liefert ein bereits geparstes Objekt -> direkt säubern.
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

  // 2. Auto-Skip / Vorspulen
  let adWasActive = false;
  let prevMuted = false;     // Mute-Zustand des echten Videos vor der Werbung
  let prevRate = 1;          // Wiedergabe-Geschwindigkeit vor der Werbung
  let pendingHideAt = 0;     // Start des Ad->Inhalt-Übergangs (für Schild-Ausblenden)
  let contentDuration = 0;   // Länge des ECHTEN Videos (nur nach stabiler Wiedergabe)
  let lastDur = -1;          // zuletzt gesehene Dauer (für Stabilitäts-Prüfung)
  let stableTicks = 0;       // wie viele Ticks die Dauer ohne Ad stabil war

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
    // Positions-Kontext sicherstellen, damit top/left/right/bottom:0 greift.
    try {
      const pos = getComputedStyle(player).position;
      if (!pos || pos === 'static') player.style.position = 'relative';
    } catch (e) {}

    if (!shieldEl || !shieldEl.isConnected) {
      buildShield();
      shieldAnim = null; // alte Animation gehört zum alten (entfernten) Spinner
    }
    if (shieldEl.parentElement !== player) player.appendChild(shieldEl);

    // Sofort sichtbar (kein Fade-in -> keine Ad-Frames sichtbar).
    shieldEl.style.transition = 'none';
    shieldEl.style.opacity = '1';

    // Spinner per Web-Animations-API drehen (CSP-fest, kein @keyframes nötig).
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
    // Sanft ausblenden.
    shieldEl.style.transition = 'opacity .28s ease';
    void shieldEl.offsetWidth; // Reflow erzwingen, damit die Transition greift
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

    // (a) Hartes Enforcement-Popup — pausiert das Video + Backdrop.
    let enforce = null;
    try { enforce = document.querySelector(ENFORCE_SELECTORS); } catch (e) {}
    if (enforce) {
      let dialog = null;
      try { dialog = enforce.closest('tp-yt-paper-dialog'); } catch (e) {}
      try { (dialog || enforce).remove(); } catch (e) {}
      // Backdrop entfernen + Seite wieder scrollbar machen.
      try { document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((b) => { try { b.remove(); } catch (e) {} }); } catch (e) {}
      try {
        document.documentElement && document.documentElement.style.removeProperty('overflow');
        document.body && document.body.style.removeProperty('overflow');
      } catch (e) {}
      hit = true;
    }

    // (b) Weicher Hinweis (Toast/Mealbar/Dialog) — per Text erkennen.
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
    // Zuerst ein evtl. aufgepopptes Anti-Adblock-Fenster wegräumen.
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
      // Rising-Edge: Zustand des echten Videos sichern + Ad zählen.
      if (!adWasActive) {
        adWasActive = true;
        prevMuted = video.muted;
        prevRate = video.playbackRate || 1;  // Geschwindigkeit merken
        showShield();                        // Player SOFORT abdecken (kein Blackscreen)
        notifyAdBlocked('player');
      } else {
        // Während der Werbung den Schild oben halten (falls er ausgeblendet wurde).
        showShield();
      }
      try {
        video.muted = true;
        if (video.playbackRate !== 16) video.playbackRate = 16;
        // Nur ans Ende spulen, wenn ALLE Bedingungen erfüllt sind:
        const safeToSeek = contentDuration > 0 && isFinite(d) && d > 0 &&
                           Math.abs(d - contentDuration) > 1;
        if (safeToSeek) {
          video.currentTime = d;
        }
      } catch (e) {}
    } else if (!adShowing) {
      // Falling-Edge: nach der Werbung Original-Zustand wiederherstellen.
      if (adWasActive && video) {
        try {
          video.muted = prevMuted;
          video.playbackRate = prevRate || 1;
        } catch (e) {}
        pendingHideAt = Date.now();  // Übergang weiter abdecken, bis Bild da ist
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

    // Skip-Buttons (verschiedene YouTube-Versionen) sofort klicken.
    const skip = document.querySelector(SKIP_SELECTORS);
    if (skip) { try { skip.click(); } catch (e) {} }

    // Overlay-/Banner-Werbung schließen.
    const overlayClose = document.querySelector(OVERLAY_CLOSE_SELECTORS);
    if (overlayClose) { try { overlayClose.click(); } catch (e) {} }
  }

  // Fallback-Intervall (häufig genug, um Ad-Frames nicht durchzulassen) ...
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
  // Auf das Erscheinen des Players warten (SPA-Navigation), dann anhängen.
  const playerWait = setInterval(() => {
    if (playerObserver) { clearInterval(playerWait); return; }
    attachPlayerObserver();
  }, 500);

  // 3. Display-/Feed-Werbung per CSS verstecken
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
    /* In-Player-Werbe-UI verstecken, damit beim Vorspulen nichts aufploppt */
    .ytp-ad-overlay-slot, .ytp-ad-overlay-image, .ytp-ad-text-overlay,
    .ytp-ad-player-overlay, .ytp-ad-player-overlay-layout,
    .ytp-ad-player-overlay-instream-info, .ytp-ad-action-interstitial,
    .ytp-ad-image-overlay, .ytp-suggested-action,
    .video-ads.ytp-ad-module,
    /* Anti-Adblock-Popup sofort verstecken, bevor das Intervall es entfernt
       (verhindert das kurze Aufblitzen beim ersten Seitenaufruf). */
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
