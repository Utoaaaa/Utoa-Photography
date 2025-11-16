import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CollectionGrid } from '@/components/CollectionGrid';
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

  return {
    title: `${location.name} — ${year.label} | UTOA Photography`,
    description,
    openGraph: {
      title: `${location.name} — ${year.label} | UTOA Photography`,
      description,
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
  const yearHref = `/${encodeURIComponent(year.label)}`;

  return (
    <main className="min-h-screen bg-background px-8 py-28 md:px-12 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <header className="space-y-4">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
            <Link href="/" className="text-gray-500 transition hover:text-gray-900">
              首頁
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={yearHref} className="text-gray-500 transition hover:text-gray-900">
              {year.label}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-gray-900" aria-current="page">
              {location.name}
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Location</p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
              {location.name}
            </h1>
          </div>
          {location.summary ? (
            <p className="max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
              {location.summary}
            </p>
          ) : (
            <p className="max-w-3xl text-base leading-relaxed text-gray-500">
              這個地點的故事即將揭曉，敬請期待後續作品。
            </p>
          )}
          <div>
            <Link
              href={yearHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              <span aria-hidden="true">←</span>
              返回 {year.label} 年其他地點
            </Link>
          </div>
        </header>

        <section className="space-y-6" data-testid="location-collections">
          {location.collections.length > 0 ? (
            <CollectionGrid yearLabel={year.label} locationSlug={location.slug} collections={location.collections} />
          ) : (
            <div
              className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-12 text-center text-gray-500"
              data-testid="location-empty"
            >
              <div className="mx-auto max-w-lg space-y-4">
                <h2 className="text-xl font-medium text-gray-800">敬請期待新的作品集</h2>
                <p className="text-sm leading-relaxed text-gray-600">
                  我們正在整理 {location.name} 的精彩故事。完成後會第一時間在這裡上映。
                </p>
                <div className="pt-4">
                  <Link
                    href={yearHref}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                  >
                    返回 {year.label} 年其他地點
                    <span aria-hidden="true" className="text-base">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
