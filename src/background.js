/**
 * background.js — Service worker
 * Responsible for:
 * 1. Stats: video ads (stream swaps) + blocked network requests
 * 2. Extension badge
 * 3. Managing settings (on/off + individual methods)
 * 4. Toggling network blocking (declarativeNetRequest ruleset) live
 */

import { initTelemetry } from './telemetry.js';
import { initUpdateCheck, getForceState } from './update-check.js';

const NETWORK_RULESET_ID = 'block_ads';
const DEFAULT_METHODS = { streamSwap: true, strip: true, spoof: true, network: true, dom: true, cosmetic: true, youtube: true, youtubeDai: true, youtubeNet: false };
// Time-saved estimate:
const VIDEO_AD_SECONDS = 22;     // avg length of a skipped video ad
const NET_REQUEST_SECONDS = 0.12; // avg load time saved per blocked request

// Stats
let stats = { adBreaks: 0, networkBlocks: 0 };
let saveTimer = null;

async function loadStats() {
  const data = await chrome.storage.local.get(['stats', 'blockLog']);
  if (data.stats && typeof data.stats === 'object') {
    stats.adBreaks = data.stats.adBreaks || 0;
    stats.networkBlocks = data.stats.networkBlocks || 0;
  }
  if (Array.isArray(data.blockLog)) {
    adLog.push(...data.blockLog.slice(0, AD_LOG_MAX));
  }
  updateBadge();
}

function saveStatsDebounced() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    chrome.storage.local.set({ stats });
  }, 1500);
}

function getTotal() {
  return stats.adBreaks + stats.networkBlocks;
}

let forceBlocked = false; // cached force-update state (for synchronous updateBadge)

function updateBadge() {
  if (forceBlocked) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff3b3b' });
    if (chrome.action.setBadgeTextColor) chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
    return;
  }
  const total = getTotal();
  let label = '';
  if (total > 0) {
    label = total > 9999 ? `${Math.floor(total / 1000)}k` : String(total);
  }
  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ color: '#9147FF' });
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
  }
}

function statsResponse() {
  return {
    adBreaks: stats.adBreaks,
    networkBlocks: stats.networkBlocks,
    total: getTotal(),
    timeSavedSec: stats.adBreaks * VIDEO_AD_SECONDS + stats.networkBlocks * NET_REQUEST_SECONDS,
  };
}

// Real block log (for the detail view)
let ruleMap = null;          // ruleId -> domain/label (from rules.json)
const adLog = [];            // most recent video-ad events from the content scripts
const AD_LOG_MAX = 80;
let logSaveTimer = null;

function ruleLabel(cond) {
  if (!cond) return 'Werbe-/Tracking-Server';
  if (cond.urlFilter) {
    const s = cond.urlFilter.replace(/^\|\|/, '').replace(/[\^|]/g, '').replace(/^\*+/, '');
    return s || 'Werbe-Server';
  }
  if (Array.isArray(cond.requestDomains) && cond.requestDomains.length) return cond.requestDomains[0];
  return 'Werbe-/Tracking-Server';
}

async function loadRuleMap() {
  if (ruleMap) return ruleMap;
  ruleMap = {};
  try {
    const res = await fetch(chrome.runtime.getURL('rules.json'));
    const rules = await res.json();
    for (const r of rules) ruleMap[r.id] = ruleLabel(r.condition);
  } catch (e) { /* ignore */ }
  return ruleMap;
}

function saveLogDebounced() {
  if (logSaveTimer) return;
  logSaveTimer = setTimeout(() => {
    logSaveTimer = null;
    chrome.storage.local.set({ blockLog: adLog.slice(0, AD_LOG_MAX) });
  }, 1500);
}

async function getBlockLog() {
  const map = await loadRuleMap();
  let netEntries = [];
  try {
    const m = await chrome.declarativeNetRequest.getMatchedRules({});
    const infos = (m && m.rulesMatchedInfo) || [];
    netEntries = infos.map((i) => ({
      t: i.timeStamp,
      type: 'net',
      label: map[i.rule.ruleId] || 'Werbe-/Tracking-Server',
    }));
  } catch (e) { /* getMatchedRules may be unavailable */ }

  const entries = netEntries.concat(adLog).sort((a, b) => b.t - a.t).slice(0, 120);
  return {
    entries,
    total: getTotal(),
    netTotal: stats.networkBlocks,
    adTotal: stats.adBreaks,
  };
}

// Count blocked network requests
const matchedRuleKeys = new Set();
let networkPollTimer = null;

function ruleMatchKey(info) {
  const rid = info?.rule?.ruleId ?? 0;
  const ts = info?.timeStamp ?? 0;
  const reqId = info?.request?.requestId;
  return reqId != null ? `r${rid}:req${reqId}` : `r${rid}:t${ts}`;
}

function ingestMatchedRules(infos) {
  let added = 0;
  for (const info of infos) {
    const key = ruleMatchKey(info);
    if (matchedRuleKeys.has(key)) continue;
    matchedRuleKeys.add(key);
    added++;
  }
  if (added > 0) {
    stats.networkBlocks += added;
    updateBadge();
    saveStatsDebounced();
  }
  return added;
}

async function pollMatchedRules() {
  try {
    if (!chrome.declarativeNetRequest?.getMatchedRules) return;
    const m = await chrome.declarativeNetRequest.getMatchedRules({});
    ingestMatchedRules((m && m.rulesMatchedInfo) || []);
  } catch (e) { /* feedback API may be unavailable */ }
}

function setupNetworkCounter() {
  // Dev/unpacked: real-time counter
  try {
    if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
      chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
        ingestMatchedRules([info]);
      });
    }
  } catch (e) {}

  // Production: getMatchedRules (declarativeNetRequestFeedback)
  pollMatchedRules();
  networkPollTimer = setInterval(pollMatchedRules, 2500);
}

// Settings
async function getSettings() {
  const force = await getForceState();
  return new Promise((resolve) => {
    chrome.storage.sync.get(['enabled', 'methods'], (s) => {
      resolve({
        enabled: force.blocked ? false : s.enabled !== false,
        methods: Object.assign({}, DEFAULT_METHODS, s.methods || {}),
      });
    });
  });
}

// Toggle network-blocking ruleset live
async function applyNetworkBlocking(shouldEnable) {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(
      shouldEnable
        ? { enableRulesetIds: [NETWORK_RULESET_ID] }
        : { disableRulesetIds: [NETWORK_RULESET_ID] }
    );
  } catch (e) {}
}

async function syncNetworkBlockingFromSettings() {
  // Force update: blocked version -> protection hard off, regardless of setting.
  const force = await getForceState();
  if (force.blocked) {
    await applyNetworkBlocking(false);
    return;
  }
  const { enabled, methods } = await getSettings();
  await applyNetworkBlocking(enabled && methods.network);
}

// Force update: badge warning + disable protection
async function applyForceUpdateState() {
  const force = await getForceState();
  forceBlocked = !!force.blocked;
  if (forceBlocked) {
    await applyNetworkBlocking(false);
    updateBadge();
  } else {
    updateBadge();
    await syncNetworkBlockingFromSettings();
  }
}

// Messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'AD_BLOCKED') {
    stats.adBreaks++;
    const url = sender?.tab?.url || sender?.url || '';
    const source = url.includes('youtube') ? 'YouTube' : url.includes('twitch') ? 'Twitch' : 'Stream';
    adLog.unshift({ t: Date.now(), type: 'video', source, label: msg.label || 'Video-Werbung übersprungen' });
    if (adLog.length > AD_LOG_MAX) adLog.length = AD_LOG_MAX;
    updateBadge();
    saveStatsDebounced();
    saveLogDebounced();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'GET_STATS') {
    pollMatchedRules().finally(() => sendResponse(statsResponse()));
    return true;
  }

  if (msg.type === 'GET_BLOCK_LOG') {
    getBlockLog().then(sendResponse);
    return true;
  }

  if (msg.type === 'RESET_STATS') {
    stats = { adBreaks: 0, networkBlocks: 0 };
    adLog.length = 0;
    matchedRuleKeys.clear();
    chrome.storage.local.set({ stats, blockLog: [] });
    updateBadge();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'GET_SETTINGS') {
    getSettings().then(sendResponse);
    return true;
  }

  if (msg.type === 'SAVE_SETTINGS') {
    chrome.storage.sync.get(['enabled', 'methods'], (current) => {
      const next = {};
      if (typeof msg.payload?.enabled !== 'undefined') {
        next.enabled = msg.payload.enabled;
      }
      if (msg.payload?.methods) {
        next.methods = Object.assign({}, DEFAULT_METHODS, current.methods || {}, msg.payload.methods);
      }
      chrome.storage.sync.set(next, async () => {
        await syncNetworkBlockingFromSettings();
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (msg.type === 'APPLY_NETWORK_BLOCKING') {
    syncNetworkBlockingFromSettings().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'GET_FORCE_UPDATE') {
    getForceState().then(sendResponse);
    return true;
  }
});

// Tab navigation: set the icon on Twitch tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.includes('twitch.tv')) return;
  chrome.action.setIcon({
    tabId,
    path: { 16: 'icons/icon16.png', 48: 'icons/icon48.png' }
  }).catch(() => {});
});

// Init
loadStats();
setupNetworkCounter();
syncNetworkBlockingFromSettings();
initTelemetry();
// Force-update check: on status change, adjust protection/badge immediately.
initUpdateCheck(() => { applyForceUpdateState(); });
applyForceUpdateState();

