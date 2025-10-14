'use client';

import { useEffect, useRef } from 'react';
import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';

interface LenisLike {
  scroll: number;
  raf: (time: number) => void;
  on: (event: 'scroll', handler: () => void) => void;
  destroy: () => void;
  resize?: () => void;
  scrollTo: (value: number | HTMLElement | string, options?: { immediate?: boolean }) => void;
}

type LenisConstructor = new (options?: Record<string, unknown>) => LenisLike;

export function SmoothScroll() {
  const rafIdRef = useRef<number | null>(null);
  const lenisRef = useRef<LenisLike | null>(null);
  const { prefersReducedMotion, setLenis } = useSmoothScroll();

  useEffect(() => {
    // 先參考 context 的設定，若仍未宣告再 fallback 到媒體查詢
    let reduceMotion = prefersReducedMotion;

    if (!reduceMotion && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    if (reduceMotion) {
      console.info('[Lenis] prefers-reduced-motion = true → skip smooth scroll');
      return;
    }

    let active = true;
    let scrollTriggerCleanup: (() => void) | null = null;

    (async () => {
      try {
        console.log('[Lenis] Starting initialization...');
        
        // 動態匯入 Lenis
        const mod = await import('lenis');
        const Lenis = mod.default as unknown;
        if (typeof Lenis !== 'function') {
          console.warn('[Lenis] Module missing default export. Abort initialization.');
          return;
        }
        const LenisCtor = Lenis as LenisConstructor;

        const lenis = new LenisCtor({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 2,
        });
        lenisRef.current = lenis;
  setLenis(lenis);

        console.log('[Lenis] Instance created');

        // 整合 GSAP ScrollTrigger
        try {
          const gsapModule = await import('gsap');
          const ScrollTriggerModule = await import('gsap/ScrollTrigger');
          const gsap = gsapModule.gsap || gsapModule.default;
          const ScrollTrigger = ScrollTriggerModule.ScrollTrigger || ScrollTriggerModule.default;

          if (gsap && ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
            
            // 讓 ScrollTrigger 跟著 Lenis 更新
            lenis.on('scroll', () => ScrollTrigger.update());
            
            const scroller = document.documentElement;

            ScrollTrigger.scrollerProxy(scroller, {
              scrollTop(value) {
                if (typeof value === 'number') {
                  lenis.scrollTo(value, { immediate: true });
                  return;
                }
                return lenis.scroll ?? window.scrollY;
              },
              getBoundingClientRect() {
                return {
                  top: 0,
                  left: 0,
                  width: window.innerWidth,
                  height: window.innerHeight,
                };
              },
              pinType: document.body.style.transform ? 'transform' : 'fixed',
            });

            const onRefresh = () => {
              if (typeof lenis.resize === 'function') {
                lenis.resize();
              }
            };
            ScrollTrigger.addEventListener('refresh', onRefresh);

            ScrollTrigger.refresh();

            scrollTriggerCleanup = () => {
              ScrollTrigger.removeEventListener('refresh', onRefresh);
            };

            gsap.ticker.lagSmoothing(0);
            
            console.log('[Lenis] GSAP ScrollTrigger integrated');
          }
        } catch (gsapError) {
          console.warn('[Lenis] GSAP integration skipped:', gsapError);
        }

        // 啟動 RAF 循環
        const raf = (time: number) => {
          if (!active) return;
          lenis.raf(time);
          rafIdRef.current = requestAnimationFrame(raf);
        };
        rafIdRef.current = requestAnimationFrame(raf);

        console.log('✅ [Lenis] Smooth scroll initialized and running');

      } catch (err) {
        console.error('[Lenis] Failed to initialize:', err);
      }
    })();

    return () => {
      active = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (scrollTriggerCleanup) {
        scrollTriggerCleanup();
      }
      scrollTriggerCleanup = null;

      if (lenisRef.current) {
        const lenis = lenisRef.current;
        try {
          if (lenis && typeof lenis.destroy === 'function') {
            lenis.destroy();
          }
        } catch (e) {
          console.warn('[Lenis] Cleanup error:', e);
        }
        lenisRef.current = null;
      }
      setLenis(null);
      console.log('[Lenis] Cleaned up');
    };
  }, [prefersReducedMotion, setLenis]);

  return null;
}
