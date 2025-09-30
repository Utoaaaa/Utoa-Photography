import { YearGrid } from '@/components/ui/YearGrid';
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
      <div className="min-h-screen bg-white">
      {/* Header with brand logo (T026) */}
      <header className="site-header geometric fixed top-0 left-0 z-50 p-6" role="banner">
        <span
          data-testid="brand"
          className="absolute top-0 left-0 text-sm md:text-base font-light tracking-widest text-gray-900"
        >
          utoa
        </span>
      </header>

    <main role="main" className="flex flex-col md:flex-col">
  {/* Hidden h1 for a11y and tests */}
  <h1 className="sr-only">Home</h1>

        {/* Hero Section with right-side geometric pattern (T026) */}
        <div>
          <section className="relative flex items-center justify-center min-h-[60vh] overflow-hidden">
            {/* Right-side geometric pattern - Hidden on mobile (T026) */}
            <div
              className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 opacity-10"
              data-testid="geometric-pattern"
              role="img"
              aria-label="geometric pattern decorative"
              aria-hidden="true"
            >
              <div
                className="w-80 h-80 opacity-5 relative absolute right-0 top-1/2 -translate-y-1/2"
                data-testid="hero-geometric"
                aria-hidden="true"
              >
              {/* Outer circle - camera body */}
              <div className="absolute inset-0 border-2 border-gray-900 rounded-full"></div>
              
              {/* Inner circle - lens */}
              <div className="absolute inset-12 border-2 border-gray-900 rounded-full"></div>
              
              {/* Central aperture */}
              <div className="absolute inset-24 border border-gray-900 rounded-full"></div>
              
              {/* Aperture blades */}
              <div className="absolute inset-20 flex items-center justify-center">
                <div className="w-6 h-6 border border-gray-900 rotate-45 transform"></div>
                <div className="absolute w-6 h-6 border border-gray-900 -rotate-45 transform"></div>
              </div>
              
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-gray-900"></div>
              <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-gray-900"></div>
              <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-gray-900"></div>
              <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-gray-900"></div>
              </div>
            </div>
            
            <div className="relative z-10 text-center space-y-8 mt-16">
              <h2 className="text-4xl md:text-6xl font-light tracking-widest text-gray-900">
                PHOTOGRAPHY
              </h2>
              <p className="text-base md:text-lg text-gray-700">Utoa Photography</p>
              <p className="text-lg md:text-xl text-gray-600 font-light tracking-wide">
                作品集
              </p>
            </div>
          </section>
        </div>

        {/* Years Timeline */}
        <div>
          <section className="px-8 py-16 max-w-7xl mx-auto">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-light tracking-wide text-gray-900 mb-4">
                Timeline
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Explore photography collections organized by year, capturing moments and stories through time.
              </p>
            </div>
            {hasError && (
              <p className="text-center text-red-600">Error loading years. Please try again.</p>
            )}
            
            <YearGrid years={years} />
          </section>
        </div>
      </main>
      </div>
  );
}
