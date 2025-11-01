'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { getImageUrl, getR2LargeUrl, prefetchImage, isCloudflareConfigured } from '@/lib/images';
import { DotNavigation } from './DotNavigation';

type Asset = {
  id: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  metadata_json?: string | null;
  created_at?: Date;
};

interface PhotoViewerProps {
  photos: Asset[];
  collectionTitle: string;
  // T027: Single-screen viewer mode
  singleScreen?: boolean;
  // T027: Text content for each slide (if available)
  slideTexts?: (string | null)[];
}

export function PhotoViewer({ 
  photos, 
  collectionTitle, 
  singleScreen = false,
  slideTexts = []
}: PhotoViewerProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const photoRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const initialCenteringDone = useRef(false);
  const snapTimeoutRef = useRef<number | null>(null);
  const lastSnappedIndexRef = useRef<number | null>(null);
  const hasCenteredAfterLoadRef = useRef(false);
  const autoScrollingRef = useRef(false);
  const autoScrollReleaseRef = useRef<number | null>(null);
  const hideNavTimeoutRef = useRef<number | null>(null);
  const [showDotNav, setShowDotNav] = useState(singleScreen);
  
  // T027: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);

  const cloudflareConfigured = useMemo(() => isCloudflareConfigured(), []);

  const triggerDotNavVisibility = useCallback(
    (duration = 1600) => {
      if (singleScreen) return;
      setShowDotNav(true);
      if (hideNavTimeoutRef.current !== null) {
        window.clearTimeout(hideNavTimeoutRef.current);
      }
      hideNavTimeoutRef.current = window.setTimeout(() => {
        setShowDotNav(false);
        hideNavTimeoutRef.current = null;
      }, duration);
    },
    [singleScreen],
  );

  // T027: Single-screen mode logic
  const goToPhoto = useCallback((index: number) => {
    if (index < 0 || index >= photos.length) return;
    
    triggerDotNavVisibility();
    setIsTransitioning(true);
    setActivePhotoIndex(index);
    
    if (!prefersReducedMotion) {
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      setIsTransitioning(false);
    }
  }, [photos.length, prefersReducedMotion]);

  // T027: Touch/swipe support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!singleScreen) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, [singleScreen]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!singleScreen || touchStartX.current === null || touchStartY.current === null) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    
    // Only trigger if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - previous photo
        goToPhoto(activePhotoIndex - 1);
      } else {
        // Swipe left - next photo
        goToPhoto(activePhotoIndex + 1);
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  }, [singleScreen, activePhotoIndex, goToPhoto]);

  // T027: Mouse wheel navigation in single-screen mode
  useEffect(() => {
    if (!singleScreen) return;
    let cooldown = false;
    let wheelTimeout: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest && target.closest('.staggered-menu-panel')) {
        return;
      }
      // Prevent default page scroll; use threshold to avoid multi-triggers
      if (cooldown) return;
      const delta = e.deltaY || 0;
      if (Math.abs(delta) < 20) return; // small nudges ignored
      e.preventDefault();
      cooldown = true;
      if (delta > 0) {
        goToPhoto(activePhotoIndex + 1);
      } else {
        goToPhoto(activePhotoIndex - 1);
      }
      // Cooldown to avoid rapid multi-advances
      wheelTimeout = setTimeout(() => {
        cooldown = false;
        wheelTimeout = null;
      }, prefersReducedMotion ? 150 : 350);
    };

    // Use passive: false to be able to call preventDefault
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel as EventListener);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [singleScreen, activePhotoIndex, goToPhoto, prefersReducedMotion]);

  // Intersection Observer for scroll sync (traditional mode)
  useEffect(() => {
    if (singleScreen) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = photoRefs.current.indexOf(entry.target as HTMLElement);
            if (index !== -1) {
              setActivePhotoIndex(index);
            }
          }
        });
      },
      { 
        threshold: [0.1, 0.5, 0.9],
        rootMargin: '-10% 0px -10% 0px'
      }
    );

    photoRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [photos, singleScreen]);
  
  const centerPhoto = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      if (typeof window === 'undefined') return;
      const photoElement = photoRefs.current[index];
      if (!photoElement) return;

      const rect = photoElement.getBoundingClientRect();
      const elementHeight = rect.height || photoElement.offsetHeight;
      const topOffset = rect.top + window.scrollY - (window.innerHeight - elementHeight) / 2;
  const viewportHeight = window.innerHeight || 0;
  const preferredOffset = viewportHeight * 0.5;
  const offset = Math.min(Math.max(preferredOffset, 0), 20);

      window.scrollTo({
        top: Math.max(topOffset - offset, 0),
        behavior,
      });
    },
    [],
  );

  const scrollToPhoto = useCallback(
    (
      index: number,
      options?: {
        immediate?: boolean;
        behavior?: ScrollBehavior;
        suppressNav?: boolean;
      },
    ) => {
      if (index < 0 || index >= photos.length) return;
      const suppressNav = options?.suppressNav ?? false;
      if (!singleScreen && !suppressNav) {
        triggerDotNavVisibility();
      }
      if (suppressNav) {
        autoScrollingRef.current = true;
        if (autoScrollReleaseRef.current !== null) {
          window.clearTimeout(autoScrollReleaseRef.current);
        }
      }

      const desiredBehavior = options?.behavior ?? (options?.immediate || prefersReducedMotion ? 'auto' : 'smooth');
      lastSnappedIndexRef.current = index;
      centerPhoto(index, desiredBehavior);

      if (suppressNav) {
        autoScrollReleaseRef.current = window.setTimeout(() => {
          autoScrollingRef.current = false;
          autoScrollReleaseRef.current = null;
        }, prefersReducedMotion ? 60 : 160);
      }
    },
    [centerPhoto, photos.length, prefersReducedMotion, singleScreen, triggerDotNavVisibility],
  );
  
  const handleDotClick = useCallback((index: number) => {
    if (singleScreen) {
      goToPhoto(index);
    } else {
      triggerDotNavVisibility();
      scrollToPhoto(index);
    }
  }, [singleScreen, goToPhoto, scrollToPhoto, triggerDotNavVisibility]);

  const handlePhotoLoad = useCallback(
    (index: number) => {
      if (singleScreen) return;
      if (index === 0 && !hasCenteredAfterLoadRef.current) {
        hasCenteredAfterLoadRef.current = true;
        scrollToPhoto(0, { immediate: true, suppressNav: true });
      }
    },
    [scrollToPhoto, singleScreen],
  );

  // T027: Enhanced keyboard navigation with ARIA support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!singleScreen) {
        // Traditional scroll mode
        switch (event.key) {
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            triggerDotNavVisibility();
            scrollToPhoto(Math.max(0, activePhotoIndex - 1));
            break;
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            triggerDotNavVisibility();
            scrollToPhoto(Math.min(photos.length - 1, activePhotoIndex + 1));
            break;
          case 'Home':
            event.preventDefault();
            triggerDotNavVisibility();
            scrollToPhoto(0);
            break;
          case 'End':
            event.preventDefault();
            triggerDotNavVisibility();
            scrollToPhoto(photos.length - 1);
            break;
        }
      } else {
        // Single-screen mode
        switch (event.key) {
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            goToPhoto(activePhotoIndex - 1);
            break;
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            goToPhoto(activePhotoIndex + 1);
            break;
          case 'Home':
            event.preventDefault();
            goToPhoto(0);
            break;
          case 'End':
            event.preventDefault();
            goToPhoto(photos.length - 1);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, photos.length, singleScreen, goToPhoto, scrollToPhoto, triggerDotNavVisibility]);

  useEffect(() => {
    if (singleScreen || initialCenteringDone.current || photos.length === 0 || typeof window === 'undefined') {
      return undefined;
    }

    initialCenteringDone.current = true;
    lastSnappedIndexRef.current = 0;
    let rafId = 0;
    rafId = window.requestAnimationFrame(() => {
      scrollToPhoto(0, { immediate: true, suppressNav: true });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [photos.length, scrollToPhoto, singleScreen]);

  useEffect(() => {
    if (singleScreen) {
      setShowDotNav(true);
    }
  }, [singleScreen]);

  useEffect(() => () => {
    if (hideNavTimeoutRef.current !== null) {
      window.clearTimeout(hideNavTimeoutRef.current);
    }
    if (autoScrollReleaseRef.current !== null) {
      window.clearTimeout(autoScrollReleaseRef.current);
    }
  }, []);

  useEffect(() => {
    if (singleScreen || typeof window === 'undefined') {
      return undefined;
    }

    const handleScroll = () => {
      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current);
      }

      if (!autoScrollingRef.current) {
        triggerDotNavVisibility();
      }

      snapTimeoutRef.current = window.setTimeout(() => {
        const viewportCenter = window.innerHeight / 2;
        let closestIndex = activePhotoIndex;
        let bestDistance = Number.POSITIVE_INFINITY;

        photoRefs.current.forEach((element, index) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const elementCenter = rect.top + rect.height / 2;
          const distance = Math.abs(elementCenter - viewportCenter);

          if (distance < bestDistance) {
            bestDistance = distance;
            closestIndex = index;
          }
        });

        const isAutoScroll = autoScrollingRef.current;
        if (!isAutoScroll) {
          triggerDotNavVisibility();
        }

        if (closestIndex !== lastSnappedIndexRef.current) {
          scrollToPhoto(closestIndex, {
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            suppressNav: true,
          });
        }
      }, prefersReducedMotion ? 80 : 140);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = null;
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activePhotoIndex, singleScreen, prefersReducedMotion, scrollToPhoto, triggerDotNavVisibility]);

  // T027: Preload adjacent images (reduced count and size)
  const preloadImages = useMemo(() => {
    const toPreload = [];
    const currentIndex = activePhotoIndex;
    
    // Preload only previous and next 1 image to limit concurrent fetches
    for (let i = -1; i <= 1; i++) {
      const index = currentIndex + i;
      if (index >= 0 && index < photos.length && index !== currentIndex) {
        toPreload.push(photos[index]);
      }
    }
    
    return toPreload;
  }, [activePhotoIndex, photos]);

  useEffect(() => {
    // Preload adjacent images with direct R2 large URLs to avoid hitting Worker
    preloadImages.forEach((photo) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = getR2LargeUrl(photo.id);
      document.head.appendChild(link);
    });
  }, [preloadImages]);

  photoRefs.current.length = photos.length;

  if (photos.length === 0) {
    return null;
  }

  // (reverted) Viewport scroll snap was removed

  const currentPhoto = photos[activePhotoIndex];
  const currentText = slideTexts[activePhotoIndex];
  
  // T027: Single-screen viewer render
  if (singleScreen) {
    const cfConfigured = cloudflareConfigured;
    const imgSrc = cfConfigured ? getR2LargeUrl(currentPhoto.id) : '/placeholder.svg';

    return (
      <div 
        className="h-screen w-full relative overflow-hidden bg-background"
        data-testid="photo-viewer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={`${collectionTitle} photo viewer`}
        aria-live="polite"
      >
        {/* Preload adjacent images for smoother navigation */}
        <Head>
          {preloadImages.slice(0, 2).map((p) => (
            <link
              // Use preload only when Cloudflare is configured
              key={p.id}
              rel="preload"
              as="image"
              href={cfConfigured ? getR2LargeUrl(p.id) : undefined}
            />
          ))}
        </Head>
        <div data-testid="photo-viewer-single-screen" className="hidden" />
        {/* Main photo container */}
        <div 
          className={`h-full w-full flex items-center justify-center transition-opacity duration-300 ${
            isTransitioning && !prefersReducedMotion ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <div className="relative max-w-full max-h-full" data-testid="current-photo" id={`photo-${activePhotoIndex + 1}`}>
            {cfConfigured ? (
              <Image
                src={imgSrc}
                alt={currentPhoto.alt}
                width={currentPhoto.width}
                height={currentPhoto.height}
                className="max-w-full max-h-screen object-contain"
                sizes="100vw"
                priority={activePhotoIndex === 0}
                fetchPriority={activePhotoIndex === 0 ? 'high' : 'low'}
                unoptimized
              />
            ) : (
              <img
                src={imgSrc}
                alt={currentPhoto.alt || 'placeholder image'}
                width={currentPhoto.width}
                height={currentPhoto.height}
                className="max-w-full max-h-screen object-contain"
                loading={activePhotoIndex === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={activePhotoIndex === 0 ? 'high' as const : 'low' as const}
              />
            )}
          </div>
        </div>

        {/* Caption / text (light theme aligned with site) */}
        {(currentText || currentPhoto.caption) && (
          <div className="absolute bottom-16 left-0 right-0 px-6">
            <div className="max-w-3xl mx-auto text-center rounded-md border border-gray-200 bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
              <p className={`text-base md:text-lg ${currentText ? 'text-gray-900' : 'text-gray-700 italic'}`}>
                {currentText || currentPhoto.caption}
              </p>
            </div>
          </div>
        )}

        {/* Photo counter */}
        <div className="absolute top-6 left-6 text-gray-700 bg-white/80 border border-gray-200 px-3 py-1 rounded text-sm shadow-sm">
          {activePhotoIndex + 1} / {photos.length}
        </div>

        {/* Navigation hints */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-gray-700 bg-white/80 border border-gray-200 px-3 py-1 rounded text-xs shadow-sm">
          使用滑鼠滾輪、方向鍵或滑動切換照片
        </div>

        {/* Dot navigation */}
        {photos.length > 1 && (
          <DotNavigation
            totalPhotos={photos.length}
            activeIndex={activePhotoIndex}
            onDotClick={handleDotClick}
            collectionTitle={collectionTitle}
            singleScreen={true}
            visible
          />
        )}
      </div>
    );
  }

  // Traditional scroll-based viewer render
  return (
    <div className="relative" data-testid="photo-viewer">
      {/* Photo container */}
      <div 
        ref={containerRef}
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-10 lg:px-16"
      >
        {photos.map((photo, index) => (
          <article
            key={photo.id}
            ref={(el) => {
              photoRefs.current[index] = el;
            }}
            className="snap-always snap-center flex min-h-[88vh] w-full flex-col items-center justify-center py-20 md:py-24 first:pt-16 first:-mt-25"
            data-testid="photo-container"
          >
            <div className="relative flex w-full flex-col items-center">
              {/* Photo */}
              <div className="relative flex w-full justify-center" data-testid="current-photo" id={`photo-${index + 1}`}>
                {cloudflareConfigured ? (
                  <Image
                    src={getR2LargeUrl(photo.id)}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    className="mx-auto h-auto max-h-[92vh] w-auto max-w-[92vw] object-contain"
                    sizes="100vw"
                    priority={index === 0}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    onLoadingComplete={() => handlePhotoLoad(index)}
                    unoptimized
                  />
                ) : (
                  <img
                    src={'/placeholder.svg'}
                    alt={photo.alt || 'placeholder image'}
                    width={photo.width}
                    height={photo.height}
                    className="mx-auto h-auto max-h-[92vh] w-auto max-w-[92vw] object-contain"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    onLoad={() => handlePhotoLoad(index)}
                  />
                )}
              </div>
              
              {/* Text content */}
              {slideTexts[index] && (
                <div className="mx-auto mt-6 max-w-4xl text-gray-900">
                  <p className="text-lg leading-relaxed md:text-xl">{slideTexts[index]}</p>
                </div>
              )}
              
              {/* Caption */}
              {photo.caption && !slideTexts[index] && (
                <figcaption className="mx-auto mt-6 max-w-3xl text-center text-sm italic text-gray-600 md:text-base" data-testid="photo-caption">
                  {photo.caption}
                </figcaption>
              )}
              
              {/* Photo metadata */}
              <div className="mt-4 text-center text-xs uppercase tracking-[0.25em] text-gray-400">
                Photo {index + 1} of {photos.length}
              </div>
            </div>
          </article>
        ))}
      </div>
      
      {/* Dot navigation */}
      {photos.length > 1 && (
        <DotNavigation
          totalPhotos={photos.length}
          activeIndex={activePhotoIndex}
          onDotClick={handleDotClick}
          collectionTitle={collectionTitle}
          singleScreen={false}
          visible={showDotNav}
        />
      )}

      {/* No-JS fallback: render a simple links list to each image */}
      <noscript>
        <div className="mx-auto max-w-6xl px-8 py-8 md:px-12 lg:px-16">
          <ul>
            {photos.map((p, i) => (
              <li key={p.id} className="mb-4">
                <a href={getR2LargeUrl(p.id)}>
                  {collectionTitle} - Photo {i + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </noscript>
    </div>
  );
}
