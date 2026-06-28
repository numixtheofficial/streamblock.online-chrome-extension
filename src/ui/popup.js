/**
 * popup.js — Extension popup logic
 */

(async function () {
  'use strict';

  const DEFAULT_METHODS = { streamSwap: true, strip: true, spoof: true, network: true, dom: true, cosmetic: true, youtube: true, youtubeDai: true, youtubeNet: false };

  const ICON_ON = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 0C3.13 0 0 3.13 0 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm-1 10.5L2.5 7l1.41-1.41L6 8.67l4.59-4.58L12 5.5 6 11.5z"/></svg>`;
  const ICON_OFF = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 0a7 7 0 100 14A7 7 0 007 0zm2.6 9.6l-.99.99L7 8.98 5.39 10.6l-.99-.99L6.01 8 4.4 6.39l.99-.99L7 7.02l1.61-1.62.99.99L7.99 8l1.61 1.6z"/></svg>`;

  const enabledToggle = document.getElementById('enabledToggle');
  const statusText = document.getElementById('statusText');
  const totalEl = document.getElementById('totalBlocked');
  const adBreaksEl = document.getElementById('adBreaks');
  const networkEl = document.getElementById('networkBlocks');
  const timeSavedEl = document.getElementById('timeSaved');
  const resetStatsBtn = document.getElementById('resetStats');
  const methodInputs = Array.from(document.querySelectorAll('.method-toggle'));
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const openSettingsBtn = document.getElementById('openSettings');
  const closeSettingsBtn = document.getElementById('closeSettings');
  const languageSelect = document.getElementById('languageSelect');
  const welcomeOverlay = document.getElementById('welcomeOverlay');
  const welcomeLanguage = document.getElementById('welcomeLanguage');
  const welcomeContinue = document.getElementById('welcomeContinue');
  const welcomeDonate = document.getElementById('welcomeDonate');
  const feedbackBtn = document.getElementById('feedbackBtn');
  const SUPPORT_URL = 'https://streamblock.online/support';
  const FEEDBACK_BASE = 'https://streamblock.online/feedback';

  let currentEnabled = true;
  let currentMethods = Object.assign({}, DEFAULT_METHODS);

  function t(key, vars) {
    return window.SB_I18N ? SB_I18N.t(key, vars) : key;
  }

  // Toast
  let toastTimer = null;
  function showToast(msg, type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    clearTimeout(toastTimer);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // Helpers
  function animateNumber(el, target) {
    const current = parseInt(String(el.textContent).replace(/\D/g, '')) || 0;
    if (current === target) { el.textContent = target; return; }
    const diff = target - current;
    const steps = Math.min(Math.abs(diff), 28);
    const step = diff / steps;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      el.textContent = Math.round(current + step * i);
      if (i >= steps) { el.textContent = target; clearInterval(interval); }
    }, 18);
  }

  function formatTime(sec) {
    sec = Math.round(sec || 0);
    if (sec < 1) return '0s';
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) {
      const m = Math.floor(sec / 60), s = sec % 60;
      return s ? `${m}m ${s}s` : `${m}m`;
    }
    if (sec < 86400) {
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      return m ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600);
    return h ? `${d}d ${h}h` : `${d}d`;
  }

  // Stats
  async function loadStats() {
    try {
      const s = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (s) {
        animateNumber(totalEl, s.total || 0);
        animateNumber(adBreaksEl, s.adBreaks || 0);
        animateNumber(networkEl, s.networkBlocks || 0);
        timeSavedEl.textContent = formatTime(s.timeSavedSec || 0);
      }
    } catch (e) { /* SW may not be ready */ }
  }

  // UI status
  function updateStatus(enabled) {
    document.body.classList.toggle('disabled-mode', !enabled);
    statusText.textContent = enabled ? t('status.active') : t('status.disabled');
    statusText.setAttribute('data-i18n', enabled ? 'status.active' : 'status.disabled');
  }

  function renderMethodIcon(method, on) {
    const el = document.querySelector(`[data-icon="${method}"]`);
    if (!el) return;
    el.className = 'strategy-icon ' + (on ? 'active' : 'inactive');
    el.innerHTML = on ? ICON_ON : ICON_OFF;
  }

  function updateMethodRows(masterOn) {
    methodInputs.forEach((inp) => {
      inp.disabled = !masterOn;
      const row = inp.closest('.strategy-item');
      if (row) row.classList.toggle('row-disabled', !masterOn);
    });
  }

  function renderMethods() {
    methodInputs.forEach((inp) => {
      const m = inp.dataset.method;
      const on = currentMethods[m] !== false;
      inp.checked = on;
      renderMethodIcon(m, on);
    });
    updateMethodRows(currentEnabled);
  }

  async function loadSettings() {
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (settings) {
      currentEnabled = settings.enabled !== false;
      currentMethods = Object.assign({}, DEFAULT_METHODS, settings.methods || {});
    }
    enabledToggle.checked = currentEnabled;
    updateStatus(currentEnabled);
    renderMethods();
  }

  async function applyToActiveTab(reload) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return false;

    // Twitch: let content.js apply it (reloads itself on reload)
    if (tab.url.includes('twitch.tv')) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, {
          type: 'APPLY_SETTINGS',
          payload: { enabled: currentEnabled, methods: currentMethods, reload }
        });
        return !!res?.reloaded;
      } catch { /* tab not reachable */ }
    }

    // YouTube: MAIN-world script only kicks in on load -> reload the tab
    if (reload && tab.url.includes('youtube.com')) {
      try { await chrome.tabs.reload(tab.id); return true; } catch { /* ignore */ }
    }
    return false;
  }

  // Master switch
  enabledToggle.addEventListener('change', async () => {
    currentEnabled = enabledToggle.checked;
    updateStatus(currentEnabled);
    updateMethodRows(currentEnabled);

    await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: { enabled: currentEnabled } });
    const reloaded = await applyToActiveTab(true);

    if (currentEnabled) {
      showToast(reloaded ? t('toast.enabledReload') : t('toast.enabled'), 'success');
    } else {
      showToast(reloaded ? t('toast.disabledReload') : t('toast.disabled'), 'error');
    }
  });

  // Method switches
  methodInputs.forEach((inp) => {
    inp.addEventListener('change', async () => {
      const method = inp.dataset.method;
      const val = inp.checked;
      currentMethods[method] = val;
      renderMethodIcon(method, val);

      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: { methods: { [method]: val } } });

      const row = inp.closest('.strategy-item');
      const needsReload = row?.dataset.reload === 'true';
      const reloaded = await applyToActiveTab(needsReload);
      const name = methodLabel(row);

      showToast(t(val ? 'toast.methodOn' : 'toast.methodOff', { name }) + ((needsReload && reloaded) ? t('toast.reload') : ''), val ? 'success' : 'error');
    });
  });

  // Anonymous stats (opt-out)
  const telemetryToggle = document.getElementById('telemetryToggle');
  if (telemetryToggle) {
    chrome.storage.sync.get(['telemetry'], (s) => {
      telemetryToggle.checked = s.telemetry !== false; // default on
    });
    telemetryToggle.addEventListener('change', () => {
      const on = telemetryToggle.checked;
      chrome.storage.sync.set({ telemetry: on });
      showToast(on ? t('toast.telemetryOn') : t('toast.telemetryOff'), on ? 'success' : 'error');
    });
  }

  resetStatsBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'RESET_STATS' });
    animateNumber(totalEl, 0);
    animateNumber(adBreaksEl, 0);
    animateNumber(networkEl, 0);
    timeSavedEl.textContent = '0s';
    showToast(t('toast.statsReset'));
  });

  // Platform tabs
  const tabButtons = Array.from(document.querySelectorAll('.platform-tab'));
  const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
  const glassTabs = document.querySelector('.glass-tabs');
  const tabGlassThumb = document.getElementById('tabGlassThumb');

  function updateGlassThumb(name) {
    const idx = tabButtons.findIndex((b) => b.dataset.tab === name);
    if (glassTabs) glassTabs.dataset.active = name;
    if (tabGlassThumb && idx >= 0) tabGlassThumb.style.setProperty('--tab-i', String(idx));
  }

  function switchTab(name) {
    if (!name) return;
    tabButtons.forEach((btn) => {
      const on = btn.dataset.tab === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    tabPanels.forEach((panel) => {
      const on = panel.dataset.panel === name;
      panel.classList.toggle('is-active', on);
      panel.hidden = !on;
    });
    updateGlassThumb(name);
    try { sessionStorage.setItem('sb_popup_tab', name); } catch { /* ignore */ }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  async function detectPlatformTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url || '';
      if (url.includes('twitch.tv')) return 'twitch';
      if (url.includes('youtube.com')) return 'youtube';
    } catch { /* ignore */ }
    return null;
  }

  async function initTabs() {
    const detected = await detectPlatformTab();
    let tab = detected;
    if (!tab) {
      try { tab = sessionStorage.getItem('sb_popup_tab'); } catch { /* ignore */ }
    }
    if (!tab || !tabButtons.some((b) => b.dataset.tab === tab)) tab = 'twitch';
    switchTab(tab);
  }

  function methodLabel(row) {
    const el = row?.querySelector('[data-i18n-key], .strategy-name');
    const key = el?.getAttribute('data-i18n-key');
    if (key) return t(key);
    return el?.textContent?.trim() || t('methods.title');
  }

  function openSettings() {
    if (!settingsOverlay) return;
    settingsOverlay.hidden = false;
    document.body.classList.add('is-locked');
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => settingsOverlay.classList.add('is-open'));
  }

  function closeSettings() {
    if (!settingsOverlay) return;
    settingsOverlay.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    document.documentElement.style.overflow = '';
    setTimeout(() => { settingsOverlay.hidden = true; }, 220);
  }

  function openWelcome() {
    if (!welcomeOverlay) return;
    welcomeOverlay.hidden = false;
    requestAnimationFrame(() => welcomeOverlay.classList.add('is-open'));
  }

  function closeWelcome() {
    if (!welcomeOverlay) return;
    welcomeOverlay.classList.remove('is-open');
    setTimeout(() => { welcomeOverlay.hidden = true; }, 280);
  }

  async function maybeShowWelcome() {
    if (!welcomeOverlay) return;
    try {
      const stored = await chrome.storage.sync.get(['onboardingDone', 'language']);
      if (stored.onboardingDone || stored.language) {
        welcomeOverlay.hidden = true;
        if (!stored.onboardingDone && stored.language) {
          await chrome.storage.sync.set({ onboardingDone: true });
        }
        return;
      }
      if (welcomeLanguage) welcomeLanguage.value = 'en';
      await SB_I18N.setLanguage('en', { persist: false });
      if (languageSelect) languageSelect.value = 'en';
      openWelcome();
    } catch (e) {
      welcomeOverlay.hidden = true;
    }
  }

  if (welcomeLanguage) {
    welcomeLanguage.addEventListener('change', async () => {
      await SB_I18N.setLanguage(welcomeLanguage.value, { persist: false });
    });
  }

  if (welcomeContinue) {
    welcomeContinue.addEventListener('click', async () => {
      const code = welcomeLanguage ? welcomeLanguage.value : 'en';
      await SB_I18N.setLanguage(code);
      try {
        await chrome.storage.sync.set({ onboardingDone: true, language: code });
      } catch (e) { /* ignore */ }
      if (languageSelect) languageSelect.value = code;
      updateStatus(currentEnabled);
      closeWelcome();
    });
  }

  if (welcomeDonate) {
    welcomeDonate.addEventListener('click', () => {
      if (chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: SUPPORT_URL });
      } else {
        window.open(SUPPORT_URL, '_blank', 'noopener');
      }
    });
  }

  function openFeedback() {
    const ver = chrome.runtime.getManifest().version || '';
    const q = new URLSearchParams({ from: 'extension' });
    if (ver) q.set('v', ver);
    const url = FEEDBACK_BASE + '?' + q.toString();
    if (chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', openFeedback);
  }

  const settingsFeedbackBtn = document.getElementById('settingsFeedbackBtn');
  if (settingsFeedbackBtn) {
    settingsFeedbackBtn.addEventListener('click', openFeedback);
  }

  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
  if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettings);

  if (languageSelect) {
    languageSelect.addEventListener('change', async () => {
      await SB_I18N.setLanguage(languageSelect.value);
      updateStatus(currentEnabled);
      showToast(t('toast.languageChanged'));
    });
  }

  // Detail view (locked preview in a large window)
  function openDetails() {
    const url = chrome.runtime.getURL('ui/detail.html');
    if (chrome.windows && chrome.windows.create) {
      chrome.windows.create({ url, type: 'popup', width: 1000, height: 720 });
    } else {
      chrome.tabs.create({ url });
    }
  }
  const openDetailsBtn = document.getElementById('openDetails');
  if (openDetailsBtn) openDetailsBtn.addEventListener('click', openDetails);

  // Locked supporter features -> open detail/donation view
  document.querySelectorAll('[data-open-details]').forEach((el) => {
    el.addEventListener('click', openDetails);
  });

  // Force update: lock screen when the version is disabled
  async function checkForceUpdate() {
    const gate = document.getElementById('updateGate');
    if (!gate) return;
    let state;
    try {
      state = await chrome.runtime.sendMessage({ type: 'GET_FORCE_UPDATE' });
    } catch (e) {
      return; // SW may not be ready
    }
    if (!state || !state.blocked) {
      gate.hidden = true;
      document.body.classList.remove('is-locked');
      return;
    }

    const version = (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || state.version || '';
    const url = state.url || 'https://streamblock.online/download';

    const bodyEl = document.getElementById('updateGateBody');
    if (bodyEl) bodyEl.textContent = t('update.body', { version });

    const msgEl = document.getElementById('updateGateMsg');
    if (msgEl) {
      if (state.message) { msgEl.textContent = state.message; msgEl.hidden = false; }
      else { msgEl.hidden = true; }
    }

    const btn = document.getElementById('updateGateBtn');
    if (btn) {
      btn.onclick = () => {
        if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url });
        else window.open(url, '_blank', 'noopener');
      };
    }

    document.body.classList.add('is-locked');
    gate.hidden = false;
  }

  // Init
  // Show the real extension version (from the manifest) so it never goes stale.
  try {
    const verEl = document.getElementById('appVersion');
    const mv = chrome.runtime.getManifest && chrome.runtime.getManifest().version;
    if (verEl && mv) verEl.textContent = 'v' + mv;
  } catch (e) { /* ignore */ }

  // ── Announcement banner (messages from the admin dashboard) ───────────────────
  const ANN_DISMISS_KEY = 'sbAnnounceDismissed';

  async function loadAnnouncement() {
    const banner = document.getElementById('announceBanner');
    if (!banner) return;

    let ann = null;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_ANNOUNCEMENT' });
      ann = res && res.announcement ? res.announcement : null;
    } catch (_) { ann = null; }
    if (!ann || !ann.id) { banner.hidden = true; return; }

    let dismissed = 0;
    try {
      const d = await chrome.storage.local.get([ANN_DISMISS_KEY]);
      dismissed = d[ANN_DISMISS_KEY] || 0;
    } catch (_) { /* ignore */ }
    if (dismissed === ann.id) { banner.hidden = true; return; }

    const level = ['info', 'success', 'warning', 'critical'].includes(ann.level) ? ann.level : 'info';
    banner.className = 'announce-banner announce-' + level;

    const titleEl = document.getElementById('announceTitle');
    const bodyEl = document.getElementById('announceBody');
    if (titleEl) { titleEl.textContent = ann.title || ''; titleEl.hidden = !ann.title; }
    if (bodyEl) bodyEl.textContent = ann.body || '';

    const linkEl = document.getElementById('announceLink');
    if (linkEl) {
      if (ann.link_url) {
        linkEl.href = ann.link_url;
        linkEl.textContent = ann.link_label || ann.link_url;
        linkEl.hidden = false;
      } else {
        linkEl.hidden = true;
      }
    }

    banner.hidden = false;

    const closeBtn = document.getElementById('announceClose');
    if (closeBtn) {
      closeBtn.onclick = () => {
        banner.hidden = true;
        try { chrome.storage.local.set({ [ANN_DISMISS_KEY]: ann.id }); } catch (_) { /* ignore */ }
      };
    }
  }

  await SB_I18N.init();
  if (languageSelect) languageSelect.value = SB_I18N.getLanguage();
  SB_I18N.onChange(() => updateStatus(currentEnabled));
  await maybeShowWelcome();

  await Promise.all([loadStats(), loadSettings(), initTabs()]);
  setInterval(loadStats, 2000);

  checkForceUpdate();
  SB_I18N.onChange(checkForceUpdate); // refresh texts on language change

  loadAnnouncement();

})();
