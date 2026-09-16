'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { generateSrcSet, getR2VariantDirectUrl } from '@/lib/images';

interface Props {
  assetId: string;
  alt: string;
  width?: number | null;
  height?: number | null;
  priority?: boolean;
  className?: string;
  fit?: 'cover' | 'contain';
  sizes?: string;
  style?: CSSProperties;
  onReady?: () => void;
  onDimensions?: (width: number, height: number, source: 'preview' | 'full') => void;
}

// Key the inner component so a changed photo cannot reveal the previous image
// or finish an obsolete decode promise over the new preview.
export function ProgressiveImage(props: Props) {
  return <ImageLayers key={props.assetId} {...props} />;
}

function ImageLayers({ assetId, alt, width, height, priority = false, className = '',
  fit = 'cover', sizes = '100vw', style, onReady, onDimensions }: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const alive = useRef(true);
  const [enhance, setEnhance] = useState(false);
  const [near, setNear] = useState(priority);
  const [measuredSize, setMeasuredSize] = useState<string>();
  const [ready, setReady] = useState(false);
  // Missing backfill variants fail on the CDN, never through the site Worker.
  // Retry the legacy responsive set, then one final large image (bounded).
  const [failureStage, setFailureStage] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  const dimensionsCallback = useRef(onDimensions);
  dimensionsCallback.current = onDimensions;

  useEffect(() => {
    alive.current = true;
    const node = root.current;
    if (!node) return;
    const measure = () => {
      const box = node.getBoundingClientRect();
      if (!box.width) return;
      const ratio = width && height ? width / height : 1;
      // Cover can require more pixels than the element's width after cropping.
      const pixels = box.height && width && height
        ? (fit === 'cover' ? Math.max(box.width, box.height * ratio) : Math.min(box.width, box.height * ratio))
        : box.width;
      setMeasuredSize(`${Math.ceil(pixels)}px`);
    };
    measure();
    setEnhance(true);
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    resize?.observe(node);
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNear(true);
        observer?.disconnect();
      }
    }, { rootMargin: '250px' }) : null;
    if (priority || !observer) setNear(true);
    else observer.observe(node);
    return () => { alive.current = false; resize?.disconnect(); observer?.disconnect(); };
  }, [width, height, fit, priority]);

  const imageClass = `absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} object-center`;
  return (
    <span ref={root} className={`relative block overflow-hidden ${className}`} style={style} data-image-ready={ready}>
      <img
        src={previewFailed ? '/placeholder.svg' : getR2VariantDirectUrl(assetId, 'thumb')}
        alt={alt}
        width={width || undefined} height={height || undefined}
        loading={priority || near ? 'eager' : 'lazy'} decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        onError={() => setPreviewFailed(true)}
        onLoad={event => {
          const image = event.currentTarget;
          if (!previewFailed && dimensionsCallback.current && image.naturalWidth && image.naturalHeight) {
            dimensionsCallback.current(image.naturalWidth, image.naturalHeight, 'preview');
          }
        }}
        className={`${imageClass} opacity-100`}
      />
      {near && enhance && (
        <img
          src={getR2VariantDirectUrl(assetId, failureStage >= 2 ? 'large' : 'medium')}
          srcSet={failureStage >= 2 ? undefined : generateSrcSet(assetId, width, height, failureStage === 0)}
          sizes={measuredSize || sizes}
          alt="" aria-hidden="true"
          width={width || undefined} height={height || undefined}
          loading="eager" decoding="async" fetchPriority={priority ? 'high' : 'low'}
          onError={() => { setReady(false); setFailureStage(stage => Math.min(stage + 1, 2)); }}
          onLoad={async event => {
            const image = event.currentTarget;
            const decodedSrc = image.currentSrc || image.src;
            try { if (image.decode) await image.decode(); } catch { return; }
            if (!alive.current || (image.currentSrc || image.src) !== decodedSrc) return;
            if (dimensionsCallback.current && image.naturalWidth && image.naturalHeight) {
              dimensionsCallback.current(image.naturalWidth, image.naturalHeight, 'full');
            }
            setReady(true);
            if (readyCallback.current) readyCallback.current();
          }}
          className={`${imageClass} transition-opacity duration-300 ease-out motion-reduce:transition-none ${ready ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  );
}
