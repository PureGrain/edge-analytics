// Edge Analytics — Cloudflare Worker entry point
//
// Routes:
//   POST /track                  — ingest analytics events
//   GET  /analytics              — query analytics data (auth required)
//   GET  /analytics/dashboard    — admin dashboard UI (auth via key prompt)
//   OPTIONS *                    — CORS preflight

import { handleTrack }     from './tracker.js';
import { handleQuery }     from './query.js';
import { handleDashboard } from './dashboard.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, method } = url;

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (method === 'POST' && pathname === '/track') {
      return handleTrack(request, env, ctx);
    }

    if (method === 'GET' && pathname === '/analytics/dashboard') {
      return handleDashboard(request, env);
    }

    if (method === 'GET' && pathname === '/analytics') {
      return handleQuery(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};
