// POST /track — ingest analytics events, enrich with CF edge data, store to D1
// Events: session_start, session_end, conversion

import { parseUserAgent } from './ua.js';
import { sendArrivalAlert, sendSessionSummary, sendConversionAlert } from './discord.js';

export async function handleTrack(request, env, ctx) {
  const corsHeaders = getCorsHeaders(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400, headers: corsHeaders });
  }

  if (!body.event || !body.sessionId) {
    return new Response(null, { status: 400, headers: corsHeaders });
  }

  // Enrich with Cloudflare edge data
  const cf = request.cf || {};
  const enriched = {
    ...body,
    ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown',
    geo: {
      country:    cf.country     || 'unknown',
      city:       cf.city        || 'unknown',
      region:     cf.region      || 'unknown',
      continent:  cf.continent   || 'unknown',
      latitude:   cf.latitude,
      longitude:  cf.longitude,
      postalCode: cf.postalCode,
      timezone:   cf.timezone,
    },
    network: {
      asn:            cf.asn,
      asOrganization: cf.asOrganization,
      tlsVersion:     cf.tlsVersion,
      httpProtocol:   cf.httpProtocol,
    },
    browser: parseUserAgent(request.headers.get('user-agent') || ''),
  };

  const tasks = [];
  const webhook = env.DISCORD_WEBHOOK;
  const siteName = env.SITE_NAME || '';

  if (body.event === 'session_start') {
    if (webhook) tasks.push(sendArrivalAlert(webhook, enriched, siteName).catch(() => {}));
    if (env.DB)  tasks.push(storeSessionStart(env.DB, enriched).catch(() => {}));

  } else if (body.event === 'session_end') {
    if (webhook) tasks.push(sendSessionSummary(webhook, enriched, siteName).catch(() => {}));
    if (env.DB)  tasks.push(storeSessionEnd(env.DB, enriched).catch(() => {}));

  } else if (body.event === 'conversion') {
    if (webhook && env.DISCORD_CONVERSIONS === 'true') {
      tasks.push(sendConversionAlert(webhook, enriched, siteName).catch(() => {}));
    }
    if (env.DB)  tasks.push(storeConversion(env.DB, enriched).catch(() => {}));
  }

  if (tasks.length > 0) ctx.waitUntil(Promise.allSettled(tasks));

  return new Response(null, { status: 204, headers: corsHeaders });
}

// --- D1 Storage ---

async function storeSessionStart(db, data) {
  const b = data.browser;
  const g = data.geo;
  const n = data.network;

  await db.prepare(`
    INSERT OR IGNORE INTO sessions (
      session_id, ip,
      country, city, region, continent,
      latitude, longitude, postal_code, timezone_cf,
      asn, isp, tls_version, http_protocol,
      browser, browser_version, os, device,
      screen_width, screen_height, viewport_width, viewport_height,
      language, timezone, dark_mode,
      referrer, landing_page,
      utm_source, utm_medium, utm_campaign, utm_content,
      is_bot, started_at
    ) VALUES (
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, datetime('now')
    )
  `).bind(
    data.sessionId, data.ip,
    g.country, g.city, g.region, g.continent,
    g.latitude || null, g.longitude || null, g.postalCode || null, g.timezone || null,
    n.asn || null, n.asOrganization || null, n.tlsVersion || null, n.httpProtocol || null,
    b.name, b.version, b.os, b.device,
    data.screen?.width || null, data.screen?.height || null,
    data.viewport?.width || null, data.viewport?.height || null,
    data.language || null, data.timezone || null,
    data.darkMode ? 1 : 0,
    data.referrer || null, data.page || '/',
    data.utmSource || null, data.utmMedium || null,
    data.utmCampaign || null, data.utmContent || null,
    b.device === 'Bot' ? 1 : 0
  ).run();
}

async function storeSessionEnd(db, data) {
  await db.prepare(`
    UPDATE sessions
    SET journey = ?, total_duration = ?, total_pages = ?, ended_at = datetime('now')
    WHERE session_id = ?
  `).bind(
    JSON.stringify(data.journey || []),
    data.totalDuration || 0,
    data.journey?.length || 0,
    data.sessionId
  ).run();
}

async function storeConversion(db, data) {
  await db.prepare(`
    INSERT INTO events (session_id, event_name, event_data, page)
    VALUES (?, ?, ?, ?)
  `).bind(
    data.sessionId,
    data.eventName || 'unknown',
    data.eventData ? JSON.stringify(data.eventData) : null,
    data.page || null
  ).run();
}

// --- CORS ---

function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim());
  const match = allowed.includes('*') || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': match ? origin || '*' : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
