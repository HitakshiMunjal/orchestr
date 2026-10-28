import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Building2,
  Clock,
  Ticket,
  Sparkles,
  Users,
  CheckCircle2,
  Hourglass,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api, { errMsg } from "../../api/client";
import {
  PageHeader,
  StatusBadge,
  SeatBar,
  EmptyState,
  LoadingGrid,
  Spinner,
} from "../../components/ui";
import { fmtDateTime, fmtRange } from "../../utils/format";

export default function BrowseEvents() {
  const { user } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const [eventsRes, ticketsRes] = await Promise.all([
        api.get("/bookings?status=APPROVED_OPEN"),
        api.get("/registrations/me"),
      ]);
      setEvents(eventsRes.data.bookings || []);
      setMyTickets(ticketsRes.data.registrations || []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRegister(event) {
    setRegisteringId(event._id);
    try {
      const res = await api.post(`/events/${event._id}/register`);
      const { seatStatus } = res.data;
      if (seatStatus === "CONFIRMED") {
        toast.success(`Seat confirmed for "${event.title}"! QR ticket issued.`);
      } else {
        toast.warn(`Event is at capacity. You are placed in the FIFO Waitlist.`);
      }
      await loadData();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setRegisteringId(null);
    }
  }

  const registeredEventMap = new Map();
  myTickets.forEach((t) => {
    if (t.eventId && t.status !== "CANCELLED") {
      registeredEventMap.set(t.eventId._id, t);
    }
  });

  return (
    <div>
      <PageHeader
        eyebrow="Student Portal"
        title="Open Student Registrations"
        subtitle="Discover and register for upcoming campus workshops, hackathons, and club activities."
        actions={
          <Link to="/tickets" className="btn btn-ghost btn-sm">
            <Ticket className="h-4 w-4 text-teal-300" /> View My Tickets ({myTickets.length})
          </Link>
        }
      />

      {loading ? (
        <LoadingGrid count={6} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No open events available"
          message="There are currently no events open for registration. Once venue bookings are approved by In-Charges and the OSA Dean, they appear here."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const existingReg = registeredEventMap.get(e._id);
            const isFull = (e.confirmedCount || 0) >= e.requestedSeats;
            const isBusy = registeringId === e._id;

            return (
              <div
                key={e._id}
                className="glass glass-hover p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                      {e.clubName}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>

                  <h3 className="font-bold text-white text-lg leading-snug">{e.title}</h3>
                  {e.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{e.description}</p>
                  )}

                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        {e.venueId?.name || "Campus Venue"} ({e.venueId?.building || "Main"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{fmtRange(e.startTime, e.endTime)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] space-y-4">
                  <SeatBar
                    confirmed={e.confirmedCount || 0}
                    total={e.requestedSeats}
                    waitlisted={e.registrationStats?.WAITLISTED || 0}
                  />

                  {existingReg ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-ink-900/60 border border-white/[0.06]">
                      <div className="flex items-center gap-2 text-xs">
                        {existingReg.status === "CONFIRMED" ? (
                          <CheckCircle2 className="h-4 w-4 text-teal-300" />
                        ) : (
                          <Hourglass className="h-4 w-4 text-amber-300" />
                        )}
                        <span className="font-semibold text-white">
                          {existingReg.status === "CONFIRMED"
                            ? "Confirmed Ticket"
                            : "Waitlisted"}
                        </span>
                      </div>
                      <Link
                        to="/tickets"
                        className="text-xs font-semibold text-teal-300 hover:text-teal-200 flex items-center gap-1"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(e)}
                      disabled={isBusy}
                      className={`btn w-full ${isFull ? "btn-violet" : "btn-primary"}`}
                    >
                      {isBusy ? (
                        <Spinner />
                      ) : isFull ? (
                        <>
                          <Hourglass className="h-4 w-4" /> Join FIFO Waitlist
                        </>
                      ) : (
                        <>
                          <Ticket className="h-4 w-4" /> Register For Event
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
