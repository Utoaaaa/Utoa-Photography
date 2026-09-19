import type { Metadata } from 'next';

import { AnimatedArchiveHome } from '@/components/site/animated';
import { getPageSEO } from '@/lib/seo/store';
import { loadYearLocationData } from '@/lib/year-location';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return getPageSEO('homepage', 'homepage', {
    title: 'UTOA Photography', description: 'Moments In Focus',
  }, '/');
}

export default async function Homepage() {
  const data = await loadYearLocationData().catch((error) => {
    console.error('Failed to load year-location data for homepage:', error);
    return { generatedAt: '', years: [] };
  });

  const years = data.years
    .filter((year) => year.status === 'published')
    .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));

  return <AnimatedArchiveHome years={years} />;
}
