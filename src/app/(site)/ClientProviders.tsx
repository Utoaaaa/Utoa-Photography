'use client';

import { ReactNode } from 'react';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <SmoothScrollProvider>{children}</SmoothScrollProvider>;
}
