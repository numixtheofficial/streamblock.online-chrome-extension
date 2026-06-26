/**
 * i18n.js — Sprache für Popup & Detail (DE / EN)
 */
(function () {
  'use strict';

  var STRINGS = {
    de: {
      'status.active': 'Aktiv · Werbung blockiert',
      'status.disabled': 'Deaktiviert · inaktiv',
      'header.details': 'Details',
      'header.detailsTitle': 'Detail-Ansicht öffnen',
      'header.donate': 'Spenden',
      'header.donateTitle': 'Zur Spenden-Seite',
      'header.toggleTitle': 'Ad-Blocker ein/aus',
      'stats.aria': 'Statistik',
      'stats.totalLabel': 'Werbung & Tracker geblockt',
      'stats.videoAds': 'Video-Ads',
      'stats.requests': 'Requests',
      'stats.timeSaved': 'Zeit gespart',
      'methods.title': 'Schutz-Methoden',
      'methods.hint': 'pro Plattform',
      'tabs.aria': 'Plattformen',
      'tabs.twitch': 'Twitch',
      'tabs.youtube': 'YouTube',
      'tabs.global': 'Global',
      'tabs.more': 'Mehr',
      'hint.twitch': 'Video-Ads auf Twitch – kurzer Quali-Drop beim Umschalten auf den Backup-Stream ist normal.',
      'hint.youtube': 'Änderungen an YouTube-Methoden laden den offenen Tab automatisch neu.',
      'hint.global': 'Schutz auf allen Webseiten – unabhängig von Twitch oder YouTube.',
      'method.streamSwap.name': 'Stream-Swap',
      'method.streamSwap.desc': 'Werbefreier Backup-Stream bei Twitch-Video-Ads.',
      'method.strip.name': 'Ad-Segmente entfernen',
      'method.strip.desc': 'Schneidet eingebettete Werbe-Stücke aus dem Stream.',
      'method.spoof.name': 'player_type Spoof',
      'method.spoof.desc': 'Tarnt den Player – Twitch liefert oft gar keine Ads.',
      'method.dom.name': 'DOM Ad-Remover',
      'method.dom.desc': 'Blendet Banner & Display-Werbung in der Oberfläche aus.',
      'method.youtube.name': 'YouTube Ad-Block',
      'method.youtube.desc': 'Schneidet Video-Werbung heraus & überspringt Ads.',
      'method.youtubeDai.name': 'SSAI-Strip',
      'method.youtubeDai.desc': 'Entfernt server-seitig eingebaute Ads (DAI). Bei Problemen ausschalten.',
      'method.network.name': 'Network-Blocking',
      'method.network.desc': 'Blockt ~330 Werbe-, Tracking- & Consent-Server.',
      'method.cosmetic.name': 'Cosmetic-Filter',
      'method.cosmetic.desc': 'Blendet Banner, AdSense & Werbe-Elemente per CSS aus.',
      'more.telemetry.name': 'Anonyme Statistik',
      'more.telemetry.desc': 'Versionszähler & Block-Summe – keine URLs, keine Identität.',
      'more.supporterTitle': 'Supporter-Features',
      'more.feedback.title': 'Feedback',
      'more.feedback.desc': 'Bug melden oder Feature vorschlagen.',
      'more.feedback.btn': 'Feedback senden',
      'more.feedback.titleAttr': 'Feedback-Formular öffnen',
      'pro.cookie.name': 'Cookie-Banner-Killer',
      'pro.cookie.desc': 'Lehnt Cookie-Banner automatisch ab.',
      'pro.captcha.name': 'Anti-Captcha',
      'pro.captcha.desc': 'Weniger Captchas durch Tracking-Block.',
      'badge.beta': 'Beta',
      'badge.pro': 'Pro',
      'donate.title': 'Entwicklung unterstützen',
      'donate.sub': 'Freiwillig — Betrag unten eingeben, dann mit Karte, Apple Pay, Google Pay oder PayPal zahlen.',
      'donate.payAria': 'Zahlungsarten',
      'donate.chip.card': 'Kreditkarte',
      'donate.chip.debit': 'Debit',
      'donate.chip.apple': 'Apple Pay',
      'donate.preview.custom': 'EIGENE',
      'donate.preview.lockTitle': 'Detail-Ansicht & eigene Filter',
      'donate.preview.lockSub': 'Genau sehen, was geblockt wird – plus eigene URLs.',
      'donate.amountLabel': 'Dein Betrag (EUR)',
      'donate.amountPlaceholder': 'z. B. 5',
      'donate.presetsAria': 'Schnellauswahl',
      'donate.enterAmount': 'Betrag eingeben',
      'donate.continuePayment': 'Weiter zur Zahlung — €{amount}',
      'donate.cryptoLink': 'Crypto & Infos',
      'donate.foot': 'Freiwillige Spenden ohne Gegenleistung — danke!',
      'footer.reset': 'Zurücksetzen',
      'settings.title': 'Einstellungen',
      'settings.language': 'Sprache',
      'settings.languageHint': 'Gilt für Popup und Detail-Ansicht.',
      'settings.close': 'Schließen',
      'welcome.title': 'Willkommen bei Streamblock',
      'welcome.message': 'Streamblock ist Pay-what-you-like-Software. Du kannst sie für immer kostenlos nutzen. 😊',
      'welcome.languageLabel': 'Sprache wählen',
      'welcome.continue': 'Los geht’s',
      'welcome.donate': 'Projekt unterstützen',
      'welcome.donateTitle': 'Zur Spenden-Seite',
      'toast.enabled': 'Ad-Blocker aktiviert',
      'toast.enabledReload': 'Aktiviert · Tab wird neu geladen',
      'toast.disabled': 'Ad-Blocker deaktiviert',
      'toast.disabledReload': 'Deaktiviert · Tab wird neu geladen',
      'toast.methodOn': '{name}: an',
      'toast.methodOff': '{name}: aus',
      'toast.reload': ' · neu laden',
      'toast.telemetryOn': 'Anonyme Statistik: an',
      'toast.telemetryOff': 'Anonyme Statistik: aus',
      'toast.statsReset': 'Statistik zurückgesetzt',
      'toast.languageChanged': 'Sprache geändert',
      'detail.title': 'Detail-Ansicht',
      'detail.subtitle': 'Echtzeit-Übersicht aller geblockten Werbung & eigene Filter',
      'detail.badge': 'Supporter',
      'detail.kpi.total': 'Gesamt geblockt',
      'detail.kpi.network': 'Netzwerk-Blocks',
      'detail.kpi.video': 'Video-Ads',
      'detail.live.title': 'Live geblockt',
      'detail.live.pill': 'echte Daten',
      'detail.live.loading': 'Lade echte Blocks …',
      'detail.live.empty': 'Noch keine Blocks erfasst. Öffne Twitch/YouTube oder surfe kurz – dann erscheinen hier echte, geblockte Anfragen.',
      'detail.live.error': 'Log konnte nicht geladen werden.',
      'detail.live.note': 'Nur die letzten <b>{shown}</b> Einträge sichtbar — das vollständige Live-Log (mit voller URL, Tab & Zeitstempel) ist Supporter-exklusiv.',
      'detail.live.moreLocked': '+{count} weitere gesperrt',
      'detail.locked.log': 'Vollständiges Live-Log',
      'detail.locked.searchable': 'durchsuchbar',
      'detail.locked.categories': 'Kategorien',
      'detail.locked.ads': 'Werbung',
      'detail.locked.tracking': 'Tracking',
      'detail.locked.consent': 'Consent',
      'detail.locked.history': 'Verlauf (24 h)',
      'detail.locked.filters': 'Eigene Filter-URLs',
      'detail.locked.add': '+ Hinzufügen',
      'detail.gate.title': 'Mehr Insights — bald verfügbar',
      'detail.gate.lead': 'Du siehst oben bereits <strong>echte, live geblockte Anfragen</strong>. Geplant für eine zukünftige Supporter-Version:',
      'detail.gate.feat1': 'Vollständiges Live-Log mit voller URL, Tab & Zeit',
      'detail.gate.feat2': 'Eigene Werbe-URLs hinzufügen & verwalten',
      'detail.gate.feat3': 'Cookie-Banner-Killer – nie wieder „Akzeptieren“',
      'detail.gate.feat4': 'Anti-Captcha – seltener „Ich bin kein Roboter“',
      'detail.gate.donateNote': 'Wähle deinen Betrag auf unserer Spenden-Seite — PayPal, Karte, Apple Pay, Google Pay oder Crypto.',
      'detail.gate.payAria': 'Zahlungsarten',
      'detail.gate.donateBtn': 'Zur Spenden-Seite',
      'detail.gate.foot': 'Freiwillige Unterstützung ·',
      'tag.ad': 'AD',
      'tag.tracker': 'TRACKER',
      'tag.video': 'VIDEO',
      'time.now': 'jetzt',
      'update.badge': 'Update erforderlich',
      'update.title': 'Diese Version wird nicht mehr unterstützt',
      'update.body': 'Deine Version (v{version}) wurde deaktiviert. Der Werbe-Schutz ist pausiert, bis du auf die aktuelle Version aktualisierst.',
      'update.protectionOff': 'Schutz pausiert',
      'update.btn': 'Jetzt aktualisieren'
    },
    en: {
      'status.active': 'Active · ads blocked',
      'status.disabled': 'Disabled · inactive',
      'header.details': 'Details',
      'header.detailsTitle': 'Open detail view',
      'header.donate': 'Donate',
      'header.donateTitle': 'Go to donation page',
      'header.toggleTitle': 'Toggle ad blocker',
      'stats.aria': 'Statistics',
      'stats.totalLabel': 'Ads & trackers blocked',
      'stats.videoAds': 'Video ads',
      'stats.requests': 'Requests',
      'stats.timeSaved': 'Time saved',
      'methods.title': 'Protection methods',
      'methods.hint': 'per platform',
      'tabs.aria': 'Platforms',
      'tabs.twitch': 'Twitch',
      'tabs.youtube': 'YouTube',
      'tabs.global': 'Global',
      'tabs.more': 'More',
      'hint.twitch': 'Twitch video ads — a brief quality dip when switching to the backup stream is normal.',
      'hint.youtube': 'Changing YouTube methods reloads the open tab automatically.',
      'hint.global': 'Protection on all websites — independent of Twitch or YouTube.',
      'method.streamSwap.name': 'Stream swap',
      'method.streamSwap.desc': 'Ad-free backup stream during Twitch video ads.',
      'method.strip.name': 'Remove ad segments',
      'method.strip.desc': 'Cuts embedded ad segments from the stream.',
      'method.spoof.name': 'player_type spoof',
      'method.spoof.desc': 'Disguises the player — Twitch often serves no ads.',
      'method.dom.name': 'DOM ad remover',
      'method.dom.desc': 'Hides banners & display ads in the UI.',
      'method.youtube.name': 'YouTube ad block',
      'method.youtube.desc': 'Strips video ads & auto-skips what slips through.',
      'method.youtubeDai.name': 'SSAI strip',
      'method.youtubeDai.desc': 'Removes server-inserted ads (DAI). Turn off if issues occur.',
      'method.network.name': 'Network blocking',
      'method.network.desc': 'Blocks ~330 ad, tracking & consent servers.',
      'method.cosmetic.name': 'Cosmetic filter',
      'method.cosmetic.desc': 'Hides banners, AdSense & ad elements via CSS.',
      'more.telemetry.name': 'Anonymous stats',
      'more.telemetry.desc': 'Version counter & block total — no URLs, no identity.',
      'more.supporterTitle': 'Supporter features',
      'more.feedback.title': 'Feedback',
      'more.feedback.desc': 'Report a bug or suggest a feature.',
      'more.feedback.btn': 'Send feedback',
      'more.feedback.titleAttr': 'Open feedback form',
      'pro.cookie.name': 'Cookie banner killer',
      'pro.cookie.desc': 'Automatically rejects cookie banners.',
      'pro.captcha.name': 'Anti-captcha',
      'pro.captcha.desc': 'Fewer captchas via tracking block.',
      'badge.beta': 'Beta',
      'badge.pro': 'Pro',
      'donate.title': 'Support development',
      'donate.sub': 'Voluntary — enter any amount below, then pay with card, Apple Pay, Google Pay, or PayPal.',
      'donate.payAria': 'Payment methods',
      'donate.chip.card': 'Credit card',
      'donate.chip.debit': 'Debit',
      'donate.chip.apple': 'Apple Pay',
      'donate.preview.custom': 'CUSTOM',
      'donate.preview.lockTitle': 'Detail view & custom filters',
      'donate.preview.lockSub': 'See exactly what’s blocked — plus your own URLs.',
      'donate.amountLabel': 'Your amount (EUR)',
      'donate.amountPlaceholder': 'e.g. 5',
      'donate.presetsAria': 'Quick amounts',
      'donate.enterAmount': 'Enter your amount',
      'donate.continuePayment': 'Continue to payment — €{amount}',
      'donate.cryptoLink': 'Crypto & info',
      'donate.foot': 'Voluntary donations with no goods or services in return — thank you!',
      'footer.reset': 'Reset',
      'settings.title': 'Settings',
      'settings.language': 'Language',
      'settings.languageHint': 'Applies to popup and detail view.',
      'settings.close': 'Close',
      'welcome.title': 'Welcome to Streamblock',
      'welcome.message': 'Streamblock is a pay-what-you-like software. You can use it for free, forever. 😊',
      'welcome.languageLabel': 'Choose your language',
      'welcome.continue': 'Get started',
      'welcome.donate': 'Support the project',
      'welcome.donateTitle': 'Go to donation page',
      'toast.enabled': 'Ad blocker enabled',
      'toast.enabledReload': 'Enabled · reloading tab',
      'toast.disabled': 'Ad blocker disabled',
      'toast.disabledReload': 'Disabled · reloading tab',
      'toast.methodOn': '{name}: on',
      'toast.methodOff': '{name}: off',
      'toast.reload': ' · reload',
      'toast.telemetryOn': 'Anonymous stats: on',
      'toast.telemetryOff': 'Anonymous stats: off',
      'toast.statsReset': 'Statistics reset',
      'toast.languageChanged': 'Language changed',
      'detail.title': 'Detail view',
      'detail.subtitle': 'Real-time overview of blocked ads & custom filters',
      'detail.badge': 'Supporter',
      'detail.kpi.total': 'Total blocked',
      'detail.kpi.network': 'Network blocks',
      'detail.kpi.video': 'Video ads',
      'detail.live.title': 'Live blocked',
      'detail.live.pill': 'live data',
      'detail.live.loading': 'Loading real blocks…',
      'detail.live.empty': 'No blocks yet. Open Twitch/YouTube or browse briefly — real blocked requests will appear here.',
      'detail.live.error': 'Could not load log.',
      'detail.live.note': 'Only the last <b>{shown}</b> entries visible — the full live log (with full URL, tab & timestamp) is supporter-only.',
      'detail.live.moreLocked': '+{count} more locked',
      'detail.locked.log': 'Full live log',
      'detail.locked.searchable': 'searchable',
      'detail.locked.categories': 'Categories',
      'detail.locked.ads': 'Ads',
      'detail.locked.tracking': 'Tracking',
      'detail.locked.consent': 'Consent',
      'detail.locked.history': 'History (24 h)',
      'detail.locked.filters': 'Custom filter URLs',
      'detail.locked.add': '+ Add',
      'detail.gate.title': 'More insights — coming soon',
      'detail.gate.lead': 'You already see <strong>real, live blocked requests</strong> above. Planned for a future supporter version:',
      'detail.gate.feat1': 'Full live log with full URL, tab & time',
      'detail.gate.feat2': 'Add & manage your own ad URLs',
      'detail.gate.feat3': 'Cookie banner killer — no more “Accept all”',
      'detail.gate.feat4': 'Anti-captcha — less “I’m not a robot”',
      'detail.gate.donateNote': 'Choose your amount on our donation page — PayPal, card, Apple Pay, Google Pay or crypto.',
      'detail.gate.payAria': 'Payment methods',
      'detail.gate.donateBtn': 'Go to donation page',
      'detail.gate.foot': 'Voluntary support ·',
      'tag.ad': 'AD',
      'tag.tracker': 'TRACKER',
      'tag.video': 'VIDEO',
      'time.now': 'now',
      'update.badge': 'Update required',
      'update.title': 'This version is no longer supported',
      'update.body': 'Your version (v{version}) has been disabled. Ad protection is paused until you update to the latest version.',
      'update.protectionOff': 'Protection paused',
      'update.btn': 'Update now'
    }
  };

  var lang = 'en';
  var listeners = [];

  function interpolate(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] != null ? String(vars[k]) : '';
    });
  }

  function t(key, vars) {
    var bucket = STRINGS[lang] || STRINGS.de;
    var fall = STRINGS.de[key];
    var val = bucket[key] != null ? bucket[key] : fall;
    return val != null ? interpolate(val, vars) : key;
  }

  function apply(root) {
    if (!root) return;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    listeners.forEach(function (fn) { fn(lang); });
  }

  function init() {
    return new Promise(function (resolve) {
      if (!chrome || !chrome.storage || !chrome.storage.sync) {
        lang = 'en';
        document.documentElement.lang = lang;
        apply(document);
        resolve(lang);
        return;
      }
      chrome.storage.sync.get(['language'], function (stored) {
        if (stored && stored.language && STRINGS[stored.language]) {
          lang = stored.language;
        } else {
          lang = 'en';
        }
        document.documentElement.lang = lang;
        apply(document);
        resolve(lang);
      });
    });
  }

  function setLanguage(code, options) {
    if (!STRINGS[code]) return Promise.resolve(lang);
    var persist = !options || options.persist !== false;
    lang = code;
    document.documentElement.lang = code;
    apply(document);
    if (!persist) return Promise.resolve(lang);
    if (chrome && chrome.storage && chrome.storage.sync) {
      return new Promise(function (resolve) {
        chrome.storage.sync.set({ language: code }, function () { resolve(lang); });
      });
    }
    return Promise.resolve(lang);
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  window.SB_I18N = {
    init: init,
    setLanguage: setLanguage,
    t: t,
    getLanguage: function () { return lang; },
    apply: apply,
    onChange: onChange
  };
})();
