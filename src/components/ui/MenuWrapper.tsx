'use client';

import { useEffect, useState } from 'react';
import StaggeredMenu from './StaggeredMenu';
import type { StaggeredMenuItem, StaggeredMenuSocialItem } from './StaggeredMenu';

const DEFAULT_SOCIAL_ITEMS: StaggeredMenuSocialItem[] = [
  { label: 'Instagram', link: 'https://instagram.com/__utoa' }
];

interface MenuWrapperProps {
  menuItems: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
}

export default function MenuWrapper({ menuItems, socialItems = DEFAULT_SOCIAL_ITEMS }: MenuWrapperProps) {
  const [loaderActive, setLoaderActive] = useState(true);

  useEffect(() => {
    // 檢查 loader 是否正在顯示
    const checkLoader = () => {
      const loaderElement = document.querySelector('[data-loader-active]');
      setLoaderActive(!!loaderElement);
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

    // 3 秒後確保顯示選單 (防止 loader 沒有正確移除的情況)
    const timeout = setTimeout(() => {
      setLoaderActive(false);
    }, 3500);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className={loaderActive ? 'opacity-0 pointer-events-none' : 'opacity-100'} style={{ transition: 'opacity 0.3s ease' }}>
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={false}
        menuButtonColor="#111"
        openMenuButtonColor="#111"
        changeMenuColorOnOpen={false}
        colors={['#ffffe1ff', '#fff8e1ff']}
        accentColor="#666"
      />
    </div>
  );
}

