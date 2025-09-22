'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { cloudflareImageLoader, getImageUrl, prefetchImage } from '@/lib/images';
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
  const photoRefs = useRef<HTMLElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  
  // T027: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, []);

  // T027: Single-screen mode logic
  const goToPhoto = useCallback((index: number) => {
    if (index < 0 || index >= photos.length) return;
    
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
  
  // T027: Enhanced keyboard navigation with ARIA support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!singleScreen) {
        // Traditional scroll mode
        switch (event.key) {
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            scrollToPhoto(Math.max(0, activePhotoIndex - 1));
            break;
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            scrollToPhoto(Math.min(photos.length - 1, activePhotoIndex + 1));
            break;
          case 'Home':
            event.preventDefault();
            scrollToPhoto(0);
            break;
          case 'End':
            event.preventDefault();
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
  }, [activePhotoIndex, photos.length, singleScreen, goToPhoto]);
  
  const scrollToPhoto = useCallback((index: number) => {
    const photoElement = photoRefs.current[index];
    if (photoElement) {
      photoElement.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center'
      });
    }
  }, [prefersReducedMotion]);
  
  const handleDotClick = useCallback((index: number) => {
    if (singleScreen) {
      goToPhoto(index);
    } else {
      scrollToPhoto(index);
    }
  }, [singleScreen, goToPhoto, scrollToPhoto]);

  // T027: Preload adjacent 1-2 images
  const preloadImages = useMemo(() => {
    const toPreload = [];
    const currentIndex = activePhotoIndex;
    
    // Preload previous and next images
    for (let i = -2; i <= 2; i++) {
      const index = currentIndex + i;
      if (index >= 0 && index < photos.length && index !== currentIndex) {
        toPreload.push(photos[index]);
      }
    }
    
    return toPreload;
  }, [activePhotoIndex, photos]);

  useEffect(() => {
    // Preload adjacent images using helper
    preloadImages.forEach((photo) => prefetchImage(photo.id, 'medium'));
  }, [preloadImages]);
  
  if (photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[activePhotoIndex];
  const currentText = slideTexts[activePhotoIndex];
  
  // T027: Single-screen viewer render
  if (singleScreen) {
    return (
      <div 
        className="h-screen w-full relative overflow-hidden bg-black"
        data-testid="photo-viewer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={`${collectionTitle} photo viewer`}
        aria-live="polite"
      >
        <div data-testid="photo-viewer-single-screen" className="hidden" />
        {/* Main photo container */}
        <div 
          className={`h-full w-full flex items-center justify-center transition-opacity duration-300 ${
            isTransitioning && !prefersReducedMotion ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <div className="relative max-w-full max-h-full" data-testid="current-photo">
            <Image
              loader={cloudflareImageLoader}
              src={currentPhoto.id}
              alt={currentPhoto.alt}
              width={currentPhoto.width}
              height={currentPhoto.height}
              className="max-w-full max-h-screen object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1280px"
              priority={activePhotoIndex === 0}
            />
          </div>
        </div>

        {/* Text overlay */}
        {currentText && (
          <div className="absolute bottom-20 left-0 right-0 px-8 py-4 bg-black bg-opacity-50 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-lg md:text-xl">{currentText}</p>
            </div>
          </div>
        )}

        {/* Caption overlay */}
        {currentPhoto.caption && !currentText && (
          <div className="absolute bottom-20 left-0 right-0 px-8 py-4 bg-black bg-opacity-50 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-lg md:text-xl italic">{currentPhoto.caption}</p>
            </div>
          </div>
        )}

        {/* Photo counter */}
        <div className="absolute top-6 left-6 text-white bg-black bg-opacity-50 px-3 py-1 rounded text-sm">
          {activePhotoIndex + 1} / {photos.length}
        </div>

        {/* Navigation hints */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded text-xs">
          使用方向鍵或滑動切換照片
        </div>

        {/* Dot navigation */}
        {photos.length > 1 && (
          <DotNavigation
            totalPhotos={photos.length}
            activeIndex={activePhotoIndex}
            onDotClick={handleDotClick}
            collectionTitle={collectionTitle}
            singleScreen={true}
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
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16"
      >
        {photos.map((photo, index) => (
          <article
            key={photo.id}
            ref={(el) => {
              if (el) {
                photoRefs.current[index] = el;
              }
            }}
            className="scroll-mt-16"
            data-testid="photo-container"
          >
            <div className="relative">
              {/* Photo */}
              <div className="relative overflow-hidden rounded bg-gray-100" data-testid="current-photo">
                <Image
                  loader={cloudflareImageLoader}
                  src={photo.id}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 85vw, 1200px"
                  priority={index === 0}
                />
              </div>
              
              {/* Text content */}
              {slideTexts[index] && (
                <div className="mt-4 text-gray-800 max-w-3xl mx-auto">
                  <p className="text-lg leading-relaxed">{slideTexts[index]}</p>
                </div>
              )}
              
              {/* Caption */}
              {photo.caption && !slideTexts[index] && (
                <figcaption className="mt-4 text-gray-600 text-center italic max-w-3xl mx-auto" data-testid="photo-caption">
                  {photo.caption}
                </figcaption>
              )}
              
              {/* Photo metadata */}
              <div className="mt-2 text-xs text-gray-400 text-center">
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
        />
      )}

      {/* No-JS fallback: render a simple links list to each image */}
      <noscript>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ul>
            {photos.map((p, i) => (
              <li key={p.id} className="mb-4">
                <a href={getImageUrl(p.id, 'large')}>
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