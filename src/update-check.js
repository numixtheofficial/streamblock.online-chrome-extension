/**
 * update-check.js — Force-Update-Prüfung.
 *
 * Fragt regelmäßig api/version.php ab, ob die installierte Version im Admin
 * deaktiviert ("gesperrt") wurde. Ist das der Fall, wird ein Force-Update
 * erzwungen: Der Status wird in chrome.storage.local hinterlegt, der Service
 * Worker schaltet daraufhin das Network-Blocking ab und das Popup zeigt einen
 * nicht schließbaren Update-Bildschirm.
 *
 * Läuft UNABHÄNGIG vom Telemetrie-Opt-out (Sicherheits-/Wartungs-Mechanismus).
 */

const VERSION_ENDPOINT = 'https://streamblock.online/api/version.php';
const UPDATE_CHECK_MINUTES = 30;
const FORCE_STATE_KEY = 'sbForceUpdate';
const DEFAULT_UPDATE_URL = 'https://streamblock.online/download';

/** Aktuell gespeicherten Force-Update-Status lesen. */
export async function getForceState() {
  try {
    const data = await chrome.storage.local.get([FORCE_STATE_KEY]);
    return data[FORCE_STATE_KEY] || { blocked: false };
  } catch (_) {
    return { blocked: false };
  }
}

/**
 * Prüft beim Server, ob die eigene Version gesperrt ist, und speichert das
 * Ergebnis. Gibt { blocked, changed, ... } zurück. Fehlertolerant (fail-open:
 * bei Netzwerk-/Serverfehler bleibt der bisherige Status erhalten).
 */
export async function checkForceUpdate() {
  const version = chrome.runtime.getManifest().version;
  let prev;
  try {
    prev = await getForceState();
  } catch (_) {
    prev = { blocked: false };
  }

  try {
    const res = await fetch(`${VERSION_ENDPOINT}?v=${encodeURIComponent(version)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ...prev, changed: false };

    const data = await res.json();
    if (!data || data.ok !== true) return { ...prev, changed: false };

    const state = {
      blocked: data.blocked === true,
      url: (typeof data.update_url === 'string' && data.update_url) || DEFAULT_UPDATE_URL,
      message: typeof data.message === 'string' ? data.message : '',
      latest: typeof data.latest === 'string' ? data.latest : '',
      version,
      checkedAt: Date.now(),
    };

    await chrome.storage.local.set({ [FORCE_STATE_KEY]: state });
    return { ...state, changed: !!prev.blocked !== state.blocked };
  } catch (_) {
    // fail-open: niemanden wegen eines Netzwerkfehlers aussperren
    return { ...prev, changed: false };
  }
}

/**
 * Initialisiert die wiederkehrende Prüfung.
 * @param {(state) => void} onChange  Callback, wenn sich der blocked-Status ändert
 * (Service Worker schaltet dann Ruleset/Badge um).
 */
export function initUpdateCheck(onChange) {
  const run = async () => {
    const state = await checkForceUpdate();
    if (state.changed && typeof onChange === 'function') {
      try { onChange(state); } catch (_) { /* ignore */ }
    }
  };

  try {
    chrome.alarms.create('sb-update-check', { periodInMinutes: UPDATE_CHECK_MINUTES });
    chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'sb-update-check') run(); });
    if (chrome.runtime.onStartup) {
      chrome.runtime.onStartup.addListener(run);
    }
    chrome.runtime.onInstalled.addListener(run);
  } catch (_) {
    /* alarms evtl. nicht verfügbar */
  }

  run();
}
