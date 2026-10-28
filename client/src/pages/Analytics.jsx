import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Layers,
  Activity,
  Award,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { errMsg } from "../api/client";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  LoadingGrid,
} from "../components/ui";
import { fmtDateTime, fmtRelative } from "../utils/format";

export default function Analytics() {
  const { user } = useAuth();
  const toast = useToast();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const res = await api.get("/analytics");
      setAnalytics(res.data);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const eventStats = analytics?.eventAttendanceStats || [];
  const venueStats = analytics?.venueUtilization || [];
  const auditLogs = analytics?.recentAuditLogs || [];

  const totalCheckedIn = eventStats.reduce((sum, e) => sum + (e.checkedInCount || 0), 0);
  const totalNoShows = eventStats.reduce((sum, e) => sum + (e.noShowCount || 0), 0);
  const totalWaitlisted = eventStats.reduce((sum, e) => sum + (e.waitlistedCount || 0), 0);
  const totalPromoted = eventStats.reduce((sum, e) => sum + (e.promotedFromWaitlistCount || 0), 0);
  const avgAttendancePct =
    eventStats.length > 0
      ? Math.round(
          eventStats.reduce((sum, e) => sum + (e.attendanceRatePct || 0), 0) /
            eventStats.length
        )
      : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Executive Insights"
        title="Campus Operational Analytics & Audit Bus"
        subtitle="Computed via high-performance MongoDB Aggregation Pipelines: turnout rates, no-show deterrence, waitlist conversion efficiency, and immutable system audit logs."
      />

      {loading ? (
        <LoadingGrid count={4} className="h-28" />
      ) : (
        <>
          {/* Top Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              icon={CheckCircle2}
              label="Overall Turnout Rate"
              value={`${avgAttendancePct}%`}
              hint="Checked-in vs total confirmed"
              tone="teal"
              delay={0}
            />
            <StatCard
              icon={Users}
              label="Verified Door Check-Ins"
              value={totalCheckedIn}
              hint="Duplicate-free door entries"
              tone="emerald"
              delay={50}
            />
            <StatCard
              icon={XCircle}
              label="Flagged No-Shows"
              value={totalNoShows}
              hint="Unscanned seats on event close"
              tone="rose"
              delay={100}
            />
            <StatCard
              icon={Award}
              label="Waitlist Auto-Promotions"
              value={totalPromoted}
              hint={`From ${totalWaitlisted} total waitlisted`}
              tone="violet"
              delay={150}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-3 mb-8">
            {/* Event Attendance Breakdown (2 cols) */}
            <div className="lg:col-span-2 glass p-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                <div>
                  <h3 className="font-bold text-white text-base">
                    Event Turnout & Conversion Rates
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live attendee check-in and no-show performance per event
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {eventStats.length} events recorded
                </span>
              </div>

              {eventStats.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No registration statistics yet"
                  message="Once students register and door check-ins begin, turnout analytics will aggregate here."
                />
              ) : (
                <div className="space-y-4">
                  {eventStats.map((e) => (
                    <div
                      key={e._id}
                      className="p-4 rounded-xl bg-ink-900/60 border border-white/[0.06] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{e.eventTitle}</h4>
                          <p className="text-xs text-slate-400">
                            Host: <span className="text-teal-300">{e.clubName}</span> · Allotted:{" "}
                            {e.requestedSeats} seats
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-teal-300">
                          {e.attendanceRatePct}% Turnout
                        </span>
                      </div>

                      {/* Bar Breakdown */}
                      <div className="grid grid-cols-4 gap-2 text-xs pt-2 border-t border-white/[0.04]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Checked-In</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {e.checkedInCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Pending Door</span>
                          <span className="font-bold text-slate-200 text-sm">
                            {e.confirmedUnscannedCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">No-Shows</span>
                          <span className="font-bold text-rose-400 text-sm">{e.noShowCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">FIFO Promoted</span>
                          <span className="font-bold text-violet-400 text-sm">
                            {e.promotedFromWaitlistCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Venue Utilization Leaderboard (1 col) */}
            <div className="glass p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                  <h3 className="font-bold text-white text-base">Venue Utilization</h3>
                  <Building2 className="h-4 w-4 text-teal-300" />
                </div>

                {venueStats.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">
                    No approved venue bookings recorded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {venueStats.map((v, i) => (
                      <div
                        key={v._id}
                        className="p-3.5 rounded-xl bg-ink-900/60 border border-white/[0.06] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[10.5px] font-bold text-teal-300">
                            #{i + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-white">{v.venueName}</p>
                            <p className="text-[11px] text-slate-400">
                              Capacity: {v.capacity} seats · {v.totalEvents} events
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-teal-300">
                            {v.totalBookedHours} hrs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-teal-400/5 border border-teal-400/20 text-[11px] text-teal-200/90 leading-relaxed">
                Utilization aggregates total hours in <code className="text-teal-300 font-bold">APPROVED_OPEN</code> and{" "}
                <code className="text-teal-300 font-bold">COMPLETED</code> states.
              </div>
            </div>
          </div>

          {/* Immutable Audit Log Feed */}
          <div className="glass p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Append-Only Audit Bus Trail
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable event log powered by Node EventEmitter and MongoDB
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Last {auditLogs.length} events
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No system actions logged yet
              </p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-3 rounded-xl bg-ink-900/60 border border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-teal-400 shrink-0" />
                      <span className="font-mono font-semibold text-teal-300">
                        {log.action}
                      </span>
                      <span className="text-slate-500">by</span>
                      <span className="font-medium text-slate-200 truncate">
                        {log.actorId?.name || "System"} ({log.actorRole})
                      </span>
                      {log.previousStatus && log.newStatus && (
                        <span className="text-slate-400 text-[11px] hidden md:inline">
                          ({log.previousStatus} →{" "}
                          <span className="text-white font-semibold">{log.newStatus}</span>)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {fmtRelative(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
