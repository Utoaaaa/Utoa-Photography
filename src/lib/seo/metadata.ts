import type { Metadata } from 'next';

export type SEOEntityType = 'homepage' | 'location' | 'collection';
export interface SEOFields {
  title: string | null;
  description: string | null;
  og_asset_id: string | null;
}
export interface SEOImage { url: string; alt: string }
export interface SEOTarget {
  type: SEOEntityType;
  id: string;
  label: string;
  path: string;
  defaultTitle: string;
  defaultDescription: string;
}
export interface SEOEditorData {
  target: SEOTarget;
  fields: SEOFields;
  images: Array<SEOImage & { id: string }>;
  siteUrl: string;
  defaultImage: SEOImage;
}
export const EMPTY_SEO: SEOFields = { title: null, description: null, og_asset_id: null };
export const DEFAULT_SEO_IMAGE: SEOImage = {
  url: '/assets/og-camera.svg', alt: 'UTOA camera wireframe illustration',
};

// Shared by the metadata renderer and the admin preview; never used by visible page components.
export function resolveSEO(defaults: { title: string; description: string }, fields: SEOFields | null) {
  return {
    title: fields?.title?.trim() || defaults.title,
    description: fields?.description?.trim() || defaults.description,
  };
}

export function buildPageMetadata({ defaults, fields, path, siteUrl, image }: {
  defaults: { title: string; description: string };
  fields: SEOFields | null;
  path: string;
  siteUrl: string;
  image?: SEOImage | null;
}): Metadata {
  const text = resolveSEO(defaults, fields);
  const selected = image ?? DEFAULT_SEO_IMAGE;
  const images = [{ url: new URL(selected.url, siteUrl).href, alt: selected.alt }];
  const url = new URL(path, siteUrl).href;
  return {
    ...text,
    alternates: { canonical: url },
    openGraph: { ...text, url, siteName: 'UTOA Photography', type: 'website', images },
    twitter: { ...text, card: 'summary_large_image', images },
  };
}
