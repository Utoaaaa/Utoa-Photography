'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function useGSAPAnimation() {
  const elementRef = useRef<HTMLDivElement>(null);
  
  return {
    elementRef,
    gsap,
    ScrollTrigger,
  };
}

export function useFadeInAnimation(options?: {
  delay?: number;
  duration?: number;
  y?: number;
  trigger?: boolean;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      return;
    }
    
    const {
      delay = 0,
      duration = 0.8,
      y = 30,
      trigger = true
    } = options || {};
    
    // Set initial state
    gsap.set(element, {
      opacity: 0,
      y: y,
    });
    
    if (trigger) {
      // Animate when element enters viewport
      gsap.to(element, {
        opacity: 1,
        y: 0,
        duration,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
      });
    } else {
      // Animate immediately
      gsap.to(element, {
        opacity: 1,
        y: 0,
        duration,
        delay,
        ease: 'power2.out',
      });
    }
  }, [options]);
  
  return elementRef;
}

export function useStaggerAnimation(options?: {
  stagger?: number;
  delay?: number;
  duration?: number;
  y?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      return;
    }
    
    const {
      stagger = 0.1,
      delay = 0,
      duration = 0.6,
      y = 20
    } = options || {};
    
    const children = container.children;
    
    // Set initial state for all children
    gsap.set(children, {
      opacity: 0,
      y: y,
    });
    
    // Animate children with stagger
    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      stagger,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
    });
  }, [options]);
  
  return containerRef;
}

export function useHoverAnimation() {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      return;
    }
    
    const handleMouseEnter = () => {
      gsap.to(element, {
        scale: 1.02,
        duration: 0.3,
        ease: 'power2.out',
      });
    };
    
    const handleMouseLeave = () => {
      gsap.to(element, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    };
    
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  return elementRef;
}