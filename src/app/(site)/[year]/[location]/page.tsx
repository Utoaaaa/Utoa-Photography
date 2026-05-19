import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AnimatedLocationArchive } from '@/components/site/animated';
import { getLocationByYearAndSlugCached } from '@/lib/year-location';

export const dynamic = 'force-dynamic';

interface LocationPageParams {
  params: Promise<{
    year: string;
    location: string;
  }>;
}

export async function generateMetadata({ params }: LocationPageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const yearLabel = decodeURIComponent(resolvedParams.year);
  const locationSlug = decodeURIComponent(resolvedParams.location);
  const result = await getLocationByYearAndSlugCached(yearLabel, locationSlug);

  if (!result) {
    return {
      title: '找不到地點 | UTOA Photography',
    };
  }

  const { year, location } = result;
  const description = location.summary ?? '探索該地點的攝影作品與故事。';
  const canonical = `/${encodeURIComponent(year.label)}/${encodeURIComponent(location.slug)}`;

  return {
    title: `${location.name} — ${year.label} | UTOA Photography`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${location.name} — ${year.label} | UTOA Photography`,
      description,
      url: canonical,
    },
    twitter: {
      title: `${location.name} — ${year.label} | UTOA Photography`,
      description,
    },
  };
}

export default async function LocationPage({ params }: LocationPageParams) {
  const resolvedParams = await params;
  const yearLabel = decodeURIComponent(resolvedParams.year);
  const locationSlug = decodeURIComponent(resolvedParams.location);
  const result = await getLocationByYearAndSlugCached(yearLabel, locationSlug);

  if (!result) {
    notFound();
  }

  const { year, location } = result;

  return <AnimatedLocationArchive year={year} location={location} />;
}
