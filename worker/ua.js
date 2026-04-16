// User-Agent parser — browser, OS, device type, bot detection

export function parseUserAgent(ua) {
  const result = { name: 'Unknown', version: '', os: 'Unknown', device: 'Desktop' };
  if (!ua) return result;

  // Bot detection (check first)
  if (/bot|crawl|spider|slurp|Bingbot|Googlebot|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot/i.test(ua)) {
    return { name: 'Bot', version: '', os: 'Bot', device: 'Bot' };
  }

  // Device type
  if (/iPad|Tablet|PlayBook|Silk/.test(ua)) {
    result.device = 'Tablet';
  } else if (/Mobile|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/.test(ua)) {
    result.device = 'Mobile';
  }

  // OS
  if (/Windows NT/.test(ua))          result.os = 'Windows';
  else if (/Mac OS X|macOS/.test(ua)) result.os = 'macOS';
  else if (/CrOS/.test(ua))           result.os = 'ChromeOS';
  else if (/Android/.test(ua))        result.os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) result.os = 'iOS';
  else if (/Linux/.test(ua))          result.os = 'Linux';

  // Browser (order matters — check specific tokens first)
  let m;
  if      ((m = ua.match(/Edg\/(\d+)/)))          { result.name = 'Edge';    result.version = m[1]; }
  else if ((m = ua.match(/OPR\/(\d+)/)))           { result.name = 'Opera';   result.version = m[1]; }
  else if ((m = ua.match(/Vivaldi\/(\d+\.\d+)/))) { result.name = 'Vivaldi'; result.version = m[1]; }
  else if ((m = ua.match(/Firefox\/(\d+)/)))       { result.name = 'Firefox'; result.version = m[1]; }
  else if ((m = ua.match(/Chrome\/(\d+)/)))        { result.name = 'Chrome';  result.version = m[1]; }
  else if (/Safari\//.test(ua) && (m = ua.match(/Version\/(\d+)/))) { result.name = 'Safari'; result.version = m[1]; }

  return result;
}
