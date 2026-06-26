/* detail.js — lädt ECHTE Block-Logs aus dem Service Worker */
(function () {
  'use strict';

  var FREE_VISIBLE = 5;
  var DONATE_URL = 'https://streamblock.online/support';
  var lastData = null;

  function t(key, vars) {
    return window.SB_I18N ? SB_I18N.t(key, vars) : key;
  }

  function nf() {
    var lang = window.SB_I18N ? SB_I18N.getLanguage() : 'de';
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'de-DE');
  }

  function fmt(n) { return nf().format(n || 0); }

  function relTime(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 5) return t('time.now');
    if (s < 60) return s + 's';
    if (s < 3600) return Math.round(s / 60) + 'm';
    return Math.round(s / 3600) + 'h';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tagFor(e) {
    if (e.type === 'video') return { cls: 't-video', txt: e.source || t('tag.video') };
    var l = (e.label || '').toLowerCase();
    var isTracker = /(analytics|track|sentry|hotjar|stat|telemetry|pixel|consent|cookie)/.test(l);
    return isTracker
      ? { cls: 't-tracker', txt: t('tag.tracker') }
      : { cls: 't-ad', txt: t('tag.ad') };
  }

  function updateLiveNote(shown) {
    var note = document.getElementById('liveNoteText');
    if (note) {
      note.innerHTML = t('detail.live.note', { shown: String(shown) });
    }
  }

  function render(data) {
    lastData = data;
    var entries = (data && data.entries) || [];

    document.getElementById('kpiTotal').textContent = fmt(data.total);
    document.getElementById('kpiNet').textContent = fmt(data.netTotal);
    document.getElementById('kpiAds').textContent = fmt(data.adTotal);

    var list = document.getElementById('liveLog');
    if (!entries.length) {
      list.innerHTML = '<div class="d-empty">' + escapeHtml(t('detail.live.empty')) + '</div>';
      updateLiveNote(0);
      document.getElementById('liveTotal').textContent = '';
      return;
    }

    var shown = entries.slice(0, FREE_VISIBLE);
    list.innerHTML = shown.map(function (e) {
      var tag = tagFor(e);
      return '<div class="d-row">' +
        '<span class="d-tag ' + tag.cls + '">' + escapeHtml(tag.txt) + '</span>' +
        '<span class="d-url">' + escapeHtml(e.label) + '</span>' +
        '<span class="d-time">' + relTime(e.t) + '</span>' +
        '</div>';
    }).join('');

    updateLiveNote(shown.length);
    var hidden = Math.max(0, entries.length - shown.length);
    document.getElementById('liveTotal').textContent = hidden > 0
      ? t('detail.live.moreLocked', { count: fmt(hidden) })
      : '';
  }

  function load() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_BLOCK_LOG' }, function (data) {
        if (chrome.runtime.lastError || !data) {
          document.getElementById('liveLog').innerHTML =
            '<div class="d-empty">' + escapeHtml(t('detail.live.error')) + '</div>';
          return;
        }
        render(data);
      });
    } catch (e) { /* ignore */ }
  }

  var donateBtn = document.getElementById('detailDonateBtn');
  if (donateBtn) {
    donateBtn.addEventListener('click', function (e) {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        e.preventDefault();
        chrome.tabs.create({ url: DONATE_URL });
      }
    });
  }

  SB_I18N.init().then(function () {
    if (lastData) render(lastData);
    SB_I18N.onChange(function () {
      if (lastData) render(lastData);
    });
    load();
    setInterval(load, 2000);
  });
})();
