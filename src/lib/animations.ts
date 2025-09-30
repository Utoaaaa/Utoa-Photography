'use client';

import { useEffect, useRef } from 'react';

// Completely disable animations to avoid any GSAP-related runtime errors
// This is a temporary solution to ensure the page loads properly

export function useGSAPAnimation() {
  const elementRef = useRef<HTMLDivElement>(null);
  
  return {
    elementRef,
    isReady: false,
  };
}

export function useFadeInAnimation(_options?: {
  delay?: number;
  duration?: number;
  y?: number;
  trigger?: boolean;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    // Simply make element visible immediately
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, []);
  
  return elementRef;
}

export function useStaggerAnimation(_options?: {
  stagger?: number;
  delay?: number;
  duration?: number;
  y?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Simply make all children visible immediately
    const children = container.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child instanceof HTMLElement) {
        child.style.opacity = '1';
        child.style.transform = 'translateY(0)';
      }
    }
  }, []);
  
  return containerRef;
}

export function useHoverAnimation() {
  const elementRef = useRef<HTMLDivElement>(null);
  
  // No hover animations - just return the ref
  return elementRef;
}
