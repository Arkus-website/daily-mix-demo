import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../src/db/client';
import { seedDatabase, type SeedFile } from '../src/db/seed';
import { today } from '../src/lib/clock';

const seed = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'seed.json'), 'utf8')) as SeedFile;
const day = today();
seedDatabase(getDb(), seed, day);
console.log(`Seeded ${seed.users.length} users, ${seed.tracks.length} tracks, ${seed.plays.length} plays (today = ${day}).`);
