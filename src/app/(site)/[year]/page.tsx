import { notFound, redirect } from 'next/navigation';
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

  const anchorSafeLabel = decodedYearLabel.replace(/\s+/g, '-');

  redirect(`/#year-${encodeURIComponent(anchorSafeLabel)}`);
}