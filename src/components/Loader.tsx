'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

type LoaderProps = {
  onDoneAction?: () => void;
  minDurationMs?: number;
};

export default function Loader({ onDoneAction, minDurationMs = 4000 }: LoaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState('00');
  const settledNumberOffset = '-12%';

  useEffect(() => {
    let isActive = true;
    let timeline: gsap.core.Timeline | null = null;
    let introTween: gsap.core.Tween | null = null;
    const timeoutIds = new Set<number>();
    const scheduleTimeout = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback();
      }, delay);
      timeoutIds.add(timeoutId);
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 多組數字序列,每次隨機選一組
    const numberSequences: ReadonlyArray<readonly number[]> = [
      [10, 36, 77, 86, 99],
      [15, 42, 68, 83, 99],
      [8, 29, 54, 82, 99],
      [12, 45, 73, 89, 99],
      [18, 38, 61, 85, 99],
      [7, 33, 59, 87, 99],
    ];
    
    // 隨機選擇一組數字序列
    const targetNumbers = numberSequences[Math.floor(Math.random() * numberSequences.length)] ?? numberSequences[0];
    let currentIndex = 0;
    
    const randomDelays = targetNumbers.map(() => 
      Math.floor(Math.random() * 200) + 50
    );
    
    const startFadeOut = () => {
      if (!isActive) return;
      
      timeline = gsap.timeline({
        onComplete: () => {
          if (onDoneAction) {
            onDoneAction();
          }
        },
      });

      if (prefersReducedMotion) {
        timeline.to(overlayRef.current, { opacity: 0, duration: 0.05 });
      } else {
        // 讓最後的 99 短暫停留後再收掉
        timeline.to({}, { duration: 0.4 });

        // 數字向左滑出與背景淡出同時進行
        timeline.to(numberRef.current, {
          x: '-100%',
          opacity: 0,
          duration: 0.7,
          ease: 'power2.in',
        }, 0.4);

        // 背景淡出 - 與滑出同時開始
        timeline.to(overlayRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.inOut',
        }, 0.4);
      }

      timeline.set(overlayRef.current, { display: 'none' });
    };
    
    const showNextNumber = () => {
      if (!isActive || currentIndex >= targetNumbers.length) return;
      
      setProgress(String(targetNumbers[currentIndex]).padStart(2, '0'));
      const currentDelay = randomDelays[currentIndex];
      currentIndex++;
      
      if (currentIndex < targetNumbers.length) {
        scheduleTimeout(showNextNumber, currentDelay);
      } else {
        // 顯示完所有數字後,開始淡出動畫
        startFadeOut();
      }
    };
    
    // 第一個數字從左邊滑入
    if (numberRef.current) {
      if (prefersReducedMotion) {
        gsap.set(numberRef.current, { x: settledNumberOffset, opacity: 1 });
        showNextNumber();
      } else {
        gsap.set(numberRef.current, {
          x: '-50%',
          opacity: 0,
        });
        introTween = gsap.to(numberRef.current, {
          x: settledNumberOffset,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => {
            showNextNumber();
          }
        });
      }
    } else {
      showNextNumber();
    }

    return () => {
      isActive = false;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
      introTween?.kill();
      timeline?.kill();
    };
  }, [onDoneAction, minDurationMs]);

  return (
    <>
      <noscript>
        <style>{'[data-loader-active="true"]{display:none!important}'}</style>
      </noscript>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] bg-background"
        aria-hidden="true"
        role="status"
        aria-label="Loading"
        data-loader-active="true"
      >
        <div 
          ref={numberRef}
          className="fixed bottom-8 left-0 text-foreground"
          style={{
            fontSize: 'clamp(270px, 42vw, 630px)',
            lineHeight: 1.1,
            fontWeight: 500,
            fontFamily: 'Georgia, "Times New Roman", serif',
            letterSpacing: '-0.02em',
            opacity: 0,
            transform: `translateX(${settledNumberOffset})`,
            willChange: 'opacity, transform',
          }}
        >
          {progress}
        </div>
      </div>
    </>
  );
}
