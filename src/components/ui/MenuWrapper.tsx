'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useLoaderState } from '@/components/providers/LoaderStateProvider';
import type { StaggeredMenuItem, StaggeredMenuSocialItem } from './StaggeredMenu';

const StaggeredMenu = dynamic(() => import('./StaggeredMenu'), {
  ssr: false,
});

const DEFAULT_SOCIAL_ITEMS: StaggeredMenuSocialItem[] = [
  { label: 'Instagram', link: 'https://instagram.com/__utoa' }
];

interface MenuWrapperProps {
  menuItems: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
}

export default function MenuWrapper({ menuItems, socialItems }: MenuWrapperProps) {
  const { loaderActive } = useLoaderState();
  const resolvedSocials = useMemo(() => socialItems ?? DEFAULT_SOCIAL_ITEMS, [socialItems]);

  return (
    <div
      className={loaderActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      style={{ transition: 'opacity 0.3s ease' }}
      aria-hidden={loaderActive}
    >
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={resolvedSocials}
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
