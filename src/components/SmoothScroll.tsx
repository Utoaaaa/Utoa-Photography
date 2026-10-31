'use client';

import { useEffect, useRef } from 'react';
import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';

interface LenisLike {
  raf: (time: number) => void;
  destroy: () => void;
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
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const isTabletOrSmaller = window.matchMedia('(max-width: 1024px)').matches;
      reduceMotion = m.matches || isCoarse || isTabletOrSmaller;
    }

    if (reduceMotion) {
      console.info('[Lenis] prefers-reduced-motion = true → skip smooth scroll');
      return;
    }

    let active = true;

    (async () => {
      try {
        console.log('[Lenis] Starting initialization...');

        // 動態匯入 Lenis
        const mod = await import('lenis');
        // The effect may have been cleaned up while the import was pending; an instance created
        // now would never be destroyed and would keep swallowing wheel events.
        if (!active) return;
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

        // No live component creates ScrollTriggers, so Lenis is not wired to GSAP; this also
        // keeps GSAP and ScrollTrigger out of the smooth-scroll code path.

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
