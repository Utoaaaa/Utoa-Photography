import Link from 'next/link';

import { CameraWireAnimation } from '@/components/ui/CameraWireAnimation';
import { buildHomeHref, buildLocationHref, buildYearAnchorId } from '@/lib/site-paths';
import type { YearEntry } from '@/lib/year-location';

import { AnimatedArchiveStyles } from './AnimatedArchiveStyles';
import { AnimatedCover } from './AnimatedCover';

const TYPEWRITER_STAGGER_MS = 120;
const MOMENT_TYPEWRITER_TEXT = 'Moment';
const FOCUS_TYPEWRITER_TEXT = 'in Focus';
const MOMENT_TYPEWRITER_START_MS = 1700;
const FOCUS_TYPEWRITER_START_MS = 2650;
const MOMENT_TYPEWRITER_CURSOR_MOVE_MS = MOMENT_TYPEWRITER_TEXT.length * TYPEWRITER_STAGGER_MS;
const FOCUS_TYPEWRITER_CURSOR_MOVE_MS = FOCUS_TYPEWRITER_TEXT.length * TYPEWRITER_STAGGER_MS;
const MOMENT_TYPEWRITER_CURSOR_VISIBLE_MS = FOCUS_TYPEWRITER_START_MS - MOMENT_TYPEWRITER_START_MS;
const FOCUS_TYPEWRITER_CURSOR_VISIBLE_MS = FOCUS_TYPEWRITER_CURSOR_MOVE_MS + 1200;
const ARCHIVE_PANEL_REVEAL_DELAY_MS = MOMENT_TYPEWRITER_START_MS;
const ARCHIVE_YEAR_REVEAL_OFFSET_MS = 400;
const ARCHIVE_LOCATION_REVEAL_OFFSET_MS = 600;
const ARCHIVE_YEAR_STAGGER_MS = 180;
const ARCHIVE_LOCATION_STAGGER_MS = 120;

function renderTypewriterChars(text: string, startDelay: number) {
  return Array.from(text).map((character, index) => (
    <span
      key={`${character}-${index}`}
      className={`animated-typewriter-char${character === ' ' ? ' animated-typewriter-char--space' : ''}`}
      style={{ animationDelay: `${startDelay + index * TYPEWRITER_STAGGER_MS}ms` }}
    >
      {character}
    </span>
  ));
}

interface AnimatedArchiveHomeProps {
  years: YearEntry[];
  brandHref?: string;
}

export function AnimatedArchiveHome({ years, brandHref = buildHomeHref() }: AnimatedArchiveHomeProps) {
  const firstPriorityLocationId = years.find((year) => year.locations.length > 0)?.locations[0]?.id ?? null;

  return (
    <div className="animated-archive-home min-h-screen overflow-hidden bg-background text-foreground">
      <a
        href="#animated-archive"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-xl transition focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-950/25"
      >
        Skip to animated archive
      </a>

      <Link
        href={brandHref}
        className="animated-home-brand fixed z-40 font-serif text-xl font-semibold tracking-wide text-gray-950 transition hover:text-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25 md:text-2xl"
        style={{ top: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        Utoa Photography
      </Link>

      <div className="pointer-events-none fixed inset-0 z-0 animated-exposure-field" aria-hidden="true" />

      <main id="animated-archive" className="relative z-10" role="main">
        <section className="px-6 pb-12 pt-28 sm:px-8 sm:pt-32 md:px-12 md:pb-16 lg:pt-36" aria-labelledby="animated-hero-title">
          <div className="mx-auto max-w-7xl rounded-[2rem] p-5 sm:p-7 lg:p-8">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(22rem,0.94fr)] lg:gap-16">
              <div className="animated-title-reveal max-w-2xl" style={{ animationDelay: '900ms' }}>
                <h1 id="animated-hero-title" aria-label="Moment in Focus" className="font-serif text-5xl font-bold leading-[0.96] tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
                  <span className="animated-typewriter-line animated-typewriter-line--moment block" aria-hidden="true">
                    {renderTypewriterChars(MOMENT_TYPEWRITER_TEXT, MOMENT_TYPEWRITER_START_MS)}
                  </span>
                  <span className="animated-typewriter-line animated-typewriter-line--focus block" aria-hidden="true">
                    {renderTypewriterChars(FOCUS_TYPEWRITER_TEXT, FOCUS_TYPEWRITER_START_MS)}
                  </span>
                </h1>
              </div>

              <div className="animated-camera-stage animated-reveal" style={{ animationDelay: '160ms' }} aria-label="Animated camera wireframe presentation">
                <CameraWireAnimation className="relative z-10 mx-auto w-[min(78vw,36rem)] text-gray-900" />
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 sm:px-8 md:px-12" aria-labelledby="archive-heading">
          <div className="animated-reveal mx-auto max-w-7xl rounded-[2rem] border border-gray-900/10 bg-white/72 p-5 shadow-2xl shadow-gray-900/5 backdrop-blur-md sm:p-7 lg:p-8" style={{ animationDelay: `${ARCHIVE_PANEL_REVEAL_DELAY_MS}ms` }}>
            <div className="mb-8 grid gap-4 border-b border-gray-900/10 pb-7 md:grid-cols-[minmax(0,0.7fr)_minmax(20rem,0.3fr)] md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Field Notes</p>
                <h2 id="archive-heading" className="mt-3 font-serif text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                  Years in Places
                </h2>
              </div>
            </div>

            <div className="space-y-12">
              {years.length > 0 ? (
                years.map((year, yearIndex) => {
                  const yearDelay = `${ARCHIVE_PANEL_REVEAL_DELAY_MS + ARCHIVE_YEAR_REVEAL_OFFSET_MS + yearIndex * ARCHIVE_YEAR_STAGGER_MS}ms`;
                  const sectionId = buildYearAnchorId(year.label);

                  return (
                    <section
                      key={year.id}
                      id={sectionId}
                      className="animated-year-panel animated-reveal scroll-mt-24"
                      style={{ animationDelay: yearDelay }}
                      aria-labelledby={`${sectionId}-heading`}
                      data-testid="animated-year-section"
                    >
                      <div className="grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
                        <div className="lg:sticky lg:top-8 lg:self-start">
                          <div className="rounded-[1.6rem] border border-gray-900/10 bg-gray-950 p-5 text-white shadow-xl shadow-gray-900/10">
                            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/55">Year</p>
                            <h3 id={`${sectionId}-heading`} className="mt-2 font-serif text-5xl font-semibold leading-none">
                              {year.label}
                            </h3>
                            <p className="mt-4 text-sm leading-6 text-white/75">{year.locations.length} location{year.locations.length === 1 ? '' : 's'}</p>
                          </div>
                        </div>

                        <div>
                          {year.locations.length > 0 ? (
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                              {year.locations.map((location, locationIndex) => {
                                const locationDelay = `${ARCHIVE_PANEL_REVEAL_DELAY_MS + ARCHIVE_LOCATION_REVEAL_OFFSET_MS + yearIndex * ARCHIVE_YEAR_STAGGER_MS + locationIndex * ARCHIVE_LOCATION_STAGGER_MS}ms`;
                                const href = buildLocationHref(year.label, location.slug);

                                return (
                                  <Link
                                    key={location.id}
                                    href={href}
                                    aria-label={`${location.name}: open archive for ${year.label}`}
                                    className="animated-location-card group animated-reveal block rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
                                    style={{ animationDelay: locationDelay }}
                                    data-testid="animated-location-card"
                                  >
                                    <article className="relative h-full overflow-hidden rounded-[1.8rem] border border-gray-900/10 bg-white shadow-sm transition duration-500 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl group-focus-visible:-translate-y-2 group-focus-visible:shadow-2xl">
                                      <div className="relative m-4 overflow-hidden rounded-[1.45rem]">
                                        <AnimatedCover
                                          assetId={location.coverAssetId}
                                          width={location.coverAssetWidth} height={location.coverAssetHeight}
                                          alt={`${location.name} cover visual`}
                                          priority={location.id === firstPriorityLocationId}
                                          seed={`${year.label}-${location.slug}-${location.name}`}
                                        />
                                      </div>

                                      <div className="px-6 pb-6 pt-1">
                                        <div className="border-t border-gray-900/10 pt-5">
                                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{year.label}</p>
                                          <h4 className="mt-2 font-serif text-3xl font-semibold leading-none text-gray-950">{location.name}</h4>
                                        </div>
                                        {location.summary ? <p className="mt-5 text-sm leading-7 text-gray-700 sm:text-base">{location.summary}</p> : null}
                                      </div>
                                    </article>
                                  </Link>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-[1.6rem] border border-dashed border-gray-900/15 bg-white/72 p-10 text-center text-gray-600" data-testid="empty-locations">
                              該年份的地點即將揭曉，敬請期待。
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-gray-900/15 bg-white/72 p-10 text-center text-gray-600" data-testid="empty-years">
                  尚無發佈的年份與地點。請稍後再回來探索新的作品。
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <style>{`
        .animated-typewriter-line--moment::after {
          animation:
            animated-typewriter-cursor-moment-move ${MOMENT_TYPEWRITER_CURSOR_MOVE_MS}ms steps(${MOMENT_TYPEWRITER_TEXT.length}, start) ${MOMENT_TYPEWRITER_START_MS}ms forwards,
            animated-typewriter-cursor-moment-visibility ${MOMENT_TYPEWRITER_CURSOR_VISIBLE_MS}ms linear ${MOMENT_TYPEWRITER_START_MS}ms forwards;
        }

        .animated-typewriter-line--focus::after {
          bottom: -0.1199em;
          animation:
            animated-typewriter-cursor-focus-move ${FOCUS_TYPEWRITER_CURSOR_MOVE_MS}ms steps(${FOCUS_TYPEWRITER_TEXT.length}, start) ${FOCUS_TYPEWRITER_START_MS}ms forwards,
            animated-typewriter-cursor-focus-visibility ${FOCUS_TYPEWRITER_CURSOR_VISIBLE_MS}ms linear ${FOCUS_TYPEWRITER_START_MS}ms forwards;
        }
      `}</style>
      <AnimatedArchiveStyles />
    </div>
  );
}
