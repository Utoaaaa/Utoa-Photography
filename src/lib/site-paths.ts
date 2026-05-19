export function normalizeBasePath(basePath?: string) {
  const value = basePath?.trim() ?? '';

  if (value === '' || value === '/') {
    return '';
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

export function buildYearAnchorId(yearLabel: string) {
  return `year-${encodeURIComponent(yearLabel.replace(/\s+/g, '-'))}`;
}

export function buildHomeHref(basePath?: string) {
  return normalizeBasePath(basePath) || '/';
}

export function buildYearHref(yearLabel: string, basePath?: string) {
  return `${normalizeBasePath(basePath) || '/'}#${buildYearAnchorId(yearLabel)}`;
}

export function buildLocationHref(yearLabel: string, locationSlug: string, basePath?: string) {
  const base = normalizeBasePath(basePath);
  return `${base}/${encodeURIComponent(yearLabel)}/${encodeURIComponent(locationSlug)}`;
}

export function buildCollectionHref(
  yearLabel: string,
  locationSlug: string,
  collectionSlug: string,
  basePath?: string
) {
  return `${buildLocationHref(yearLabel, locationSlug, basePath)}/${encodeURIComponent(collectionSlug)}`;
}
