'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';

import { LocationCard } from '@/components/LocationCard';
import type { YearEntry } from '@/lib/year-location';

interface YearSwitcherProps {
  years: YearEntry[];
}

export function YearSwitcher({ years }: YearSwitcherProps) {
  const initialYear = useMemo(() => {
    const withLocations = years.find((year) => year.locations.length > 0);
    return (withLocations ?? years[0])?.label ?? '';
  }, [years]);

  const [activeYearLabel, setActiveYearLabel] = useState(initialYear);

  const activeYear = useMemo(
    () => years.find((year) => year.label === activeYearLabel) ?? years[0] ?? null,
    [activeYearLabel, years],
  );

  if (!activeYear) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/70 p-10 text-center text-gray-500">
        尚無年份資料可供顯示。
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="year-switcher">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="年份選擇">
        {years.map((year) => {
          const isActive = year.label === activeYearLabel;
          return (
            <button
              key={year.id}
              type="button"
              role="tab"
              id={`year-tab-${year.label}`}
              aria-selected={isActive}
              aria-controls={`year-panel-${year.label}`}
              className={clsx(
                'rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2',
                isActive
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:text-gray-900',
              )}
              onClick={() => setActiveYearLabel(year.label)}
            >
              {year.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`year-panel-${activeYear.label}`} aria-labelledby={`year-tab-${activeYear.label}`}>
        {activeYear.locations.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {activeYear.locations.map((location) => (
              <LocationCard key={location.id} yearLabel={activeYear.label} location={location} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-10 text-center text-gray-500" data-testid="empty-locations">
            該年份的地點即將揭曉，敬請期待。
          </div>
        )}
      </div>

      <noscript>
        <div className="space-y-10">
          {years.map((year) => (
            <section key={year.id} className="rounded-xl border border-gray-200 bg-white/70 p-6">
              <header className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{year.label}</h3>
                <span className="text-sm text-gray-500">{year.locations.length} 個地點</span>
              </header>
              {year.locations.length > 0 ? (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {year.locations.map((location) => (
                    <li key={location.id}>
                      <article className="space-y-2">
                        <h4 className="text-lg font-medium text-gray-900">{location.name}</h4>
                        <p className="text-sm text-gray-600">{location.summary ?? '敬請期待更多作品。'}</p>
                        <a
                          href={`/${encodeURIComponent(year.label)}/${encodeURIComponent(location.slug)}`}
                          className="text-sm font-medium text-gray-900 underline"
                        >
                          查看作品
                        </a>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">該年份的地點即將揭曉。</p>
              )}
            </section>
          ))}
        </div>
      </noscript>
    </div>
  );
}
