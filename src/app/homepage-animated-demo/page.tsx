import type { Metadata } from 'next';
import Link from 'next/link';

import { CameraWireAnimation } from '@/components/ui/CameraWireAnimation';

export const metadata: Metadata = {
  title: 'Animated Camera Archive Demo | UTOA Photography',
  description: 'An isolated animated homepage concept demo for the UTOA Photography archive.',
  robots: {
    index: false,
    follow: false,
  },
};

type DemoLocation = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  coverClassName: string;
};

type DemoYear = {
  id: string;
  label: string;
  locations: DemoLocation[];
};

const demoYears: DemoYear[] = [
  {
    id: 'year-2025',
    label: '2025',
    locations: [
      {
        id: 'taipei-25',
        name: 'Taipei',
        slug: 'taipei-25',
        summary: 'Neon rain, station glass, and narrow alleys cut into a fast nocturnal sequence.',
        coverClassName: 'demo-cover-taipei',
      },
      {
        id: 'kyoto-25',
        name: 'Kyoto',
        slug: 'kyoto-25',
        summary: 'Temple shadows and quiet streets held in warmer, slower afternoon exposure.',
        coverClassName: 'demo-cover-kyoto',
      },
      {
        id: 'seoul-25',
        name: 'Seoul',
        slug: 'seoul-25',
        summary: 'Concrete, chrome, and blue hour reflections across pedestrian overpasses.',
        coverClassName: 'demo-cover-seoul',
      },
    ],
  },
  {
    id: 'year-2024',
    label: '2024',
    locations: [
      {
        id: 'kinmen-24',
        name: 'Kinmen',
        slug: 'kinmen-24',
        summary: 'Wind-worn walls, ferry light, and pale stone details from the island route.',
        coverClassName: 'demo-cover-kinmen',
      },
      {
        id: 'tainan-24',
        name: 'Tainan',
        slug: 'tainan-24',
        summary: 'Market color, old signage, and heavy afternoon heat compressed into one walk.',
        coverClassName: 'demo-cover-tainan',
      },
    ],
  },
  {
    id: 'year-2023',
    label: '2023',
    locations: [
      {
        id: 'yilan-23',
        name: 'Yilan',
        slug: 'yilan-23',
        summary: 'Mist, field edges, and low cloud cover observed through a restrained palette.',
        coverClassName: 'demo-cover-yilan',
      },
    ],
  },
];

const TYPEWRITER_STAGGER_MS = 120;
const MOMENT_TYPEWRITER_TEXT = 'Moment';
const FOCUS_TYPEWRITER_TEXT = 'in Focus';
const MOMENT_TYPEWRITER_START_MS = 1700;
const FOCUS_TYPEWRITER_START_MS = 2650;
const MOMENT_TYPEWRITER_CURSOR_MOVE_MS = MOMENT_TYPEWRITER_TEXT.length * TYPEWRITER_STAGGER_MS;
const FOCUS_TYPEWRITER_CURSOR_MOVE_MS = FOCUS_TYPEWRITER_TEXT.length * TYPEWRITER_STAGGER_MS;
const MOMENT_TYPEWRITER_CURSOR_VISIBLE_MS = FOCUS_TYPEWRITER_START_MS - MOMENT_TYPEWRITER_START_MS;
const FOCUS_TYPEWRITER_CURSOR_VISIBLE_MS = FOCUS_TYPEWRITER_CURSOR_MOVE_MS + 1200;
const ARCHIVE_PANEL_REVEAL_DELAY_MS = FOCUS_TYPEWRITER_START_MS + (FOCUS_TYPEWRITER_TEXT.length - 1) * TYPEWRITER_STAGGER_MS;
const ARCHIVE_YEAR_REVEAL_OFFSET_MS = 400;
const ARCHIVE_LOCATION_REVEAL_OFFSET_MS = 600;
const ARCHIVE_YEAR_STAGGER_MS = 180;
const ARCHIVE_LOCATION_STAGGER_MS = 120;

function renderTypewriterChars(text: string, startDelay: number) {
  return Array.from(text).map((character, index) => (
    <span
      key={`${character}-${index}`}
      className={`demo-typewriter-char${character === ' ' ? ' demo-typewriter-char--space' : ''}`}
      style={{ animationDelay: `${startDelay + index * TYPEWRITER_STAGGER_MS}ms` }}
    >
      {character}
    </span>
  ));
}

function buildLocationHref(yearLabel: string, locationSlug: string) {
  return `/homepage-animated-demo/${encodeURIComponent(yearLabel)}/${encodeURIComponent(locationSlug)}`;
}

export default function HomepageAnimatedDemo() {
  return (
    <div className="homepage-animated-demo min-h-screen overflow-hidden bg-background text-foreground">
      <a
        href="#animated-archive"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-xl transition focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-950/25"
      >
        Skip to animated archive
      </a>

      <Link
        href="/"
        className="demo-home-brand fixed z-40 font-serif text-xl font-semibold tracking-wide text-gray-950 transition hover:text-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25 md:text-2xl"
        style={{ top: 'calc(env(safe-area-inset-top) + 2.5rem)' }}
      >
        Utoa Photography
      </Link>

      <div className="pointer-events-none fixed inset-0 z-0 demo-exposure-field" aria-hidden="true" />

      <main id="animated-archive" className="relative z-10" role="main">
        <section className="px-6 pb-12 pt-28 sm:px-8 sm:pt-32 md:px-12 md:pb-16 lg:pt-36" aria-labelledby="demo-hero-title">
          <div className="mx-auto max-w-7xl rounded-[2rem] p-5 sm:p-7 lg:p-8">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(22rem,0.94fr)] lg:gap-16">
              <div className="demo-title-reveal max-w-2xl" style={{ animationDelay: '900ms' }}>
                <h1 id="demo-hero-title" aria-label="Moment in Focus" className="font-serif text-5xl font-bold leading-[0.96] tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
                  <span className="demo-typewriter-line demo-typewriter-line--moment block" aria-hidden="true">
                    {renderTypewriterChars(MOMENT_TYPEWRITER_TEXT, MOMENT_TYPEWRITER_START_MS)}
                  </span>
                  <span className="demo-typewriter-line demo-typewriter-line--focus block" aria-hidden="true">
                    {renderTypewriterChars(FOCUS_TYPEWRITER_TEXT, FOCUS_TYPEWRITER_START_MS)}
                  </span>
                </h1>
              </div>

              <div className="demo-camera-stage demo-reveal" style={{ animationDelay: '160ms' }} aria-label="Animated camera wireframe presentation">
                <CameraWireAnimation className="relative z-10 mx-auto w-[min(78vw,36rem)] text-gray-900" />
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 sm:px-8 md:px-12" aria-labelledby="archive-heading">
          <div className="demo-archive-panel demo-reveal mx-auto max-w-7xl rounded-[2rem] border border-gray-900/10 bg-white/72 p-5 shadow-2xl shadow-gray-900/5 backdrop-blur-md sm:p-7 lg:p-8" style={{ animationDelay: `${ARCHIVE_PANEL_REVEAL_DELAY_MS}ms` }}>
            <div className="mb-8 grid gap-4 border-b border-gray-900/10 pb-7 md:grid-cols-[minmax(0,0.7fr)_minmax(20rem,0.3fr)] md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Field Notes</p>
                <h2 id="archive-heading" className="mt-3 font-serif text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
                  Years in Places
                </h2>
              </div>
            </div>

            <div className="space-y-12">
              {demoYears.map((year, yearIndex) => {
                const yearDelay = `${ARCHIVE_PANEL_REVEAL_DELAY_MS + ARCHIVE_YEAR_REVEAL_OFFSET_MS + yearIndex * ARCHIVE_YEAR_STAGGER_MS}ms`;

                return (
                  <section
                    key={year.id}
                    id={year.id}
                    className="demo-year-panel demo-reveal scroll-mt-24"
                    style={{ animationDelay: yearDelay }}
                    aria-labelledby={`${year.id}-heading`}
                  >
                    <div className="grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
                      <div className="lg:sticky lg:top-8 lg:self-start">
                        <div className="rounded-[1.6rem] border border-gray-900/10 bg-gray-950 p-5 text-white shadow-xl shadow-gray-900/10">
                          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/55">Year</p>
                          <h3 id={`${year.id}-heading`} className="mt-2 font-serif text-5xl font-semibold leading-none">
                            {year.label}
                          </h3>
                          <p className="mt-4 text-sm leading-6 text-white/75">{year.locations.length} location{year.locations.length === 1 ? '' : 's'}</p>
                        </div>
                      </div>

                      <div>
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                          {year.locations.map((location, locationIndex) => {
                            const locationDelay = `${ARCHIVE_PANEL_REVEAL_DELAY_MS + ARCHIVE_LOCATION_REVEAL_OFFSET_MS + yearIndex * ARCHIVE_YEAR_STAGGER_MS + locationIndex * ARCHIVE_LOCATION_STAGGER_MS}ms`;
                            const href = buildLocationHref(year.label, location.slug);

                            return (
                              <Link
                                key={location.id}
                                href={href}
                                prefetch={false}
                                aria-label={`${location.name}: open demo route preview for ${year.label}`}
                                className="demo-location-card group demo-reveal block rounded-[1.8rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/25 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
                                style={{ animationDelay: locationDelay }}
                              >
                                <article className="relative h-full overflow-hidden rounded-[1.8rem] border border-gray-900/10 bg-white shadow-sm transition duration-500 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl group-focus-visible:-translate-y-2 group-focus-visible:shadow-2xl">
                                  <div className="relative m-4 overflow-hidden rounded-[1.45rem]">
                                    <div
                                      className={`demo-cover-panel ${location.coverClassName}`}
                                      style={{ aspectRatio: '3 / 4', minHeight: 0 }}
                                      aria-label={`${location.name} demo gradient cover visual`}
                                      role="img"
                                    >
                                      <div className="demo-cover-grid" aria-hidden="true" />
                                      <div className="demo-cover-flare" aria-hidden="true" />
                                    </div>
                                  </div>

                                  <div className="px-6 pb-6 pt-1">
                                    <div className="border-t border-gray-900/10 pt-5">
                                      <div>
                                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">{year.label}</p>
                                        <h5 className="mt-2 font-serif text-3xl font-semibold leading-none text-gray-950">{location.name}</h5>
                                      </div>
                                    </div>
                                    <p className="mt-5 text-sm leading-7 text-gray-700 sm:text-base">{location.summary}</p>
                                  </div>
                                </article>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <style>{`
        .homepage-animated-demo {
          --demo-paper: var(--background);
          --demo-ink: var(--foreground);
          --demo-soft-line: rgb(17 24 39 / 0.1);
          --demo-focus: rgb(17 24 39 / 0.26);
          background:
            radial-gradient(circle at 18% 10%, rgb(255 208 54 / 0.28), transparent 24rem),
            radial-gradient(circle at 86% 8%, rgb(1 175 246 / 0.16), transparent 22rem),
            linear-gradient(180deg, var(--demo-paper), rgb(255 252 232));
        }

        .homepage-animated-demo .demo-home-brand {
          left: var(--demo-shell-gutter);
        }

        .demo-exposure-field {
          background:
            linear-gradient(105deg, transparent 0 34%, rgb(255 255 255 / 0.54) 41%, transparent 48% 100%),
            radial-gradient(circle at 62% 18%, rgb(242 0 133 / 0.14), transparent 16rem),
            radial-gradient(circle at 22% 78%, rgb(1 175 246 / 0.13), transparent 18rem);
          animation: demo-exposure-sweep 8s ease-in-out infinite;
        }

        .demo-reveal {
          opacity: 0;
          transform: translateY(24px);
          animation: demo-reveal-up 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .demo-title-reveal {
          opacity: 0;
          animation: demo-title-fade-in 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .demo-typewriter-line {
          position: relative;
          width: max-content;
          max-width: 100%;
          white-space: nowrap;
        }

        .demo-typewriter-char {
          display: inline-block;
          opacity: 0;
          animation: demo-typewriter-char-reveal 1ms linear forwards;
          will-change: opacity;
        }

        .demo-typewriter-char--space {
          width: 0.28em;
        }

        .demo-typewriter-line--moment::after,
        .demo-typewriter-line--focus::after {
          content: '';
          position: absolute;
          left: 0.08em;
          bottom: -0.12em;
          width: 0.82ch;
          height: 0.105em;
          border-radius: 0;
          background: currentColor;
          opacity: 0;
        }

        .demo-typewriter-line--moment::after {
          animation:
            demo-typewriter-cursor-moment-move ${MOMENT_TYPEWRITER_CURSOR_MOVE_MS}ms steps(${MOMENT_TYPEWRITER_TEXT.length}, start) ${MOMENT_TYPEWRITER_START_MS}ms forwards,
            demo-typewriter-cursor-moment-visibility ${MOMENT_TYPEWRITER_CURSOR_VISIBLE_MS}ms linear ${MOMENT_TYPEWRITER_START_MS}ms forwards;
        }

        .demo-typewriter-line--focus::after {
          bottom: -0.1199em;
          animation:
            demo-typewriter-cursor-focus-move ${FOCUS_TYPEWRITER_CURSOR_MOVE_MS}ms steps(${FOCUS_TYPEWRITER_TEXT.length}, start) ${FOCUS_TYPEWRITER_START_MS}ms forwards,
            demo-typewriter-cursor-focus-visibility ${FOCUS_TYPEWRITER_CURSOR_VISIBLE_MS}ms linear ${FOCUS_TYPEWRITER_START_MS}ms forwards;
        }

        .demo-camera-stage {
          position: relative;
          min-height: 24rem;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid var(--demo-soft-line);
          border-radius: 2rem;
          background:
            radial-gradient(circle at 50% 45%, rgb(255 255 255 / 0.92), rgb(255 255 255 / 0.5) 42%, transparent 64%),
            linear-gradient(135deg, rgb(255 255 255 / 0.82), rgb(255 248 225 / 0.58));
          box-shadow: 0 28px 80px rgb(17 24 39 / 0.1);
          isolation: isolate;
        }

        .demo-year-panel {
          position: relative;
        }

        .demo-year-panel::before {
          content: '';
          position: absolute;
          left: 5.95rem;
          top: 8.6rem;
          bottom: -3.2rem;
          width: 1px;
          background: linear-gradient(180deg, rgb(17 24 39 / 0.28), transparent);
          display: none;
        }

        .demo-cover-panel {
          position: relative;
          min-height: 19rem;
          overflow: hidden;
          border-radius: 1.45rem;
          background:
            radial-gradient(circle at 32% 24%, var(--cover-glow), transparent 11rem),
            linear-gradient(135deg, var(--cover-a), var(--cover-b) 48%, var(--cover-c));
          transform: scale(1);
          transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1), filter 700ms ease;
        }

        .demo-location-card:hover .demo-cover-panel,
        .demo-location-card:focus-visible .demo-cover-panel {
          transform: scale(1.065);
          filter: saturate(1.18) contrast(1.06);
        }

        .demo-cover-grid {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgb(255 255 255 / 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgb(255 255 255 / 0.16) 1px, transparent 1px);
          background-size: 2.6rem 2.6rem;
          mask-image: radial-gradient(circle at 50% 42%, black, transparent 76%);
          opacity: 0.65;
        }

        .demo-cover-flare {
          position: absolute;
          inset: auto -18% 10% 20%;
          height: 45%;
          border-radius: 999px;
          background: rgb(255 255 255 / 0.22);
          filter: blur(30px);
          transform: rotate(-9deg);
          animation: demo-cover-breathe 5s ease-in-out infinite;
        }

        .demo-cover-taipei { --cover-a: #0f172a; --cover-b: #0ea5e9; --cover-c: #f20085; --cover-glow: rgb(255 208 54 / 0.5); }
        .demo-cover-kyoto { --cover-a: #6b2f1a; --cover-b: #d97745; --cover-c: #f6dba8; --cover-glow: rgb(255 248 225 / 0.7); }
        .demo-cover-seoul { --cover-a: #111827; --cover-b: #64748b; --cover-c: #c4b5fd; --cover-glow: rgb(1 175 246 / 0.4); }
        .demo-cover-kinmen { --cover-a: #27391c; --cover-b: #a3b18a; --cover-c: #fef3c7; --cover-glow: rgb(255 255 255 / 0.54); }
        .demo-cover-tainan { --cover-a: #451a03; --cover-b: #ea580c; --cover-c: #facc15; --cover-glow: rgb(255 255 255 / 0.42); }
        .demo-cover-yilan { --cover-a: #0f2f2f; --cover-b: #5aa0a0; --cover-c: #dce6d3; --cover-glow: rgb(220 252 231 / 0.48); }

        @media (min-width: 1024px) {
          .demo-year-panel::before {
            display: block;
          }
        }

        @keyframes demo-reveal-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes demo-title-fade-in {
          to {
            opacity: 1;
          }
        }

        @keyframes demo-exposure-sweep {
          0%, 100% { transform: translateX(-12%) scale(1); opacity: 0.52; }
          50% { transform: translateX(12%) scale(1.03); opacity: 0.88; }
        }

        @keyframes demo-typewriter-char-reveal {
          from {
            opacity: 1;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes demo-typewriter-cursor-moment-move {
          from {
            left: 0.08em;
          }

          to {
            left: calc(100% + 0.08em);
          }
        }

        @keyframes demo-typewriter-cursor-focus-move {
          from {
            left: 0.08em;
          }

          to {
            left: calc(100% + 0.08em);
          }
        }

        @keyframes demo-typewriter-cursor-moment-visibility {
          0%, 99% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes demo-typewriter-cursor-focus-visibility {
          0%, 34%, 50%, 66%, 82% {
            opacity: 1;
          }

          42%, 58%, 74%, 90%, 100% {
            opacity: 0;
          }
        }

        @keyframes demo-cover-breathe {
          0%, 100% { opacity: 0.45; transform: translateX(-3%) rotate(-9deg); }
          50% { opacity: 0.9; transform: translateX(7%) rotate(-9deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .homepage-animated-demo .demo-reveal,
          .homepage-animated-demo .demo-title-reveal,
          .homepage-animated-demo .demo-exposure-field,
          .homepage-animated-demo .demo-cover-flare {
            animation: none !important;
          }

          .homepage-animated-demo .demo-reveal,
          .homepage-animated-demo .demo-title-reveal {
            opacity: 1 !important;
            transform: none !important;
          }

          .homepage-animated-demo .demo-typewriter-char {
            animation: none !important;
            opacity: 1 !important;
          }

          .homepage-animated-demo .demo-typewriter-line--moment::after,
          .homepage-animated-demo .demo-typewriter-line--focus::after {
            animation: none !important;
            opacity: 0 !important;
          }

          .homepage-animated-demo .demo-location-card article,
          .homepage-animated-demo .demo-cover-panel {
            transform: none !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
