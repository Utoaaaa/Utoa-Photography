import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { generateSrcSet } from '@/lib/images';

describe('responsive progressive images', () => {
  it('describes portrait variants using their actual width, sorted ascending', () => {
    const srcset = generateSrcSet('portrait', 2000, 3000);
    expect(srcset).toContain('/small 640w');
    expect(srcset).toContain('/desktop 1280w');
    const widths = srcset.split(', ').map(part => Number(part.match(/ (\d+)w$/)?.[1]));
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
  });

  it('does not upscale the new variants for small originals', () => {
    const srcset = generateSrcSet('small-original', 800, 600);
    expect(srcset).toContain('/small 800w');
    expect(srcset).not.toContain('/desktop');
  });

  it('keeps the preview visible until full image decoding completes', async () => {
    const onReady = jest.fn();
    const { container } = render(<ProgressiveImage assetId="one" alt="A photo" width={3000} height={2000} priority onReady={onReady} />);
    const full = container.querySelector('img[aria-hidden]') as HTMLImageElement;
    let decode!: () => void;
    full.decode = () => new Promise<void>(resolve => { decode = resolve; });
    fireEvent.load(full);
    expect(container.firstChild).toHaveAttribute('data-image-ready', 'false');
    expect(onReady).not.toHaveBeenCalled();
    await act(async () => { decode(); });
    expect(container.firstChild).toHaveAttribute('data-image-ready', 'true');
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(screen.getByAltText('A photo')).toHaveClass('opacity-100');
    expect(screen.getByAltText('A photo')).not.toHaveClass('opacity-0');
    expect(screen.getByAltText('A photo')).toBeInTheDocument();
  });

  it('does not mount full-size offscreen images before intersection', () => {
    const { container } = render(<ProgressiveImage assetId="far" alt="Later" width={3000} height={2000} />);
    expect(container.querySelector('img[aria-hidden]')).toBeNull();
  });

  it('resets preview state on navigation and ignores late decode completion', async () => {
    const onReady = jest.fn();
    const { container, rerender } = render(<ProgressiveImage assetId="one" alt="One" priority onReady={onReady} />);
    const full = container.querySelector('img[aria-hidden]') as HTMLImageElement;
    let decode!: () => void;
    full.decode = () => new Promise<void>(resolve => { decode = resolve; });
    fireEvent.load(full);
    rerender(<ProgressiveImage assetId="two" alt="Two" priority onReady={onReady} />);
    await act(async () => { decode(); });
    expect(container.firstChild).toHaveAttribute('data-image-ready', 'false');
    expect(onReady).not.toHaveBeenCalled();
  });

  it('falls back to legacy responsive images, then a bounded final attempt', async () => {
    const { container } = render(<ProgressiveImage assetId="one" alt="One" width={3000} height={2000} priority />);
    const full = container.querySelector('img[aria-hidden]')!;
    fireEvent.error(full);
    await waitFor(() => expect(full.getAttribute('srcset')).not.toContain('/small'));
    expect(full.getAttribute('srcset')).not.toContain('/desktop');
    expect(full.getAttribute('srcset')).toContain('/medium 1200w');
    fireEvent.error(full);
    await waitFor(() => expect(full).not.toHaveAttribute('srcset'));
    expect(full.getAttribute('src')).toContain('large');
    fireEvent.error(full);
    expect(full).not.toHaveAttribute('srcset');
    expect(container.firstChild).toHaveAttribute('data-image-ready', 'false');
  });

});

// The test runtime exposes MessageChannel; release React scheduler ports.
afterAll(() => {
  const getHandles = (process as typeof process & { _getActiveHandles?: () => { constructor?: { name?: string }; close?: () => void }[] })._getActiveHandles;
  if (getHandles) for (const handle of getHandles()) {
    if (handle.constructor?.name === 'MessagePort' && handle.close) handle.close();
  }
});
