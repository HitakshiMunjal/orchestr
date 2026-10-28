import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, cls: "border-emerald-400/30 text-emerald-200", bar: "bg-emerald-400" },
  error: { icon: XCircle, cls: "border-rose-400/30 text-rose-200", bar: "bg-rose-400" },
  warn: { icon: AlertTriangle, cls: "border-amber-400/30 text-amber-100", bar: "bg-amber-400" },
  info: { icon: Info, cls: "border-cyan-400/30 text-cyan-100", bar: "bg-cyan-400" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      warn: (m) => push("warn", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(400px,calc(100vw-2.5rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const tone = TONES[t.type] || TONES.info;
          const Icon = tone.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative flex animate-slide-in items-start gap-3 overflow-hidden rounded-xl border bg-ink-850/95 p-3.5 pr-9 text-sm shadow-2xl backdrop-blur-xl ${tone.cls}`}
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
