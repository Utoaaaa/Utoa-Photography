'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Loader from '@/components/Loader';
import { gsap } from 'gsap';

export default function LoaderClient() {
  const pathname = usePathname();
  const [show, setShow] = useState(true);
  const [skipLoader, setSkipLoader] = useState(false);

  useEffect(() => {
    // Admin 頁面不顯示 loader
    if (pathname?.startsWith('/admin')) {
      setSkipLoader(true);
      setShow(false);
      
      // 確保內容可見
      const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
      if (mainContent) {
        gsap.set(mainContent, { opacity: 1, scale: 1 });
      }
      return;
    }

    // 使用 MutationObserver 監聽 DOM 變化，立即檢測 404
    const check404 = () => {
      const notFoundElement = document.querySelector('[data-not-found="true"]');
      if (notFoundElement) {
        setSkipLoader(true);
        setShow(false);
        
        // 確保內容可見
        const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
        if (mainContent) {
          gsap.set(mainContent, { opacity: 1, scale: 1 });
        }
        return true;
      }
      return false;
    };

    // 立即檢查
    if (check404()) return;

    // 如果沒有檢測到 404，監聽 DOM 變化
    const observer = new MutationObserver(() => {
      if (check404()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-not-found']
    });

    // 不是 404，預先隱藏主內容 (僅在首次載入時)
    const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
    if (mainContent && !skipLoader && show) {
      gsap.set(mainContent, { opacity: 0, scale: 0.98 });
    } else if (mainContent) {
      // 客戶端導航時,確保內容可見
      gsap.set(mainContent, { opacity: 1, scale: 1 });
    }

    return () => observer.disconnect();
  }, [skipLoader, pathname, show]);

  const handleLoaderDone = () => {
    // 主內容入場動畫（從中間淡入）
    const mainContent = document.querySelector('main') || document.querySelector('[data-main-content]');
    if (mainContent) {
      gsap.to(
        mainContent,
        { 
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
          delay: 0.1,
        }
      );
    }

    // 延遲移除 loader 以確保動畫開始
    setTimeout(() => {
      setShow(false);
    }, 100);
  };

  // 404 頁面或已完成，不顯示 loader
  if (!show || skipLoader) return null;

  return <Loader onDone={handleLoaderDone} minDurationMs={3000} />;
}
