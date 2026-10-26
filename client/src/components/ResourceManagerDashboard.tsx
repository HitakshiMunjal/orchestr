import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, CampusResource, ResourceBooking, CheckoutLog } from '../types';
import { 
  Boxes, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  MapPin, 
  ShieldCheck, 
  Plus, 
  Camera, 
  Projector, 
  Building, 
  RefreshCw,
  X,
  UserCheck
} from 'lucide-react';

interface ResourceManagerDashboardProps {
  currentUser: User;
  resources: CampusResource[];
  onRefreshResources: () => void;
}

export const ResourceManagerDashboard: React.FC<ResourceManagerDashboardProps> = ({
  currentUser,
  resources,
  onRefreshResources,
}) => {
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [checkoutLogs, setCheckoutLogs] = useState<CheckoutLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'CATALOG' | 'PENDING' | 'CHECKOUT_LOG' | 'BOOK_SLOT'>('CATALOG');
  const [isLoading, setIsLoading] = useState(false);

  // Booking Form State (tests 30-min cleanup buffer conflict prevention!)
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Return Gear Form State
  const [returningLogId, setReturningLogId] = useState<string | null>(null);
  const [returnCondition, setReturnCondition] = useState<'Good' | 'Damaged' | 'Late'>('Good');
  const [damageNotes, setDamageNotes] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bkgRes, chkRes] = await Promise.all([
        api.getBookings(),
        api.getCheckoutLogs(),
      ]);
      setBookings(bkgRes.bookings || []);
      setCheckoutLogs(chkRes.checkoutLogs || []);
    } catch (err) {
      console.error('Failed to load resource manager data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (bookingId: string) => {
    const reason = prompt('Approval note / confirmation:', 'Approved for department authorized event');
    if (reason === null) return;

    try {
      await api.approveBooking(bookingId, reason);
      await fetchData();
    } catch (err: any) {
      alert('Approval failed: ' + err.message);
    }
  };

  const handleReject = async (bookingId: string) => {
    const reason = prompt('Rejection reason / conflict details:', 'Facility reserved for scheduled hardware calibration');
    if (reason === null) return;

    try {
      await api.rejectBooking(bookingId, reason);
      await fetchData();
    } catch (err: any) {
      alert('Rejection failed: ' + err.message);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    try {
      const res = await api.createBooking({
        resourceId: selectedResourceId,
        purpose: bookingPurpose,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      alert(res.message);
      setBookingPurpose('');
      await fetchData();
      setActiveSubTab('CATALOG');
    } catch (err: any) {
      if (err.status === 409) {
        setConflictError(err.data?.message || err.message);
      } else {
        alert('Booking request failed: ' + err.message);
      }
    }
  };

  const handleTriggerAutoReleaseSweep = async () => {
    try {
      const res = await api.triggerSweep();
      alert(res.message);
      await fetchData();
    } catch (err: any) {
      alert('Sweep failed: ' + err.message);
    }
  };

  const handleReturnGearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningLogId) return;

    try {
      await api.returnGear(returningLogId, {
        conditionOnReturn: returnCondition,
        damageNotes,
      });
      alert('Return log updated successfully!');
      setReturningLogId(null);
      setDamageNotes('');
      await fetchData();
    } catch (err: any) {
      alert('Return failed: ' + err.message);
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Campus Facilities & Equipment</span>
          <h2 className="text-xl font-black text-white mt-0.5">Resource Custody & Approvals</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tiered approval workflow, 30-min buffer conflict check, unclaimed slot 20-min auto-release, and gear condition logging.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTriggerAutoReleaseSweep}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5"
            title="Runs automated sweep for approved room slots unclaimed after 20 minutes"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            Sweep Unclaimed Slots (20-min TTL)
          </button>
          <button
            onClick={() => setActiveSubTab('BOOK_SLOT')}
            className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-950 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Book Room / Gear
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex rounded-2xl bg-slate-900 p-1 border border-slate-800 max-w-2xl">
        <button
          onClick={() => setActiveSubTab('CATALOG')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'CATALOG'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          Campus Inventory ({resources.length})
        </button>
        <button
          onClick={() => setActiveSubTab('PENDING')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'PENDING'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Approvals ({pendingBookings.length})
        </button>
        <button
          onClick={() => setActiveSubTab('CHECKOUT_LOG')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'CHECKOUT_LOG'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Equipment Custody & Returns ({checkoutLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('BOOK_SLOT')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'BOOK_SLOT'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Conflict Buffer Test
        </button>
      </div>

      {/* Subtab 1: Inventory Catalog */}
      {activeSubTab === 'CATALOG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <div
              key={res.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    res.tier === 'RESTRICTED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {res.tier === 'RESTRICTED' ? 'RESTRICTED (Manual Approval)' : 'BASIC (Auto-Approved)'}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {res.category}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white">{res.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{res.description}</p>

                <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Location:</span>
                    <strong>{res.location}</strong>
                  </div>
                  {res.capacity && (
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Seating Limit:</span>
                      <strong className="text-indigo-400">{res.capacity} Seats</strong>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Cleanup Buffer:</span>
                    <strong className="text-blue-300">30 Minutes (Mandatory)</strong>
                  </div>
                </div>

                {/* Specs Pill List */}
                {res.specs && res.specs.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {res.specs.map((s, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Condition: <strong className="text-emerald-400">{res.currentCondition || 'Good'}</strong></span>
                <span className="text-[10px] text-slate-500">{res.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtab 2: Pending Approvals */}
      {activeSubTab === 'PENDING' && (
        <div className="space-y-4">
          {pendingBookings.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">All requests reviewed</h3>
              <p className="text-xs text-slate-400 mt-1">No pending restricted resource approvals at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
              {pendingBookings.map((bkg) => (
                <div key={bkg.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        REQUIRES MANAGER APPROVAL
                      </span>
                      <span className="text-xs font-bold text-white">{bkg.resourceName}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200">"{bkg.purpose}"</p>
                    <p className="text-xs text-slate-400">
                      Requested by <strong>{bkg.bookedByUserName}</strong> ({bkg.bookedByUserEmail})
                    </p>
                    <p className="text-xs text-blue-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(bkg.startTime).toLocaleString()} — {new Date(bkg.endTime).toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(bkg.id)}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(bkg.id)}
                      className="py-2 px-3.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-bold transition-all border border-rose-800 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 3: Equipment Custody & Return Log */}
      {activeSubTab === 'CHECKOUT_LOG' && (
        <div className="space-y-4">
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900">
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">Equipment Custody Tracking</span>
              <span className="text-[11px] text-slate-400">Tracks physical gear pick-up, condition & late penalties</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {checkoutLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{log.resourceName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'CHECKED_OUT'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {log.status === 'CHECKED_OUT' ? 'CURRENTLY IN CUSTODY' : 'RETURNED'}
                      </span>
                    </div>

                    <p className="text-slate-300">
                      Borrower: <strong>{log.userName}</strong> ({log.userEmail}) • Handed out by {log.checkedOutBy}
                    </p>
                    <p className="text-slate-400">
                      Out: {new Date(log.checkedOutAt).toLocaleDateString()} • Expected Return: {new Date(log.expectedReturnTime).toLocaleDateString()}
                    </p>

                    {log.actualReturnTime && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.conditionOnReturn === 'Good'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : log.conditionOnReturn === 'Damaged'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          Return Condition: {log.conditionOnReturn}
                        </span>
                        {log.damageNotes && <span className="text-slate-400 italic font-mono text-[11px]">Note: "{log.damageNotes}"</span>}
                      </div>
                    )}
                  </div>

                  {log.status === 'CHECKED_OUT' && (
                    <button
                      onClick={() => setReturningLogId(log.id)}
                      className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-950 shrink-0"
                    >
                      Process Return & Condition
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Modal to Process Gear Return */}
          {returningLogId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Log Equipment Return</h3>
                  <button onClick={() => setReturningLogId(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleReturnGearSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Inspected Condition</label>
                    <select
                      value={returnCondition}
                      onChange={(e) => setReturnCondition(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Good">Good (Full working order, batteries charged)</option>
                      <option value="Damaged">Damaged (Hardware fault, scratches, or missing cables)</option>
                      <option value="Late">Late (Returned past agreed deadline)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Manager Notes & Inspection Report</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Lens clean, minor scratch on cage, port verified."
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Confirm & Save Return Status
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab 4: Book Slot & Conflict Simulator */}
      {activeSubTab === 'BOOK_SLOT' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 max-w-xl mx-auto space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Resource Booking & Conflict Prevention</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tests automated conflict detection with <strong>mandatory 30-minute cleanup buffers</strong> and tiered approval routing.
            </p>
          </div>

          {conflictError && (
            <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 animate-in shake">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-200">Double-Booking Blocked!</strong>
                <p className="mt-0.5">{conflictError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Campus Room or Gear</label>
              <select
                required
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">Choose resource...</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — [{r.tier}] ({r.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose of Booking</label>
              <input
                type="text"
                required
                placeholder="e.g. Autonomous Vehicle Hardware Testing Session"
                value={bookingPurpose}
                onChange={(e) => setBookingPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-extrabold shadow-md shadow-blue-950"
            >
              Verify Buffer Conflict & Submit Booking
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
