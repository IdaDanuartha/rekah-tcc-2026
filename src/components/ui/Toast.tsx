"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURATION = 3800;

const kindMeta: Record<
  ToastKind,
  { icon: React.ComponentType<{ size?: number; className?: string }>; accent: string; iconClass: string }
> = {
  success: { icon: CheckCircle2, accent: "var(--color-hijau-tuntas)", iconClass: "text-[var(--color-hijau-tuntas)]" },
  error: { icon: AlertTriangle, accent: "var(--color-genting)", iconClass: "text-[var(--color-genting)]" },
  info: { icon: Info, accent: "var(--color-air-jernih)", iconClass: "text-[var(--color-air-jernih)]" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++seq.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const api: ToastApi = {
    show,
    success: (m) => show("success", m),
    error: (m) => show("error", m),
    info: (m) => show("info", m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const meta = kindMeta[t.kind];
          const Icon = meta.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="animate-fade-up pointer-events-auto flex items-start gap-3 pl-3 pr-2 py-3 rounded-lg card border-l-[3px] shadow-[var(--shadow-float)]"
              style={{ borderLeftColor: meta.accent }}
            >
              <Icon size={17} className={`shrink-0 mt-0.5 ${meta.iconClass}`} />
              <p className="flex-1 text-sm text-[var(--color-tanah-pecah)] leading-snug">
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                className="p-1 -mt-0.5 rounded text-[var(--color-lempung)] hover:text-[var(--color-tanah-pecah)] hover:bg-[var(--color-kertas-tua)] transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return ctx;
}
