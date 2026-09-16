import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoViewer } from '../../src/components/ui/PhotoViewer';

const genPhoto = (id: string) => ({
  id,
  alt: `alt-${id}`,
  caption: `caption-${id}`,
  width: 1000,
  height: 800,
  metadata_json: null,
  created_at: new Date(),
});

type ActiveHandle = {
  constructor?: { name?: string };
  close?: () => void;
};

describe('PhotoViewer', () => {
  afterAll(() => {
    const getActiveHandles = (process as typeof process & { _getActiveHandles?: () => ActiveHandle[] })._getActiveHandles;
    if (!getActiveHandles) return;

    for (const handle of getActiveHandles()) {
      if (handle.constructor?.name === 'MessagePort' && typeof handle.close === 'function') {
        handle.close();
      }
    }
  });

  beforeEach(() => {
    window.scrollTo = jest.fn();
    process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH = 'TEST';
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(min-width: 1024px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('corrects a portrait stored with landscape EXIF dimensions from its preview', () => {
    const photo = { ...genPhoto('rotated'), width: 7008, height: 4672 };
    render(<PhotoViewer photos={[photo]} collectionTitle="C" />);
    const preview = screen.getByAltText('alt-rotated');
    Object.defineProperties(preview, { naturalWidth: { value: 300 }, naturalHeight: { value: 450 } });
    fireEvent.load(preview);
    expect(preview.parentElement).toHaveStyle({ aspectRatio: '4672 / 7008' });
    expect(preview.parentElement?.parentElement).not.toHaveStyle({ maxWidth: 'min(100%, 56vh)' });
  });

  it('does not turn a correctly recorded portrait into a square from a cropped preview', () => {
    const photo = { ...genPhoto('portrait'), width: 4672, height: 7008 };
    render(<PhotoViewer photos={[photo]} collectionTitle="C" />);
    const preview = screen.getByAltText('alt-portrait');
    Object.defineProperties(preview, { naturalWidth: { value: 300 }, naturalHeight: { value: 300 } });
    fireEvent.load(preview);
    expect(preview.parentElement).toHaveStyle({ aspectRatio: '4672 / 7008' });
  });

  it('renders traditional scroll viewer and dots', () => {
    const photos = [genPhoto('1'), genPhoto('2'), genPhoto('3')];
    render(
      <PhotoViewer photos={photos} collectionTitle="C" singleScreen={false} />
    );

    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();
    const items = screen.getAllByTestId('photo-container');
    expect(items.length).toBe(3);
    expect(screen.getByTestId('dot-navigation')).toBeInTheDocument();
  });

  it('renders single-screen mode and navigates via dots', () => {
    const photos = [genPhoto('1'), genPhoto('2'), genPhoto('3')];
    render(
      <PhotoViewer photos={photos} collectionTitle="C" singleScreen />
    );

    expect(screen.getByTestId('photo-viewer-single-screen')).toBeInTheDocument();
    const dots = screen.getAllByTestId('nav-dot');
    fireEvent.click(dots[2]);
    // Use the aria-live status to assert the active index
    expect(
      screen.getByRole('status', { name: /currently viewing photo 3 of 3/i })
    ).toBeInTheDocument();
  });

  it('preloads only adjacent previews after the current image is ready', async () => {
    const photos = [genPhoto('1'), genPhoto('2'), genPhoto('3')];
    render(<PhotoViewer photos={photos} collectionTitle="C" singleScreen={false} />);
    expect(document.querySelectorAll('link[rel="preload"]')).toHaveLength(0);
    fireEvent.load(document.querySelector('img[aria-hidden="true"]')!);
    await waitFor(() => {
      const links = document.querySelectorAll('link[rel="preload"]');
      expect(links.length).toBeGreaterThan(0);
      expect(links[0].getAttribute('href')).toContain('thumb');
      expect(links[0]).toHaveAttribute('fetchpriority', 'low');
    });
  });
});
