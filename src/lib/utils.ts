import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isBrowser = () => typeof window !== 'undefined';

export function shouldReduceMotion() {
  if (!isBrowser()) return false;
  const mm: ((query: string) => MediaQueryList) | undefined = (window as unknown as { matchMedia?: (q: string) => MediaQueryList }).matchMedia;
  if (typeof mm !== 'function') return false;
  const q = mm('(prefers-reduced-motion: reduce)');
  return !!(q && q.matches === true);
}

// --- Audit logging sink (T014) ---
export type AuditRecord = {
  timestamp: string;
  who: string;
  action: string;
  entity: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type AuditSink = (record: AuditRecord) => Promise<void> | void;

let auditSink: AuditSink | null = null;

export function setAuditSink(sink: AuditSink) {
  auditSink = sink;
}

export async function writeAudit(record: AuditRecord) {
  if (auditSink) {
    try {
      await auditSink(record);
      return;
    } catch {
      // fall through to console if custom sink fails
    }
  }
  // Default sink: console (non-throwing)
  console.log('[AUDIT]', record);
}

// Safely parse JSON body from NextRequest without throwing on empty/invalid JSON
export async function parseRequestJsonSafe<T = Record<string, unknown>>(request: import('next/server').NextRequest, defaultValue: T = {} as T): Promise<T> {
  try {
    const text = await request.text();
    if (!text) return defaultValue;
    return JSON.parse(text) as T;
  } catch {
    return defaultValue;
  }
}
