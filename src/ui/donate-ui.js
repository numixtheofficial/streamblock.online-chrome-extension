/**
 * donate-ui.js — Amount input before PayPal (popup)
 */
(function () {
  'use strict';

  var PAYPAL_URL = 'https://www.paypal.com/ncp/payment/JGS7B7H7B3KCJ';
  var MIN_AMOUNT = 1;

  function t(key, vars) {
    return window.SB_I18N ? SB_I18N.t(key, vars) : key;
  }

  function formatAmount(value) {
    var rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
    return rounded.toFixed(2).replace(/0$/, '');
  }

  function parseAmount(raw) {
    var v = parseFloat(String(raw || '').replace(',', '.').trim());
    return isFinite(v) ? v : NaN;
  }

  function openPayPal(url) {
    if (chrome && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: url });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  function wire(input, btn, options) {
    if (!input || !btn) return;

    var labelEl = btn.querySelector(options.labelSelector || '.donate-btn-label');
    var presets = options.presetSelector
      ? document.querySelectorAll(options.presetSelector)
      : [];

    function isValid() {
      var v = parseAmount(input.value);
      return isFinite(v) && v >= MIN_AMOUNT;
    }

    function setBtnState(ok, amount) {
      if (ok) {
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('is-disabled');
        if (labelEl) {
          labelEl.textContent = t('donate.continuePayment', { amount: formatAmount(amount) });
        }
      } else {
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('is-disabled');
        if (labelEl) labelEl.textContent = t('donate.enterAmount');
      }
    }

    function refresh() {
      var v = parseAmount(input.value);
      setBtnState(isValid(), v);
    }

    input.addEventListener('input', refresh);
    input.addEventListener('change', refresh);

    presets.forEach(function (preset) {
      preset.addEventListener('click', function () {
        input.value = preset.getAttribute('data-amount') || '';
        refresh();
        input.focus();
      });
    });

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (!isValid()) {
        input.focus();
        return;
      }
      openPayPal(PAYPAL_URL);
    });

    if (window.SB_I18N) {
      SB_I18N.onChange(function () { refresh(); });
    }

    refresh();
  }

  function start() {
    wire(document.getElementById('donateAmount'), document.getElementById('donateBtn'), {
      presetSelector: '.donate-amount-preset'
    });
  }

  function boot() {
    if (window.SB_I18N) {
      SB_I18N.init().then(start);
    } else {
      start();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
