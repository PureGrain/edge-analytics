// GET /analytics — query analytics data
// Auth: Authorization: Bearer <ANALYTICS_KEY>
// Query params: ?range=today|7d|30d|all (default: 7d)

export async function handleQuery(request, env) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const json = (data, status = 200) => new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

  // Auth
  const auth = request.headers.get('Authorization') || '';
  if (!env.ANALYTICS_KEY || auth !== `Bearer ${env.ANALYTICS_KEY}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (!env.DB) return json({ error: 'Database not configured' }, 503);

  const url = new URL(request.url);
  const range = url.searchParams.get('range') || '7d';
  const after = rangeStart(range); // SQL literal like datetime('now', '-7 days')

  try {
    const db = env.DB;

    const [
      total, unique, avgDuration, avgPages, bots,
      topPages, topCountries, topReferrers,
      browsers, devices, utmSources,
      conversions, recent,
    ] = await Promise.all([
      db.prepare(`SELECT COUNT(*) as n FROM sessions WHERE is_bot = 0 AND started_at >= ${after}`).first(),
      db.prepare(`SELECT COUNT(DISTINCT ip) as n FROM sessions WHERE is_bot = 0 AND started_at >= ${after}`).first(),
      db.prepare(`SELECT AVG(total_duration) as n FROM sessions WHERE is_bot = 0 AND total_duration > 0 AND started_at >= ${after}`).first(),
      db.prepare(`SELECT AVG(total_pages) as n FROM sessions WHERE is_bot = 0 AND total_pages > 0 AND started_at >= ${after}`).first(),
      db.prepare(`SELECT COUNT(*) as n FROM sessions WHERE is_bot = 1 AND started_at >= ${after}`).first(),

      db.prepare(`SELECT landing_page as label, COUNT(*) as n FROM sessions WHERE is_bot = 0 AND landing_page IS NOT NULL AND started_at >= ${after} GROUP BY landing_page ORDER BY n DESC LIMIT 10`).all(),
      db.prepare(`SELECT country as label, COUNT(*) as n FROM sessions WHERE is_bot = 0 AND country IS NOT NULL AND started_at >= ${after} GROUP BY country ORDER BY n DESC LIMIT 10`).all(),
      db.prepare(`SELECT COALESCE(referrer, '') as label, COUNT(*) as n FROM sessions WHERE is_bot = 0 AND started_at >= ${after} GROUP BY referrer ORDER BY n DESC LIMIT 10`).all(),
      db.prepare(`SELECT browser as label, COUNT(*) as n FROM sessions WHERE is_bot = 0 AND browser IS NOT NULL AND started_at >= ${after} GROUP BY browser ORDER BY n DESC LIMIT 8`).all(),
      db.prepare(`SELECT device as label, COUNT(*) as n FROM sessions WHERE is_bot = 0 AND device IS NOT NULL AND started_at >= ${after} GROUP BY device ORDER BY n DESC`).all(),
      db.prepare(`SELECT COALESCE(utm_source, '(direct)') as label, COUNT(*) as n FROM sessions WHERE is_bot = 0 AND started_at >= ${after} GROUP BY utm_source ORDER BY n DESC LIMIT 10`).all(),

      db.prepare(`
        SELECT e.event_name as label, COUNT(*) as n
        FROM events e
        JOIN sessions s ON s.session_id = e.session_id
        WHERE s.is_bot = 0 AND e.created_at >= ${after}
        GROUP BY e.event_name ORDER BY n DESC LIMIT 20
      `).all(),

      db.prepare(`
        SELECT session_id, country, city, browser, os, device,
               landing_page, total_duration, total_pages, started_at, ended_at,
               utm_source, utm_medium, utm_campaign
        FROM sessions WHERE is_bot = 0 AND started_at >= ${after}
        ORDER BY started_at DESC LIMIT 25
      `).all(),
    ]);

    return json({
      range,
      summary: {
        sessions:    total.n    || 0,
        uniqueIPs:   unique.n   || 0,
        avgDuration: Math.round(avgDuration.n || 0),
        avgPages:    Math.round((avgPages.n || 0) * 10) / 10,
        bots:        bots.n     || 0,
      },
      topPages:       topPages.results     || [],
      topCountries:   topCountries.results || [],
      topReferrers:   formatReferrers(topReferrers.results || []),
      browsers:       browsers.results     || [],
      devices:        devices.results      || [],
      utmSources:     utmSources.results   || [],
      conversions:    conversions.results  || [],
      recentSessions: recent.results       || [],
    });
  } catch (err) {
    return json({ error: 'Query failed', detail: err.message }, 500);
  }
}

// --- Helpers ---

function rangeStart(range) {
  if (range === 'today') return `date('now')`;
  if (range === '7d')    return `datetime('now', '-7 days')`;
  if (range === '30d')   return `datetime('now', '-30 days')`;
  return `'2000-01-01'`; // all time
}

function formatReferrers(rows) {
  return rows.map(r => ({
    label: r.label ? parseReferrerHost(r.label) : 'Direct',
    n: r.n,
  }));
}

function parseReferrerHost(ref) {
  if (!ref) return 'Direct';
  try { return new URL(ref).hostname; } catch { return ref.slice(0, 50); }
}
