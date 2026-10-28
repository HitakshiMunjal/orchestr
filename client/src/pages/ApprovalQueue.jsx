import { useEffect, useState } from "react";
import {
  ShieldCheck,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  Users,
  Cpu,
  AlertTriangle,
  ArrowRight,
  Filter,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { errMsg } from "../api/client";
import {
  PageHeader,
  StatusBadge,
  StatusPipeline,
  EmptyState,
  LoadingGrid,
  Modal,
  Spinner,
  ConfirmButton,
} from "../components/ui";
import { fmtDateTime, fmtRange } from "../utils/format";

export default function ApprovalQueue() {
  const { user } = useAuth();
  const toast = useToast();
  const isIncharge = user.role === "incharge";
  const isDean = user.role === "osa_dean";
  const isAdmin = user.role === "admin";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  // Approval / Rejection Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadBookings() {
    try {
      setLoading(true);
      const res = await api.get("/bookings");
      setBookings(res.data.bookings || []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function handleDeleteBooking(id) {
    try {
      await api.delete(`/bookings/${id}`);
      toast.success("Event and all associated records permanently deleted.");
      await loadBookings();
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  function handleOpenAction(booking, type) {
    setSelectedBooking(booking);
    setActionType(type);
    setRemarks(
      type === "approve"
        ? isIncharge
          ? "Venue verified and available. Approved for OSA Dean review."
          : "Final venue lock approved by OSA Dean. Event open for student registration."
        : ""
    );
  }

  async function handleConfirmAction(e) {
    e.preventDefault();
    if (!selectedBooking || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === "approve") {
        if (selectedBooking.status === "PENDING_INCHARGE") {
          await api.patch(`/bookings/${selectedBooking._id}/incharge-approve`, {
            remarks,
          });
          toast.success("Stage 1 In-Charge Approval recorded! Forwarded to OSA Dean.");
        } else if (selectedBooking.status === "PENDING_OSA_DEAN") {
          await api.patch(`/bookings/${selectedBooking._id}/dean-approve`, {
            remarks,
          });
          toast.success("Stage 2 OSA Dean Approval recorded! Venue officially locked & open for students.");
        }
      } else {
        const res = await api.patch(`/bookings/${selectedBooking._id}/cancel-or-reject`, {
          reason: remarks || "Booking rejected by administration",
        });
        toast.info(res.data.message || "Booking rejected. Venue and equipment holds released immediately.");
      }
      setSelectedBooking(null);
      await loadBookings();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Filter bookings according to activeTab and user role
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "pending") {
      if (isIncharge) {
        return (
          b.status === "PENDING_INCHARGE" &&
          (isAdmin || b.venueId?.inchargeId === user._id || b.venueId?.inchargeId?._id === user._id)
        );
      }
      if (isDean) {
        return b.status === "PENDING_OSA_DEAN";
      }
      // admin sees any pending
      return ["PENDING_INCHARGE", "PENDING_OSA_DEAN"].includes(b.status);
    }
    if (activeTab === "active_holds") {
      return ["PENDING_INCHARGE", "PENDING_OSA_DEAN", "APPROVED_OPEN"].includes(b.status);
    }
    // past
    return ["COMPLETED", "REJECTED", "CANCELLED"].includes(b.status);
  });

  return (
    <div>
      <PageHeader
        eyebrow="Governance & Approvals"
        title="Venue Approval Queue"
        subtitle="Review and sanction event requests for assigned campus venues and equipment."
      />

      {/* Tab Filter */}
      <div className="glass p-3 mb-6 flex items-center gap-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={`btn btn-sm ${
            activeTab === "pending" ? "btn-primary" : "btn-ghost"
          }`}
        >
          Pending My Action (
          {
            bookings.filter((b) => {
              if (isIncharge) {
                return (
                  b.status === "PENDING_INCHARGE" &&
                  (isAdmin || b.venueId?.inchargeId === user._id || b.venueId?.inchargeId?._id === user._id)
                );
              }
              if (isDean) return b.status === "PENDING_OSA_DEAN";
              return ["PENDING_INCHARGE", "PENDING_OSA_DEAN"].includes(b.status);
            }).length
          }
          )
        </button>
        <button
          onClick={() => setActiveTab("active_holds")}
          className={`btn btn-sm ${
            activeTab === "active_holds" ? "btn-primary" : "btn-ghost"
          }`}
        >
          All Active Venue Holds
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`btn btn-sm ${
            activeTab === "history" ? "btn-primary" : "btn-ghost"
          }`}
        >
          Past / Completed History
        </button>
      </div>

      {loading ? (
        <LoadingGrid count={4} />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Approval queue is clear"
          message={
            activeTab === "pending"
              ? "There are no pending booking requests requiring your approval right now."
              : "No records found in this category."
          }
        />
      ) : (
        <div className="space-y-6">
          {filteredBookings.map((b) => {
            const isAssignedIncharge =
              b.venueId?.inchargeId === user._id ||
              b.venueId?.inchargeId?._id === user._id;
            const canInchargeApprove =
              b.status === "PENDING_INCHARGE" &&
              (isAdmin || (isIncharge && isAssignedIncharge));
            const canDeanApprove =
              b.status === "PENDING_OSA_DEAN" && (isAdmin || isDean);

            return (
              <div key={b._id} className="glass glass-hover p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-xl">{b.title}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      Organized by{" "}
                      <span className="text-teal-300 font-semibold">{b.clubName}</span> (
                      {b.organizerId?.name || "Organizer"}) · Venue:{" "}
                      <span className="text-white font-medium">
                        {b.venueId?.name || "Campus Venue"}
                      </span>{" "}
                      ({b.venueId?.building || "Main Block"})
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {canInchargeApprove && (
                      <button
                        onClick={() => handleOpenAction(b, "approve")}
                        className="btn btn-primary btn-sm"
                      >
                        <ShieldCheck className="h-4 w-4" /> Approve Stage 1
                      </button>
                    )}

                    {canDeanApprove && (
                      <button
                        onClick={() => handleOpenAction(b, "approve")}
                        className="btn btn-violet btn-sm"
                      >
                        <BadgeCheck className="h-4 w-4" /> Final Approve & Lock
                      </button>
                    )}

                    {(canInchargeApprove || canDeanApprove) && (
                      <button
                        onClick={() => handleOpenAction(b, "reject")}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    )}

                    {isAdmin && (
                      <ConfirmButton
                        onConfirm={() => handleDeleteBooking(b._id)}
                        confirmLabel="Delete Permanently"
                        className="btn btn-ghost btn-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </ConfirmButton>
                    )}
                  </div>
                </div>

                {/* Pipeline visualizer */}
                <div className="my-5 p-4 rounded-xl bg-ink-950/60 border border-white/[0.04]">
                  <StatusPipeline booking={b} />
                </div>

                {/* Details Breakdown */}
                <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-white/[0.06] text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Reserved Window</span>
                    <span className="font-semibold text-white">
                      {fmtRange(b.startTime, b.endTime)}
                    </span>
                    <p className="text-[11px] text-teal-300/80 mt-0.5">
                      Cleanup Buffer: until {fmtDateTime(b.bufferEndTime)}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Requested Capacity</span>
                    <span className="font-semibold text-white">
                      {b.requestedSeats} Seats{" "}
                      <span className="text-slate-400 font-normal">
                        (Venue Max: {b.venueId?.capacity || "—"})
                      </span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Requested Equipment</span>
                    <span className="text-slate-200">
                      {b.equipmentIds && b.equipmentIds.length > 0
                        ? b.equipmentIds.map((eq) => eq.name).join(", ")
                        : "None"}
                    </span>
                  </div>
                </div>

                {/* Remarks & Description */}
                {b.description && (
                  <p className="mt-3 text-xs text-slate-400 italic">
                    "{b.description}"
                  </p>
                )}

                {b.inchargeApproval?.approvedAt && (
                  <div className="mt-3 text-xs text-teal-300/90 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      Stage 1 passed: Approved by{" "}
                      {b.inchargeApproval.approvedBy?.name || "In-Charge"} at{" "}
                      {fmtDateTime(b.inchargeApproval.approvedAt)}
                      {b.inchargeApproval.remarks && ` ("${b.inchargeApproval.remarks}")`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approval / Rejection Modal */}
      <Modal
        open={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title={
          actionType === "approve"
            ? selectedBooking?.status === "PENDING_INCHARGE"
              ? `Stage 1: Venue In-Charge Approval`
              : `Stage 2: OSA Dean Final Venue-Lock`
            : `Reject Booking Request`
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedBooking(null)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="approval-form"
              disabled={submitting}
              className={`btn btn-sm ${
                actionType === "approve" ? "btn-primary" : "btn-danger"
              }`}
            >
              {submitting ? <Spinner /> : null}
              {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </button>
          </>
        }
      >
        {selectedBooking && (
          <form id="approval-form" onSubmit={handleConfirmAction} className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-ink-900 border border-white/[0.06] text-xs space-y-1.5">
              <p>
                <span className="text-slate-400">Event:</span>{" "}
                <span className="font-bold text-white">{selectedBooking.title}</span>
              </p>
              <p>
                <span className="text-slate-400">Club:</span> {selectedBooking.clubName}
              </p>
              <p>
                <span className="text-slate-400">Venue:</span> {selectedBooking.venueId?.name} (
                {selectedBooking.requestedSeats} seats)
              </p>
              <p>
                <span className="text-slate-400">Time:</span>{" "}
                {fmtRange(selectedBooking.startTime, selectedBooking.endTime)}
              </p>
            </div>

            <div>
              <label className="label">
                {actionType === "approve" ? "Approval Remarks / Guidelines" : "Reason for Rejection"}
              </label>
              <textarea
                rows={3}
                required={actionType === "reject"}
                className="input resize-none text-xs"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "Add any room setup notes or remarks..."
                    : "Specify the reason (e.g. university exam conflict, facility maintenance)..."
                }
              />
            </div>

            {actionType === "approve" && selectedBooking.status === "PENDING_OSA_DEAN" && (
              <p className="text-xs text-emerald-300">
                ✅ Approving this request will officially lock the venue slot and open registrations
                for students campus-wide.
              </p>
            )}

            {actionType === "reject" && (
              <p className="text-xs text-rose-300">
                ⚠️ Rejecting will immediately release all venue and equipment holds for other clubs.
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
