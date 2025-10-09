'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ScrollFadeOutProps {
  children: ReactNode;
  className?: string;
}

/**
 * ScrollFadeOut Component
 * 往下滾:放大淡出 | 往上滾:由小變大重新出現
 */
export function ScrollFadeOut({ children, className = '' }: ScrollFadeOutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let cleanup: (() => void) | undefined;

    const loadScrollAnimation = async () => {
      try {
        const gsapModule = await import('gsap');
        const ScrollTriggerModule = await import('gsap/ScrollTrigger');
        const gsap = gsapModule.gsap || gsapModule.default;
        const ScrollTrigger = ScrollTriggerModule.ScrollTrigger || ScrollTriggerModule.default;

        if (!gsap || !ScrollTrigger) return;

        gsap.registerPlugin(ScrollTrigger);

        console.log('🎬 Setting up camera animations (zoom out + zoom in)');

        const container = containerRef.current;
        if (!container) return;

        // 設定初始狀態
        gsap.set(container, {
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          transformOrigin: 'center center',
        });

        // 設置觸發點
        const trigger = ScrollTrigger.create({
          trigger: document.documentElement,
          start: '30vh top',
          onEnter: () => {
            // 往下滾進入:放大淡出
            console.log('📸 Camera zoom out (enlarge + fade)');
            gsap.to(container, {
              scale: 1.5,
              opacity: 0,
              filter: 'blur(15px)',
              duration: 1.5,
              ease: 'power2.inOut',
            });
          },
          onLeave: () => {
            // 往下滾離開:保持淡出狀態
            console.log('📸 Camera stays hidden');
          },
          onEnterBack: () => {
            // 往上滾回來:直接恢復初始狀態
            gsap.set(container, {
              scale: 1,
              opacity: 1,
              filter: 'blur(0px)',
            });
          },
          onLeaveBack: () => {
            // 往上滾離開螢幕上緣:保持初始樣式
            gsap.set(container, {
              scale: 1,
              opacity: 1,
              filter: 'blur(0px)',
            });
          },
        });

        console.log('✅ Camera animations ready (bidirectional at 30vh)');

        cleanup = () => {
          trigger.kill();
          console.log('🧹 ScrollTrigger cleaned up');
        };
      } catch (error) {
        console.error('Failed to load GSAP ScrollTrigger:', error);
      }
    };

    loadScrollAnimation();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
