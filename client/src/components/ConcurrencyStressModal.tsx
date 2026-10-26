import React, { useState } from 'react';
import { api } from '../services/api';
import { EventItem } from '../types';
import confetti from 'canvas-confetti';
import { 
  X, 
  Flame, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Cpu, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface ConcurrencyStressModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  onComplete?: () => void;
}

export const ConcurrencyStressModal: React.FC<ConcurrencyStressModalProps> = ({
  isOpen,
  onClose,
  events,
  onComplete,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [burstCount, setBurstCount] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const currentEvent = events.find((e) => e.id === selectedEventId);

  const handleRunStressTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const res = await api.stressTest(selectedEventId, burstCount);
      setResult(res);

      if (!res.overbooked) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
      if (onComplete) onComplete();
    } catch (err: any) {
      alert('Stress test error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Concurrency Stress Test Simulator</h2>
              <p className="text-xs text-slate-400">Prove atomic database locking & 0 overbooking during high-demand drops</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Info Banner */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-200 leading-relaxed">
            <p className="font-semibold flex items-center gap-1.5 text-indigo-300 mb-1">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
              Atomic Mutex Compare-And-Swap Protection
            </p>
            When 50+ students click "Register" at the exact same millisecond, Orchestr's locking mechanism serializes seat allocation. It caps registrations precisely at venue capacity and automatically moves overflow students onto the FIFO waitlist.
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Select Event for Stress Test</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} (Cap: {e.venueCapacity} seats • Currently: {e.registeredCount} booked)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Simultaneous Concurrent Requests Burst: <strong className="text-rose-400">{burstCount} students</strong>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={burstCount}
                onChange={(e) => setBurstCount(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>10 requests</span>
                <span>50 requests</span>
                <span>100 requests</span>
              </div>
            </div>

            <button
              onClick={handleRunStressTest}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-extrabold transition-all shadow-lg shadow-rose-950 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin text-white" />
                  Firing {burstCount} Concurrent Requests Simultaneously...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-white" />
                  Launch {burstCount} Concurrent Registration Requests
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {result && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Stress Test Results</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                  !result.overbooked 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {!result.overbooked ? (
                    <><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 0 OVERBOOKING VERIFIED</>
                  ) : (
                    <><AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> OVERBOOKING DETECTED</>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Capacity</span>
                  <strong className="text-sm text-white">{result.venueCapacity}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Confirmed</span>
                  <strong className="text-sm text-emerald-400">{result.finalConfirmed}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Waitlisted</span>
                  <strong className="text-sm text-amber-400">{result.finalWaitlist}</strong>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                {result.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
