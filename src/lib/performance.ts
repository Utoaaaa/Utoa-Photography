// Web Vitals monitoring
export interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  id: string;
  delta: number;
  navigationType: string;
}

export function reportWebVitals(metric: WebVitalsMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);
  }
  
  // In production, you could send this to an analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }
    
    // Example: send to custom analytics endpoint
    // fetch('/api/analytics/web-vitals', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metric),
    // });
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static startTimes = new Map<string, number>();
  
  static start(label: string): void {
    this.startTimes.set(label, performance.now());
  }
  
  static end(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`Performance monitoring: No start time found for "${label}"`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.startTimes.delete(label);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  static measure(label: string, fn: () => void): void {
    this.start(label);
    fn();
    this.end(label);
  }
  
  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }
}

// Resource loading performance
export function trackResourceLoading() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('load', () => {
    // Measure navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics = {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      download: navigation.responseEnd - navigation.responseStart,
      domParse: navigation.domContentLoadedEventEnd - navigation.responseEnd,
      total: navigation.loadEventEnd - navigation.fetchStart,
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.table(metrics);
    }
  });
  
  // Track resource timing
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming;
        
        // Log slow resources
        if (resource.duration > 1000) {
          console.warn(`Slow resource: ${resource.name} (${resource.duration.toFixed(2)}ms)`);
        }
      }
    });
  });
  
  observer.observe({ entryTypes: ['resource'] });
}

// Image loading performance
export function trackImageLoading(imageElement: HTMLImageElement, label: string) {
  const startTime = performance.now();
  
  const onLoad = () => {
    const loadTime = performance.now() - startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Image Load] ${label}: ${loadTime.toFixed(2)}ms`);
    }
    
    imageElement.removeEventListener('load', onLoad);
    imageElement.removeEventListener('error', onError);
  };
  
  const onError = () => {
    console.error(`[Image Error] Failed to load: ${label}`);
    imageElement.removeEventListener('load', onLoad);
    imageElement.removeEventListener('error', onError);
  };
  
  imageElement.addEventListener('load', onLoad);
  imageElement.addEventListener('error', onError);
}

// Bundle size analysis
export function analyzeBundle() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }
  
  // Simple bundle analysis
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  let totalSize = 0;
  
  scripts.forEach((script) => {
    const src = (script as HTMLScriptElement).src;
    if (src.includes('/_next/static/')) {
      // Estimate size based on common patterns
      if (src.includes('framework')) {
        totalSize += 40; // ~40KB for React framework
      } else if (src.includes('main')) {
        totalSize += 20; // ~20KB for main bundle
      } else if (src.includes('pages')) {
        totalSize += 10; // ~10KB per page
      }
    }
  });
  
  console.log(`[Bundle Analysis] Estimated total JS size: ~${totalSize}KB`);
}

// Core Web Vitals thresholds
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  TTFB: { good: 800, needsImprovement: 1800 },
} as const;

export function getVitalScore(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[metric as keyof typeof WEB_VITALS_THRESHOLDS];
  
  if (!thresholds) return 'good';
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}