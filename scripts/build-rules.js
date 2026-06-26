/**
 * build-rules.js — Generiert rules.json (declarativeNetRequest) aus kategorisierten
 * Domain-Listen. Ausführen mit:  node build-rules.js
 *
 * Jede Domain wird zu einer Block-Regel "||domain^" (matcht Domain + Subdomains).
 * Block-Regeln benötigen KEINE host_permissions und wirken global.
 *
 * WICHTIG: Hier dürfen NIEMALS Twitch-Playback-Domains landen
 * (twitch.tv, ttvnw.net, jtvnw.net, twitchcdn.net, twitchsvc.net als ganze Domain),
 * sonst bricht der Stream. Twitch-Ads werden über schmale Pfad-Regeln geblockt.
 */

const fs = require('fs');
const path = require('path');

// Ressourcentypen: alles AUSSER main_frame (damit normale Navigation nicht bricht)
const RT = [
  'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object',
  'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other'
];

// ── Consent / Cookie-Banner / CMP ─────────────────────────────────────────────
const CONSENT = [
  'consensu.org', 'cookiebot.com', 'cookielaw.org', 'onetrust.com', 'cookiepro.com',
  'quantcast.com', 'sourcepoint.com', 'sp-prod.net', 'privacy-mgmt.com', 'summerhamster.com',
  'trustarc.com', 'usercentrics.eu', 'didomi.io', 'privacy-center.org', 'consentmanager.net',
  'cookieyes.com', 'iubenda.com', 'termly.io', 'osano.com', 'secureprivacy.ai',
  'cookie-script.com', 'cookiefirst.com', 'cookiehub.net', 'civiccomputing.com',
  'crownpeak.net', 'faktor.io', 'sirdata.com', 'axeptio.eu', 'fundingchoicesmessages.google.com',
  'ensighten.com', 'evidon.com', 'truste.com', 'consentframework.com', 'transcend.io'
];

// ── A/B-Testing / Experimente / Personalisierung ──────────────────────────────
const AB_TESTING = [
  'optimizely.com', 'visualwebsiteoptimizer.com', 'wingify.com', 'abtasty.com',
  'kameleoon.com', 'kameleoon.eu', 'monetate.net', 'dynamicyield.com', 'dy-api.com',
  'convertexperiments.com', 'taplytics.com', 'statsig.com', 'split.io',
  'adobedtm.com', 'demdex.net', 'omtrdc.net', 'everesttech.net', 'maxymiser.net',
  'qualaroo.com', 'optimizesrv.com', 'webtrends.com', 'sitespect.com',
  'apptimize.com', 'amplitude.com', 'optimstatic.com'
];

// ── Affiliate-Netzwerke / Tracking-Redirects ──────────────────────────────────
const AFFILIATE = [
  'awin.com', 'awin1.com', 'dwin1.com', 'zenaps.com',
  'cj.com', 'dpbolvw.net', 'anrdoezrs.net', 'jdoqocy.com', 'kqzyfj.com', 'tkqlhce.com',
  'ftjcfx.com', 'lduhtrp.net', 'qksrv.net',
  'linksynergy.com', 'rakutenmarketing.com', 'rakuten-static.com',
  'shareasale.com', 'shareasale-analytics.com',
  'impact.com', 'impactradius-event.com', 'impactradius-go.com', '7eer.net', 'evyy.net', 'ojrq.net',
  'partnerize.com', 'prf.hn', 'performancehorizon.com',
  'admitad.com', 'artfut.com', 'lenmit.com', 'ad.admitad.com',
  'tradedoubler.com', 'tradetracker.net', 'tradetracker.com',
  'skimlinks.com', 'skimresources.com', 'redirectingat.com',
  'sovrn.com', 'viglink.com', 'flexoffers.com',
  'pepperjamnetwork.com', 'pntra.com', 'pntrac.com', 'pntrs.com', 'gopjn.com',
  'avantlink.com', 'avmws.com', 'webgains.com', 'webgains.io', 'digidip.net',
  'clickbank.net', 'affilae.com', 'effiliation.com', 'daisycon.com',
  'financeads.net', 'belboon.com', 'adtraction.com', 'partner-ads.com',
  'commission-junction.com', 'doubleclick-affiliate.com'
];

// ── Werbung / Ad-Exchanges / SSPs / DSPs ──────────────────────────────────────
const ADS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adservice.google.com', 'imasdk.googleapis.com', 'pagead2.googlesyndication.com',
  'g.doubleclick.net', 'ad.doubleclick.net', 'googletagservices.com',
  '2mdn.net', 'gstatic.2mdn.net',  // DoubleClick Video-Ad-Creatives (kein YT-Video)
  'amazon-adsystem.com', 'adsystem.amazon.com',
  'criteo.com', 'criteo.net', 'adroll.com', 'pubmatic.com', 'rubiconproject.com',
  'openx.net', 'adnxs.com', 'casalemedia.com', '33across.com', 'bidswitch.net',
  'taboola.com', 'outbrain.com', 'sharethrough.com', 'spotxchange.com', 'spotx.tv',
  'smartadserver.com', 'adform.net', 'adformdsp.net', 'teads.tv', 'contextweb.com',
  'gumgum.com', 'indexww.com', 'media.net', 'mgid.com', 'revcontent.com',
  'yieldmo.com', 'districtm.io', 'sonobi.com', 'triplelift.com', 'adsrvr.org',
  'moatads.com', 'adsafeprotected.com', 'serving-sys.com', 'flashtalking.com',
  'mathtag.com', 'bluekai.com', 'agkn.com', 'rlcdn.com', 'tapad.com',
  'ads-twitter.com', 'adsymptotic.com', 'jwpltx.com', 'innovid.com',
  'smartclip.net', 'stickyadstv.com', 'springserve.com',
  'btloader.com', 'confiant-integrations.net', 'lijit.com'
];

// ── Analytics / Tracking / Session-Recording ──────────────────────────────────
const TRACKERS = [
  'google-analytics.com', 'googletagmanager.com', 'app-measurement.com',
  'analytics.google.com', 'ssl.google-analytics.com',
  'scorecardresearch.com', 'quantserve.com',
  'hotjar.com', 'hotjar.io', 'mouseflow.com', 'fullstory.com', 'crazyegg.com',
  'mixpanel.com', 'segment.com', 'segment.io', 'heap.io', 'heapanalytics.com',
  'nr-data.net', 'newrelic.com', 'chartbeat.com', 'chartbeat.net', 'parsely.com',
  'bat.bing.com', 'clarity.ms', 'mc.yandex.ru', 'an.yandex.ru', 'metrica.yandex.com',
  'sc-static.net', 'tr.snapchat.com', 'analytics.tiktok.com', 'business-api.tiktok.com',
  'analytics.twitter.com', 'static.ads-twitter.com', 'ct.pinterest.com',
  'px.ads.linkedin.com', 'snap.licdn.com', 'branch.io', 'appsflyer.com',
  'adjust.com', 'adjust.io', 'kochava.com', 'smartlook.com', 'inspectlet.com',
  'plausible.io', 'matomo.cloud', 'po.st', 'sharethis.com', 'addthis.com',
  'connect.facebook.net', 'pixel.facebook.com', 'an.facebook.com',
  'cdn.mxpnl.com', 'logx.optimizely.com', 'count.optimizely.com',
  'yieldlab.net', 'permutive.com', 'tinypass.com', 'piano.io', 'cxense.com',
  'krxd.net', 'exelator.com', 'eyeota.net', 'crwdcntrl.net', 'tealiumiq.com'
];

// ── Fehler-Tracker (vom AdBlock-Test geprüft) ────────────────────────────────
const ERROR_TRACKERS = [
  'bugsnag.com', 'getsentry.com', 'sentry-cdn.com', 'sentry.io'
];

// ── Gezielt: vom Test als "nicht geblockt" gemeldete Hosts + Unabhängigkeit ───
// Bei Content-Domains (yahoo, yandex, tiktok, …) NUR Tracking-Subdomains blocken,
// niemals die Haupt-Domain.
const TEST_COVERAGE = [
  // Google Analytics (ohne Bindestrich!)
  'googleanalytics.com',
  // Pinterest
  'ads.pinterest.com', 'log.pinterest.com', 'trk.pinterest.com',
  // TikTok / ByteDance
  'ads.tiktok.com', 'ads-sg.tiktok.com', 'ads-api.tiktok.com', 'analytics-sg.tiktok.com', 'byteoversea.com',
  // LinkedIn
  'ads.linkedin.com', 'analytics.pointdrive.linkedin.com',
  // YouTube / Twitter / Reddit (nur Ad-/Event-Subdomains)
  'ads.youtube.com', 'ads-api.twitter.com', 'events.reddit.com', 'events.redditmedia.com',
  // Yahoo (nur Werbe-/Tracking-Subdomains, nicht yahoo.com selbst)
  'ads.yahoo.com', 'udcm.yahoo.com', 'log.fc.yahoo.com', 'partnerads.ysm.yahoo.com',
  'gemini.yahoo.com', 'analytics.yahoo.com', 'adspecs.yahoo.com', 'adtech.yahooinc.com',
  // Yandex (nur Werbe-/Metrik-Subdomains, nicht yandex.ru selbst)
  'metrika.yandex.ru', 'appmetrica.yandex.ru', 'adfox.yandex.ru', 'adfstat.yandex.ru',
  'offerwall.yandex.net', 'mc.yandex.ru', 'an.yandex.ru',
  // Weitere Ad-Netzwerke
  'adcolony.com', 'unityads.unity3d.com', 'luckyorange.com', 'luckyorange.net', 'freshmarketer.com',
  // Adobe/Omniture Tracking
  '2o7.net',
  // Amazon S3 Ad-Buckets (exakte Hosts)
  'adtago.s3.amazonaws.com', 'analyticsengine.s3.amazonaws.com',
  'analytics.s3.amazonaws.com', 'advice-ads.s3.amazonaws.com',
  // Mobile/OEM-Telemetrie (Hersteller-Werbung & Tracking)
  'realme.com', 'realmemobile.com', 'oppomobile.com', 'oneplus.cn', 'oneplus.net',
  'samsungads.com', 'samsunghealthcn.com', 'smetrics.samsung.com', 'nmetrics.samsung.com',
  'api.ad.xiaomi.com', 'sdkconfig.ad.xiaomi.com', 'sdkconfig.ad.intl.xiaomi.com',
  'data.mistat.xiaomi.com', 'data.mistat.india.xiaomi.com', 'data.mistat.rus.xiaomi.com',
  'tracking.rus.miui.com', 'grs.hicloud.com', 'metrics.data.hicloud.com', 'metrics2.data.hicloud.com',
  'logservice.hicloud.com', 'logservice1.hicloud.com', 'logbak.hicloud.com',
  'iadsdk.apple.com', 'api-adservices.apple.com', 'metrics.icloud.com', 'metrics.mzstatic.com',
  'books-analytics-events.apple.com', 'weather-analytics-events.apple.com', 'notes-analytics-events.apple.com'
];

// ── Generische Ad-Script-Pfade (für Script-Bait-Tests / EasyList-Stil) ────────
const GENERIC_PATH_RULES = [
  { urlFilter: '/ads.js', resourceTypes: ['script'] },
  { urlFilter: '/adsbygoogle.js', resourceTypes: ['script'] },
  { urlFilter: '/pagead/', resourceTypes: RT },
  { urlFilter: '/pagead2/', resourceTypes: RT },
  { urlFilter: '/show_ads.js', resourceTypes: ['script'] },
  // Banner-Werbung mit Ad-Keywords im Pfad (EasyList-Stil). Deckt u.a. die
  // adblock-tester.com Banner ab (Flash .swf, GIF, statisches PNG):
  //   /banners/pr_advertising_ads_banner.{swf,gif,png}
  { urlFilter: '_advertising_ads_banner', resourceTypes: RT },
  { urlFilter: '/banners/pr_advertising', resourceTypes: RT }
];

// ── YouTube Ad-Telemetrie (nur Ad-Pings, NICHT das Video selbst!) ─────────────
// googlevideo.com (Video-CDN) wird bewusst NICHT geblockt -> kein Playback-Bruch.
const YOUTUBE_PATH_RULES = [
  { urlFilter: 'youtube.com/api/stats/ads', resourceTypes: ['image', 'xmlhttprequest', 'ping'] },
  { urlFilter: 'youtube.com/api/stats/atr', resourceTypes: ['image', 'xmlhttprequest', 'ping'] },
  { urlFilter: 'youtube.com/ptracking', resourceTypes: ['image', 'xmlhttprequest', 'ping'] },
  { urlFilter: 'youtube.com/pcs/activeview', resourceTypes: ['image', 'xmlhttprequest', 'ping'] },
  { urlFilter: 'youtube.com/pagead/', resourceTypes: RT },
  { urlFilter: 'youtube.com/get_midroll_', resourceTypes: ['xmlhttprequest'] },
  { urlFilter: 'youtube.com/get_ad_tag', resourceTypes: ['xmlhttprequest'] },
  { urlFilter: 'googleads.g.doubleclick.net/pagead/', resourceTypes: RT }
];

// ── Twitch-spezifische Ad-Pfade (schmal, NICHT die ganze Domain!) ─────────────
const TWITCH_PATH_RULES = [
  { urlFilter: '||twitchsvc.net/v1/ads*', resourceTypes: ['xmlhttprequest'] },
  { urlFilter: '||twitchsvc.net/v1/ad?*', resourceTypes: ['xmlhttprequest'] },
  { urlFilter: '*spade.twitch.tv/track*ad*', resourceTypes: ['xmlhttprequest', 'ping'] },
  { urlFilter: '||adsapi.twitch.tv^', resourceTypes: ['xmlhttprequest', 'script'] },
  { urlFilter: '||countess.twitch.tv^', resourceTypes: ['xmlhttprequest', 'ping'] }
];

// ── Generieren ─────────────────────────────────────────────────────────────────
function dedupe(arr) {
  return [...new Set(arr.map(d => d.trim()).filter(Boolean))];
}

const allDomains = dedupe([
  ...CONSENT, ...AB_TESTING, ...AFFILIATE, ...ADS, ...TRACKERS,
  ...ERROR_TRACKERS, ...TEST_COVERAGE
]);

// Sicherheitsnetz: Twitch-Playback-Domains niemals blocken
const FORBIDDEN = ['twitch.tv', 'ttvnw.net', 'jtvnw.net', 'twitchcdn.net', 'twitchsvc.net', 'twitch.tech'];
const safeDomains = allDomains.filter(d => !FORBIDDEN.some(f => d === f || d.endsWith('.' + f)));

const rules = [];
let id = 1;

for (const domain of safeDomains) {
  rules.push({
    id: id++,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: `||${domain}^`, resourceTypes: RT }
  });
}

for (const r of [...GENERIC_PATH_RULES, ...YOUTUBE_PATH_RULES, ...TWITCH_PATH_RULES]) {
  rules.push({
    id: id++,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: r.urlFilter, resourceTypes: r.resourceTypes }
  });
}

const outPath = path.join(__dirname, '..', 'src', 'rules.json');
fs.writeFileSync(outPath, JSON.stringify(rules, null, 2) + '\n');

console.log(`✓ rules.json erstellt: ${rules.length} Regeln`);
console.log(`  Consent: ${dedupe(CONSENT).length} · A/B: ${dedupe(AB_TESTING).length} · Affiliate: ${dedupe(AFFILIATE).length} · Ads: ${dedupe(ADS).length} · Tracker: ${dedupe(TRACKERS).length}`);
console.log(`  Fehler-Tracker: ${dedupe(ERROR_TRACKERS).length} · Test-Abdeckung: ${dedupe(TEST_COVERAGE).length} · Pfad-Regeln: ${GENERIC_PATH_RULES.length + YOUTUBE_PATH_RULES.length + TWITCH_PATH_RULES.length}`);
