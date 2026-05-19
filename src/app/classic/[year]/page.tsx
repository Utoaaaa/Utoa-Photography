import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { buildYearHref } from '@/lib/site-paths';
import { getYearByLabel } from '@/lib/year-location';

interface YearPageProps {
  params: Promise<{
    year: string;
  }>;
}

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function ClassicYearPage({ params }: YearPageProps) {
  const { year: yearLabel } = await params;
  const decodedYearLabel = decodeURIComponent(yearLabel);
  const year = await getYearByLabel(decodedYearLabel);

  if (!year) {
    notFound();
  }

  redirect(buildYearHref(year.label, '/classic'));
}
