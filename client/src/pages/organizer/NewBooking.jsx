import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarPlus,
  Building2,
  Cpu,
  Clock,
  Users,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api, { errMsg } from "../../api/client";
import { PageHeader, Spinner } from "../../components/ui";
import { toLocalInput, fmtDateTime } from "../../utils/format";

export default function NewBooking() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [venues, setVenues] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  // Form State
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  defaultStart.setHours(14, 0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: "",
    clubName: "Developer Student Club",
    description: "",
    venueId: "",
    equipmentIds: [],
    startTime: toLocalInput(defaultStart),
    endTime: toLocalInput(defaultEnd),
    requestedSeats: 50,
    bufferMinutes: 15,
  });

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        const [vRes, eRes] = await Promise.all([
          api.get("/resources?type=venue"),
          api.get("/resources?type=equipment"),
        ]);
        const venueList = vRes.data.resources || [];
        setVenues(venueList);
        setEquipment(eRes.data.resources || []);
        if (venueList.length > 0) {
          setForm((f) => ({
            ...f,
            venueId: venueList[0]._id,
            requestedSeats: Math.min(f.requestedSeats, venueList[0].capacity),
          }));
        }
      } catch (err) {
        toast.error(errMsg(err));
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  const selectedVenue = venues.find((v) => v._id === form.venueId);

  // Live buffer computation
  const startDate = new Date(form.startTime);
  const endDate = new Date(form.endTime);
  const bufferEndDate = !Number.isNaN(endDate.getTime())
    ? new Date(endDate.getTime() + form.bufferMinutes * 60 * 1000)
    : null;

  function handleEquipmentToggle(eqId) {
    setForm((f) => {
      const exists = f.equipmentIds.includes(eqId);
      return {
        ...f,
        equipmentIds: exists
          ? f.equipmentIds.filter((id) => id !== eqId)
          : [...f.equipmentIds, eqId],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setConflictError(null);

    if (selectedVenue && form.requestedSeats > selectedVenue.capacity) {
      toast.error(
        `Requested seats (${form.requestedSeats}) cannot exceed venue capacity (${selectedVenue.capacity})`
      );
      return;
    }

    if (endDate <= startDate) {
      toast.error("Event end time must be after start time");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/bookings", {
        ...form,
        requestedSeats: Number(form.requestedSeats),
      });
      toast.success(
        `Provisional hold locked! Event submitted for In-Charge approval.`
      );
      navigate("/my-events");
    } catch (err) {
      const message = errMsg(err);
      if (err.response?.status === 409) {
        setConflictError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Venue Reservations"
        title="Book Venue & Equipment"
        subtitle="Request campus spaces and equipment for your club's upcoming events."
      />

      {conflictError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Time-Slot Conflict Detected</h4>
            <p className="text-xs text-rose-200 mt-1 leading-relaxed">{conflictError}</p>
            <p className="text-[11px] text-rose-300/80 mt-2">
              Tip: Pick an alternate time or choose a different campus venue.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Event Info */}
        <div className="glass p-6 space-y-4">
          <h3 className="font-bold text-white text-base">1. Event & Club Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Event Title</label>
              <input
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Annual Tech Symposium & Hackathon"
              />
            </div>
            <div>
              <label className="label">Host Club / Chapter</label>
              <input
                className="input"
                required
                value={form.clubName}
                onChange={(e) => setForm({ ...form, clubName: e.target.value })}
                placeholder="e.g. IEEE Student Branch"
              />
            </div>
          </div>

          <div>
            <label className="label">Description & Agenda</label>
            <textarea
              rows={3}
              className="input resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Outline the event objectives, guest speakers, and schedule..."
            />
          </div>
        </div>

        {/* Venue & Capacity */}
        <div className="glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">2. Venue & Seat Allotment</h3>
            {selectedVenue && (
              <span className="text-xs text-teal-300 font-semibold">
                Venue Max: {selectedVenue.capacity} physical seats
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Select Campus Venue</label>
              <select
                className="input"
                required
                value={form.venueId}
                onChange={(e) => {
                  const newVenueId = e.target.value;
                  const v = venues.find((item) => item._id === newVenueId);
                  setForm({
                    ...form,
                    venueId: newVenueId,
                    requestedSeats: v
                      ? Math.min(form.requestedSeats, v.capacity)
                      : form.requestedSeats,
                  });
                }}
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} ({v.building}) · Max {v.capacity} Seats
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Requested Seat Capacity</label>
              <input
                type="number"
                min="1"
                max={selectedVenue?.capacity || 500}
                className="input"
                required
                value={form.requestedSeats}
                onChange={(e) =>
                  setForm({ ...form, requestedSeats: Number(e.target.value) })
                }
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Strictly capped at venue capacity ({selectedVenue?.capacity || 0} seats).
              </p>
            </div>
          </div>

          {/* Equipment Checkboxes */}
          <div>
            <label className="label mb-2">Required AV / Lab Equipment</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {equipment.map((eq) => {
                const selected = form.equipmentIds.includes(eq._id);
                return (
                  <button
                    key={eq._id}
                    type="button"
                    onClick={() => handleEquipmentToggle(eq._id)}
                    className={`p-3 rounded-xl border text-left text-xs transition flex flex-col justify-between ${
                      selected
                        ? "border-teal-300/60 bg-teal-400/10 text-white"
                        : "border-white/[0.08] bg-ink-900/60 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <span className="font-semibold text-slate-200">{eq.name}</span>
                    <span className="text-[10.5px] text-slate-500 mt-1">
                      {eq.capacity} unit(s) · {eq.building}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Schedule & Automatic 15-Minute Buffer */}
        <div className="glass p-6 space-y-4">
          <h3 className="font-bold text-white text-base">
            3. Schedule & Automated Buffer Lock
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Start Time</label>
              <input
                type="datetime-local"
                className="input"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>

            <div>
              <label className="label">End Time</label>
              <input
                type="datetime-local"
                className="input"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>

          {/* Buffer Visualizer Box */}
          <div className="p-4 rounded-xl bg-ink-900/80 border border-teal-400/30 text-xs">
            <div className="flex items-center gap-2 text-teal-300 font-bold mb-1">
              <Clock className="h-4 w-4" />
              <span>Automated 15-Minute Cleanup Buffer</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              To prevent back-to-back overlap and allow room turnaround, your hold will lock the venue
              until:
            </p>
            <p className="text-sm font-bold text-white mt-1">
              {bufferEndDate ? fmtDateTime(bufferEndDate) : "—"}{" "}
              <span className="text-teal-300 font-normal text-xs">
                (End Time + {form.bufferMinutes}m)
              </span>
            </p>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loading}
            className="btn btn-primary px-6"
          >
            {submitting ? (
              <Spinner />
            ) : (
              <>
                <CalendarPlus className="h-4 w-4" /> Submit Booking Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
