import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  CalendarPlus,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../utils/format";
import Logo from "./Logo";

const OVERVIEW = { to: "/", label: "Overview", icon: LayoutDashboard, end: true };
const CATALOG = { to: "/catalog", label: "Venue Catalog", icon: Building2 };

export const NAV_BY_ROLE = {
  student: [
    OVERVIEW,
    { to: "/events", label: "Browse Events", icon: CalendarCheck },
    { to: "/tickets", label: "My Tickets", icon: Ticket },
  ],
  organizer: [
    OVERVIEW,
    { to: "/book", label: "Book a Venue", icon: CalendarPlus },
    { to: "/my-events", label: "My Events", icon: CalendarCheck },
    CATALOG,
  ],
  incharge: [OVERVIEW, { to: "/approvals", label: "Approval Queue", icon: ShieldCheck }, CATALOG],
  osa_dean: [
    OVERVIEW,
    { to: "/approvals", label: "Final Approvals", icon: BadgeCheck },
    { to: "/analytics", label: "Analytics", icon: TrendingUp },
    CATALOG,
  ],
  admin: [
    OVERVIEW,
    { to: "/catalog", label: "Manage Catalog", icon: Building2 },
    { to: "/approvals", label: "Approvals", icon: ShieldCheck },
    { to: "/analytics", label: "Analytics", icon: TrendingUp },
  ],
};

const ROLE_TONE = {
  student: "from-teal-300 to-cyan-400",
  organizer: "from-sky-300 to-indigo-400",
  incharge: "from-amber-300 to-orange-400",
  osa_dean: "from-violet-300 to-fuchsia-400",
  admin: "from-rose-300 to-pink-400",
};

function initials(name = "") {
  return name
    .replace(/^(Dr\.|Prof\.)\s+/i, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavItem({ item, compact }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          compact ? "shrink-0" : ""
        } ${
          isActive
            ? "bg-gradient-to-r from-teal-400/15 to-transparent text-white"
            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !compact && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-teal-300 to-cyan-400" />
          )}
          <Icon className={`h-4 w-4 transition-colors ${isActive ? "text-teal-300" : "group-hover:text-slate-200"}`} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = NAV_BY_ROLE[user.role] || [OVERVIEW];

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-900/70 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <Logo size={38} />
          <div>
            <p className="font-display text-lg font-bold leading-none text-white">Orchestr</p>
            <p className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-slate-500">Every Event. Perfectly Coordinated.</p>
          </div>
        </div>

        <p className="px-5 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</p>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
          {nav.map((item) => (
            <NavItem key={item.to + item.label} item={item} />
          ))}
        </nav>

        <div className="m-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-ink-950 ${
                ROLE_TONE[user.role] || ROLE_TONE.student
              }`}
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button id="logout-button" onClick={handleLogout} className="btn btn-ghost btn-sm mt-3 w-full">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-900/80 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display font-bold text-white">Orchestr</span>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" aria-label="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Primary mobile">
          {nav.map((item) => (
            <NavItem key={item.to + item.label} item={item} compact />
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
