'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ScrollZoomInProps {
  children: ReactNode;
  className?: string;
  /** 進場觸發點 (預設 top 65%) */
  start?: string;
  /** 進場起始縮放 */
  fromScale?: number;
  /** 進場動畫時長 */
  duration?: number;
}

export function ScrollZoomIn({
  children,
  className = '',
  start = 'top 65%',
  fromScale = 0.965,
  duration = 0.75,
}: ScrollZoomInProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let teardown: (() => void) | undefined;

    (async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const baseStyles = {
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      } as const;

      const scroller = document.documentElement;

      const resetHidden = () => {
        gsap.set(el, { scale: fromScale, autoAlpha: 0, filter: 'none', ...baseStyles, overwrite: 'auto' });
      };

      const showVisible = () => {
        gsap.set(el, { scale: 1, autoAlpha: 1, filter: 'none', ...baseStyles, overwrite: 'auto' });
      };

      const playEnter = () => {
        gsap.killTweensOf(el);
        gsap.fromTo(
          el,
          { scale: fromScale, autoAlpha: 0, filter: 'none', ...baseStyles },
          {
            scale: 1,
            autoAlpha: 1,
            duration,
            ease: 'power2.out',
            overwrite: 'auto',
          },
        );
      };

      resetHidden();

      const enterTrigger = ScrollTrigger.create({
        trigger: el,
        start,
        scroller,
        invalidateOnRefresh: true,
        onEnter: playEnter,
        onEnterBack: showVisible,
        onLeave: () => {
          resetHidden();
        },
        onLeaveBack: showVisible,
      });

      ScrollTrigger.refresh();

      if (enterTrigger.isActive || enterTrigger.progress > 0) {
        playEnter();
      }

      teardown = () => {
        enterTrigger.kill();
        gsap.killTweensOf(el);
      };
    })();

    return () => {
      if (teardown) {
        teardown();
      }
    };
  }, [start, fromScale, duration]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
