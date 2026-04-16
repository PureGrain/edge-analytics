// Edge Analytics — client-side tracking snippet
// Sends session_start, session_end, and custom conversion events to the worker.
//
// Configuration (optional — set before this script loads):
//   window.EDGE_ANALYTICS_CONFIG = {
//     trackUrl: 'https://your-worker.workers.dev/track',  // default: /track
//     siteId:   'my-site',                                // optional label
//   };
//
// Custom conversion events (call from your own JS):
//   window.edgeTrack('form_submit', { service: 'lawn-care' });
//   window.edgeTrack('phone_click');
//
// Owner opt-out (run in browser console):
//   localStorage.setItem('_ea_notrack', '1')

(function () {
  'use strict';

  var cfg = window.EDGE_ANALYTICS_CONFIG || {};
  var TRACK_URL = cfg.trackUrl || '/track';

  // --- Privacy gates ---
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  try { if (localStorage.getItem('_ea_notrack')) return; } catch (e) {}

  // --- Storage helpers (safe for private browsing) ---
  var store = {
    get:  function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set:  function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    json: function (k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    save: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  var SESSION_KEY  = '_ea_sid';
  var JOURNEY_KEY  = '_ea_journey';
  var NAV_KEY      = '_ea_nav';
  var START_KEY    = '_ea_started';
  var REF_KEY      = '_ea_ref';

  // --- Session ID ---
  var sessionId = store.get(SESSION_KEY);
  var isNewSession = !sessionId;
  if (isNewSession) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    store.set(SESSION_KEY, sessionId);
  }

  store.set(NAV_KEY, '');

  // --- UTM parameters ---
  var utmParams = (function () {
    try {
      var params = new URLSearchParams(window.location.search);
      return {
        utmSource:   params.get('utm_source')   || undefined,
        utmMedium:   params.get('utm_medium')   || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        utmContent:  params.get('utm_content')  || undefined,
      };
    } catch (e) { return {}; }
  })();

  // --- Device data ---
  var deviceData = {
    screen:   { width: screen.width, height: screen.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    language: navigator.language || 'unknown',
    timezone: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'unknown'; } })(),
    darkMode: !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches),
  };

  // --- Page journey ---
  var currentPage = window.location.pathname;
  var pageStart = Date.now();
  var maxScroll = 0;
  var clicks = [];

  var journey = store.json(JOURNEY_KEY) || [];
  var lastEntry = journey.length > 0 ? journey[journey.length - 1] : null;
  if (lastEntry && lastEntry.page === currentPage) {
    lastEntry.enteredAt = pageStart;
    lastEntry.duration = 0;
    lastEntry.scrollDepth = 0;
    lastEntry.clicks = [];
  } else {
    journey.push({ page: currentPage, enteredAt: pageStart, duration: 0, scrollDepth: 0, clicks: [] });
  }
  store.save(JOURNEY_KEY, journey);

  // --- Send event ---
  function send(event, data) {
    var payload = JSON.stringify(Object.assign(
      { event: event, sessionId: sessionId, timestamp: Date.now() },
      deviceData,
      data
    ));

    if (event === 'session_end') {
      try {
        fetch(TRACK_URL, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true });
      } catch (e) {
        var blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon) navigator.sendBeacon(TRACK_URL, blob);
      }
    } else {
      fetch(TRACK_URL, {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      }).catch(function () {});
    }
  }

  // --- Public API: custom conversion events ---
  window.edgeTrack = function (eventName, eventData) {
    send('conversion', {
      eventName: eventName,
      eventData: eventData || null,
      page: currentPage,
    });
  };

  // --- Session start ---
  if (isNewSession && !store.get(START_KEY)) {
    store.set(START_KEY, '1');
    store.set(REF_KEY, document.referrer || '');
    send('session_start', Object.assign(
      { page: currentPage, referrer: document.referrer || null },
      utmParams
    ));
  }

  // --- Scroll tracking ---
  function updateScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    var docH = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0);
    var winH = window.innerHeight;
    var scrollable = docH - winH;
    if (scrollable > 0) {
      var pct = Math.round((scrollTop / scrollable) * 100);
      if (pct > maxScroll) maxScroll = Math.min(pct, 100);
    } else {
      maxScroll = 100;
    }
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  setTimeout(updateScroll, 500);

  // --- Click tracking ---
  document.addEventListener('click', function (e) {
    var target = e.target.closest('a, button, [data-track]');
    if (!target) return;

    var label = '';
    if (target.dataset && target.dataset.track) {
      label = target.dataset.track;
    } else if (target.tagName === 'A') {
      label = (target.textContent || '').trim().slice(0, 50);
      if (target.hostname && target.hostname !== window.location.hostname) {
        label = '[ext] ' + label;
      }
    } else if (target.tagName === 'BUTTON') {
      label = (target.textContent || '').trim().slice(0, 50) || target.getAttribute('aria-label') || 'button';
    }

    if (label && clicks.length < 30) clicks.push(label);

    if (target.tagName === 'A' && target.hostname === window.location.hostname && !target.hash) {
      store.set(NAV_KEY, 'true');
    }
  }, true);

  // --- Page data save ---
  function savePageData() {
    var dur = Math.round((Date.now() - pageStart) / 1000);
    var j = store.json(JOURNEY_KEY) || [];
    var idx = j.length - 1;
    if (idx >= 0) {
      j[idx].duration = dur;
      j[idx].scrollDepth = maxScroll;
      j[idx].clicks = clicks;
      store.save(JOURNEY_KEY, j);
    }
    return j;
  }

  // --- Session end ---
  var sessionEndSent = false;

  function sendSessionEnd() {
    if (sessionEndSent) return;
    sessionEndSent = true;
    var j = savePageData();
    var isNav = store.get(NAV_KEY) === 'true';
    if (!isNav) {
      send('session_end', {
        journey: j,
        totalDuration: j.reduce(function (sum, p) { return sum + (p.duration || 0); }, 0),
        referrer: store.get(REF_KEY) || null,
      });
    }
  }

  window.addEventListener('beforeunload', sendSessionEnd);
  window.addEventListener('pagehide', function (e) {
    if (!e.persisted) { sendSessionEnd(); } else { savePageData(); }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') savePageData();
  });
})();
