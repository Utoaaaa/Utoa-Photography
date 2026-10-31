import type { ReactNode } from 'react';

import LoaderClient from '@/app/loader-client';
import { SmoothScroll } from '@/components/SmoothScroll';
import { LoaderStateProvider } from '@/components/providers/LoaderStateProvider';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';

/**
 * Public-site chrome: Lenis smooth scrolling and the first-visit loader (both pull in GSAP).
 * Mounted by the public site layouts only, so admin pages never download either library.
 */
export function SiteProviders({ children }: { children: ReactNode }) {
  return (
    <SmoothScrollProvider>
      <LoaderStateProvider>
        <SmoothScroll />
        <LoaderClient />
        {children}
      </LoaderStateProvider>
    </SmoothScrollProvider>
  );
}
