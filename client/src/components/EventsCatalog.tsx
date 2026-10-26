import React, { useState } from 'react';
import { api } from '../services/api';
import { User, EventItem, Registration } from '../types';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  Search
} from 'lucide-react';

interface EventsCatalogProps {
  currentUser: User | null;
  events: EventItem[];
  myRegistrations: Registration[];
  onOpenTicket: (reg: Registration, event?: EventItem) => void;
  onRefreshData: () => void;
  onOpenStressTest: (eventId?: string) => void;
}

export const EventsCatalog: React.FC<EventsCatalogProps> = ({
  currentUser,
  events,
  myRegistrations,
  onOpenTicket,
  onRefreshData,
  onOpenStressTest,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => {
    const matchesCat = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.resourceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleRegister = async (event: EventItem) => {
    if (!currentUser) {
      alert('Please select or log in with a campus account first.');
      return;
    }

    setRegisteringId(event.id);
    try {
      const res = await api.registerForEvent(event.id);

      if (res.status === 'CONFIRMED') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        alert(`🎉 ${res.message}`);
        if (res.registration) {
          onOpenTicket(res.registration, event);
        }
      } else {
        alert(`⏳ ${res.message}`);
      }

      onRefreshData();
    } catch (err: any) {
      const data = err.data || {};
      if (data.error === 'MISSING_PREREQUISITE') {
        alert(`⚠️ ${data.message}`);
      } else if (data.error === 'SCHEDULE_CLASH') {
        alert(`⚠️ ${data.message}`);
      } else if (data.error === 'ACCOUNT_SUSPENDED_STRIKES') {
        alert(`🛑 ${data.message}`);
      } else {
        alert(err.message || 'Registration failed');
      }
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'WORKSHOP', 'HACKATHON', 'SEMINAR'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Events' : cat.charAt(0) + cat.slice(1).toLowerCase() + 's'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search events, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.map((evt) => {
          const myReg = myRegistrations.find((r) => r.eventId === evt.id);
          const isRegistered = Boolean(myReg && (myReg.status === 'CONFIRMED' || myReg.status === 'ATTENDED'));
          const isWaitlisted = Boolean(myReg && myReg.status === 'WAITLISTED');
          const isFull = evt.registeredCount >= evt.venueCapacity;
          const isCompleted = evt.status === 'COMPLETED';

          return (
            <div
              key={evt.id}
              className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group shadow-xl"
            >
              <div>
                {/* Cover Image & Category Badge */}
                <div className="h-44 w-full relative overflow-hidden bg-slate-950">
                  <img
                    src={evt.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-950/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30">
                      {evt.category}
                    </span>
                    {evt.dualScanRequired && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30">
                        Dual-Scan
                      </span>
                    )}
                  </div>

                  {/* Seating Limit Badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[11px] font-mono font-bold text-slate-200">
                    {evt.registeredCount} / {evt.venueCapacity} Seats
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>

                  {/* Venue & Time Details */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-200 font-semibold">{evt.resourceName}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{new Date(evt.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>

                  {/* Prerequisites Alert Badge */}
                  {evt.prerequisites && evt.prerequisites.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Requires Completion: <strong>{evt.prerequisites[0].eventTitle}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Action Footer */}
              <div className="p-5 pt-0">
                {isCompleted ? (
                  <div className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500 font-bold">
                    Event Completed
                  </div>
                ) : isRegistered ? (
                  <button
                    onClick={() => myReg && onOpenTicket(myReg, evt)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Seat Confirmed (View Pass)
                  </button>
                ) : isWaitlisted ? (
                  <div className="w-full py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-center text-xs font-bold">
                    Queued on Waitlist (Position #{myReg?.waitlistPosition || 1})
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegister(evt)}
                    disabled={registeringId === evt.id}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      isFull
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-950'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950'
                    }`}
                  >
                    {registeringId === evt.id ? (
                      'Securing Seat with Atomic Lock...'
                    ) : isFull ? (
                      <>
                        <Clock className="w-4 h-4" />
                        Join Waitlist Queue (100% Full)
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Register (Room Cap: {evt.venueCapacity})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
