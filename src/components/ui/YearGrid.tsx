'use client';

import Link from 'next/link';
import type { getPublishedYears } from '@/lib/queries/years';
import { useStaggerAnimation, useHoverAnimation } from '@/lib/animations';

type Year = Awaited<ReturnType<typeof getPublishedYears>>[0];

interface YearGridProps {
  years: Year[];
}

export function YearGrid({ years }: YearGridProps) {
  const gridRef = useStaggerAnimation({
    stagger: 0.1,
    delay: 0.2,
    duration: 0.8,
    y: 30
  });

  if (years.length === 0) {
    return (
      <div className="text-center py-16" data-testid="empty-years">
        <p className="text-gray-500 text-lg">No years available yet.</p>
      </div>
    );
  }

  return (
    <div 
      ref={gridRef}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
      data-testid="years-grid"
    >
      {years.map((year) => (
        <YearBox key={year.id} year={year} />
      ))}
    </div>
  );
}

function YearBox({ year }: { year: Year }) {
  const hoverRef = useHoverAnimation();

  return (
    <Link
      href={`/${encodeURIComponent(year.label)}`}
      className="group focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded"
      data-testid="year-box"
    >
      <div 
        ref={hoverRef}
        className="relative aspect-square bg-white border border-gray-200 hover:border-gray-400 transition-all duration-300 group-hover:shadow-lg rounded flex items-center justify-center overflow-hidden"
      >
        {/* Background geometric pattern */}
        <div 
          className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
          aria-hidden="true"
        >
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-transparent to-gray-900"></div>
          
          {/* Central cross pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-gray-900"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-gray-900"></div>
          </div>
          
          {/* Corner elements */}
          <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-gray-900"></div>
          <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-gray-900"></div>
          <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-gray-900"></div>
          <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-gray-900"></div>
        </div>
        
        {/* Year label */}
        <div className="relative z-10 text-center">
          <span className="text-2xl md:text-3xl font-light tracking-wider text-gray-900 group-hover:text-gray-700 transition-colors duration-300">
            {year.label}
          </span>
        </div>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gray-50 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      </div>
    </Link>
  );
}