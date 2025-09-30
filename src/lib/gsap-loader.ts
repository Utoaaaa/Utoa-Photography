export type GSAPBundle = { gsap: any; ScrollTrigger: any } | null;

let p: Promise<GSAPBundle> | null = null;

export const isBrowser = () => typeof window !== 'undefined';

export async function loadGSAP(): Promise<GSAPBundle> {
  if (!isBrowser()) return null;
  if (p) return p;
  p = (async () => {
    try {
      const [core, st] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      const gsap: any = (core as any).gsap ?? (core as any).default ?? core;
      const ST: any = (st as any).ScrollTrigger ?? (st as any).default ?? st;
      if (!gsap || typeof gsap.to !== 'function') return null;
      const hasST = !!(
        gsap.core &&
        typeof gsap.core.globals === 'function' &&
        gsap.core.globals() &&
        (gsap.core.globals() as any).ScrollTrigger
      );
      if (!hasST && typeof ST === 'function') gsap.registerPlugin(ST);
      return { gsap, ScrollTrigger: ST };
    } catch (_e) {
      return null;
    }
  })();
  return p;
}
