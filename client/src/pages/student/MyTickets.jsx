import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Ticket,
  QrCode,
  Download,
  XCircle,
  Building2,
  Clock,
  CheckCircle2,
  Hourglass,
  FileCheck,
  Maximize2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api, { errMsg } from "../../api/client";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  LoadingGrid,
  Modal,
  ConfirmButton,
  Spinner,
} from "../../components/ui";
import { fmtDateTime, fmtRange } from "../../utils/format";

export default function MyTickets() {
  const { user } = useAuth();
  const toast = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  async function loadTickets() {
    try {
      setLoading(true);
      const res = await api.get("/registrations/me");
      setTickets(res.data.registrations || []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleCancel(regId) {
    setCancellingId(regId);
    try {
      const res = await api.patch(`/registrations/${regId}/cancel`);
      toast.info("Registration cancelled. Any waitlisted student has been auto-promoted.");
      await loadTickets();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setCancellingId(null);
    }
  }

  async function handleDownloadCert(ticket) {
    setDownloadingId(ticket._id);
    try {
      const res = await api.get(`/registrations/${ticket._id}/certificate`, {
        responseType: "blob",
      });
      // Trigger file download in browser
      const blob = new Blob([res.data], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Certificate-${ticket.eventId?.title?.replace(/\s+/g, "_") || "Event"}.txt`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance certificate downloaded successfully!");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="My Passes & Credentials"
        title="My Tickets & Attendance Passes"
        subtitle="Manage your confirmed door passes, track real-time FIFO waitlist positions, and download verified attendance certificates."
      />

      {loading ? (
        <LoadingGrid count={4} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No registered events found"
          message="You haven't registered for any events yet. Browse open events to claim a confirmed seat or join a waitlist."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => {
            const isConfirmed = t.status === "CONFIRMED";
            const isWaitlisted = t.status === "WAITLISTED";
            const isCheckedIn = t.status === "CHECKED_IN";
            const isCancelled = t.status === "CANCELLED";
            const event = t.eventId || {};

            return (
              <div
                key={t._id}
                className="glass glass-hover p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                      {event.clubName || "Campus Club"}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>

                  <h3 className="font-bold text-white text-lg leading-snug">{event.title}</h3>

                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>{event.venueId?.name || "Campus Facility"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{fmtRange(event.startTime, event.endTime)}</span>
                    </div>
                  </div>

                  {/* QR Pass Preview for Confirmed */}
                  {isConfirmed && t.qrToken && (
                    <div className="mt-5 p-4 rounded-xl bg-ink-950/80 border border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <QRCodeSVG value={t.qrToken} size={56} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Door Entry Pass</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {t.qrToken.slice(0, 10)}...
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="btn btn-ghost btn-sm"
                        title="Enlarge Pass"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Waitlist Queue Position Banner */}
                  {isWaitlisted && (
                    <div className="mt-5 p-4 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs">
                      <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
                        <Hourglass className="h-4 w-4" />
                        <span>FIFO Waitlist Queue</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        You are at position{" "}
                        <span className="font-bold text-white">#{t.waitlistPosition ?? 1}</span> in line.
                        If any confirmed attendee cancels, you will be promoted automatically.
                      </p>
                    </div>
                  )}

                  {/* Checked In Banner */}
                  {isCheckedIn && (
                    <div className="mt-5 p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Door Check-In Verified</span>
                      </div>
                      <p className="text-slate-300">
                        Attendance confirmed at {fmtDateTime(t.checkedInAt)}. Your official certificate is ready.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  {isCheckedIn && (
                    <button
                      onClick={() => handleDownloadCert(t)}
                      disabled={downloadingId === t._id}
                      className="btn btn-success btn-sm w-full"
                    >
                      {downloadingId === t._id ? <Spinner /> : <Download className="h-3.5 w-3.5" />}
                      Stream Certificate
                    </button>
                  )}

                  {(isConfirmed || isWaitlisted) && (
                    <ConfirmButton
                      onConfirm={() => handleCancel(t._id)}
                      disabled={cancellingId === t._id}
                      confirmLabel="Click again to cancel seat"
                      className="btn btn-danger btn-sm w-full"
                    >
                      {isConfirmed ? "Cancel Ticket" : "Leave Waitlist"}
                    </ConfirmButton>
                  )}

                  {isCancelled && (
                    <span className="text-xs text-slate-500 italic">Registration cancelled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enlarged QR Modal */}
      <Modal
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title="Official Event Door Pass"
        footer={
          <button onClick={() => setSelectedTicket(null)} className="btn btn-ghost btn-sm">
            Close
          </button>
        }
      >
        {selectedTicket && (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="p-4 bg-white rounded-2xl shadow-2xl mb-4">
              <QRCodeSVG value={selectedTicket.qrToken || ""} size={220} />
            </div>
            <h3 className="font-bold text-white text-xl">
              {selectedTicket.eventId?.title || "Event Pass"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Attendee: <span className="text-white font-medium">{user.name}</span> ({user.department})
            </p>
            <div className="mt-4 p-3 rounded-xl bg-ink-900 border border-white/[0.08] w-full text-xs text-slate-300 space-y-1">
              <p>
                <span className="text-slate-500">Venue:</span> {selectedTicket.eventId?.venueId?.name || "Campus Venue"}
              </p>
              <p>
                <span className="text-slate-500">Token ID:</span>{" "}
                <span className="font-mono text-teal-300">{selectedTicket.qrToken}</span>
              </p>
            </div>
            <p className="text-[11px] text-amber-300/80 mt-4">
              ⚠️ Show this QR code at the door for authorized scanner verification. Screenshots cannot be re-used.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
