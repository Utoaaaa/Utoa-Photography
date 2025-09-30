"use client";

import { useRouter } from 'next/navigation';

interface Year {
  id: string;
  label: string;
}

interface YearGridProps {
  years: Year[];
}

export function YearGrid({ years }: YearGridProps) {
  const router = useRouter();
  if (years.length === 0) {
    return (
      <div className="text-center py-16" data-testid="empty-years">
        <p className="text-gray-500 text-lg">No years available yet.</p>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 responsive"
      data-testid="years-grid"
      role="grid"
    >
      {years.map((year) => (
        <YearBox key={year.id} year={year} onNavigate={(href) => router.push(href)} />
      ))}
    </div>
  );
}

function YearBox({ year, onNavigate }: { year: Year; onNavigate: (href: string) => void }) {
  return (
    <a
      href={`/${encodeURIComponent(year.label)}`}
      className="group focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded aspect-square transition"
      role="button"
      data-testid="year-box"
      data-year-link
      onClick={(e) => {
        e.preventDefault();
        const href = `/${encodeURIComponent(year.label)}`;
        onNavigate(href);
      }}
    >
      <div 
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
    </a>
  );
}