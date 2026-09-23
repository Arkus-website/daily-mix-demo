import seed from '../../data/seed.json';
import { getDb } from '@/db/client';
import { seedDatabase, type SeedFile } from '@/db/seed';
import { setClock, today } from '@/lib/clock';

// Each test file gets its own in-memory database, seeded against a fixed "now".
process.env.DM_DB_PATH = ':memory:';
setClock(() => new Date('2026-09-23T19:00:00Z'));
seedDatabase(getDb(), seed as SeedFile, today());
