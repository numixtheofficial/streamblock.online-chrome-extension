/**
 * announce-check.js — Popup announcements.
 *
 * Periodically queries api/announce.php to see whether a message was activated
 * in the admin (e.g. "Twitch changed something, a fix is coming"). The result is
 * cached in chrome.storage.local; the popup shows it as a banner.
 *
 * Runs INDEPENDENTLY of the telemetry opt-out (read/display only, no personal
 * data). Fail-open: on any error, no banner is forced.
 */

const ANNOUNCE_ENDPOINT = 'https://streamblock.online/api/announce.php';
const ANNOUNCE_CHECK_MINUTES = 20;
const ANNOUNCE_STATE_KEY = 'sbAnnouncement';

/** Read the last cached announcement (or null). */
export async function getAnnouncement() {
  try {
    const data = await chrome.storage.local.get([ANNOUNCE_STATE_KEY]);
    return data[ANNOUNCE_STATE_KEY] || null;
  } catch (_) {
    return null;
  }
}

/**
 * Fetch the current announcement from the server and store it. Returns the
 * announcement (or null). On network/server error the last known announcement
 * is kept.
 */
export async function checkAnnouncement() {
  try {
    const res = await fetch(ANNOUNCE_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return await getAnnouncement();

    const data = await res.json();
    if (!data || data.ok !== true) return await getAnnouncement();

    const ann = (data.announcement && typeof data.announcement === 'object') ? data.announcement : null;
    await chrome.storage.local.set({ [ANNOUNCE_STATE_KEY]: ann });
    return ann;
  } catch (_) {
    return await getAnnouncement();
  }
}

/** Set up the recurring check (alarm). */
export function initAnnounceCheck() {
  const run = () => { checkAnnouncement().catch(() => {}); };

  try {
    chrome.alarms.create('sb-announce-check', { periodInMinutes: ANNOUNCE_CHECK_MINUTES });
    chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'sb-announce-check') run(); });
    if (chrome.runtime.onStartup) {
      chrome.runtime.onStartup.addListener(run);
    }
    chrome.runtime.onInstalled.addListener(run);
  } catch (_) {
    /* alarms may be unavailable */
  }

  run();
}
