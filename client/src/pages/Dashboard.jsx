import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarPlus,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Building2,
  BadgeCheck,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { errMsg } from "../api/client";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  StatusPipeline,
  SeatBar,
  EmptyState,
  LoadingGrid,
} from "../components/ui";
import { fmtDateTime, fmtRange, ROLE_LABELS, firstName } from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        if (user.role === "student") {
          const [eventsRes, ticketsRes] = await Promise.all([
            api.get("/bookings?status=APPROVED_OPEN"),
            api.get("/registrations/me"),
          ]);
          if (!isMounted) return;
          const openEvents = eventsRes.data.bookings || [];
          const tickets = ticketsRes.data.registrations || [];
          setRecentBookings(openEvents.slice(0, 4));
          setMyTickets(tickets);
          setStats({
            openEvents: openEvents.length,
            confirmedTickets: tickets.filter((t) => t.status === "CONFIRMED").length,
            waitlisted: tickets.filter((t) => t.status === "WAITLISTED").length,
            attended: tickets.filter((t) => t.status === "CHECKED_IN").length,
          });
        } else if (user.role === "organizer") {
          const [myEventsRes, openRes] = await Promise.all([
            api.get("/bookings?scope=mine"),
            api.get("/bookings?status=APPROVED_OPEN"),
          ]);
          if (!isMounted) return;
          const mine = myEventsRes.data.bookings || [];
          setRecentBookings(mine.slice(0, 4));
          setStats({
            myEvents: mine.length,
            pendingApproval: mine.filter((b) =>
              ["PENDING_INCHARGE", "PENDING_OSA_DEAN"].includes(b.status)
            ).length,
            activeLocked: mine.filter((b) => b.status === "APPROVED_OPEN").length,
            totalAttendees: mine.reduce((sum, b) => sum + (b.confirmedCount || 0), 0),
          });
        } else if (user.role === "incharge") {
          const [inchargeRes, resourcesRes] = await Promise.all([
            api.get("/bookings?scope=incharge"),
            api.get("/resources?type=venue"),
          ]);
          if (!isMounted) return;
          const bookings = inchargeRes.data.bookings || [];
          setRecentBookings(bookings.slice(0, 4));
          setStats({
            pendingIncharge: bookings.filter((b) => b.status === "PENDING_INCHARGE").length,
            venuesManaged: (resourcesRes.data.resources || []).filter(
              (r) => r.inchargeId?._id === user._id || r.inchargeId === user._id
            ).length,
            approvedEvents: bookings.filter((b) =>
              ["PENDING_OSA_DEAN", "APPROVED_OPEN", "COMPLETED"].includes(b.status)
            ).length,
          });
        } else {
          // osa_dean or admin
          const [bookingsRes, analyticsRes] = await Promise.all([
            api.get("/bookings"),
            api.get("/analytics").catch(() => ({ data: {} })),
          ]);
          if (!isMounted) return;
          const all = bookingsRes.data.bookings || [];
          setRecentBookings(all.slice(0, 4));
          const pendingDean = all.filter((b) => b.status === "PENDING_OSA_DEAN").length;
          const activeHolds = all.filter((b) =>
            ["PENDING_INCHARGE", "PENDING_OSA_DEAN", "APPROVED_OPEN"].includes(b.status)
          ).length;
          const statsData = analyticsRes.data || {};
          setStats({
            pendingDean,
            activeHolds,
            totalBookings: all.length,
            venueUtilizationCount: (statsData.venueUtilization || []).length,
          });
        }
      } catch (err) {
        console.error("Dashboard load failed:", errMsg(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div>
      <PageHeader
        eyebrow="Operations Console"
        title={`Welcome back, ${firstName(user.name)}`}
        subtitle={`Signed in as ${ROLE_LABELS[user.role]} (${user.department || "General"}) — manage venue locks, approvals, registrations, and operations.`}
        actions={
          <div className="flex items-center gap-2">
            {user.role === "organizer" && (
              <Link to="/book" className="btn btn-primary">
                <CalendarPlus className="h-4 w-4" /> Book a Venue
              </Link>
            )}
            {user.role === "student" && (
              <Link to="/events" className="btn btn-primary">
                <CalendarCheck className="h-4 w-4" /> Browse Events
              </Link>
            )}
            {["incharge", "osa_dean"].includes(user.role) && (
              <Link to="/approvals" className="btn btn-primary">
                <ShieldCheck className="h-4 w-4" /> Review Queue
              </Link>
            )}
            {user.role === "admin" && (
              <Link to="/catalog" className="btn btn-primary">
                <Building2 className="h-4 w-4" /> Manage Catalog
              </Link>
            )}
          </div>
        }
      />

      {/* Role-Specific Stats Grid */}
      <section className="mb-10">
        {loading ? (
          <LoadingGrid count={4} className="h-28" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {user.role === "student" && (
              <>
                <StatCard
                  icon={CalendarCheck}
                  label="Open Events"
                  value={stats?.openEvents ?? 0}
                  hint="Ready for registration"
                  tone="teal"
                  delay={0}
                />
                <StatCard
                  icon={Ticket}
                  label="Confirmed Tickets"
                  value={stats?.confirmedTickets ?? 0}
                  hint="Door QR passes ready"
                  tone="emerald"
                  delay={50}
                />
                <StatCard
                  icon={Clock}
                  label="Waitlisted Spots"
                  value={stats?.waitlisted ?? 0}
                  hint="Automatic FIFO promotion"
                  tone="amber"
                  delay={100}
                />
                <StatCard
                  icon={BadgeCheck}
                  label="Certificates"
                  value={stats?.attended ?? 0}
                  hint="Attended & verified"
                  tone="violet"
                  delay={150}
                />
              </>
            )}

            {user.role === "organizer" && (
              <>
                <StatCard
                  icon={CalendarPlus}
                  label="My Event Bookings"
                  value={stats?.myEvents ?? 0}
                  hint="All submitted requests"
                  tone="teal"
                  delay={0}
                />
                <StatCard
                  icon={Clock}
                  label="Under Approval"
                  value={stats?.pendingApproval ?? 0}
                  hint="Provisional holds locked"
                  tone="amber"
                  delay={50}
                />
                <StatCard
                  icon={BadgeCheck}
                  label="Approved & Open"
                  value={stats?.activeLocked ?? 0}
                  hint="Registrations running"
                  tone="emerald"
                  delay={100}
                />
                <StatCard
                  icon={Users}
                  label="Confirmed Attendees"
                  value={stats?.totalAttendees ?? 0}
                  hint="Across all open events"
                  tone="violet"
                  delay={150}
                />
              </>
            )}

            {user.role === "incharge" && (
              <>
                <StatCard
                  icon={ShieldCheck}
                  label="Stage 1 Queue"
                  value={stats?.pendingIncharge ?? 0}
                  hint="Pending your venue approval"
                  tone="amber"
                  delay={0}
                />
                <StatCard
                  icon={Building2}
                  label="Venues Managed"
                  value={stats?.venuesManaged ?? 0}
                  hint="Assigned in catalog"
                  tone="teal"
                  delay={50}
                />
                <StatCard
                  icon={BadgeCheck}
                  label="Forwarded / Approved"
                  value={stats?.approvedEvents ?? 0}
                  hint="To OSA Dean or locked"
                  tone="emerald"
                  delay={100}
                />
                <StatCard
                  icon={Clock}
                  label="Conflict Engine"
                  value="15m Buffer"
                  hint="Cleanup auto-reserved"
                  tone="sky"
                  delay={150}
                />
              </>
            )}

            {["osa_dean", "admin"].includes(user.role) && (
              <>
                <StatCard
                  icon={BadgeCheck}
                  label="Stage 2 Final Queue"
                  value={stats?.pendingDean ?? 0}
                  hint="Pending OSA Dean venue-lock"
                  tone="violet"
                  delay={0}
                />
                <StatCard
                  icon={Building2}
                  label="Active Venue Holds"
                  value={stats?.activeHolds ?? 0}
                  hint="Provisional + approved locks"
                  tone="teal"
                  delay={50}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Total Events"
                  value={stats?.totalBookings ?? 0}
                  hint="All recorded requests"
                  tone="emerald"
                  delay={100}
                />
                <StatCard
                  icon={Users}
                  label="Utilized Venues"
                  value={stats?.venueUtilizationCount ?? 0}
                  hint="Active campus facilities"
                  tone="amber"
                  delay={150}
                />
              </>
            )}
          </div>
        )}
      </section>

      {/* Main Content Area */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Recent Events / Bookings */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {user.role === "student"
                ? "Featured Open Events"
                : user.role === "organizer"
                ? "Your Recent Event Bookings"
                : "Active Campus Bookings"}
            </h2>
            <Link
              to={
                user.role === "student"
                  ? "/events"
                  : user.role === "organizer"
                  ? "/my-events"
                  : "/approvals"
              }
              className="text-xs font-semibold text-teal-300 hover:text-teal-200 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <LoadingGrid count={3} />
          ) : recentBookings.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No events to show right now"
              message={
                user.role === "organizer"
                  ? "You haven't submitted any event bookings yet. Create your first request!"
                  : "Check back soon for newly approved campus events."
              }
              action={
                user.role === "organizer" ? (
                  <Link to="/book" className="btn btn-primary btn-sm">
                    Book a Venue
                  </Link>
                ) : null
              }
            />
          ) : (
            <div className="grid gap-4">
              {recentBookings.map((b) => (
                <div key={b._id} className="glass glass-hover p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{b.title}</h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        <span className="text-teal-300 font-medium">{b.clubName}</span> ·{" "}
                        {b.venueId?.name || "Campus Venue"} ({b.venueId?.building || "Main"})
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{fmtDateTime(b.startTime)}</span>
                  </div>

                  <div className="mb-4">
                    <StatusPipeline booking={b} />
                  </div>

                  <div className="border-t border-white/[0.06] pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="w-full sm:w-1/2">
                      <SeatBar
                        confirmed={b.confirmedCount || 0}
                        total={b.requestedSeats}
                        waitlisted={b.registrationStats?.WAITLISTED || 0}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role === "student" && b.status === "APPROVED_OPEN" && (
                        <Link to="/events" className="btn btn-primary btn-sm">
                          Register Seat
                        </Link>
                      )}
                      {user.role === "organizer" && b.status === "APPROVED_OPEN" && (
                        <Link to={`/my-events/${b._id}/scanner`} className="btn btn-violet btn-sm">
                          Door Scanner
                        </Link>
                      )}
                      {["incharge", "osa_dean", "admin"].includes(user.role) && (
                        <Link to="/approvals" className="btn btn-ghost btn-sm">
                          Review
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Context Sidebar */}
        <section className="space-y-6">
          {/* Quick Access Card */}
          <div className="glass p-5">
            <h3 className="font-bold text-white text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {user.role === "student" && (
                <>
                  <Link
                    to="/events"
                    className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] text-xs font-semibold text-slate-200 hover:border-teal-300/40 hover:bg-white/[0.04] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarCheck className="h-4 w-4 text-teal-300" /> Browse Available Events
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                  <Link
                    to="/tickets"
                    className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] text-xs font-semibold text-slate-200 hover:border-teal-300/40 hover:bg-white/[0.04] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <Ticket className="h-4 w-4 text-cyan-300" /> My QR Tickets & Certs
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                </>
              )}

              {user.role === "organizer" && (
                <>
                  <Link
                    to="/book"
                    className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] text-xs font-semibold text-slate-200 hover:border-teal-300/40 hover:bg-white/[0.04] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarPlus className="h-4 w-4 text-teal-300" /> Request Venue Booking
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                  <Link
                    to="/my-events"
                    className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] text-xs font-semibold text-slate-200 hover:border-teal-300/40 hover:bg-white/[0.04] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarCheck className="h-4 w-4 text-sky-300" /> Door Scanners & Rosters
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                </>
              )}

              {["incharge", "osa_dean", "admin"].includes(user.role) && (
                <>
                  <Link
                    to="/approvals"
                    className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] text-xs font-semibold text-slate-200 hover:border-teal-300/40 hover:bg-white/[0.04] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-amber-300" /> Pending Approvals Queue
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                  {["osa_dean", "admin"].includes(user.role) && (
                    <Link
                      to="/analytics"
                      className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] text-xs font-semibold text-slate-200 hover:border-teal-300/40 hover:bg-white/[0.04] transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <TrendingUp className="h-4 w-4 text-violet-300" /> Operational Analytics
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    </Link>
                  )}
                  <Link
                    to="/catalog"
                    className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] text-xs font-semibold text-slate-200 hover:border-teal-300/40 hover:bg-white/[0.04] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-teal-300" /> Venue & Gear Catalog
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Student Ticket Snapshot (if student) */}
          {user.role === "student" && myTickets.length > 0 && (
            <div className="glass p-5">
              <h3 className="font-bold text-white text-sm mb-3">Your Active Tickets</h3>
              <div className="space-y-2.5">
                {myTickets.slice(0, 3).map((t) => (
                  <div
                    key={t._id}
                    className="p-3 rounded-xl bg-ink-900/60 border border-white/[0.06] flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-white truncate">{t.eventId?.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {fmtRange(t.eventId?.startTime, t.eventId?.endTime)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
