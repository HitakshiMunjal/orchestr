import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  Crown,
  GraduationCap,
  ListOrdered,
  Lock,
  Mail,
  Megaphone,
  ScanLine,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { errMsg } from "../api/client";
import { firstName } from "../utils/format";
import Logo from "../components/Logo";
import { Spinner } from "../components/ui";

const DEMO_PASSWORD = "password123";

const DEMO_ACCOUNTS = [
  { id: "demo-student", role: "Student", email: "student@orchestr.edu", icon: GraduationCap, tone: "text-teal-300 bg-teal-400/10" },
  { id: "demo-organizer", role: "Organizer", email: "organizer@orchestr.edu", icon: Megaphone, tone: "text-sky-300 bg-sky-400/10" },
  { id: "demo-incharge", role: "In-Charge", email: "incharge@orchestr.edu", icon: ShieldCheck, tone: "text-amber-300 bg-amber-400/10" },
  { id: "demo-dean", role: "Dean", email: "dean@orchestr.edu", icon: BadgeCheck, tone: "text-violet-300 bg-violet-400/10" },
  { id: "demo-admin", role: "Admin", email: "admin@orchestr.edu", icon: Crown, tone: "text-rose-300 bg-rose-400/10" },
];

const FLOW = [
  { icon: Building2, title: "Resource Catalog", text: "Venues & gear with capacity and in-charges" },
  { icon: Lock, title: "Provisional Hold", text: "Conflict-checked with a 15-min cleanup buffer" },
  { icon: BadgeCheck, title: "Two-Stage Approval", text: "In-Charge → Dean sequential sanction" },
  { icon: ListOrdered, title: "Atomic Seats + FIFO", text: "Zero overbooking, auto waitlist promotion" },
  { icon: ScanLine, title: "Door QR Check-In", text: "Screenshot-sharing blocked at the door" },
  { icon: Award, title: "Certificates & Insights", text: "Streamed certificates and turnout analytics" },
];

export default function Login() {
  const { user, login, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", department: "CSE" });

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function finish(promise, key) {
    setBusy(key);
    try {
      const u = await promise();
      toast.success(`Welcome, ${firstName(u.name)}!`);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(null);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    finish(() => (mode === "login" ? login(form.email, form.password) : signup(form)), "form");
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] animate-float rounded-full bg-teal-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[480px] w-[480px] animate-float-slow rounded-full bg-violet-500/20 blur-[120px]" />

      {/* Hero */}
      <section className="relative hidden flex-col justify-between p-12 lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="font-display text-xl font-bold text-white">Orchestr</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Every Event. Perfectly Coordinated.</p>
          </div>
        </div>

        <div className="max-w-xl animate-fade-up my-auto py-10">
          <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
            From room request to <span className="text-gradient">certificate</span>, in one flow.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-slate-400">
            Official venue reservations, capacity-capped registrations, FIFO waitlists and duplicate-proof door
            check-ins — orchestrated for every club on campus.
          </p>

          <ol className="mt-10 grid grid-cols-2 gap-3">
            {FLOW.map((step, i) => (
              <li
                key={step.title}
                className="glass glass-hover flex animate-fade-up gap-3 p-3.5"
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/20 to-violet-400/10 text-teal-200 ring-1 ring-white/10">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    <span className="mr-1.5 text-slate-500">{i + 1}.</span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-400">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-slate-600">© {new Date().getFullYear()} Orchestr · Built for campus operations</p>
      </section>

      {/* Auth card */}
      <section className="relative flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={40} />
            <div>
              <p className="font-display text-xl font-bold text-white">Orchestr</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Every Event. Perfectly Coordinated.</p>
            </div>
          </div>

          <div className="glass bg-ink-900/60 p-7 sm:p-8">
            <h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {mode === "login" ? "Sign in to continue to your workspace." : "Students and club organizers can self-register."}
            </p>

            <div className="mt-6 grid grid-cols-2 rounded-xl border border-white/[0.06] bg-ink-950/60 p-1">
              {["login", "signup"].map((m) => (
                <button
                  key={m}
                  id={`tab-${m}`}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-lg py-2 text-sm font-semibold transition-all ${
                    mode === m ? "bg-white/10 text-white shadow" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {m === "login" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="label" htmlFor="signup-name">Full name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input id="signup-name" className="input pl-10" required value={form.name} onChange={set("name")} placeholder="Ananya Sharma" />
                  </div>
                </div>
              )}
              <div>
                <label className="label" htmlFor="auth-email">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input id="auth-email" type="email" className="input pl-10" required value={form.email} onChange={set("email")} placeholder="you@orchestr.edu" autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="auth-password">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="auth-password"
                    type="password"
                    className="input pl-10"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="••••••••"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>
              </div>
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="signup-role">I am a</label>
                    <select id="signup-role" className="input" value={form.role} onChange={set("role")}>
                      <option value="student">Student</option>
                      <option value="organizer">Club Organizer</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="signup-dept">Department</label>
                    <input id="signup-dept" className="input" value={form.department} onChange={set("department")} />
                  </div>
                </div>
              )}

              <button id="auth-submit" type="submit" disabled={Boolean(busy)} className="btn btn-primary w-full py-3">
                {busy === "form" ? <Spinner /> : <ArrowRight className="h-4 w-4" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">One-click demo roles</p>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  id={acc.id}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => finish(() => login(acc.email, DEMO_PASSWORD), acc.email)}
                  className="glass glass-hover flex flex-col items-center gap-2 px-1 py-3 text-[11px] font-semibold text-slate-300 disabled:opacity-50"
                  title={acc.email}
                >
                  <span className={`rounded-lg p-2 ${acc.tone}`}>
                    {busy === acc.email ? <Spinner /> : <acc.icon className="h-4 w-4" />}
                  </span>
                  {acc.role}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-slate-600">
              All demo accounts use password <code className="text-slate-400">{DEMO_PASSWORD}</code>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
