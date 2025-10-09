'use client';

import { useEffect, useRef, useState } from 'react';

interface FadeInTextProps {
  children: React.ReactNode;
  className?: string;
}

export function FadeInText({ children, className = '' }: FadeInTextProps) {
  const [mounted, setMounted] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 偵測 Loader 是否完成
  useEffect(() => {
    if (!mounted) return;

    const checkLoader = () => {
      const loaderElement = document.querySelector('[data-loader-active]');
      if (!loaderElement) {
        setLoaderDone(true);
      }
    };

    // 初始檢查
    checkLoader();

    // 監聽 DOM 變化
    const observer = new MutationObserver(checkLoader);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-loader-active']
    });

    // 5 秒後強制顯示(防止 loader 檢測失敗)
    const timeout = setTimeout(() => {
      setLoaderDone(true);
    }, 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [mounted]);

  // 淡入動畫
  useEffect(() => {
    if (!mounted || !loaderDone || typeof window === 'undefined') return;

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
  }, [mounted, loaderDone]);

  return (
    <div 
      ref={textRef}
      className={className}
      style={{ opacity: loaderDone ? undefined : 0 }}
    >
      {children}
    </div>
  );
}
