/**
 * build-rules.js — Generates rules.json (declarativeNetRequest) from categorized
 * domain lists. Run with:  node build-rules.js
 *
 * Each domain becomes a block rule "||domain^" (matches domain + subdomains).
 * Block rules need NO host_permissions and apply globally.
 *
 * IMPORTANT: Twitch playback domains must NEVER end up here
 * (twitch.tv, ttvnw.net, jtvnw.net, twitchcdn.net, twitchsvc.net as whole domains),
 * otherwise the stream breaks. Twitch ads are blocked via narrow path rules.
 */

const fs = require('fs');
const path = require('path');

// Resource types: everything EXCEPT main_frame (so normal navigation doesn't break)
const RT = [
  'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object',
  'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other'
];

// Consent / cookie banners / CMP
const CONSENT = [
  'consensu.org', 'cookiebot.com', 'cookielaw.org', 'onetrust.com', 'cookiepro.com',
  'quantcast.com', 'sourcepoint.com', 'sp-prod.net', 'privacy-mgmt.com', 'summerhamster.com',
  'trustarc.com', 'usercentrics.eu', 'didomi.io', 'privacy-center.org', 'consentmanager.net',
  'cookieyes.com', 'iubenda.com', 'termly.io', 'osano.com', 'secureprivacy.ai',
  'cookie-script.com', 'cookiefirst.com', 'cookiehub.net', 'civiccomputing.com',
  'crownpeak.net', 'faktor.io', 'sirdata.com', 'axeptio.eu', 'fundingchoicesmessages.google.com',
  'ensighten.com', 'evidon.com', 'truste.com', 'consentframework.com', 'transcend.io'
];

// A/B testing / experiments / personalization
const AB_TESTING = [
  'optimizely.com', 'visualwebsiteoptimizer.com', 'wingify.com', 'abtasty.com',
  'kameleoon.com', 'kameleoon.eu', 'monetate.net', 'dynamicyield.com', 'dy-api.com',
  'convertexperiments.com', 'taplytics.com', 'statsig.com', 'split.io',
  'adobedtm.com', 'demdex.net', 'omtrdc.net', 'everesttech.net', 'maxymiser.net',
  'qualaroo.com', 'optimizesrv.com', 'webtrends.com', 'sitespect.com',
  'apptimize.com', 'amplitude.com', 'optimstatic.com'
];

// Affiliate networks / tracking redirects
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
  'commission-junction.com', 'doubleclick-affiliate.com',
  // Partner / affiliate tracking (d3ward reachable)
  'partnerstack.com', 'refersion.com'
];

// Ads / ad exchanges / SSPs / DSPs
const ADS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adservice.google.com', 'imasdk.googleapis.com', 'pagead2.googlesyndication.com',
  'g.doubleclick.net', 'ad.doubleclick.net', 'googletagservices.com',
  '2mdn.net', 'gstatic.2mdn.net',  // DoubleClick video ad creatives (not the YT video)
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
  'btloader.com', 'confiant-integrations.net', 'lijit.com',
  // More ad exchanges / SSPs / video ad servers / ad verification (pure ad-tech)
  'propellerads.com', '3lift.com', 'kargo.com', 'indexexchange.com', 'smartyads.com',
  'doubleverify.com', 'insightexpressai.com', 'fwmrm.net', 'tremorhub.com', 'connatix.com',
  // Header bidding / ad identity / more ad-tech (d3ward reachable)
  'htlbid.com', 'ad.gt', 'stackadapt.com', 'onetag-sys.com', 'pippio.com',
  'id5-sync.com', 'uidapi.com', 'smartclip.com', 'lgsmartad.com', 'is.com'
];

// Analytics / tracking / session recording
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
  'krxd.net', 'exelator.com', 'eyeota.net', 'crwdcntrl.net', 'tealiumiq.com',
  // Analytics / CDP / fingerprinting / customer engagement (d3ward reachable)
  'cloudflareinsights.com', 'posthog.com', 'rudderstack.com', 'rudderlabs.com',
  'snowplowanalytics.com', 'fingerprintjs.com', 'fpjs.io', 'siftscience.com',
  'wzrkt.com', 'clevertap-prod.com', 'lr-ingest.com', 'singular.net', 'bnc.lt',
  'trackcmp.net', 'braze.com', 'onesignal.com', 'klaviyo.com', 'customer.io', 'driftt.com'
];

// Error trackers (checked by the adblock test)
// d2wy8f7a9ursnm.cloudfront.net = Bugsnag's dedicated script CDN. bugsnag.com
// only covers notify/sessions; the "Script execution" test loads the library
// from the CloudFront distribution -> must be blocked separately.
const ERROR_TRACKERS = [
  'bugsnag.com', 'd2wy8f7a9ursnm.cloudfront.net',
  'getsentry.com', 'sentry-cdn.com', 'sentry.io', 'crashlytics.com'
];

// Mobile ad networks (pure ad-SDK / network domains)
const MOBILE_ADS = [
  'applovin.com', 'vungle.com', 'liftoff.io', 'pangleglobal.com', 'chartboost.com',
  'supersonicads.com', 'fyber.com', 'inmobi.com', 'ironsource.mobi'
];

// Cryptominers / malvertising / pop-ups / malicious scripts
const MALWARE = [
  // Browser cryptominers
  'coinimp.com', 'crypto-loot.org', 'monerominer.rocks',
  // Malvertising / pop-up / pop-under networks
  'popads.net', 'popcash.net', 'onclickads.net', 'clickadu.com',
  'trafficjunky.net', 'exoclick.com', 'juicyads.com',
  // Malicious / unwanted scripts
  'statdynamic.com'
];

// Targeted: hosts reported as "not blocked" by the test + extra independence.
// For content domains (yahoo, yandex, tiktok, …) block ONLY tracking subdomains,
// never the main domain.
const TEST_COVERAGE = [
  // Google Analytics (without the hyphen!)
  'googleanalytics.com',
  // Pinterest
  'ads.pinterest.com', 'log.pinterest.com', 'trk.pinterest.com',
  // TikTok / ByteDance
  'ads.tiktok.com', 'ads-sg.tiktok.com', 'ads-api.tiktok.com', 'analytics-sg.tiktok.com', 'byteoversea.com',
  // LinkedIn
  'ads.linkedin.com', 'analytics.pointdrive.linkedin.com',
  // YouTube / Twitter / Reddit (only ad/event subdomains)
  'ads.youtube.com', 'ads-api.twitter.com', 'events.reddit.com', 'events.redditmedia.com',
  // Yahoo (only ad/tracking subdomains, not yahoo.com itself)
  'ads.yahoo.com', 'udcm.yahoo.com', 'log.fc.yahoo.com', 'partnerads.ysm.yahoo.com',
  'gemini.yahoo.com', 'analytics.yahoo.com', 'adspecs.yahoo.com', 'adtech.yahooinc.com',
  // Yandex (only ad/metrics subdomains, not yandex.ru itself)
  'metrika.yandex.ru', 'appmetrica.yandex.ru', 'adfox.yandex.ru', 'adfstat.yandex.ru',
  'offerwall.yandex.net', 'mc.yandex.ru', 'an.yandex.ru',
  // More ad networks
  'adcolony.com', 'unityads.unity3d.com', 'luckyorange.com', 'luckyorange.net', 'freshmarketer.com',
  // Adobe/Omniture tracking
  '2o7.net',
  // Amazon S3 ad buckets (exact hosts)
  'adtago.s3.amazonaws.com', 'analyticsengine.s3.amazonaws.com',
  'analytics.s3.amazonaws.com', 'advice-ads.s3.amazonaws.com',
  // Mobile/OEM telemetry (vendor ads & tracking)
  'realme.com', 'realmemobile.com', 'oppomobile.com', 'oneplus.cn', 'oneplus.net',
  'samsungads.com', 'samsunghealthcn.com', 'smetrics.samsung.com', 'nmetrics.samsung.com',
  'api.ad.xiaomi.com', 'sdkconfig.ad.xiaomi.com', 'sdkconfig.ad.intl.xiaomi.com',
  'data.mistat.xiaomi.com', 'data.mistat.india.xiaomi.com', 'data.mistat.rus.xiaomi.com',
  'tracking.rus.miui.com', 'grs.hicloud.com', 'metrics.data.hicloud.com', 'metrics2.data.hicloud.com',
  'logservice.hicloud.com', 'logservice1.hicloud.com', 'logbak.hicloud.com',
  'iadsdk.apple.com', 'api-adservices.apple.com', 'metrics.icloud.com', 'metrics.mzstatic.com',
  'books-analytics-events.apple.com', 'weather-analytics-events.apple.com', 'notes-analytics-events.apple.com',
  // Only ad/tracking subdomains of content domains (NEVER block the main domain)
  'aan.amazon.com', 'bingads.microsoft.com', 'ads.microsoft.com',
  's.youtube.com', 'dai.google.com', 'metrics.brightcove.com', 'g.jwpsrv.com',
  // d3ward "reachable" – only ad/tracking/telemetry subdomains
  'advertising-api-eu.amazon.com', 'fls-na.amazon.com', 'device-metrics-us.amazon.com',
  'device-metrics-us-2.amazon.com', 'mads-eu.amazon.com',
  'c.bing.com', 'tagmanager.google.com', 'analytics.adobe.io', 'stats.wp.com',
  'settings-win.data.microsoft.com', 'vortex.data.microsoft.com',
  'vortex-win.data.microsoft.com', 'watson.telemetry.microsoft.com',
  'browser.events.data.msn.com',
  'udc.yahoo.com', 'advertising.yahoo.com', 'geo.yahoo.com', 'analytics.query.yahoo.com',
  'advertising.yandex.ru', 'rum.browser-intake-datadoghq.com',
  'tr.facebook.com', 'graph.facebook.com', 'graph.instagram.com', 'sc-analytics.appspot.com',
  'ads-api.x.com', 'analytics.x.com', 'ads.x.com', 'd.reddit.com',
  'mcs-va.tiktokv.com', 'mon.tiktokv.com',
  'analytics.pinterest.com', 'widgets.pinterest.com',
  'pixel.quora.com', 'qevents.quora.com', 'px.srvcs.tumblr.com',
  'ads.vk.com', 'ad.mail.ru', 'top-fwz1.mail.ru',
  'advertising.apple.com', 'xp.apple.com', 'ads.huawei.com', 'tracking.miui.com', 'ngfts.lge.com',
  'ads.roku.com', 'events.launchdarkly.com', 'track.hubspot.com',
  'munchkin.marketo.net', 'click.mailchimp.com', 'widget.intercom.io'
];

// Generic ad-script paths (for script-bait tests / EasyList style)
const GENERIC_PATH_RULES = [
  { urlFilter: '/ads.js', resourceTypes: ['script'] },
  { urlFilter: '/adsbygoogle.js', resourceTypes: ['script'] },
  { urlFilter: '/pagead/', resourceTypes: RT },
  { urlFilter: '/pagead2/', resourceTypes: RT },
  { urlFilter: '/show_ads.js', resourceTypes: ['script'] },
  // Banner ads with ad keywords in the path (EasyList style). Covers e.g. the
  // adblock-tester.com banners (Flash .swf, GIF, static PNG):
  //   /banners/pr_advertising_ads_banner.{swf,gif,png}
  { urlFilter: '_advertising_ads_banner', resourceTypes: RT },
  { urlFilter: '/banners/pr_advertising', resourceTypes: RT },
  // VK retargeting pixel (path on vk.com – main domain stays reachable)
  { urlFilter: 'vk.com/rtrg', resourceTypes: ['image', 'xmlhttprequest', 'ping', 'script'] }
];

// YouTube ad telemetry (only ad pings, NOT the video itself!)
// googlevideo.com (video CDN) is deliberately NOT blocked -> no playback break.
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

// Twitch-specific ad paths (narrow, NOT the whole domain!)
const TWITCH_PATH_RULES = [
  { urlFilter: '||twitchsvc.net/v1/ads*', resourceTypes: ['xmlhttprequest'] },
  { urlFilter: '||twitchsvc.net/v1/ad?*', resourceTypes: ['xmlhttprequest'] },
  { urlFilter: '*spade.twitch.tv/track*ad*', resourceTypes: ['xmlhttprequest', 'ping'] },
  { urlFilter: '||adsapi.twitch.tv^', resourceTypes: ['xmlhttprequest', 'script'] },
  { urlFilter: '||countess.twitch.tv^', resourceTypes: ['xmlhttprequest', 'ping'] }
];

// Generate
function dedupe(arr) {
  return [...new Set(arr.map(d => d.trim()).filter(Boolean))];
}

const allDomains = dedupe([
  ...CONSENT, ...AB_TESTING, ...AFFILIATE, ...ADS, ...TRACKERS,
  ...ERROR_TRACKERS, ...MOBILE_ADS, ...MALWARE, ...TEST_COVERAGE
]);

// Safety net: never block Twitch playback domains
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

console.log(`rules.json created: ${rules.length} rules`);
console.log(`  Consent: ${dedupe(CONSENT).length} · A/B: ${dedupe(AB_TESTING).length} · Affiliate: ${dedupe(AFFILIATE).length} · Ads: ${dedupe(ADS).length} · Trackers: ${dedupe(TRACKERS).length}`);
console.log(`  Error trackers: ${dedupe(ERROR_TRACKERS).length} · Mobile ads: ${dedupe(MOBILE_ADS).length} · Malware: ${dedupe(MALWARE).length} · Test coverage: ${dedupe(TEST_COVERAGE).length} · Path rules: ${GENERIC_PATH_RULES.length + YOUTUBE_PATH_RULES.length + TWITCH_PATH_RULES.length}`);
