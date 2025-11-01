"use client";

import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
  dataTestId?: string;
  initialFocusRef?: React.RefObject<HTMLButtonElement | HTMLDivElement | HTMLElement>;
};

export default function AccessibleDialog({ open, titleId, onClose, children, dataTestId, initialFocusRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    const prevPaddingRight = style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      style.overflow = prevOverflow;
      style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = initialFocusRef?.current || containerRef.current?.querySelector('[data-autofocus]') || containerRef.current;
    if (el && 'focus' in el) (el as HTMLElement).focus();

    const handler = (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Escape') onClose();
      if (keyEvent.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]'
          )
        ).filter((n) => n.offsetParent !== null || getComputedStyle(n).visibility !== 'hidden');

        if (focusable.length === 0) {
          // No focusable children; keep focus on container
          (container as HTMLElement).focus();
          keyEvent.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const isShift = keyEvent.shiftKey;

        if (!active) return;

        if (!isShift && active === last) {
          keyEvent.preventDefault();
          first.focus();
        } else if (isShift && active === first) {
          keyEvent.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      data-testid={dataTestId}
      data-lenis-prevent
      data-lenis-prevent-wheel
      className="fixed inset-0 z-50 flex min-h-full items-center justify-center bg-black/30 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-5xl transform rounded bg-white p-4 shadow outline-none sm:min-w-[24rem] max-h-[90vh] overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
}
