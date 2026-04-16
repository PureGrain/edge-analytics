-- Edge Analytics — D1 schema
-- Run: wrangler d1 execute <DB_NAME> --file=schema/schema.sql

CREATE TABLE IF NOT EXISTS sessions (
  session_id   TEXT PRIMARY KEY,
  ip           TEXT,
  country      TEXT,
  city         TEXT,
  region       TEXT,
  continent    TEXT,
  latitude     REAL,
  longitude    REAL,
  postal_code  TEXT,
  timezone_cf  TEXT,
  asn          TEXT,
  isp          TEXT,
  tls_version  TEXT,
  http_protocol TEXT,
  browser      TEXT,
  browser_version TEXT,
  os           TEXT,
  device       TEXT,
  screen_width  INTEGER,
  screen_height INTEGER,
  viewport_width  INTEGER,
  viewport_height INTEGER,
  language     TEXT,
  timezone     TEXT,
  dark_mode    INTEGER DEFAULT 0,
  referrer     TEXT,
  landing_page TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_content  TEXT,
  is_bot       INTEGER DEFAULT 0,
  journey      TEXT,
  total_duration INTEGER,
  total_pages  INTEGER,
  started_at   TEXT DEFAULT (datetime('now')),
  ended_at     TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL,
  event_name   TEXT NOT NULL,
  event_data   TEXT,
  page         TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_country    ON sessions(country);
CREATE INDEX IF NOT EXISTS idx_sessions_bot        ON sessions(is_bot);
CREATE INDEX IF NOT EXISTS idx_sessions_landing    ON sessions(landing_page);
CREATE INDEX IF NOT EXISTS idx_events_name         ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_session      ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at   ON events(created_at DESC);
