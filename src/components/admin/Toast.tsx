'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastIntent = 'success' | 'error' | 'info';

interface ToastOptions {
  id?: string;
  type?: ToastIntent;
  title?: string;
  description: string;
  duration?: number;
}

interface ToastRecord extends Required<Omit<ToastOptions, 'id'>> {
  id: string;
}

interface ToastContextValue {
  showToast: (toast: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ id, type = 'info', title, description, duration = DEFAULT_DURATION }: ToastOptions) => {
      const toastId = id ?? generateId();
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          type,
          title: title ?? '',
          description,
          duration,
        },
      ]);

      if (duration > 0) {
        const timeout = setTimeout(() => {
          dismissToast(toastId);
        }, duration);
        timeoutsRef.current.set(toastId, timeout);
      }

      return toastId;
    },
    [dismissToast],
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-6 right-6 z-[1000] flex max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const containerClasses = 'pointer-events-auto rounded-lg border px-4 py-3 shadow-lg transition';
          let accentClasses = 'border-gray-200 bg-white text-gray-900';

          if (toast.type === 'success') {
            accentClasses = 'border-green-200 bg-green-50 text-green-900';
          } else if (toast.type === 'error') {
            accentClasses = 'border-red-200 bg-red-50 text-red-900';
          }

          return (
            <div
              key={toast.id}
              data-testid="toast-item"
              className={`${containerClasses} ${accentClasses}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
                  <p className="text-sm leading-snug">{toast.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-md border border-transparent px-2 py-1 text-xs text-gray-500 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                >
                  關閉
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { showToast, dismissToast } = context;

  const success = useCallback(
    (description: string, options?: Omit<ToastOptions, 'description' | 'type'>) =>
      showToast({ ...options, type: 'success', description }),
    [showToast],
  );

  const error = useCallback(
    (description: string, options?: Omit<ToastOptions, 'description' | 'type'>) =>
      showToast({ ...options, type: 'error', description }),
    [showToast],
  );

  const info = useCallback(
    (description: string, options?: Omit<ToastOptions, 'description' | 'type'>) =>
      showToast({ ...options, type: 'info', description }),
    [showToast],
  );

  const helpers = useMemo(
    () => ({
      show: showToast,
      success,
      error,
      info,
      dismiss: dismissToast,
    }),
    [showToast, success, error, info, dismissToast],
  );

  return helpers;
}
