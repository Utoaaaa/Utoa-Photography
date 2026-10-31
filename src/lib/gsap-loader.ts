// GSAP core only: no live component creates ScrollTriggers, so the plugin is not loaded.
export type GSAPBundle = { gsap: any } | null;

let p: Promise<GSAPBundle> | null = null;

export const isBrowser = () => typeof window !== 'undefined';

export async function loadGSAP(): Promise<GSAPBundle> {
  if (!isBrowser()) return null;
  if (p) return p;
  p = (async () => {
    try {
      const core = await import('gsap');
      const gsap: any = (core as any).gsap ?? (core as any).default ?? core;
      if (!gsap || typeof gsap.to !== 'function') return null;
      return { gsap };
    } catch {
      return null;
    }
  })();
  return p;
}
