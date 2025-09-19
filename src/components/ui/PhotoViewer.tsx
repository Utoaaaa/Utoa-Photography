'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { DotNavigation } from './DotNavigation';

type Asset = {
  id: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  metadata_json: string | null;
  created_at: Date;
};

interface PhotoViewerProps {
  photos: Asset[];
  collectionTitle: string;
}

export function PhotoViewer({ photos, collectionTitle }: PhotoViewerProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const photoRefs = useRef<HTMLElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Intersection Observer for scroll sync
  useEffect(() => {
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
  }, [photos]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, photos.length]);
  
  const scrollToPhoto = useCallback((index: number) => {
    const photoElement = photoRefs.current[index];
    if (photoElement) {
      photoElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);
  
  const handleDotClick = useCallback((index: number) => {
    scrollToPhoto(index);
  }, [scrollToPhoto]);
  
  if (photos.length === 0) {
    return null;
  }
  
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
              <div className="relative overflow-hidden rounded bg-gray-100">
                <Image
                  src={`https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${photo.id}/large`}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1024px"
                  priority={index < 3} // Prioritize first 3 images
                />
              </div>
              
              {/* Caption */}
              {photo.caption && (
                <figcaption className="mt-4 text-gray-600 text-center italic max-w-3xl mx-auto">
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
        />
      )}
    </div>
  );
}