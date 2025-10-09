'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

type LoaderProps = {
  onDone?: () => void;
  minDurationMs?: number;
};

export default function Loader({ onDone, minDurationMs = 4000 }: LoaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState('00');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isActive = true;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 多組數字序列,每次隨機選一組
    const numberSequences = [
      [10, 36, 77, 86, 99],
      [15, 42, 68, 83, 99],
      [8, 29, 54, 82, 99],
      [12, 45, 73, 89, 99],
      [18, 38, 61, 85, 99],
      [7, 33, 59, 87, 99],
    ];
    
    // 隨機選擇一組數字序列
    const targetNumbers = numberSequences[Math.floor(Math.random() * numberSequences.length)];
    let currentIndex = 0;
    
    const randomDelays = targetNumbers.map(() => 
      Math.floor(Math.random() * 200) + 50
    );
    
    const startFadeOut = () => {
      if (!isActive) return;
      
      const tl = gsap.timeline({
        onComplete: () => {
          if (onDone) {
            onDone();
          }
        },
      });

      if (prefersReducedMotion) {
        tl.to(overlayRef.current, { opacity: 0, duration: 0.05 });
      } else {
        // 稍微等待顯示一下（300ms）
        tl.to({}, { duration: 0.3 });
        
        // 數字向左滑出與背景淡出同時進行
        tl.to(numberRef.current, {
          x: '-100%',
          opacity: 0,
          duration: 0.8,
          ease: 'power2.in',
        }, 0.3); // 從 0.3s 開始

        // 背景淡出 - 與滑出同時開始
        tl.to(overlayRef.current, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.inOut',
        }, 0.3); // 從 0.3s 開始
      }

      tl.set(overlayRef.current, { display: 'none' });
    };
    
    const showNextNumber = () => {
      if (!isActive || currentIndex >= targetNumbers.length) return;
      
      setProgress(String(targetNumbers[currentIndex]).padStart(2, '0'));
      const currentDelay = randomDelays[currentIndex];
      currentIndex++;
      
      if (currentIndex < targetNumbers.length) {
        setTimeout(showNextNumber, currentDelay);
      } else {
        // 顯示完所有數字後,開始淡出動畫
        startFadeOut();
      }
    };
    
    // 第一個數字從左邊滑入
    if (numberRef.current && !prefersReducedMotion) {
      gsap.set(numberRef.current, {
        x: '-50%',
        opacity: 0,
      });
      gsap.to(numberRef.current, {
        x: '-12%',
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          showNextNumber();
        }
      });
    } else {
      showNextNumber();
    }

    return () => {
      isActive = false;
    };
  }, [mounted, onDone, minDurationMs]);

  if (!mounted) {
    return null;
  }

  return (
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
          transform: 'translateX(-12%)',
        }}
      >
        {progress}
      </div>
    </div>
  );
}
