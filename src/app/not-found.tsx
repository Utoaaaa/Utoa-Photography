'use client';

import { useEffect, useRef } from 'react';
import { loadGSAP } from '@/lib/gsap-loader';

export default function NotFound() {
  const numberRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    let mounted = true;

    (async () => {
      const bundle = await loadGSAP();
      if (!bundle || !mounted) return;
      const gsap = bundle.gsap;

      // 動畫時間軸
      const tl = gsap.timeline();

      // 404 數字淡入
      tl.fromTo(
        numberRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' },
        0.1
      );

      // 哭臉淡入
      tl.fromTo(
        faceRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' },
        0.4
      );
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white" data-not-found="true">
      {/* 404 大數字 - 左下角 */}
      <div
        ref={numberRef}
        className="fixed bottom-8 left-0 transform -translate-x-[12%]"
        style={{
          fontSize: 'clamp(270px, 42vw, 630px)',
          lineHeight: 1.1,
          fontWeight: 500,
          color: '#000',
          fontFamily: 'Georgia, "Times New Roman", serif',
          letterSpacing: '-0.02em',
          opacity: 0,
        }}
      >
        404
      </div>

      {/* Windows 哭臉 - 右上角 */}
      <div
        ref={faceRef}
        className="fixed top-12 right-12"
        style={{
          fontSize: 'clamp(80px, 12vw, 160px)',
          lineHeight: 1,
          fontWeight: 400,
          color: '#000',
          fontFamily: 'Georgia, "Times New Roman", serif',
          opacity: 0,
        }}
      >
        :(
      </div>
    </div>
  );
}
