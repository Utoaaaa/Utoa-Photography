const DEFAULT_SITE_URL = 'https://utoa.studio';

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, '');
}

export function getSiteUrlMetadataBase() {
  return new URL(getSiteUrl());
}
