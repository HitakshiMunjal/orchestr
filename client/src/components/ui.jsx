import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

const STATUS_STYLES = {
  PENDING_INCHARGE: { label: "Awaiting In-Charge", cls: "bg-amber-400/10 text-amber-300 ring-amber-400/30" },
  PENDING_OSA_DEAN: { label: "Awaiting Dean", cls: "bg-violet-400/10 text-violet-300 ring-violet-400/30" },
  APPROVED_OPEN: { label: "Locked · Open", cls: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30" },
  COMPLETED: { label: "Completed", cls: "bg-sky-400/10 text-sky-300 ring-sky-400/30" },
  REJECTED: { label: "Rejected", cls: "bg-rose-400/10 text-rose-300 ring-rose-400/30" },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-400/10 text-slate-400 ring-slate-400/25" },
  CONFIRMED: { label: "Confirmed", cls: "bg-teal-400/10 text-teal-300 ring-teal-400/30" },
  WAITLISTED: { label: "Waitlisted", cls: "bg-amber-400/10 text-amber-300 ring-amber-400/30" },
  CHECKED_IN: { label: "Checked In", cls: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30" },
  NO_SHOW: { label: "No-Show", cls: "bg-rose-400/10 text-rose-300 ring-rose-400/30" },
};

export function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { label: status, cls: "bg-slate-400/10 text-slate-300 ring-slate-400/25" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider ring-1 ring-inset ${s.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const PIPELINE_STEPS = ["Hold Placed", "In-Charge", "Dean Approval", "Completed"];
const REACHED_INDEX = { PENDING_INCHARGE: 0, PENDING_OSA_DEAN: 1, APPROVED_OPEN: 2, COMPLETED: 3 };

/** Visualizes PENDING_INCHARGE -> PENDING_OSA_DEAN -> APPROVED_OPEN -> COMPLETED */
export function StatusPipeline({ booking }) {
  const terminal = ["REJECTED", "CANCELLED"].includes(booking.status);
  let reached = REACHED_INDEX[booking.status] ?? 0;
  if (terminal) {
    reached = booking.deanApproval?.approvedAt ? 2 : booking.inchargeApproval?.approvedAt ? 1 : 0;
  }

  return (
    <div className="flex items-center" aria-label={`Approval pipeline: ${booking.status}`}>
      {PIPELINE_STEPS.map((label, i) => {
        const done = i <= reached;
        const failed = terminal && i === reached + 1;
        const waiting = !terminal && i === reached + 1 && reached < 2;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                  failed
                    ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/50"
                    : done
                    ? "bg-gradient-to-br from-teal-300 to-cyan-400 text-ink-950"
                    : waiting
                    ? "animate-pulse-ring bg-teal-400/15 text-teal-200 ring-1 ring-teal-300/60"
                    : "bg-white/5 text-slate-500 ring-1 ring-white/10"
                }`}
              >
                {failed ? <X className="h-3 w-3" /> : done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={`whitespace-nowrap text-[10px] font-medium ${
                  failed ? "text-rose-300" : done ? "text-slate-200" : waiting ? "text-teal-200" : "text-slate-500"
                }`}
              >
                {failed ? booking.status.toLowerCase() : label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <span
                className={`mx-1.5 mb-5 h-px flex-1 ${
                  i < reached ? "bg-gradient-to-r from-teal-300 to-cyan-400" : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SeatBar({ confirmed = 0, total = 0, waitlisted = 0 }) {
  const pct = total ? Math.min(100, Math.round((confirmed / total) * 100)) : 0;
  const full = confirmed >= total && total > 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          <span className="font-semibold text-white">{confirmed}</span> / {total} seats
        </span>
        <span className={full ? "font-semibold text-amber-300" : "text-slate-400"}>
          {full ? `Full${waitlisted ? ` · ${waitlisted} waitlisted` : ""}` : `${total - confirmed} left`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            full ? "bg-gradient-to-r from-amber-300 to-rose-400" : "bg-gradient-to-r from-teal-300 to-cyan-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-up">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/80">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-[2.1rem]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const STAT_TONES = {
  teal: "from-teal-400/20 to-teal-400/0 text-teal-300",
  violet: "from-violet-400/20 to-violet-400/0 text-violet-300",
  amber: "from-amber-400/20 to-amber-400/0 text-amber-300",
  sky: "from-sky-400/20 to-sky-400/0 text-sky-300",
  rose: "from-rose-400/20 to-rose-400/0 text-rose-300",
  emerald: "from-emerald-400/20 to-emerald-400/0 text-emerald-300",
};

export function StatCard({ icon: Icon, label, value, hint, tone = "teal", delay = 0 }) {
  return (
    <div className="glass glass-hover animate-fade-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {Icon && (
          <span className={`rounded-xl bg-gradient-to-br p-2 ${STAT_TONES[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="glass flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 rounded-2xl bg-gradient-to-br from-teal-400/15 to-violet-400/10 p-4 text-teal-300 ring-1 ring-white/10">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingGrid({ count = 3, className = "h-44" }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${className}`} />
      ))}
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

/** Two-step confirm: first click arms the button, second click within 3s fires */
export function ConfirmButton({ onConfirm, children, confirmLabel = "Click to confirm", className = "btn btn-danger btn-sm", disabled, id }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick() {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3000);
  }

  return (
    <button id={id} type="button" disabled={disabled} onClick={handleClick} className={`${className} ${armed ? "ring-2 ring-rose-400/60" : ""}`}>
      {armed ? confirmLabel : children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass relative w-full animate-fade-up bg-ink-850/95 ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/[0.06] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
