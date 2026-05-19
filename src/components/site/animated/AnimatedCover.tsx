import { generateSrcSet, getR2VariantDirectUrl } from '@/lib/images';

const FALLBACK_TONE_COUNT = 6;

function getFallbackTone(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % FALLBACK_TONE_COUNT;
  }
  return String(hash);
}

interface AnimatedCoverProps {
  assetId: string | null;
  alt: string;
  width?: number | null;
  height?: number | null;
  priority?: boolean;
  sizes?: string;
  seed: string;
}

export function AnimatedCover({
  assetId,
  alt,
  width,
  height,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  seed,
}: AnimatedCoverProps) {
  return (
    <div className="animated-cover-panel" style={{ aspectRatio: '3 / 4', minHeight: 0 }}>
      {assetId ? (
        <img
          src={getR2VariantDirectUrl(assetId, 'medium')}
          srcSet={generateSrcSet(assetId)}
          sizes={sizes}
          alt={alt}
          width={width ?? 1200}
          height={height ?? 1600}
          className="h-full w-full object-cover object-center"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
        />
      ) : (
        <div
          className="animated-cover-fallback"
          data-testid="animated-cover-fallback"
          data-tone={getFallbackTone(seed)}
          role="img"
          aria-label={alt}
        />
      )}
      <div className="animated-cover-grid" aria-hidden="true" />
      <div className="animated-cover-flare" aria-hidden="true" />
    </div>
  );
}
