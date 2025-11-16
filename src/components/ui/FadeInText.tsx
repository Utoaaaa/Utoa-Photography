'use client';

import { useEffect, useRef, useState } from 'react';
import { useLoaderState } from '@/components/providers/LoaderStateProvider';

interface FadeInTextProps {
  children: React.ReactNode;
  className?: string;
}

export function FadeInText({ children, className = '' }: FadeInTextProps) {
  const [mounted, setMounted] = useState(false);
  const { loaderActive } = useLoaderState();
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 淡入動畫
  useEffect(() => {
    if (!mounted || loaderActive || typeof window === 'undefined') return;

    const loadAnimation = async () => {
      try {
        const gsapModule = await import('gsap');
        const gsap = gsapModule.gsap || gsapModule.default;
        
        if (!gsap || !textRef.current) return;

        // 淡入動畫
        gsap.fromTo(textRef.current,
          { opacity: 0, y: 20 },
          { 
            opacity: 1, 
            y: 0,
            duration: 1.2,
            ease: 'power2.out',
            delay: 0.3 // 稍微延遲,配合相機動畫
          }
        );
      } catch (error) {
        console.error('Failed to load GSAP for text animation:', error);
      }
    };

    loadAnimation();
  }, [mounted, loaderActive]);

  return (
    <div 
      ref={textRef}
      className={className}
      style={{ opacity: loaderActive ? 0 : undefined }}
    >
      {children}
    </div>
  );
}
