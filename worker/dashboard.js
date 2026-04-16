// GET /analytics/dashboard — serve admin dashboard HTML
// Auth: ?key=ANALYTICS_KEY (stored in sessionStorage after first entry)

export function handleDashboard(request, env) {
  const siteName = env.SITE_NAME || 'Analytics';
  const html = buildDashboardHtml(siteName);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function buildDashboardHtml(siteName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${siteName} — Analytics</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh}
a{color:inherit;text-decoration:none}

/* Auth overlay */
#auth{position:fixed;inset:0;background:#0f1117;display:flex;align-items:center;justify-content:center;z-index:100}
#auth.hidden{display:none}
.auth-box{background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;padding:40px;width:100%;max-width:360px;text-align:center}
.auth-box h2{font-size:1.2rem;margin-bottom:8px;color:#f1f5f9}
.auth-box p{font-size:.85rem;color:#94a3b8;margin-bottom:24px}
.auth-box input{width:100%;padding:10px 14px;background:#0f1117;border:1px solid #374151;border-radius:8px;color:#e2e8f0;font-size:.9rem;outline:none}
.auth-box input:focus{border-color:#6366f1}
.auth-box button{margin-top:12px;width:100%;padding:10px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:.9rem;cursor:pointer}
.auth-box button:hover{background:#4f46e5}
.auth-error{color:#f87171;font-size:.8rem;margin-top:8px;min-height:1.2em}

/* Layout */
#app{display:none;padding:24px;max-width:1400px;margin:0 auto}
#app.visible{display:block}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:gap}
header h1{font-size:1.2rem;font-weight:600;color:#f1f5f9}
header h1 span{color:#6366f1}

/* Range buttons */
.range-btns{display:flex;gap:4px;background:#1a1f2e;border:1px solid #2d3748;border-radius:8px;padding:4px}
.range-btn{padding:5px 14px;border-radius:6px;border:none;background:transparent;color:#94a3b8;cursor:pointer;font-size:.8rem;transition:.15s}
.range-btn.active,.range-btn:hover{background:#374151;color:#f1f5f9}
.range-btn.active{background:#6366f1;color:#fff}

/* Stat cards */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.card{background:#1a1f2e;border:1px solid #2d3748;border-radius:10px;padding:18px 20px}
.card-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:6px}
.card-value{font-size:1.8rem;font-weight:700;color:#f1f5f9}
.card-sub{font-size:.75rem;color:#94a3b8;margin-top:4px}

/* Grid sections */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}
@media(max-width:900px){.grid-2,.grid-3{grid-template-columns:1fr}}
.section{background:#1a1f2e;border:1px solid #2d3748;border-radius:10px;padding:18px}
.section h3{font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:14px}

/* Bar list */
.bar-list{display:flex;flex-direction:column;gap:8px}
.bar-row{display:flex;align-items:center;gap:10px}
.bar-label{font-size:.82rem;color:#cbd5e1;min-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 0 110px}
.bar-label.wide{flex:0 0 160px;min-width:160px}
.bar-track{flex:1;background:#0f1117;border-radius:4px;height:6px;overflow:hidden}
.bar-fill{height:100%;background:#6366f1;border-radius:4px;transition:width .4s ease}
.bar-count{font-size:.78rem;color:#94a3b8;min-width:36px;text-align:right}

/* Conversion pills */
.pills{display:flex;flex-wrap:wrap;gap:8px}
.pill{background:#2d3748;border-radius:20px;padding:5px 12px;font-size:.8rem;display:flex;align-items:center;gap:6px}
.pill-name{color:#e2e8f0}
.pill-count{background:#6366f1;border-radius:10px;padding:1px 7px;font-size:.72rem;color:#fff;font-weight:600}

/* Sessions table */
.table-wrap{overflow-x:auto;margin-bottom:24px}
table{width:100%;border-collapse:collapse;font-size:.8rem}
thead th{background:#1a1f2e;padding:10px 12px;text-align:left;color:#64748b;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #2d3748;white-space:nowrap}
tbody tr{border-bottom:1px solid #1e2433}
tbody tr:hover{background:#1a1f2e}
tbody td{padding:10px 12px;color:#cbd5e1;vertical-align:middle}
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:.7rem;font-weight:500}
.badge-mobile{background:#1e3a5f;color:#60a5fa}
.badge-desktop{background:#1a2e1a;color:#4ade80}
.badge-tablet{background:#3b2f1a;color:#fbbf24}
.badge-bot{background:#3b1a1a;color:#f87171}

/* Loading / empty */
.loading{color:#64748b;font-size:.85rem;text-align:center;padding:40px}
.empty{color:#475569;font-size:.82rem;font-style:italic}

/* Footer */
footer{text-align:center;color:#334155;font-size:.72rem;margin-top:32px;padding-top:16px;border-top:1px solid #1e2433}
</style>
</head>
<body>

<!-- Auth overlay -->
<div id="auth">
  <div class="auth-box">
    <h2>Edge Analytics</h2>
    <p>${siteName}</p>
    <input type="password" id="keyInput" placeholder="Analytics key" autocomplete="current-password">
    <button onclick="submitKey()">Sign in</button>
    <div class="auth-error" id="authError"></div>
  </div>
</div>

<!-- Dashboard -->
<div id="app">
  <header>
    <h1>Edge Analytics <span>/ ${siteName}</span></h1>
    <div style="display:flex;align-items:center;gap:12px">
      <div class="range-btns">
        <button class="range-btn" onclick="setRange('today')">Today</button>
        <button class="range-btn active" onclick="setRange('7d')">7d</button>
        <button class="range-btn" onclick="setRange('30d')">30d</button>
        <button class="range-btn" onclick="setRange('all')">All</button>
      </div>
      <button onclick="signOut()" style="background:none;border:none;color:#475569;cursor:pointer;font-size:.8rem">Sign out</button>
    </div>
  </header>

  <div class="cards" id="cards">
    <div class="card"><div class="card-label">Sessions</div><div class="card-value" id="statSessions">—</div><div class="card-sub" id="statBots"></div></div>
    <div class="card"><div class="card-label">Unique IPs</div><div class="card-value" id="statIPs">—</div></div>
    <div class="card"><div class="card-label">Avg Duration</div><div class="card-value" id="statDuration">—</div></div>
    <div class="card"><div class="card-label">Avg Pages</div><div class="card-value" id="statPages">—</div></div>
  </div>

  <div class="grid-2">
    <div class="section"><h3>Top Pages</h3><div id="topPages" class="bar-list"></div></div>
    <div class="section"><h3>Top Countries</h3><div id="topCountries" class="bar-list"></div></div>
  </div>

  <div class="grid-3">
    <div class="section"><h3>Referrers</h3><div id="topReferrers" class="bar-list"></div></div>
    <div class="section"><h3>Browsers</h3><div id="browsers" class="bar-list"></div></div>
    <div class="section"><h3>Devices</h3><div id="devices" class="bar-list"></div></div>
  </div>

  <div class="grid-2">
    <div class="section"><h3>UTM Sources</h3><div id="utmSources" class="bar-list"></div></div>
    <div class="section"><h3>Conversions</h3><div id="conversions" class="pills"></div></div>
  </div>

  <div class="section" style="margin-bottom:16px">
    <h3>Recent Sessions</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Location</th>
            <th>Browser / OS</th>
            <th>Device</th>
            <th>Landing Page</th>
            <th>Pages</th>
            <th>Duration</th>
            <th>UTM Source</th>
          </tr>
        </thead>
        <tbody id="sessionTable"></tbody>
      </table>
    </div>
  </div>

  <footer>Edge Analytics &bull; Powered by Cloudflare Workers + D1</footer>
</div>

<script>
(function() {
  var API = window.location.origin + '/analytics';
  var key = '';
  var range = '7d';

  // --- Auth ---
  var stored = sessionStorage.getItem('ea_key');
  if (stored) { key = stored; load(); }

  document.getElementById('keyInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitKey();
  });

  window.submitKey = function() {
    key = document.getElementById('keyInput').value.trim();
    if (!key) return;
    document.getElementById('authError').textContent = '';
    load();
  };

  window.signOut = function() {
    sessionStorage.removeItem('ea_key');
    key = '';
    document.getElementById('auth').classList.remove('hidden');
    document.getElementById('app').classList.remove('visible');
  };

  window.setRange = function(r) {
    range = r;
    document.querySelectorAll('.range-btn').forEach(function(b) {
      b.classList.toggle('active', b.textContent === (r === '7d' ? '7d' : r === 'today' ? 'Today' : r === '30d' ? '30d' : 'All'));
    });
    load();
  };

  async function load() {
    try {
      var res = await fetch(API + '?range=' + range, {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (res.status === 401) {
        document.getElementById('authError').textContent = 'Invalid key.';
        return;
      }
      var data = await res.json();
      sessionStorage.setItem('ea_key', key);
      document.getElementById('auth').classList.add('hidden');
      document.getElementById('app').classList.add('visible');
      render(data);
    } catch (e) {
      document.getElementById('authError').textContent = 'Connection failed.';
    }
  }

  function render(d) {
    var s = d.summary || {};
    set('statSessions', fmt(s.sessions));
    set('statIPs', fmt(s.uniqueIPs));
    set('statDuration', fmtDur(s.avgDuration));
    set('statPages', s.avgPages || '0');
    set('statBots', s.bots ? s.bots + ' bots filtered' : '');

    renderBars('topPages',     d.topPages,     true);
    renderBars('topCountries', d.topCountries, false);
    renderBars('topReferrers', d.topReferrers, false);
    renderBars('browsers',     d.browsers,     false);
    renderBars('devices',      d.devices,      false);
    renderBars('utmSources',   d.utmSources,   false);

    renderConversions(d.conversions || []);
    renderTable(d.recentSessions || []);
  }

  function renderBars(id, rows, wide) {
    var el = document.getElementById(id);
    if (!rows || !rows.length) { el.innerHTML = '<div class="empty">No data</div>'; return; }
    var max = rows[0].n || 1;
    el.innerHTML = rows.map(function(r) {
      var pct = Math.round((r.n / max) * 100);
      return '<div class="bar-row">' +
        '<div class="bar-label' + (wide ? ' wide' : '') + '" title="' + esc(r.label) + '">' + esc(r.label || '—') + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="bar-count">' + fmt(r.n) + '</div>' +
        '</div>';
    }).join('');
  }

  function renderConversions(rows) {
    var el = document.getElementById('conversions');
    if (!rows.length) { el.innerHTML = '<div class="empty">No conversion events recorded</div>'; return; }
    el.innerHTML = rows.map(function(r) {
      return '<div class="pill"><span class="pill-name">' + esc(r.label) + '</span><span class="pill-count">' + fmt(r.n) + '</span></div>';
    }).join('');
  }

  function renderTable(rows) {
    var tbody = document.getElementById('sessionTable');
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="8" class="loading">No sessions</td></tr>'; return; }
    tbody.innerHTML = rows.map(function(r) {
      var loc = [r.city, r.country].filter(Boolean).join(', ') || '—';
      var dev = r.device || 'Desktop';
      var badge = 'badge-' + dev.toLowerCase();
      return '<tr>' +
        '<td>' + fmtTime(r.started_at) + '</td>' +
        '<td>' + esc(loc) + '</td>' +
        '<td>' + esc((r.browser || '') + (r.os ? ' / ' + r.os : '')) + '</td>' +
        '<td><span class="badge ' + badge + '">' + esc(dev) + '</span></td>' +
        '<td>' + esc(r.landing_page || '/') + '</td>' +
        '<td>' + (r.total_pages || 1) + '</td>' +
        '<td>' + fmtDur(r.total_duration) + '</td>' +
        '<td>' + esc(r.utm_source || '—') + '</td>' +
        '</tr>';
    }).join('');
  }

  function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(n) { return (n || 0).toLocaleString(); }
  function fmtDur(s) {
    if (!s || s < 1) return '0s';
    if (s < 60) return Math.round(s) + 's';
    var m = Math.floor(s / 60), sec = Math.round(s % 60);
    return sec ? m + 'm ' + sec + 's' : m + 'm';
  }
  function fmtTime(ts) {
    if (!ts) return '—';
    try {
      var d = new Date(ts + (ts.endsWith('Z') ? '' : 'Z'));
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    } catch { return ts.slice(0, 16); }
  }
})();
</script>
</body>
</html>`;
}
