import { notFound, redirect } from 'next/navigation';
import { buildYearHref } from '@/lib/site-paths';
import { getYearByLabel } from '@/lib/queries/years';

interface YearPageProps {
  params: Promise<{
    year: string;
  }>;
}

export default async function YearPage({ params }: YearPageProps) {
  const { year: yearLabel } = await params;
  const decodedYearLabel = decodeURIComponent(yearLabel);
  const year = await getYearByLabel(decodedYearLabel);

  if (!year) {
    notFound();
  }

  redirect(buildYearHref(year.label));
}
