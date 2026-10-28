import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  Search,
  ArrowLeft,
  Camera,
  Keyboard,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api, { errMsg } from "../../api/client";
import { PageHeader, StatusBadge, Spinner, LoadingGrid } from "../../components/ui";
import { fmtDateTime } from "../../utils/format";

export default function DoorScanner() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scanner & manual input state
  const [manualToken, setManualToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const scannerRef = useRef(null);

  async function loadData() {
    try {
      setLoading(true);
      const [eventRes, rosterRes] = await Promise.all([
        api.get(`/bookings/${eventId}`),
        api.get(`/events/${eventId}/registrations`),
      ]);
      setEvent(eventRes.data.booking);
      setAttendees(rosterRes.data.registrations || []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function handleVerifyToken(tokenToVerify) {
    if (!tokenToVerify || processing) return;
    setProcessing(true);
    try {
      const res = await api.post(`/events/${eventId}/checkin`, {
        qrToken: tokenToVerify.trim(),
      });
      const reg = res.data.registration;
      setLastScanResult({
        success: true,
        message: "Entry Granted! Check-in verified.",
        student: reg.studentId,
        checkedInAt: reg.checkedInAt,
      });
      toast.success(`Check-in verified for ${reg.studentId?.name || "Student"}!`);
      setManualToken("");
      await loadData();
    } catch (err) {
      const errorMsg = errMsg(err);
      const isDuplicate = err.response?.status === 409;
      setLastScanResult({
        success: false,
        isDuplicate,
        message: errorMsg,
        checkedInAt: err.response?.data?.checkedInAt,
        student: err.response?.data?.student,
      });
      if (isDuplicate) {
        toast.error("DUPLICATE SCAN BLOCKED: Ticket already used!");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setProcessing(false);
    }
  }

  // Camera scanner mounting
  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        handleVerifyToken(decodedText);
      },
      (error) => {
        // ignore per-frame camera read errors
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [scanning, eventId]);

  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const confirmedCount = attendees.filter((a) => a.status === "CONFIRMED").length;

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/my-events"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to My Events
        </Link>
      </div>

      <PageHeader
        eyebrow="Door Operations"
        title="Verified Door QR Check-In"
        subtitle={
          event
            ? `Scanning entrance for "${event.title}" (${event.clubName}) at ${event.venueId?.name}. Screenshot sharing and duplicate scans are blocked in real-time.`
            : "Door entrance scanner"
        }
      />

      {loading ? (
        <LoadingGrid count={2} className="h-64" />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Scanner & Verification Console */}
          <div className="space-y-6">
            <div className="glass p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-teal-300" /> Door Entrance Terminal
                </h3>
                <button
                  onClick={() => setScanning(!scanning)}
                  className={`btn btn-sm ${scanning ? "btn-danger" : "btn-primary"}`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {scanning ? "Stop Camera" : "Start Camera Scanner"}
                </button>
              </div>

              {/* Camera Mount Container */}
              {scanning && (
                <div className="mb-6 p-4 rounded-2xl bg-ink-950 border border-white/[0.08]">
                  <div id="qr-reader" className="w-full" />
                </div>
              )}

              {/* Manual Token Verification (Desktop / Code Entry) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyToken(manualToken);
                }}
                className="space-y-3"
              >
                <label className="label flex items-center gap-1.5">
                  <Keyboard className="h-3.5 w-3.5 text-slate-400" />
                  Manual QR Token Verification
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input font-mono text-xs"
                    placeholder="Paste 40-character QR token or scan..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!manualToken.trim() || processing}
                    className="btn btn-primary px-5 shrink-0"
                  >
                    {processing ? <Spinner /> : "Verify"}
                  </button>
                </div>
              </form>

              {/* Scan Feedback Banner */}
              {lastScanResult && (
                <div
                  className={`mt-6 p-5 rounded-2xl border text-sm animate-fade-up ${
                    lastScanResult.success
                      ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
                      : "bg-rose-500/15 border-rose-400/40 text-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {lastScanResult.success ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-base">
                        {lastScanResult.success
                          ? "Check-In Verified!"
                          : lastScanResult.isDuplicate
                          ? "DUPLICATE SCAN BLOCKED"
                          : "Verification Failed"}
                      </h4>
                      <p className="mt-1 text-xs">{lastScanResult.message}</p>

                      {lastScanResult.student && (
                        <div className="mt-3 p-3 rounded-xl bg-ink-950/70 border border-white/[0.06] text-xs space-y-1">
                          <p>
                            <span className="text-slate-400">Student:</span>{" "}
                            <span className="font-bold text-white">
                              {lastScanResult.student.name}
                            </span>{" "}
                            ({lastScanResult.student.email})
                          </p>
                          <p>
                            <span className="text-slate-400">Department:</span>{" "}
                            {lastScanResult.student.department}
                          </p>
                          {lastScanResult.checkedInAt && (
                            <p>
                              <span className="text-slate-400">Checked In:</span>{" "}
                              {fmtDateTime(lastScanResult.checkedInAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Turnout Stats Box */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-4 text-center">
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  Checked In at Door
                </span>
                <p className="font-display text-3xl font-bold text-emerald-400 mt-2">
                  {checkedInCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Verified entries</p>
              </div>

              <div className="glass p-4 text-center">
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  Pending Arrival
                </span>
                <p className="font-display text-3xl font-bold text-amber-300 mt-2">
                  {confirmedCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Unscanned tickets</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Attendee Door Roster */}
          <div className="glass p-6 flex flex-col h-[600px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <div>
                <h3 className="font-bold text-white text-base">Live Attendee Roster</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {attendees.length} total registrations recorded
                </p>
              </div>
              <span className="text-xs font-semibold text-teal-300">
                {checkedInCount} / {attendees.length} Scanned
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {attendees.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-500">
                  No registered attendees yet
                </div>
              ) : (
                attendees.map((a) => {
                  const isChecked = a.status === "CHECKED_IN";
                  const isWaitlisted = a.status === "WAITLISTED";

                  return (
                    <div
                      key={a._id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        isChecked
                          ? "bg-emerald-400/5 border-emerald-400/20"
                          : isWaitlisted
                          ? "bg-amber-400/5 border-amber-400/20"
                          : "bg-ink-900/60 border-white/[0.06]"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">
                          {a.studentId?.name || "Student"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {a.studentId?.email} · {a.studentId?.department}
                        </p>
                        {a.checkedInAt && (
                          <p className="text-[10px] text-emerald-400 mt-0.5">
                            Checked in: {fmtDateTime(a.checkedInAt)}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
