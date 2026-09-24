import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listTracks } from '@/db/repo';
import { coverUrl } from './covers';

describe('coverUrl', () => {
  const dir = path.join(process.cwd(), 'public', 'covers');

  it('has one committed cover per seeded track', () => {
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.webp'))).toHaveLength(40);
  });

  it('points at a file that exists for every track', () => {
    for (const track of listTracks()) {
      expect(fs.existsSync(path.join(process.cwd(), 'public', coverUrl(track.id)))).toBe(true);
    }
  });
});
