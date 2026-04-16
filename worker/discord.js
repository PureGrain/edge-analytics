// Discord embed helpers — arrival alerts and session summaries

export async function sendArrivalAlert(webhookUrl, data, siteName) {
  const loc = locationString(data.geo);
  const b = data.browser;
  const isp = data.network?.asOrganization;
  const ts = discordTimestamp(data.timestamp);

  const embed = {
    title: `\uD83D\uDC41\uFE0F New Visitor${siteName ? ` — ${siteName}` : ''}`,
    color: 0x4f46e5,
    fields: [
      {
        name: '\uD83C\uDF10 Location',
        value: `${loc}${isp ? ` \u2022 ${isp}` : ''}${data.network?.asn ? ` (AS${data.network.asn})` : ''}`,
        inline: false,
      },
      {
        name: '\uD83D\uDCBB Device',
        value: `${b.name} ${b.version} \u2022 ${b.os} \u2022 ${b.device}`,
        inline: false,
      },
      {
        name: '\uD83D\uDD17 Referrer',
        value: parseReferrer(data.referrer),
        inline: true,
      },
      {
        name: '\uD83D\uDCC4 Landed on',
        value: data.page || '/',
        inline: true,
      },
      {
        name: '\uD83D\uDD52 Time',
        value: ts,
        inline: true,
      },
    ],
    footer: {
      text: `IP: ${maskIP(data.ip)} \u2022 Session: ${data.sessionId?.slice(0, 8)}`,
    },
    timestamp: new Date(data.timestamp || Date.now()).toISOString(),
  };

  // Add UTM row if present
  const utmParts = [];
  if (data.utmSource)   utmParts.push(`source: ${data.utmSource}`);
  if (data.utmMedium)   utmParts.push(`medium: ${data.utmMedium}`);
  if (data.utmCampaign) utmParts.push(`campaign: ${data.utmCampaign}`);
  if (utmParts.length > 0) {
    embed.fields.push({ name: '\uD83C\uDFF7\uFE0F UTM', value: utmParts.join(' \u2022 '), inline: false });
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

export async function sendSessionSummary(webhookUrl, data, siteName) {
  const loc = locationString(data.geo);
  const b = data.browser;
  const isp = data.network?.asOrganization;

  let journeyStr = 'No page data';
  if (data.journey?.length > 0) {
    journeyStr = data.journey.map((p, i) => {
      let line = `${i + 1}. **${p.page}** (${formatDuration(p.duration)}) \u2022 scrolled ${p.scrollDepth}%`;
      if (p.clicks?.length > 0) {
        line += '\n' + p.clicks.slice(0, 5).map(c => `\u2514 ${truncate(c, 40)}`).join('\n');
      }
      return line;
    }).join('\n');
  }

  const totalPages = data.journey?.length || 0;
  const screenStr = data.screen ? `${data.screen.width}\u00D7${data.screen.height}` : 'unknown';

  const fields = [
    { name: '\uD83C\uDF10 Location', value: `${loc}${isp ? ` \u2022 ${isp}` : ''}`, inline: false },
    { name: '\uD83D\uDCBB Device', value: `${b.name} ${b.version} \u2022 ${b.os} \u2022 ${b.device}`, inline: false },
    { name: '\uD83D\uDDFA\uFE0F Journey', value: truncate(journeyStr, 1024), inline: false },
    {
      name: '\uD83D\uDCCA Session',
      value: [
        `\u23F1 **${formatDuration(data.totalDuration || 0)}** \u2022 ${totalPages} page${totalPages !== 1 ? 's' : ''}`,
        `\uD83D\uDDA5 ${screenStr} \u2022 ${data.darkMode ? 'dark' : 'light'} \u2022 ${data.language || 'en'}`,
        `\uD83D\uDD17 Referrer: ${parseReferrer(data.referrer)}`,
      ].join('\n'),
      inline: false,
    },
  ];

  const embed = {
    title: `\uD83D\uDC4B Session Ended${siteName ? ` — ${siteName}` : ''}`,
    color: 0x10b981,
    fields,
    footer: { text: `IP: ${maskIP(data.ip)} \u2022 Session: ${data.sessionId?.slice(0, 8)}` },
    timestamp: new Date(data.timestamp || Date.now()).toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

export async function sendConversionAlert(webhookUrl, data, siteName) {
  const embed = {
    title: `\uD83C\uDFAF Conversion${siteName ? ` — ${siteName}` : ''}`,
    color: 0xf59e0b,
    fields: [
      { name: '\uD83D\uDCCC Event', value: data.eventName || 'unknown', inline: true },
      { name: '\uD83D\uDCC4 Page', value: data.page || '/', inline: true },
    ],
    footer: { text: `Session: ${data.sessionId?.slice(0, 8)}` },
    timestamp: new Date().toISOString(),
  };

  if (data.eventData) {
    try {
      const d = typeof data.eventData === 'string' ? JSON.parse(data.eventData) : data.eventData;
      const pairs = Object.entries(d).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join('\n');
      if (pairs) embed.fields.push({ name: 'Data', value: pairs, inline: false });
    } catch {}
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

// --- Helpers ---

function formatDuration(s) {
  if (!s || s < 1) return '0s';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

function locationString(geo) {
  if (!geo) return 'Unknown';
  const parts = [];
  if (geo.city && geo.city !== 'unknown') parts.push(geo.city);
  if (geo.region && geo.region !== 'unknown') parts.push(geo.region);
  if (geo.country && geo.country !== 'unknown') parts.push(geo.country);
  return parts.join(', ') || 'Unknown';
}

function discordTimestamp(ts) {
  return `<t:${Math.floor((ts || Date.now()) / 1000)}:t>`;
}

function parseReferrer(ref) {
  if (!ref) return 'Direct';
  try {
    const url = new URL(ref);
    return url.hostname + (url.pathname !== '/' ? url.pathname : '');
  } catch {
    return ref.slice(0, 60);
  }
}

function maskIP(ip) {
  return ip || 'unknown';
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}
