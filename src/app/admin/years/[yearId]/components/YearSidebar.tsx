'use client';

import Link from 'next/link';

import type { YearSummary } from '../types';

type YearSidebarProps = {
  years: YearSummary[];
  yearsLoading: boolean;
  yearsError: string | null;
  selectedYearId: string | null;
  currentYearIdentifier: string;
  onYearNavigated?: () => void;
};

export default function YearSidebar({
  years,
  yearsLoading,
  yearsError,
  selectedYearId,
  currentYearIdentifier,
  onYearNavigated,
}: YearSidebarProps) {
  if (yearsLoading) {
    return <div className="p-5 text-sm text-gray-500">載入年份中…</div>;
  }

  if (yearsError) {
    return (
      <div className="p-5 text-sm text-red-600" data-testid="years-error">
        {yearsError}
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <div className="p-5 text-sm text-gray-500" data-testid="years-empty">
        尚未建立任何年份。
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100/70" data-testid="years-sidebar-list">
      {years.map((year) => {
        const isActive = selectedYearId ? year.id === selectedYearId : year.id === currentYearIdentifier;
        return (
          <li key={year.id}>
            <Link
              href={`/admin/years/${year.id}`}
              className={`flex items-center justify-between px-5 py-3.5 text-sm transition-colors ${
                isActive ? 'bg-blue-50/80 text-blue-700 font-medium ring-1 ring-blue-100' : 'hover:bg-gray-50'
              }`}
              data-testid={isActive ? 'year-item-active' : 'year-item'}
              aria-current={isActive ? 'page' : undefined}
              onClick={onYearNavigated}
            >
              <span>{year.label}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                  year.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {year.status === 'published' ? '已發布' : '草稿'}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
