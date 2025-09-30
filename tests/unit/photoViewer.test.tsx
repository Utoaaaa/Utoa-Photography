import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
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

describe('PhotoViewer', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH = 'TEST';
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

  it('preloads adjacent images without crashing', async () => {
    const photos = [genPhoto('1'), genPhoto('2'), genPhoto('3')];
    render(<PhotoViewer photos={photos} collectionTitle="C" singleScreen />);
    await waitFor(() => {
      const links = document.querySelectorAll('link[rel="preload"]');
      expect(links.length).toBeGreaterThan(0);
    });
  });
});
