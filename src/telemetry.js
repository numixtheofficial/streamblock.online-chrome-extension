/**
 * telemetry.js — anonymous, aggregated stats (opt-out).
 *
 * Sends ONLY: random install ID, version, browser type, total block counter.
 * NO URLs, no visited pages, no personal data.
 *
 * Heartbeat / "online" in the admin: only while a Twitch or YouTube tab is open.
 * Browser in the background without a stream tab = not online.
 *
 * Opt-out: chrome.storage.sync { telemetry: false }
 */

const TELEMETRY_ENDPOINT = 'https://streamblock.online/api/collect.php';
const TELEMETRY_SECRET   = 'c0c5ffcac25558b2125e4e84f4c040a1de70afb37810cc4808c4312192f19b76';
const HEARTBEAT_MINUTES  = 5;
const STREAM_TAB_URLS    = ['*://*.twitch.tv/*', '*://*.youtube.com/*'];

function isConfigured() {
  return !TELEMETRY_ENDPOINT.includes('streamblock.example')
      && !TELEMETRY_SECRET.startsWith('AENDERN');
}

function detectBrowser() {
  const ua = (self.navigator && navigator.userAgent) || '';
  if (navigator.brave) return 'brave';
  if (/Edg\//.test(ua)) return 'edge';
  if (/OPR\/|Opera/.test(ua)) return 'opera';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Chrome\//.test(ua)) return 'chrome';
  return 'other';
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Memoized so several telemetry calls firing at once on first install share ONE
// id instead of each generating a different one (which would make the admin
// count a single install twice).
let _installIdPromise = null;
function getInstallId() {
  if (!_installIdPromise) {
    _installIdPromise = (async () => {
      const { installId } = await chrome.storage.local.get(['installId']);
      if (installId) return installId;
      const id = (crypto.randomUUID && crypto.randomUUID())
        || ([...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''));
      await chrome.storage.local.set({ installId: id });
      return id;
    })().catch((e) => { _installIdPromise = null; throw e; });
  }
  return _installIdPromise;
}

/** True if at least one Twitch/YouTube tab is open (not discarded). */
async function hasOpenStreamTab() {
  try {
    const tabs = await chrome.tabs.query({ url: STREAM_TAB_URLS });
    return tabs.some((t) => t && !t.discarded);
  } catch (_) {
    return false;
  }
}

async function sendTelemetry(options = {}) {
  try {
    if (!isConfigured()) return;
    const sync = await chrome.storage.sync.get(['telemetry']);
    if (sync.telemetry === false) return;

    if (!options.force && !(await hasOpenStreamTab())) return;

    const { stats } = await chrome.storage.local.get(['stats']);
    const blocked_total = ((stats && stats.adBreaks) || 0) + ((stats && stats.networkBlocks) || 0);

    const body = JSON.stringify({
      install_id: await getInstallId(),
      version: chrome.runtime.getManifest().version,
      browser: detectBrowser(),
      blocked_total,
    });
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = await hmacHex(TELEMETRY_SECRET, ts + '.' + body);

    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-SB-Timestamp': ts, 'X-SB-Signature': sig },
      body,
      keepalive: true,
    });
  } catch (_) {
    /* silent & fault-tolerant */
  }
}

export function initTelemetry() {
  try {
    chrome.runtime.onInstalled.addListener(() => sendTelemetry({ force: true }));
    chrome.alarms.create('sb-telemetry', { periodInMinutes: HEARTBEAT_MINUTES });
    chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'sb-telemetry') sendTelemetry(); });

    chrome.tabs.onUpdated.addListener((_id, info, tab) => {
      if (info.status === 'complete' && tab && tab.url
          && (tab.url.includes('twitch.tv') || tab.url.includes('youtube.com'))) {
        sendTelemetry();
      }
    });

    sendTelemetry();
  } catch (_) {
    /* alarms/permissions may be unavailable */
  }
}
