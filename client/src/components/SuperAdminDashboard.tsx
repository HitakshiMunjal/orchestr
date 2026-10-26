import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, AuditLogEntry, AnalyticsData } from '../types';
import { 
  BarChart3, 
  ShieldAlert, 
  FileText, 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Building, 
  Search, 
  Filter, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface SuperAdminDashboardProps {
  currentUser: User;
  usersList: User[];
  onRefreshUsers: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentUser,
  usersList,
  onRefreshUsers,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'AUDIT_LOG' | 'STRIKES'>('ANALYTICS');
  const [searchFilter, setSearchFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [anaRes, audRes] = await Promise.all([
        api.getAnalytics(),
        api.getAuditLogs({ action: actionFilter || undefined, search: searchFilter || undefined }),
      ]);
      setAnalytics(anaRes);
      setAuditLogs(audRes.logs || []);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleRevokeStrike = async (studentId: string, strikeId: string) => {
    const reason = prompt('Administrative reason for revoking strike:', 'Medical certificate submitted to Academic Registrar');
    if (reason === null) return;

    try {
      const res = await api.revokeStrike(studentId, strikeId, reason);
      alert(res.message);
      onRefreshUsers();
      fetchData();
    } catch (err: any) {
      alert('Revoke failed: ' + err.message);
    }
  };

  const handleIssueStrike = async (studentId: string) => {
    const reason = prompt('Reason for issuing administrative strike:', 'Unregistered disturbance during seminar');
    if (reason === null) return;

    try {
      const res = await api.issueStrike(studentId, reason);
      alert(res.message);
      onRefreshUsers();
      fetchData();
    } catch (err: any) {
      alert('Strike issue failed: ' + err.message);
    }
  };

  const studentsWithStrikes = usersList.filter((u) => u.role === 'STUDENT' && (u.strikes > 0 || u.isBlockedUntil));

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Campus Oversight & Registrar</span>
          <h2 className="text-xl font-black text-white mt-0.5">Dean of Academic Affairs Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time turnout & no-show telemetry, immutable event audit ledger, and disciplinary strike governance.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'ANALYTICS'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOG')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'AUDIT_LOG'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Immutable Audit Log
          </button>
          <button
            onClick={() => setActiveTab('STRIKES')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'STRIKES'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Disciplinary Board ({studentsWithStrikes.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Real-Time Analytics */}
      {activeTab === 'ANALYTICS' && analytics && (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Registrations</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{analytics.summary.totalRegistrations}</span>
                <span className="text-xs text-indigo-400 font-semibold">{analytics.summary.confirmedRegistrations} Confirmed</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Across all published campus events</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Actual Turnout Rate</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{analytics.summary.turnoutRate}%</span>
                <span className="text-xs text-slate-400 font-semibold">({analytics.summary.actualTurnout} attendees)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Verified check-in rate at entrance gates</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">No-Show Percentage</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${analytics.summary.noShowRate > 15 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {analytics.summary.noShowRate}%
                </span>
                <span className="text-xs text-slate-400 font-semibold">({analytics.summary.noShows} no-shows)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Penalized under automated strike rules</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Waitlist Conversions</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-400">{analytics.summary.waitlistConversionRate}%</span>
                <span className="text-xs text-slate-400 font-semibold">({analytics.summary.waitlisted} waiting)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Seats claimed within 30-min TTL</p>
            </div>
          </div>

          {/* Room Utilization Table & Bar Chart */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Campus Venue Utilization Rates</h3>
                <p className="text-xs text-slate-400">Monitors room efficiency and prevents underutilized hall bookings</p>
              </div>
              <span className="text-xs text-indigo-400 font-semibold">{analytics.roomUtilization.length} Venues Tracked</span>
            </div>

            <div className="space-y-3">
              {analytics.roomUtilization.map((room) => (
                <div key={room.roomId} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-400" /> {room.roomName}
                    </span>
                    <span className="font-mono font-bold text-slate-300">
                      Cap: {room.capacity} seats • {room.utilizationRate}% Utilization
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        room.utilizationRate >= 80
                          ? 'bg-emerald-500'
                          : room.utilizationRate >= 50
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${room.utilizationRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Immutable Audit Log */}
      {activeTab === 'AUDIT_LOG' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Immutable System Audit Trail</h3>
              <p className="text-xs text-slate-400">Permanent record of bookings, approvals, scans, duplicate conflicts & strikes</p>
            </div>

            {/* Filter Controls */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="AUTO_RELEASE_UNCLAIMED_SLOT">AUTO_RELEASE_UNCLAIMED_SLOT</option>
                <option value="DUPLICATE_SCAN_BLOCKED">DUPLICATE_SCAN_BLOCKED</option>
                <option value="CHECK_IN_SUCCESS">CHECK_IN_SUCCESS</option>
                <option value="APPROVE_BOOKING">APPROVE_BOOKING</option>
                <option value="ISSUE_STRIKE">ISSUE_STRIKE</option>
                <option value="WAITLIST_PROMOTION">WAITLIST_PROMOTION</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
              </div>
            </form>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/80">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs hover:bg-slate-900/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                        log.action.includes('ALERT') || log.action.includes('DUPLICATE') || log.action.includes('STRIKE')
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : log.action.includes('AUTO_RELEASE')
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-300">{log.actorName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({log.actorRole})</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{log.details}</p>
                  </div>

                  <div className="text-right shrink-0 text-[11px] text-slate-500 font-mono">
                    <p>{new Date(log.timestamp).toLocaleTimeString()}</p>
                    <p>{new Date(log.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Disciplinary Strikes Board */}
      {activeTab === 'STRIKES' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Student Strike Governance & Appeals</h3>
            <p className="text-xs text-slate-400">Review penalized students, inspect strike reasons, and grant administrative leniency</p>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
            {studentsWithStrikes.map((student) => {
              const isBlocked = student.strikes >= 3;

              return (
                <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm">{student.name}</strong>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isBlocked
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {student.strikes} Strikes {isBlocked && '• REGISTRATION BLOCKED'}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      {student.department} • {student.email}
                    </p>

                    {/* Strike Reasons */}
                    {student.strikeHistory && student.strikeHistory.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {student.strikeHistory.map((s) => (
                          <div key={s.id} className="text-[11px] text-slate-300 flex items-center justify-between gap-2 bg-slate-900 p-1.5 rounded">
                            <span>"{s.reason}" ({s.eventTitle})</span>
                            {!s.revokedAt && (
                              <button
                                onClick={() => handleRevokeStrike(student.id, s.id)}
                                className="text-[10px] text-emerald-400 hover:underline shrink-0"
                              >
                                Revoke Strike
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleIssueStrike(student.id)}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 text-xs font-semibold border border-slate-700"
                    >
                      Issue Disciplinary Strike
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
