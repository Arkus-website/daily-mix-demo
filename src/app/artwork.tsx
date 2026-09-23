/** Generated cover art: a colour block derived from the track's hue. */
export function Artwork({ hue, size = 'md' }: { hue: number; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'h-28 w-28' : 'h-14 w-14';
  return (
    <div
      aria-hidden
      className={`${dims} shrink-0 rounded-md shadow-lg`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 60% 25%))` }}
    />
  );
}
