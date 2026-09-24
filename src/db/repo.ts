import type { DailyMix, Play, PlayContext, Track, User } from '@/lib/types';
import { getDb } from './client';

type UserRow = { id: string; display_name: string; email: string; plan: User['plan']; country: string };
type TrackRow = { id: string; title: string; artist: string; album: string; duration_ms: number; artwork_hue: number };
type PlayRow = { id: string; user_id: string; track_id: string; played_at: string; completed: number; context: PlayContext };

const toUser = (r: UserRow): User => ({ id: r.id, displayName: r.display_name, email: r.email, plan: r.plan, country: r.country });
const toTrack = (r: TrackRow): Track => ({
  id: r.id,
  title: r.title,
  artist: r.artist,
  album: r.album,
  durationMs: r.duration_ms,
  artworkHue: r.artwork_hue,
});
const toPlay = (r: PlayRow): Play => ({
  id: r.id,
  userId: r.user_id,
  trackId: r.track_id,
  playedAt: r.played_at,
  completed: r.completed === 1,
  context: r.context,
});

// Users

export function listUsers(): User[] {
  return (getDb().prepare('SELECT * FROM users ORDER BY display_name').all() as UserRow[]).map(toUser);
}

export function findUser(id: string): User | null {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

// Catalogue and listening history

export function listTracks(): Track[] {
  return (getDb().prepare('SELECT * FROM tracks ORDER BY id').all() as TrackRow[]).map(toTrack);
}

export function listPlays(userId: string): Play[] {
  const rows = getDb().prepare('SELECT * FROM plays WHERE user_id = ? ORDER BY played_at').all(userId) as PlayRow[];
  return rows.map(toPlay);
}

/** The user's most recently played distinct tracks, newest first. */
export function listRecentTracks(userId: string, limit: number): Track[] {
  const rows = getDb()
    .prepare(
      `SELECT t.* FROM tracks t
       JOIN (SELECT track_id, MAX(played_at) AS last FROM plays WHERE user_id = ? GROUP BY track_id) p ON p.track_id = t.id
       ORDER BY p.last DESC, t.id LIMIT ?`,
    )
    .all(userId, limit) as TrackRow[];
  return rows.map(toTrack);
}

// Daily mixes

export function findMixForDate(userId: string, mixDate: string): DailyMix | null {
  const row = getDb()
    .prepare('SELECT payload_json FROM daily_mixes WHERE user_id = ? AND mix_date = ?')
    .get(userId, mixDate) as { payload_json: string } | undefined;
  return row ? (JSON.parse(row.payload_json) as DailyMix) : null;
}

export function findMix(id: string): DailyMix | null {
  const row = getDb().prepare('SELECT payload_json FROM daily_mixes WHERE id = ?').get(id) as
    | { payload_json: string }
    | undefined;
  return row ? (JSON.parse(row.payload_json) as DailyMix) : null;
}

/** Inserts the mix unless one already exists for that user and day. */
export function insertMix(mix: DailyMix, createdAt: string): void {
  getDb()
    .prepare(
      'INSERT OR IGNORE INTO daily_mixes (id, user_id, mix_date, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(mix.id, mix.userId, mix.mixDate, JSON.stringify(mix), createdAt);
}

// Saved mixes

export function isSaved(userId: string, mixId: string): boolean {
  return !!getDb().prepare('SELECT 1 FROM saved_mixes WHERE user_id = ? AND mix_id = ?').get(userId, mixId);
}

export function saveMix(userId: string, mixId: string, savedAt: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO saved_mixes (user_id, mix_id, saved_at) VALUES (?, ?, ?)')
    .run(userId, mixId, savedAt);
}

export function unsaveMix(userId: string, mixId: string): void {
  getDb().prepare('DELETE FROM saved_mixes WHERE user_id = ? AND mix_id = ?').run(userId, mixId);
}

export function listSavedMixes(userId: string): { mix: DailyMix; savedAt: string }[] {
  const rows = getDb()
    .prepare(
      `SELECT m.payload_json, s.saved_at FROM saved_mixes s
       JOIN daily_mixes m ON m.id = s.mix_id
       WHERE s.user_id = ? ORDER BY m.mix_date DESC`,
    )
    .all(userId) as { payload_json: string; saved_at: string }[];
  return rows.map((r) => ({ mix: JSON.parse(r.payload_json) as DailyMix, savedAt: r.saved_at }));
}

// Mix shares

/** The mix's active share token, or null if it has never been shared or was revoked. */
export function findShareToken(mixId: string): string | null {
  const row = getDb().prepare('SELECT token FROM mix_shares WHERE mix_id = ? AND revoked_at IS NULL').get(mixId) as
    | { token: string }
    | undefined;
  return row?.token ?? null;
}

/** Creates the mix's share row, replacing a revoked one so a mix can be re-shared under a fresh token. */
export function createShareToken(token: string, mixId: string, ownerId: string, createdAt: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO mix_shares (token, mix_id, owner_id, created_at, revoked_at) VALUES (?, ?, ?, ?, NULL)')
    .run(token, mixId, ownerId, createdAt);
}

export function revokeShare(mixId: string, revokedAt: string): void {
  getDb().prepare('UPDATE mix_shares SET revoked_at = ? WHERE mix_id = ?').run(revokedAt, mixId);
}

/** The shared mix for a token, or null if the token is unknown or its share was revoked. */
export function findMixByShareToken(token: string): DailyMix | null {
  const row = getDb()
    .prepare(
      `SELECT m.payload_json FROM mix_shares s
       JOIN daily_mixes m ON m.id = s.mix_id
       WHERE s.token = ? AND s.revoked_at IS NULL`,
    )
    .get(token) as { payload_json: string } | undefined;
  return row ? (JSON.parse(row.payload_json) as DailyMix) : null;
}
