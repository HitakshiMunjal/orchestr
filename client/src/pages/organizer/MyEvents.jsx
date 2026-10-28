import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarPlus,
  Building2,
  Clock,
  ScanLine,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  BadgeCheck,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api, { errMsg } from "../../api/client";
import {
  PageHeader,
  StatusBadge,
  StatusPipeline,
  SeatBar,
  EmptyState,
  LoadingGrid,
  ConfirmButton,
  Spinner,
} from "../../components/ui";
import { fmtDateTime, fmtRange } from "../../utils/format";

export default function MyEvents() {
  const { user } = useAuth();
  const toast = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState(null);

  async function loadMyEvents() {
    try {
      setLoading(true);
      const res = await api.get("/bookings?scope=mine");
      setBookings(res.data.bookings || []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyEvents();
  }, []);

  async function handleCancelBooking(id) {
    setActionBusyId(id);
    try {
      const res = await api.patch(`/bookings/${id}/cancel-or-reject`, {
        reason: "Organizer voluntarily cancelled the venue reservation",
      });
      toast.info(res.data.message || "Booking cancelled. Venue and equipment holds released.");
      await loadMyEvents();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleCompleteEvent(id) {
    setActionBusyId(id);
    try {
      const res = await api.patch(`/bookings/${id}/complete`);
      toast.success(
        `Event closed! Marked ${res.data.noShowCount || 0} unscanned confirmed tickets as No-Show.`
      );
      await loadMyEvents();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDeleteBooking(id) {
    setActionBusyId(id);
    try {
      await api.delete(`/bookings/${id}`);
      toast.success("Event and all associated records permanently deleted.");
      await loadMyEvents();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Organizer Portal"
        title="My Club Events"
        subtitle="Manage your scheduled club events, door check-ins, and attendee rosters."
        actions={
          <Link to="/book" className="btn btn-primary">
            <CalendarPlus className="h-4 w-4" /> Book New Venue
          </Link>
        }
      />

      {loading ? (
        <LoadingGrid count={4} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No event requests submitted yet"
          message="Your club hasn't placed any venue bookings. Submit a request to lock a venue slot."
          action={
            <Link to="/book" className="btn btn-primary btn-sm">
              Book a Venue Now
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => {
            const isHoldActive = ["PENDING_INCHARGE", "PENDING_OSA_DEAN", "APPROVED_OPEN"].includes(
              b.status
            );
            const isOpen = b.status === "APPROVED_OPEN";
            const isCompleted = b.status === "COMPLETED";
            const isRejected = b.status === "REJECTED";
            const isCancelled = b.status === "CANCELLED";
            const isBusy = actionBusyId === b._id;

            return (
              <div key={b._id} className="glass glass-hover p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-xl">{b.title}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Host: <span className="text-teal-300 font-semibold">{b.clubName}</span> ·{" "}
                      {b.venueId?.name || "Campus Venue"} ({b.venueId?.building || "Main"})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOpen && (
                      <Link
                        to={`/my-events/${b._id}/scanner`}
                        className="btn btn-primary btn-sm"
                      >
                        <ScanLine className="h-3.5 w-3.5" /> Door Scanner
                      </Link>
                    )}

                    {isOpen && (
                      <ConfirmButton
                        onConfirm={() => handleCompleteEvent(b._id)}
                        disabled={isBusy}
                        confirmLabel="Confirm Close & Flag No-Shows"
                        className="btn btn-violet btn-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Close Event
                      </ConfirmButton>
                    )}

                    {isHoldActive && (
                      <ConfirmButton
                        onConfirm={() => handleCancelBooking(b._id)}
                        disabled={isBusy}
                        confirmLabel="Click to Release Venue Hold"
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel Booking
                      </ConfirmButton>
                    )}

                    {user.role === "admin" && (
                      <ConfirmButton
                        onConfirm={() => handleDeleteBooking(b._id)}
                        disabled={isBusy}
                        confirmLabel="Delete Permanently"
                        className="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </ConfirmButton>
                    )}
                  </div>
                </div>

                {/* Pipeline visualizer */}
                <div className="my-5 p-4 rounded-xl bg-ink-950/60 border border-white/[0.04]">
                  <StatusPipeline booking={b} />
                </div>

                {/* Details Grid */}
                <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-white/[0.06] text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Scheduled Window</span>
                    <span className="font-semibold text-white">
                      {fmtRange(b.startTime, b.endTime)}
                    </span>
                    <p className="text-[11px] text-teal-300/80 mt-0.5">
                      Cleanup Buffer: until {fmtDateTime(b.bufferEndTime)}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Equipped Gear</span>
                    <span className="text-slate-200">
                      {b.equipmentIds && b.equipmentIds.length > 0
                        ? b.equipmentIds.map((eq) => eq.name).join(", ")
                        : "No extra equipment"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Seat Registration Cap</span>
                    <SeatBar
                      confirmed={b.confirmedCount || 0}
                      total={b.requestedSeats}
                      waitlisted={b.registrationStats?.WAITLISTED || 0}
                    />
                  </div>
                </div>

                {/* Approval Remarks Banner (if any) */}
                {(b.inchargeApproval?.remarks || b.deanApproval?.remarks || b.rejectionReason) && (
                  <div className="mt-4 p-3 rounded-xl bg-ink-900 border border-white/[0.06] text-xs space-y-1">
                    {b.inchargeApproval?.remarks && (
                      <p className="text-slate-300">
                        <span className="text-amber-300 font-semibold">In-Charge Note:</span>{" "}
                        {b.inchargeApproval.remarks}
                      </p>
                    )}
                    {b.deanApproval?.remarks && (
                      <p className="text-slate-300">
                        <span className="text-violet-300 font-semibold">OSA Dean Note:</span>{" "}
                        {b.deanApproval.remarks}
                      </p>
                    )}
                    {b.rejectionReason && (
                      <p className="text-rose-300 font-semibold">
                        Reason for Cancellation/Rejection: {b.rejectionReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
