# Edge Analytics

Privacy-first, zero-infrastructure web analytics built on Cloudflare Workers + D1.

**What it does:**
- Tracks sessions, page journeys, scroll depth, clicks, device & geo data
- Captures UTM parameters for campaign attribution
- Supports custom conversion events (form submits, phone clicks, etc.)
- Optional Discord alerts on visitor arrival and session end
- Admin dashboard served from the Worker itself — no separate hosting needed
- Respects Do Not Track / Global Privacy Control
- No cookies, no third-party services, runs entirely on Cloudflare free tier

---

## Setup

### 1. Create D1 database

```bash
wrangler d1 create edge-analytics
```

Copy the `database_id` from the output into `wrangler.toml`.

### 2. Apply schema

```bash
wrangler d1 execute edge-analytics --file=schema/schema.sql
```

### 3. Configure wrangler.toml

Edit `wrangler.toml`:
- Set `SITE_NAME` to your site name
- Set `ALLOWED_ORIGIN` to your site's domain (comma-separated for multiple)
- Set `database_id` from step 1

### 4. Set secrets

```bash
wrangler secret put ANALYTICS_KEY     # your dashboard password / Bearer token
wrangler secret put DISCORD_WEBHOOK   # optional: Discord webhook URL
```

### 5. Deploy

```bash
wrangler deploy
```

---

## Add tracking to your site

Include the snippet before `</body>`:

```html
<script>
window.EDGE_ANALYTICS_CONFIG = {
  trackUrl: 'https://your-worker.workers.dev/track',
};
</script>
<script src="/js/analytics.js"></script>
```

For same-origin deployments (Pages Functions or Worker serving static files), `trackUrl` can be omitted — it defaults to `/track`.

### Conversion events

Call `window.edgeTrack()` from your own JavaScript:

```javascript
// Track a form submission
window.edgeTrack('form_submit', { service: 'lawn-care' });

// Track a phone number click
document.querySelectorAll('a[href^="tel:"]').forEach(el => {
  el.addEventListener('click', () => window.edgeTrack('phone_click'));
});
```

---

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/track` | Ingest analytics events |
| `GET` | `/analytics` | JSON analytics API (Bearer auth) |
| `GET` | `/analytics/dashboard` | Admin dashboard UI |

### Query API

```bash
curl https://your-worker.workers.dev/analytics?range=7d \
  -H "Authorization: Bearer YOUR_ANALYTICS_KEY"
```

Range options: `today`, `7d` (default), `30d`, `all`

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANALYTICS_KEY` | Yes (secret) | Bearer token for API and dashboard auth |
| `DISCORD_WEBHOOK` | No (secret) | Discord webhook for arrival/session alerts |
| `ALLOWED_ORIGIN` | Yes (var) | CORS origin(s), comma-separated |
| `SITE_NAME` | No (var) | Display name in Discord embeds and dashboard |
| `DISCORD_CONVERSIONS` | No (var) | Set `"true"` to fire Discord alerts for conversions |

---

## Data collected

**Per session:**
- IP address (stored, not exposed in dashboard)
- Country, city, region (from Cloudflare edge)
- ISP / ASN
- Browser, OS, device type
- Screen & viewport dimensions
- Language, timezone, dark mode preference
- Referrer URL
- Landing page
- UTM parameters (source, medium, campaign, content)
- Page journey (pages visited, time on each, scroll depth, clicks)
- Total session duration

**Conversion events:**
- Event name, optional data payload, page URL, timestamp

---

## Owner opt-out

Open your browser console on your own site and run:

```javascript
localStorage.setItem('_ea_notrack', '1');
```
