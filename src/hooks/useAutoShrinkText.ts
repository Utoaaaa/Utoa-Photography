import { DependencyList, RefObject, useEffect } from 'react';

interface AutoShrinkOptions {
  /**
   * Smallest font size in pixels we allow before giving up on shrinking.
   */
  minFontSize: number;
  /**
   * Number of pixels to decrement per adjustment step.
   * Defaults to 0.5px for smoother transitions.
   */
  step?: number;
  /**
   * Extra px tolerance before we consider the text overflowing vertically.
   */
  tolerance?: number;
}

/**
 * Shrinks the font size of an element until it fits on a single line of text.
 * The hook respects the element's default (CSS) font-size and only adjusts when
 * the text would overflow its container.
 */
export function useAutoShrinkText(
  targetRef: RefObject<HTMLElement | null>,
  options: AutoShrinkOptions,
  deps: DependencyList = [],
) {
  const { minFontSize, step = 0.5, tolerance = 0 } = options;

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;

    let frame: number | null = null;

    const shrinkToFit = () => {
      if (!target.isConnected) return;

      target.style.fontSize = '';

      const computedStyle = window.getComputedStyle(target);
      let currentFontSize = parseFloat(computedStyle.fontSize);

      if (!Number.isFinite(currentFontSize) || Number.isNaN(currentFontSize)) {
        return;
      }

      const measureWidth = () => {
        const previousWhiteSpace = target.style.whiteSpace;
        target.style.whiteSpace = 'nowrap';
        const width = target.scrollWidth;
        target.style.whiteSpace = previousWhiteSpace;
        return width;
      };

      const availableWidth = target.clientWidth;
      if (availableWidth === 0) return;

      let contentWidth = measureWidth();
      let guard = 0;

      if (contentWidth <= availableWidth + tolerance) {
        return;
      }

      while (contentWidth > availableWidth + tolerance && currentFontSize > minFontSize && guard < 120) {
        currentFontSize = Math.max(currentFontSize - step, minFontSize);
        target.style.fontSize = `${currentFontSize}px`;
        contentWidth = measureWidth();
        guard += 1;
      }
    };

    const scheduleShrink = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(shrinkToFit);
    };

    const resizeObserver = new ResizeObserver(scheduleShrink);
    resizeObserver.observe(target);

    scheduleShrink();

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      resizeObserver.disconnect();
    };
  }, [targetRef, minFontSize, step, tolerance, ...deps]);
}
