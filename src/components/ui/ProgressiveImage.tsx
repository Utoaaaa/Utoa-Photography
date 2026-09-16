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
}

// Key the inner component so a changed photo cannot reveal the previous image
// or finish an obsolete decode promise over the new preview.
export function ProgressiveImage(props: Props) {
  return <ImageLayers key={props.assetId} {...props} />;
}

function ImageLayers({ assetId, alt, width, height, priority = false, className = '',
  fit = 'cover', sizes = '100vw', style, onReady }: Props) {
  const root = useRef<HTMLSpanElement>(null);
  const alive = useRef(true);
  const [enhance, setEnhance] = useState(false);
  const [near, setNear] = useState(priority);
  const [measuredSize, setMeasuredSize] = useState<string>();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;

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
        className={`${imageClass} transition-opacity duration-300 motion-reduce:transition-none ${ready ? 'opacity-0' : 'opacity-100'}`}
      />
      {near && enhance && (
        <img
          src={getR2VariantDirectUrl(assetId, failed ? 'large' : 'medium')}
          srcSet={failed ? undefined : generateSrcSet(assetId, width, height)}
          sizes={measuredSize || sizes}
          alt="" aria-hidden="true"
          width={width || undefined} height={height || undefined}
          loading="eager" decoding="async" fetchPriority={priority ? 'high' : 'low'}
          onError={() => { if (!failed) setFailed(true); }}
          onLoad={async event => {
            const image = event.currentTarget;
            try { if (image.decode) await image.decode(); } catch { return; }
            if (!alive.current) return;
            setReady(true);
            if (readyCallback.current) readyCallback.current();
          }}
          className={`${imageClass} transition-opacity duration-300 motion-reduce:transition-none ${ready ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  );
}
