import { CameraWireAnimation } from '@/components/ui/CameraWireAnimation';
import { FadeInText } from '@/components/ui/FadeInText';
import { LocationCard } from '@/components/LocationCard';
import GlassSurface from '@/components/ui/GlassSurface';
import { loadYearLocationData } from '@/lib/year-location';

export const dynamic = 'force-dynamic';

export default async function Homepage() {
  const data = await loadYearLocationData().catch((error) => {
    console.error('Failed to load year-location data for homepage:', error);
    return { generatedAt: '', years: [] };
  });

  const years = data.years
    .filter((year) => year.status === 'published')
    .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
  const hasYears = years.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with brand name in serif font */}
      <header
        data-brand-header
        className="fixed top-0 left-0 z-10 px-8 md:px-12 pb-10 md:pb-12"
        role="banner"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        <div className="text-gray-900">
          <GlassSurface
            width="max-content"
            height="max-content"
            borderRadius={24}
            backgroundOpacity={0.05}
            saturation={1.4}
            className="inline-block pointer-events-none"
          >
            <div className="px-3 py-2 md:px-4 md:py-3">
              <div className="font-serif text-2xl md:text-3xl lg:text-4xl font-normal leading-none tracking-wide">
                Utoa
              </div>
              <div className="font-serif text-2xl md:text-3xl lg:text-4xl font-normal leading-none tracking-wide mt-1">
                Photography
              </div>
            </div>
          </GlassSurface>
        </div>
      </header>
      <style>{`@media (min-width: 768px){ header[data-brand-header]{ padding-top: calc(env(safe-area-inset-top) + 3rem); } }`}</style>

  <main role="main" className="relative z-[2]" data-main-content>
        {/* Hidden h1 for a11y and tests */}
        <h1 className="sr-only">Home</h1>

        <section className="flex min-h-screen flex-col px-8 md:px-12 pt-10 sm:pt-14 md:pt-32 pb-16 md:pb-0">
          <div className="flex flex-1 flex-col md:flex-row md:items-center gap-10 lg:gap-16">
            <div className="order-1 md:order-2 flex flex-1 flex-col justify-end md:justify-center items-center min-h-[calc(50vh-2rem)] md:min-h-0">
              <CameraWireAnimation className="text-gray-800 opacity-80 w-[82vw] max-w-[22rem] sm:max-w-[26rem] md:max-w-[32rem] lg:max-w-[38rem] xl:max-w-[44rem]" />
            </div>
            <div className="order-2 md:order-1 flex flex-1 flex-col items-center md:items-center justify-center h-[calc(50vh-2rem)] md:h-auto">
              <FadeInText>
                <div className="w-full max-w-[28rem] text-left mx-auto">
                  <h2 className="font-serif text-4xl xl:text-5xl font-bold text-gray-900 leading-tight tracking-wide">
                    Moments
                    <br />
                    In Focus
                  </h2>
                </div>
              </FadeInText>
            </div>
          </div>
        </section>

        <section className="px-8 md:px-12 pb-20 bg-background">
          <div className="w-full max-w-7xl mx-auto space-y-24">
            {hasYears ? (
              years.map((year) => {
                const sanitizedLabel = year.label.replace(/\s+/g, '-');
                const sectionId = `year-${sanitizedLabel}`;
                const headingId = `year-heading-${sanitizedLabel}`;

                return (
                  <section
                    key={year.id}
                    id={sectionId}
                    data-testid="year-section"
                    className="scroll-mt-24 space-y-10"
                    aria-labelledby={headingId}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h2 id={headingId} className="font-serif text-4xl font-normal tracking-wide text-gray-900">
                          {year.label}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                          {year.locations.length > 0
                            ? `${year.locations.length} 個地點`
                            : '地點即將揭曉，敬請期待。'}
                        </p>
                      </div>
                    </div>

                    {year.locations.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="location-grid">
                        {year.locations.map((location) => (
                          <LocationCard key={location.id} yearLabel={year.label} location={location} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-10 text-center text-gray-500" data-testid="empty-locations">
                        該年份的地點即將揭曉，敬請期待。
                      </div>
                    )}
                  </section>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-12 text-center text-gray-500" data-testid="empty-years">
                尚無發佈的年份與地點。請稍後再回來探索新的作品。
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
