'use client';

import { ReactNode } from 'react';
import { useFadeInAnimation } from '@/lib/animations';

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
}

export function AnimatedSection({ 
  children, 
  delay = 0, 
  duration = 0.8, 
  y = 50 
}: AnimatedSectionProps) {
  const ref = useFadeInAnimation({
    delay,
    duration,
    y,
    trigger: true
  });

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}