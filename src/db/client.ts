import path from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'premium')),
  country TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  artwork_hue INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  track_id TEXT NOT NULL REFERENCES tracks(id),
  played_at TEXT NOT NULL,
  completed INTEGER NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('late_night', 'commute', 'workout', 'focus', 'other'))
);
CREATE INDEX IF NOT EXISTS plays_user ON plays (user_id, played_at);
CREATE TABLE IF NOT EXISTS daily_mixes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  mix_date TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, mix_date)
);
CREATE TABLE IF NOT EXISTS saved_mixes (
  user_id TEXT NOT NULL REFERENCES users(id),
  mix_id TEXT NOT NULL REFERENCES daily_mixes(id),
  saved_at TEXT NOT NULL,
  PRIMARY KEY (user_id, mix_id)
);
CREATE TABLE IF NOT EXISTS mix_shares (
  token TEXT PRIMARY KEY,
  mix_id TEXT NOT NULL UNIQUE REFERENCES daily_mixes(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
`;

let db: Database.Database | null = null;

/** One connection per process. DM_DB_PATH overrides the default file (tests use ':memory:'). */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(process.env.DM_DB_PATH ?? path.join(process.cwd(), 'data', 'app.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
  }
  return db;
}
