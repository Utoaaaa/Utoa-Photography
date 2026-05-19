export function DemoArchiveStyles() {
  return (
    <style>{`
      .demo-exposure-field {
        background:
          linear-gradient(105deg, transparent 0 34%, rgb(255 255 255 / 0.54) 41%, transparent 48% 100%),
          radial-gradient(circle at 62% 18%, rgb(242 0 133 / 0.14), transparent 16rem),
          radial-gradient(circle at 22% 78%, rgb(1 175 246 / 0.13), transparent 18rem);
        animation: demo-exposure-sweep 8s ease-in-out infinite;
      }

      .demo-scanlines {
        background:
          repeating-linear-gradient(180deg, rgb(17 24 39 / 0.045) 0 1px, transparent 1px 9px),
          linear-gradient(90deg, transparent, rgb(17 24 39 / 0.04), transparent);
        mix-blend-mode: multiply;
        opacity: 0.5;
        animation: demo-scanline-drift 10s linear infinite;
      }

      .demo-reveal {
        opacity: 0;
        transform: translateY(24px);
        animation: demo-reveal-up 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .demo-cover-panel {
        position: relative;
        min-height: 18rem;
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
        transform: scale(1.055);
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

      @keyframes demo-reveal-up { to { opacity: 1; transform: translateY(0); } }
      @keyframes demo-exposure-sweep { 0%, 100% { transform: translateX(-12%) scale(1); opacity: 0.52; } 50% { transform: translateX(12%) scale(1.03); opacity: 0.88; } }
      @keyframes demo-scanline-drift { from { background-position: 0 0, 0 0; } to { background-position: 0 90px, 140px 0; } }
      @keyframes demo-cover-breathe { 0%, 100% { opacity: 0.45; transform: translateX(-3%) rotate(-9deg); } 50% { opacity: 0.9; transform: translateX(7%) rotate(-9deg); } }

      @media (prefers-reduced-motion: reduce) {
        .demo-reveal,
        .demo-exposure-field,
        .demo-scanlines,
        .demo-cover-flare {
          animation: none !important;
        }

        .demo-reveal {
          opacity: 1 !important;
          transform: none !important;
        }

        .demo-cover-panel {
          transform: none !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}
