import Image from 'next/image';
import { coverUrl } from '@/lib/covers';

export function Cover({ trackId, className = '' }: { trackId: string; className?: string }) {
  return (
    <Image
      src={coverUrl(trackId)}
      alt=""
      width={600}
      height={600}
      draggable={false}
      loading="eager"
      className={`aspect-square shrink-0 object-cover shadow-lg shadow-black/40 ${className}`}
    />
  );
}

/** Three covers fanned out, the first one in front. */
export function CoverFan({ trackIds, size = 'md' }: { trackIds: string[]; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-14', md: 'w-24', lg: 'w-44' }[size];
  const side = { sm: 'w-11', md: 'w-20', lg: 'w-32' }[size];
  const [first, second, third] = trackIds;
  return (
    <div className="relative flex items-center justify-center">
      {second && <Cover trackId={second} className={`${side} -mr-6 -rotate-6 rounded-lg opacity-80`} />}
      <Cover trackId={first} className={`${dims} relative z-10 rounded-xl`} />
      {third && <Cover trackId={third} className={`${side} -ml-6 rotate-6 rounded-lg opacity-80`} />}
    </div>
  );
}
