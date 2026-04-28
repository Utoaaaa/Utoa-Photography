'use client';

import { useEffect, useRef, useState } from 'react';
import { useLoaderState } from '@/components/providers/LoaderStateProvider';

interface FadeInTextProps {
  children: React.ReactNode;
  className?: string;
}

export function FadeInText({ children, className = '' }: FadeInTextProps) {
  const [mounted, setMounted] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const { loaderActive } = useLoaderState();
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 淡入動畫
  useEffect(() => {
    if (!mounted || loaderActive || typeof window === 'undefined') return;
    let cancelled = false;
    let tween: gsap.core.Tween | null = null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimationComplete(true);
      return undefined;
    }

    const loadAnimation = async () => {
      try {
        const gsapModule = await import('gsap');
        const gsap = gsapModule.gsap || gsapModule.default;
        
        if (cancelled || !gsap || !textRef.current) return;

        // 淡入動畫
        tween = gsap.fromTo(textRef.current,
          { opacity: 0, y: 20 },
          { 
            opacity: 1, 
            y: 0,
            duration: 1.2,
            ease: 'power2.out',
            delay: 0.3, // 稍微延遲,配合相機動畫
            onComplete: () => {
              if (!cancelled) setAnimationComplete(true);
            },
          }
        );
      } catch (error) {
        console.error('Failed to load GSAP for text animation:', error);
        if (!cancelled) setAnimationComplete(true);
      }
    };

    loadAnimation();
    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [mounted, loaderActive]);

  const shouldHide = mounted && (loaderActive || !animationComplete);

  return (
    <div 
      ref={textRef}
      className={className}
      style={{
        opacity: shouldHide ? 0 : undefined,
        transform: shouldHide ? 'translateY(20px)' : undefined,
      }}
    >
      <noscript>
        <style>{'[data-fade-in-text]{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      {children}
    </div>
  );
}
