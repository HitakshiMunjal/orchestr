import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Registration, EventItem } from '../types';
import { generateCertificatePDF } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';
import { 
  Ticket, 
  Clock, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Download, 
  ExternalLink, 
  Trash2, 
  ShieldCheck, 
  Timer,
  ChevronRight
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User;
  onViewTicket: (reg: Registration, event?: EventItem) => void;
  onOpenVerify: (hash: string) => void;
  onRefreshUser: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  onViewTicket,
  onOpenVerify,
  onRefreshUser,
}) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'TICKETS' | 'WAITLIST' | 'CERTIFICATES' | 'STRIKES'>('TICKETS');
  const [timeRemainingMap, setTimeRemainingMap] = useState<Record<string, string>>({});

  const fetchMyData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMyRegistrations();
      setRegistrations(res.registrations || []);
    } catch (err) {
      console.error('Failed to load student registrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, [currentUser.id]);

  // TTL Countdown interval for promoted waitlist seats
  useEffect(() => {
    const timer = setInterval(() => {
      const newMap: Record<string, string> = {};
      const now = Date.now();

      registrations.forEach((reg) => {
        if (reg.status === 'WAITLISTED' && reg.waitlistExpiresAt) {
          const diff = new Date(reg.waitlistExpiresAt).getTime() - now;
          if (diff > 0) {
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            newMap[reg.id] = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
          } else {
            newMap[reg.id] = 'Expired';
          }
        }
      });

      setTimeRemainingMap(newMap);
    }, 1000);

    return () => clearInterval(timer);
  }, [registrations]);

  const handleCancelTicket = async (regId: string) => {
    if (!confirm('Are you sure you want to cancel this registration? Your seat will immediately be passed to the #1 waitlisted student with a 30-minute claim TTL.')) return;

    try {
      await api.cancelRegistration(regId);
      await fetchMyData();
      onRefreshUser();
    } catch (err: any) {
      alert('Cancel failed: ' + err.message);
    }
  };

  const handleClaimWaitlist = async (regId: string) => {
    try {
      await api.claimWaitlistSeat(regId);
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
      await fetchMyData();
      onRefreshUser();
    } catch (err: any) {
      alert('Claim failed: ' + err.message);
    }
  };

  const handleDownloadCert = async (reg: Registration) => {
    await generateCertificatePDF({
      studentName: reg.userName,
      studentId: reg.studentId,
      affiliation: currentUser.department || 'Verified Campus Student',
      eventTitle: reg.eventTitle,
      issueDate: reg.certificateIssuedAt || reg.checkedInAt || new Date().toISOString(),
      certificateHash: reg.certificateHash || 'ORCH-PENDING-HASH',
      organizerName: 'Priya Patel',
      clubName: 'Campus Innovation Society',
    });
  };

  const confirmedTickets = registrations.filter((r) => r.status === 'CONFIRMED');
  const waitlistTickets = registrations.filter((r) => r.status === 'WAITLISTED');
  const attendedTickets = registrations.filter((r) => r.status === 'ATTENDED' || r.certificateGenerated);

  return (
    <div className="space-y-6">
      {/* Student Welcome & Strike Status Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Student Portal</span>
          <h2 className="text-xl font-black text-white mt-0.5">{currentUser.name}</h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>{currentUser.department}</span>
            {currentUser.studentId && <span>• ID: {currentUser.studentId}</span>}
            <span>• {currentUser.email}</span>
          </p>
        </div>

        {/* Strike Meter */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-4 shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">No-Show Strike Record</span>
            <div className="flex items-center gap-1.5 mt-1">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    currentUser.strikes >= num
                      ? 'bg-rose-500 text-white shadow-sm shadow-rose-950'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
          <div className="border-l border-slate-800 pl-4 text-xs">
            <span className={`font-bold block ${currentUser.strikes === 0 ? 'text-emerald-400' : currentUser.strikes < 3 ? 'text-amber-400' : 'text-rose-400 animate-pulse'}`}>
              {currentUser.strikes === 0 ? 'Clean Record (0 Strikes)' : `${currentUser.strikes} ${currentUser.strikes === 1 ? 'Strike' : 'Strikes'} Accrued`}
            </span>
            <span className="text-[10px] text-slate-400">
              {currentUser.strikes >= 3 ? 'Registration Suspended' : '3 strikes = 14-day ban'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex rounded-2xl bg-slate-900 p-1 border border-slate-800 max-w-xl">
        <button
          onClick={() => setActiveSubTab('TICKETS')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'TICKETS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          Confirmed Passes ({confirmedTickets.length})
        </button>
        <button
          onClick={() => setActiveSubTab('WAITLIST')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'WAITLIST'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Active Waitlists ({waitlistTickets.length})
        </button>
        <button
          onClick={() => setActiveSubTab('CERTIFICATES')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'CERTIFICATES'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Verified Certificates ({attendedTickets.length})
        </button>
        <button
          onClick={() => setActiveSubTab('STRIKES')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'STRIKES'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Strikes Log ({currentUser.strikes})
        </button>
      </div>

      {/* Tab 1: Confirmed Tickets */}
      {activeSubTab === 'TICKETS' && (
        <div className="space-y-4">
          {confirmedTickets.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800">
              <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No active event tickets</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Explore the campus events catalog to reserve seats with tamper-proof cryptographic QR passes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {confirmedTickets.map((reg) => (
                <div
                  key={reg.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {reg.checkedIn ? '✓ CHECKED IN AT DOOR' : 'CONFIRMED PASS'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">{reg.ticketId}</span>
                    </div>

                    <h3 className="text-base font-bold text-white">{reg.eventTitle}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Registered: {new Date(reg.registeredAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => onViewTicket(reg)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      View Signed QR Ticket
                    </button>
                    {!reg.checkedIn && (
                      <button
                        onClick={() => handleCancelTicket(reg.id)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 text-xs font-semibold transition-all border border-slate-700 hover:border-rose-800"
                        title="Cancel Registration (Promotes #1 waitlisted student with 30-min TTL)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Waitlists & Timed Promotion (TTL) */}
      {activeSubTab === 'WAITLIST' && (
        <div className="space-y-4">
          {waitlistTickets.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No active waitlist queues</h3>
              <p className="text-xs text-slate-400 mt-1">
                When full-capacity events have cancellations, waitlisted students receive automated 30-minute claim promotions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {waitlistTickets.map((reg) => {
                const hasActivePromotion = reg.waitlistExpiresAt && new Date() < new Date(reg.waitlistExpiresAt);
                const remainingTime = timeRemainingMap[reg.id] || '30m 00s';

                return (
                  <div
                    key={reg.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      hasActivePromotion
                        ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-500/60 shadow-xl shadow-amber-950/30'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        hasActivePromotion
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Timer className="w-3 h-3" />
                        {hasActivePromotion ? 'PROMOTED! CLAIM WINDOW OPEN' : `Waitlist Position #${reg.waitlistPosition || 1}`}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{reg.eventTitle}</h3>

                    {/* Promotion TTL Countdown Card */}
                    {hasActivePromotion ? (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-300 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" /> Time Remaining to Claim:
                          </span>
                          <strong className="text-base font-mono text-amber-400 font-black tracking-wider">
                            {remainingTime}
                          </strong>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          A seat opened! You have a 30-minute window to claim this seat before it passes to the next student in line.
                        </p>
                        <button
                          onClick={() => handleClaimWaitlist(reg.id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-950 flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-4 h-4" />
                          Claim Your Seat Now!
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                        You are in queue at position #{reg.waitlistPosition || 1}. You will receive a 30-minute claim notification when a seat opens.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Verified Certificates */}
      {activeSubTab === 'CERTIFICATES' && (
        <div className="space-y-4">
          {attendedTickets.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No certificates issued yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Certificates are automatically generated and issued strictly to students who check in at the venue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendedTickets.map((reg) => (
                <div
                  key={reg.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> VERIFIED ATTENDEE CREDENTIAL
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">{reg.certificateHash}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{reg.eventTitle}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Completed & Checked In: {new Date(reg.checkedInAt || reg.registeredAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleDownloadCert(reg)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Official PDF
                    </button>
                    {reg.certificateHash && (
                      <button
                        onClick={() => onOpenVerify(reg.certificateHash!)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1"
                        title="View Public Registry Verification Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Strikes History */}
      {activeSubTab === 'STRIKES' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">No-Show Penalty Audit History</h3>
              <p className="text-xs text-slate-400">Automated campus enforcement: students who register and fail to attend accrue strikes.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Total Strikes: {currentUser.strikes} / 3
            </span>
          </div>

          {currentUser.strikeHistory && currentUser.strikeHistory.length > 0 ? (
            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
              {currentUser.strikeHistory.map((s, idx) => (
                <div key={s.id || idx} className="p-4 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-rose-400 block mb-0.5">
                      Strike Issued: {s.eventTitle}
                    </span>
                    <p className="text-slate-300">{s.reason}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Issued by {s.issuedBy} on {new Date(s.issuedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {s.revokedAt ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      Revoked by Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                      Active Strike
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              You have a clean attendance record with 0 penalty strikes. Keep it up!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
