import { YearGrid } from '@/components/ui/YearGrid';
import { CameraWireAnimation } from '@/components/ui/CameraWireAnimation';
import { getPublishedYears } from '@/lib/queries/years';

export const dynamic = 'force-dynamic';

export default async function Homepage() {
  let years: any[] = [];
  let hasError = false;
  const getApiBaseUrl = () => {
    const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
    const site = process.env.NEXT_PUBLIC_SITE_URL || vercel || 'http://localhost:3000';
    return site.replace(/\/$/, '');
  };
  try {
  const res = await fetch(`${getApiBaseUrl()}/api/years?status=published&order=asc`, { cache: 'no-store' });
    if (res.ok) {
      years = await res.json();
    } else {
      hasError = true;
      years = [];
    }
  } catch {
    hasError = true;
    years = [];
  }
  // Only fallback when primary fetch failed
  if (hasError && years.length === 0) {
    try {
      const fallbackYears = await getPublishedYears();
      if (Array.isArray(fallbackYears) && fallbackYears.length > 0) {
        years = fallbackYears as any[];
        // keep hasError to indicate API issue while showing data from fallback
      }
    } catch {
      // ignore; keep empty state
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with brand name in serif font */}
      <header className="fixed top-0 left-0 z-10 px-8 py-10 md:px-12 md:py-12" role="banner">
        <div className="text-gray-900">
          <div className="font-serif text-2xl md:text-3xl lg:text-4xl font-light leading-none tracking-wide">
            Utoa
          </div>
          <div className="font-serif text-2xl md:text-3xl lg:text-4xl font-light leading-none tracking-wide mt-1">
            Photography
          </div>
        </div>
      </header>

      <main role="main" className="flex flex-col" data-main-content>
        {/* Hidden h1 for a11y and tests */}
        <h1 className="sr-only">Home</h1>

        {/* First Page: Camera Animation - Full viewport height */}
        <section className="min-h-screen flex items-center justify-center px-8 md:px-12">
          {/* Desktop: Right half | Mobile: Center */}
          <div className="w-full lg:ml-[50%] lg:pr-12 flex items-center justify-center">
            <CameraWireAnimation className="text-gray-800 opacity-80" />
          </div>
        </section>

        {/* Second Page: Years Timeline - Starts after first viewport */}
        <section className="min-h-screen px-8 md:px-12 py-20 flex items-center justify-center">
          <div className="w-full max-w-7xl mx-auto">
            {hasError && (
              <p className="text-center text-red-600 mb-8">Error loading years. Please try again.</p>
            )}
            
            <YearGrid years={years} />
          </div>
        </section>
      </main>
    </div>
  );
}
