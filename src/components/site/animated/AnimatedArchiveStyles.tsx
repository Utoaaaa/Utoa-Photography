export function AnimatedArchiveStyles() {
  return (
    <style>{`
      .animated-archive-home {
        --animated-paper: var(--background);
        --animated-ink: var(--foreground);
        --animated-soft-line: rgb(17 24 39 / 0.1);
        --animated-focus: rgb(17 24 39 / 0.26);
        background:
          radial-gradient(circle at 18% 10%, rgb(255 208 54 / 0.28), transparent 24rem),
          radial-gradient(circle at 86% 8%, rgb(1 175 246 / 0.16), transparent 22rem),
          linear-gradient(180deg, var(--animated-paper), rgb(255 252 232));
      }

      .animated-home-brand {
        left: var(--animated-shell-gutter, 1.5rem);
      }

      .animated-exposure-field {
        background:
          linear-gradient(105deg, transparent 0 34%, rgb(255 255 255 / 0.54) 41%, transparent 48% 100%),
          radial-gradient(circle at 62% 18%, rgb(242 0 133 / 0.14), transparent 16rem),
          radial-gradient(circle at 22% 78%, rgb(1 175 246 / 0.13), transparent 18rem);
        animation: animated-exposure-sweep 8s ease-in-out infinite;
      }

      @media (max-width: 640px) {
        .animated-archive-home .animated-exposure-field {
          inset: 0 -34vw;
          background:
            linear-gradient(105deg, transparent 0 22%, rgb(255 255 255 / 0.32) 42%, transparent 66% 100%),
            radial-gradient(circle at 62% 18%, rgb(242 0 133 / 0.14), transparent 16rem),
            radial-gradient(circle at 22% 78%, rgb(1 175 246 / 0.13), transparent 18rem);
        }
      }

      .animated-reveal {
        opacity: 0;
        transform: translateY(24px);
        animation: animated-reveal-up 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .animated-title-reveal {
        opacity: 0;
        animation: animated-title-fade-in 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      main.animated-loader-pending .animated-reveal,
      main.animated-loader-pending .animated-title-reveal,
      main.animated-loader-pending .animated-typewriter-char,
      main.animated-loader-pending .animated-typewriter-line--moment::after,
      main.animated-loader-pending .animated-typewriter-line--focus::after {
        animation-play-state: paused;
      }

      .animated-typewriter-line {
        position: relative;
        width: max-content;
        max-width: 100%;
        white-space: nowrap;
      }

      .animated-typewriter-char {
        display: inline-block;
        opacity: 0;
        animation: animated-typewriter-char-reveal 1ms linear forwards;
        will-change: opacity;
      }

      .animated-typewriter-char--space {
        width: 0.28em;
      }

      .animated-typewriter-line--moment::after,
      .animated-typewriter-line--focus::after {
        content: '';
        position: absolute;
        left: 0.08em;
        bottom: -0.12em;
        width: 0.82ch;
        height: 0.105em;
        background: currentColor;
        opacity: 0;
      }

      .animated-camera-stage {
        position: relative;
        min-height: 24rem;
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 1px solid var(--animated-soft-line);
        border-radius: 2rem;
        background:
          radial-gradient(circle at 50% 45%, rgb(255 255 255 / 0.92), rgb(255 255 255 / 0.5) 42%, transparent 64%),
          linear-gradient(135deg, rgb(255 255 255 / 0.82), rgb(255 248 225 / 0.58));
        box-shadow: 0 28px 80px rgb(17 24 39 / 0.1);
        isolation: isolate;
      }

      .animated-year-panel {
        position: relative;
      }

      .animated-year-panel::before {
        content: '';
        position: absolute;
        left: 5.95rem;
        top: 8.6rem;
        bottom: -3.2rem;
        width: 1px;
        background: linear-gradient(180deg, rgb(17 24 39 / 0.28), transparent);
        display: none;
      }

      .animated-cover-panel {
        position: relative;
        min-height: 19rem;
        overflow: hidden;
        border-radius: 1.45rem;
        transform: scale(1);
        transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1), filter 700ms ease;
      }

      .animated-location-card:hover .animated-cover-panel,
      .animated-location-card:focus-visible .animated-cover-panel {
        transform: scale(1.065);
        filter: saturate(1.18) contrast(1.06);
      }

      .animated-cover-fallback {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 32% 24%, var(--animated-cover-glow), transparent 11rem),
          linear-gradient(135deg, var(--animated-cover-a), var(--animated-cover-b) 48%, var(--animated-cover-c));
      }

      .animated-cover-fallback[data-tone='0'] { --animated-cover-a: #0f172a; --animated-cover-b: #0ea5e9; --animated-cover-c: #f20085; --animated-cover-glow: rgb(255 208 54 / 0.5); }
      .animated-cover-fallback[data-tone='1'] { --animated-cover-a: #6b2f1a; --animated-cover-b: #d97745; --animated-cover-c: #f6dba8; --animated-cover-glow: rgb(255 248 225 / 0.7); }
      .animated-cover-fallback[data-tone='2'] { --animated-cover-a: #111827; --animated-cover-b: #64748b; --animated-cover-c: #c4b5fd; --animated-cover-glow: rgb(1 175 246 / 0.4); }
      .animated-cover-fallback[data-tone='3'] { --animated-cover-a: #27391c; --animated-cover-b: #a3b18a; --animated-cover-c: #fef3c7; --animated-cover-glow: rgb(255 255 255 / 0.54); }
      .animated-cover-fallback[data-tone='4'] { --animated-cover-a: #451a03; --animated-cover-b: #ea580c; --animated-cover-c: #facc15; --animated-cover-glow: rgb(255 255 255 / 0.42); }
      .animated-cover-fallback[data-tone='5'] { --animated-cover-a: #0f2f2f; --animated-cover-b: #5aa0a0; --animated-cover-c: #dce6d3; --animated-cover-glow: rgb(220 252 231 / 0.48); }

      .animated-cover-flare {
        position: absolute;
        inset: auto -18% 10% 20%;
        height: 45%;
        border-radius: 999px;
        background: rgb(255 255 255 / 0.22);
        filter: blur(30px);
        transform: rotate(-9deg);
        animation: animated-cover-breathe 5s ease-in-out infinite;
      }

      @media (min-width: 1280px) {
        .animated-year-panel::before {
          display: block;
        }
      }

      @keyframes animated-reveal-up {
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes animated-title-fade-in {
        to { opacity: 1; }
      }

      @keyframes animated-exposure-sweep {
        0%, 100% { transform: translateX(-12%) scale(1); opacity: 0.52; }
        50% { transform: translateX(12%) scale(1.03); opacity: 0.88; }
      }

      @keyframes animated-typewriter-char-reveal {
        from { opacity: 1; }
        to { opacity: 1; }
      }

      @keyframes animated-typewriter-cursor-moment-move {
        from { left: 0.08em; }
        to { left: calc(100% + 0.08em); }
      }

      @keyframes animated-typewriter-cursor-focus-move {
        from { left: 0.08em; }
        to { left: calc(100% + 0.08em); }
      }

      @keyframes animated-typewriter-cursor-moment-visibility {
        0%, 99% { opacity: 1; }
        100% { opacity: 0; }
      }

      @keyframes animated-typewriter-cursor-focus-visibility {
        0%, 34%, 50%, 66%, 82% { opacity: 1; }
        42%, 58%, 74%, 90%, 100% { opacity: 0; }
      }

      @keyframes animated-cover-breathe {
        0%, 100% { opacity: 0.45; transform: translateX(-3%) rotate(-9deg); }
        50% { opacity: 0.9; transform: translateX(7%) rotate(-9deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .animated-archive-home .animated-reveal,
        .animated-archive-home .animated-title-reveal,
        .animated-archive-home .animated-exposure-field,
        .animated-archive-home .animated-cover-flare,
        .animated-reveal,
        .animated-exposure-field,
        .animated-cover-flare {
          animation: none !important;
        }

        .animated-archive-home .animated-reveal,
        .animated-archive-home .animated-title-reveal,
        .animated-reveal {
          opacity: 1 !important;
          transform: none !important;
        }

        .animated-archive-home .animated-typewriter-char {
          animation: none !important;
          opacity: 1 !important;
        }

        .animated-archive-home .animated-typewriter-line--moment::after,
        .animated-archive-home .animated-typewriter-line--focus::after {
          animation: none !important;
          opacity: 0 !important;
        }

        .animated-archive-home .animated-location-card article,
        .animated-archive-home .animated-cover-panel,
        .animated-location-card article,
        .animated-cover-panel {
          transform: none !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}
