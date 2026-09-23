import type Database from 'better-sqlite3';
import { addDays } from '@/lib/clock';
import type { PlayContext, Track, User } from '@/lib/types';

export type SeedFile = {
  users: User[];
  tracks: Track[];
  // Plays are stored relative to the seeding day so the history always ends "recently".
  plays: { id: string; userId: string; trackId: string; dayOffset: number; time: string; completed: boolean; context: PlayContext }[];
};

/** Replaces all data with the seed file, resolving play offsets against `today` (YYYY-MM-DD). */
export function seedDatabase(db: Database.Database, seed: SeedFile, today: string): void {
  const insertUser = db.prepare(
    'INSERT INTO users (id, display_name, email, plan, country) VALUES (@id, @displayName, @email, @plan, @country)',
  );
  const insertTrack = db.prepare(
    'INSERT INTO tracks (id, title, artist, album, duration_ms, artwork_hue) VALUES (@id, @title, @artist, @album, @durationMs, @artworkHue)',
  );
  const insertPlay = db.prepare(
    'INSERT INTO plays (id, user_id, track_id, played_at, completed, context) VALUES (?, ?, ?, ?, ?, ?)',
  );

  db.transaction(() => {
    db.exec('DELETE FROM saved_mixes; DELETE FROM daily_mixes; DELETE FROM plays; DELETE FROM tracks; DELETE FROM users;');
    seed.users.forEach((u) => insertUser.run(u));
    seed.tracks.forEach((t) => insertTrack.run(t));
    for (const p of seed.plays) {
      const playedAt = `${addDays(today, -p.dayOffset)}T${p.time}`;
      insertPlay.run(p.id, p.userId, p.trackId, playedAt, p.completed ? 1 : 0, p.context);
    }
  })();
}
