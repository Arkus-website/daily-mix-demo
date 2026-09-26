// Cover art is committed under public/covers, one 600×600 image per track id.
export function coverUrl(trackId: string): string {
  return `/covers/${trackId}.webp`;
}

/** Guest tracks on a shared mix carry no catalogue id (the public contract has none), so they have no cover file. */
export const GUEST_TRACK_PREFIX = 'shared-';

export function hasCover(trackId: string): boolean {
  return !trackId.startsWith(GUEST_TRACK_PREFIX);
}

/** Two-stop background tint for surfaces that sit behind a cover. */
export function coverGradient(hue: number): string {
  return `linear-gradient(180deg, hsl(${hue} 55% 32%) 0%, hsl(${(hue + 30) % 360} 45% 12%) 100%)`;
}
