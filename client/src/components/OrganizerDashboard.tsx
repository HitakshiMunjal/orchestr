import React, { useState } from 'react';
import { api } from '../services/api';
import { User, EventItem, CampusResource } from '../types';
import { 
  Sparkles, 
  Plus, 
  Scan, 
  Flame, 
  AlertTriangle, 
  Users, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  X,
  Lock
} from 'lucide-react';

interface OrganizerDashboardProps {
  currentUser: User;
  events: EventItem[];
  resources: CampusResource[];
  onOpenScanner: () => void;
  onOpenStressTest: () => void;
  onRefreshEvents: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  currentUser,
  events,
  resources,
  onOpenScanner,
  onOpenStressTest,
  onRefreshEvents,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clubName, setClubName] = useState(currentUser.department || 'Google Developer Student Club');
  const [resourceId, setResourceId] = useState('');
  const [category, setCategory] = useState<'WORKSHOP' | 'HACKATHON' | 'SEMINAR' | 'CULTURAL' | 'TECH_TALK'>('WORKSHOP');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dualScanRequired, setDualScanRequired] = useState(false);
  const [selectedPrereqId, setSelectedPrereqId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const roomResources = resources.filter((r) => r.type === 'ROOM');
  const selectedVenue = roomResources.find((r) => r.id === resourceId);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId) {
      alert('Please select a venue room for the event.');
      return;
    }

    setIsLoading(true);
    try {
      const prereqs = [];
      if (selectedPrereqId) {
        const prereqEvt = events.find((ev) => ev.id === selectedPrereqId);
        if (prereqEvt) {
          prereqs.push({ eventId: prereqEvt.id, eventTitle: prereqEvt.title });
        }
      }

      const res = await api.createEvent({
        title,
        description,
        clubName,
        resourceId,
        category,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        dualScanRequired,
        prerequisites: prereqs,
      });

      alert(res.message);
      setIsCreateModalOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      onRefreshEvents();
    } catch (err: any) {
      alert('Create event error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkNoShows = async (eventId: string) => {
    if (!confirm('Finalize event and process no-shows? Any confirmed registered student who failed to check in will receive an automated penalty strike!')) return;

    try {
      const res = await api.markNoShows(eventId);
      alert(res.message);
      onRefreshEvents();
    } catch (err: any) {
      alert('Error marking no-shows: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Organizer Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Club Organizer Portal</span>
          <h2 className="text-xl font-black text-white mt-0.5">Campus Event Orchestration</h2>
          <p className="text-xs text-slate-400 mt-1">
            Room-linked capacity caps, prerequisite enforcement, live door scanner, and automated no-show strikes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Event
          </button>
          <button
            onClick={onOpenScanner}
            className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950 flex items-center gap-1.5"
          >
            <Scan className="w-4 h-4" /> Door Scanner
          </button>
          <button
            onClick={onOpenStressTest}
            className="py-2 px-3.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950 flex items-center gap-1.5"
            title="Simulate 50 concurrent students clicking register at the same millisecond"
          >
            <Flame className="w-4 h-4" /> Concurrency Test
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((evt) => {
          const fillPercentage = Math.min(100, Math.round(((evt.registeredCount || 0) / (evt.venueCapacity || 1)) * 100));

          return (
            <div
              key={evt.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {evt.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {evt.dualScanRequired && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Dual Scan
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {evt.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-white">{evt.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{evt.description}</p>

                {/* Venue & Capacity Metric */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Venue:
                    </span>
                    <strong className="text-white">{evt.resourceName}</strong>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        Seating Allotment (Room Cap: {evt.venueCapacity})
                      </span>
                      <span className="font-mono font-bold text-indigo-300">
                        {evt.registeredCount} / {evt.venueCapacity} ({fillPercentage}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          fillPercentage >= 100 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
                    <span>Checked In: <strong className="text-emerald-400">{evt.checkedInCount}</strong></span>
                    <span>Waitlisted Queue: <strong className="text-amber-400">{evt.waitlistCount}</strong></span>
                  </div>
                </div>

                {/* Prerequisites Badge */}
                {evt.prerequisites && evt.prerequisites.length > 0 && (
                  <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-800/40 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Prerequisite Required: <strong>{evt.prerequisites[0].eventTitle}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={onOpenScanner}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950 flex items-center justify-center gap-1"
                >
                  <Scan className="w-3.5 h-3.5" /> Door Scanner
                </button>
                {evt.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleMarkNoShows(evt.id)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-semibold transition-all border border-slate-700 hover:border-rose-800 flex items-center gap-1"
                    title="Process automated no-show strikes for absent registrants"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Process No-Shows
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Campus Event</h3>
                  <p className="text-xs text-slate-400">Room-linked capacity limit automatically applied</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Web3 & Autonomous Agents Workshop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Event agenda and expectations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Room Venue Picker (ROOM-LINKED CAPACITY LIMIT!) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Venue (Capacity automatically caps registrations!)
                </label>
                <select
                  required
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a campus room/auditorium...</option>
                  {roomResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Seating Limit: {r.capacity} seats • {r.location})
                    </option>
                  ))}
                </select>

                {selectedVenue && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Capacity automatically capped at exactly {selectedVenue.capacity} seats.
                  </p>
                )}
              </div>

              {/* Prerequisite Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Required Prerequisite Workshop (Optional)
                </label>
                <select
                  value={selectedPrereqId}
                  onChange={(e) => setSelectedPrereqId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None (Open to all students)</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} (Part 1 required)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-0.5">Students who haven't completed this Part 1 workshop will be blocked from registering.</p>
              </div>

              {/* Dual Scan Mode */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">Entry & Exit Dual-Scan Requirement</span>
                  <span className="text-[10px] text-slate-400">Requires students to scan both in and out to prevent leaving early for certificate.</span>
                </div>
                <input
                  type="checkbox"
                  checked={dualScanRequired}
                  onChange={(e) => setDualScanRequired(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 cursor-pointer"
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
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-950"
              >
                {isLoading ? 'Creating Event...' : 'Publish Event (Capacity Capped to Room)'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
