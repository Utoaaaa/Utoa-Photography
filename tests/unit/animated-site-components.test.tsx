import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

import {
  AnimatedArchiveHome,
  AnimatedCollectionShell,
  AnimatedLocationArchive,
} from '../../src/components/site/animated';
import { buildYearAnchorId, buildYearHref } from '../../src/lib/site-paths';
import type { YearEntry } from '../../src/lib/year-location';
import type { CollectionViewerPayload } from '../../src/lib/viewer/collection';

const liveYear: YearEntry = {
  id: 'year-2026',
  label: '2026',
  orderIndex: '0001',
  status: 'published',
  locations: [
    {
      id: 'loc-taipei-rain-26',
      yearId: 'year-2026',
      slug: 'taipei-rain-26',
      name: 'Taipei Rain',
      summary: 'Wet neon, station glass, and a midnight walk through narrow streets.',
      coverAssetId: 'location-cover-asset',
      orderIndex: '0001',
      collectionCount: 1,
      collections: [
        {
          id: 'collection-night-walk',
          slug: 'night-walk',
          title: 'Night Walk',
          summary: 'A compact sequence from the blue hour into late rain.',
          photoCount: 1,
          coverAssetId: null,
          coverAssetWidth: null,
          coverAssetHeight: null,
          orderIndex: '0001',
          capturedAt: '2026-03-04T00:00:00.000Z',
          publishedAt: '2026-03-05T00:00:00.000Z',
          updatedAt: '2026-03-06T00:00:00.000Z',
        },
      ],
    },
  ],
};

const emptyLocationYear: YearEntry = {
  id: 'year-2025',
  label: '2025',
  orderIndex: '0000',
  status: 'published',
  locations: [],
};

const viewerPayload: CollectionViewerPayload = {
  year: { id: liveYear.id, label: liveYear.label },
  location: {
    id: liveYear.locations[0].id,
    slug: liveYear.locations[0].slug,
    name: liveYear.locations[0].name,
    summary: liveYear.locations[0].summary,
  },
  collection: {
    id: liveYear.locations[0].collections[0].id,
    slug: liveYear.locations[0].collections[0].slug,
    title: liveYear.locations[0].collections[0].title,
    summary: liveYear.locations[0].collections[0].summary,
  },
  photos: [
    {
      id: 'photo-asset-1',
      alt: 'Lantern in rain',
      caption: 'A lantern reflected in a wet alley.',
      width: 1600,
      height: 1200,
    },
  ],
};

type ActiveHandle = {
  constructor?: { name?: string };
  close?: () => void;
};

describe('animated site components', () => {
  afterAll(() => {
    const getActiveHandles = (process as typeof process & { _getActiveHandles?: () => ActiveHandle[] })._getActiveHandles;
    if (!getActiveHandles) return;

    for (const handle of getActiveHandles()) {
      if (handle.constructor?.name === 'MessagePort' && typeof handle.close === 'function') {
        handle.close();
      }
    }
  });

  it('renders the homepage archive with live year and location data plus real cover images', () => {
    render(<AnimatedArchiveHome years={[liveYear]} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Moment in Focus' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Years in Places' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: liveYear.label })).toBeInTheDocument();
    const yearSection = screen.getByTestId('animated-year-section');
    expect(yearSection).toHaveAttribute('id', buildYearAnchorId(liveYear.label));
    expect(buildYearHref(liveYear.label)).toBe(`/#${yearSection.id}`);

    const locationLink = screen.getByTestId('animated-location-card');
    expect(locationLink).toHaveAttribute('href', '/2026/taipei-rain-26');

    const coverImage = screen.getByAltText('Taipei Rain cover visual');
    expect(coverImage.tagName).toBe('IMG');
    expect(coverImage).toHaveAttribute('src', '/images/location-cover-asset/thumb');
    expect(coverImage.parentElement?.querySelector('img[aria-hidden]')).toHaveAttribute(
      'srcset',
      '/images/location-cover-asset/thumb 300w, /images/location-cover-asset/medium 1200w, /images/location-cover-asset/large 3840w'
    );
  });

  it('keeps the homepage empty-years fallback for no published years', () => {
    render(<AnimatedArchiveHome years={[]} />);

    expect(screen.getByTestId('empty-years')).toHaveTextContent('尚無發佈的年份與地點');
    expect(screen.queryByTestId('animated-location-card')).not.toBeInTheDocument();
  });

  it('keeps year-level empty locations and prioritizes the first non-empty location cover', () => {
    render(<AnimatedArchiveHome years={[emptyLocationYear, liveYear]} />);

    expect(screen.getByTestId('empty-locations')).toHaveTextContent('該年份的地點即將揭曉');
    expect(screen.getByAltText('Taipei Rain cover visual')).toHaveAttribute('fetchpriority', 'high');
  });

  it('renders location collections with a deterministic fallback only when a cover is missing', () => {
    render(<AnimatedLocationArchive year={liveYear} location={liveYear.locations[0]} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Taipei Rain' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: liveYear.label })).toHaveAttribute('href', '/#year-2026');
    expect(screen.getByTestId('animated-location-collections')).toBeInTheDocument();

    const collectionLink = screen.getByTestId('animated-collection-card');
    expect(collectionLink).toHaveAttribute('href', '/2026/taipei-rain-26/night-walk');
    expect(within(collectionLink).getByText('2026/03/04')).toBeInTheDocument();
    expect(within(collectionLink).getByText('1 photo')).toBeInTheDocument();

    const fallback = screen.getByTestId('animated-cover-fallback');
    expect(fallback).toHaveAccessibleName('Night Walk collection cover visual');
    expect(fallback).toHaveAttribute('data-tone', '1');
    expect(screen.queryByAltText('Night Walk collection cover visual')).not.toBeInTheDocument();
  });

  it('renders a deterministic empty state for locations without collections', () => {
    render(<AnimatedLocationArchive year={liveYear} location={{ ...liveYear.locations[0], collections: [] }} />);

    expect(screen.getByTestId('animated-location-collections')).toBeInTheDocument();
    expect(screen.getByTestId('animated-empty-collections')).toHaveTextContent(
      'Collections will appear here after publication.'
    );
    expect(screen.queryByTestId('animated-collection-card')).not.toBeInTheDocument();
  });

  it('renders the collection shell header and integrates the live viewer payload', () => {
    render(<AnimatedCollectionShell data={viewerPayload} />);

    expect(screen.getByTestId('animated-collection-shell')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Night Walk' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: liveYear.label })).toHaveAttribute('href', '/#year-2026');
    expect(screen.getByRole('link', { name: 'Taipei Rain' })).toHaveAttribute('href', '/2026/taipei-rain-26');
    expect(screen.getByTestId('photo-viewer')).toBeInTheDocument();

    const photo = screen.getByAltText('Lantern in rain');
    expect(photo.tagName).toBe('IMG');
    expect(photo).toHaveAttribute('src', '/images/photo-asset-1/thumb');
    expect(photo.parentElement?.querySelector('img[aria-hidden]')).toHaveAttribute(
      'srcset',
      '/images/photo-asset-1/thumb 300w, /images/photo-asset-1/small 960w, /images/photo-asset-1/medium 1200w, /images/photo-asset-1/desktop 1600w'
    );
  });

  it('renders the collection empty-photo fallback with the production selector', () => {
    render(<AnimatedCollectionShell data={{ ...viewerPayload, photos: [] }} />);

    expect(screen.getByTestId('empty-photos')).toHaveTextContent('Photos will appear here after upload.');
    expect(screen.queryByTestId('photo-viewer')).not.toBeInTheDocument();
  });
});
