/**
 * update-check.js — Force-update check.
 *
 * Periodically queries api/version.php to see whether the installed version was
 * disabled ("blocked") in the admin. If so, a force update is enforced: the state
 * is stored in chrome.storage.local, the service worker then turns off network
 * blocking and the popup shows a non-dismissable update screen.
 *
 * Runs INDEPENDENTLY of the telemetry opt-out (security/maintenance mechanism).
 */

const VERSION_ENDPOINT = 'https://streamblock.online/api/version.php';
const UPDATE_CHECK_MINUTES = 30;
const FORCE_STATE_KEY = 'sbForceUpdate';
const DEFAULT_UPDATE_URL = 'https://streamblock.online/download';

/** Read the currently stored force-update state. */
export async function getForceState() {
  try {
    const data = await chrome.storage.local.get([FORCE_STATE_KEY]);
    return data[FORCE_STATE_KEY] || { blocked: false };
  } catch (_) {
    return { blocked: false };
  }
}

/**
 * Asks the server whether this version is blocked and stores the result.
 * Returns { blocked, changed, ... }. Fault-tolerant (fail-open: on a
 * network/server error the previous state is kept).
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
    // fail-open: don't lock anyone out because of a network error
    return { ...prev, changed: false };
  }
}

/**
 * Initializes the recurring check.
 * @param {(state) => void} onChange  Callback when the blocked state changes
 * (service worker then toggles ruleset/badge).
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
    /* alarms may be unavailable */
  }

  run();
}
