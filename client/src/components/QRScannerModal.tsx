import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EventItem, Registration } from '../types';
import { playSuccessChime, playErrorBuzzer } from '../utils/audio';
import { 
  X, 
  Scan, 
  ShieldCheck, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck, 
  ArrowRightLeft,
  Sparkles,
  Ticket
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  onScanComplete?: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  events,
  onScanComplete,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scanMode, setScanMode] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [offlineManifest, setOfflineManifest] = useState<any>(null);
  const [offlinePendingScans, setOfflinePendingScans] = useState<any[]>([]);
  const [eventTickets, setEventTickets] = useState<Registration[]>([]);

  // Simulation input
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [manualPayload, setManualPayload] = useState<string>('');
  const [scanResult, setScanResult] = useState<{
    type: 'SUCCESS' | 'DUPLICATE' | 'ERROR';
    title: string;
    message: string;
    details?: any;
    timestamp?: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;

    // Load registered tickets for this event so user can easily simulate scanning them
    api.getEventById(selectedEventId)
      .then((data) => {
        setEventTickets(data.registrations || []);
        if (data.registrations && data.registrations.length > 0) {
          setSelectedTicketId(data.registrations[0].ticketId);
        }
      })
      .catch((err) => console.error('Failed to load tickets for scanner:', err));
  }, [selectedEventId]);

  if (!isOpen) return null;

  const currentEvent = events.find((e) => e.id === selectedEventId);

  // Toggle Basement Mode (Offline)
  const handleToggleOffline = async () => {
    if (!isOfflineMode) {
      // Enabling offline mode: Pre-load manifest
      try {
        const res = await api.getOfflineManifest(selectedEventId);
        setOfflineManifest(res.manifest);
        setIsOfflineMode(true);
      } catch (err: any) {
        alert('Could not download offline manifest: ' + err.message);
      }
    } else {
      setIsOfflineMode(false);
    }
  };

  // Sync pending offline scans to server
  const handleSyncOfflineScans = async () => {
    if (offlinePendingScans.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await api.syncOfflineScans(offlinePendingScans);
      alert(`Synchronized ${res.summary.synced} offline scans! (${res.summary.duplicates} duplicate conflicts resolved).`);
      setOfflinePendingScans([]);
      if (onScanComplete) onScanComplete();
    } catch (err: any) {
      alert('Offline sync failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process the Door Scan
  const handleProcessScan = async (ticketDataPayload: any) => {
    setIsProcessing(true);
    setScanResult(null);

    // If Basement Offline Mode is active:
    if (isOfflineMode) {
      setTimeout(() => {
        const parsed = typeof ticketDataPayload === 'string' ? JSON.parse(ticketDataPayload) : ticketDataPayload;
        const attendee = offlineManifest?.attendees?.find((a: any) => a.ticketId === parsed.ticketId);

        if (!attendee) {
          playErrorBuzzer();
          setScanResult({
            type: 'ERROR',
            title: 'TICKET NOT IN OFFLINE MANIFEST',
            message: 'This ticket does not appear in the pre-loaded offline guest list.',
          });
          setIsProcessing(false);
          return;
        }

        // Check if already checked in locally
        const alreadyInPending = offlinePendingScans.some((s) => s.ticketId === parsed.ticketId);
        if (attendee.checkedIn || alreadyInPending) {
          playErrorBuzzer();
          setScanResult({
            type: 'DUPLICATE',
            title: '409 CONFLICT: DUPLICATE SCAN BLOCKED (OFFLINE)',
            message: `Ticket was already validated at ${attendee.checkedInAt || 'Offline Gate'}. Shared screenshot rejected.`,
            details: { name: attendee.userName, ticketId: attendee.ticketId },
          });
          setIsProcessing(false);
          return;
        }

        // Offline First Scan SUCCESS
        playSuccessChime();
        setOfflinePendingScans((prev) => [
          ...prev,
          { ticketId: parsed.ticketId, scannedAt: new Date().toISOString(), scanMode, deviceId: 'Basement Scanner #1' },
        ]);

        setScanResult({
          type: 'SUCCESS',
          title: 'OFFLINE CHECK-IN VERIFIED ✓',
          message: `Welcome, ${attendee.userName}! Stored in offline buffer.`,
          details: { name: attendee.userName, email: attendee.userEmail, ticketId: attendee.ticketId },
        });
        setIsProcessing(false);
      }, 300);
      return;
    }

    // Normal Online Mode
    try {
      const res = await api.scanTicket({
        ticketData: ticketDataPayload,
        scanMode,
        gateName: 'Gate A (Main Quad)',
      });

      playSuccessChime();
      setScanResult({
        type: 'SUCCESS',
        title: scanMode === 'EXIT' ? 'EXIT SCAN VERIFIED ✓' : 'CHECK-IN VERIFIED ✓',
        message: res.message || 'Access Granted. Welcome!',
        details: res.attendee || { name: res.registration?.userName, ticketId: res.registration?.ticketId },
        timestamp: new Date().toLocaleTimeString(),
      });

      // Refresh event tickets
      api.getEventById(selectedEventId).then((data) => setEventTickets(data.registrations || []));
      if (onScanComplete) onScanComplete();
    } catch (err: any) {
      playErrorBuzzer();
      const status = err.status || 500;
      const data = err.data || {};

      if (status === 409) {
        // DUPLICATE SCAN REJECTION!
        setScanResult({
          type: 'DUPLICATE',
          title: '409 CONFLICT: DUPLICATE SCAN BLOCKED!',
          message: data.message || 'This ticket has already been used! Shared screenshots are prohibited.',
          details: {
            attendeeName: data.attendeeName,
            originalCheckInAt: data.originalCheckInAt,
            checkedInBy: data.checkedInBy,
          },
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        setScanResult({
          type: 'ERROR',
          title: 'SCAN REJECTED / INVALID',
          message: data.message || err.message || 'Verification failed.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateSelectScan = () => {
    const reg = eventTickets.find((t) => t.ticketId === selectedTicketId);
    if (!reg) return;

    const payload = {
      ticketId: reg.ticketId,
      eventId: reg.eventId,
      userId: reg.userId,
      timestamp: reg.registeredAt,
      signature: reg.qrSignature,
    };
    handleProcessScan(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Live Door Scanner & Security Gate
                {isOfflineMode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Basement Mode
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Tamper-proof HMAC verification & duplicate-scan blocker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar: Event, Scan Mode & Offline toggle */}
        <div className="p-4 bg-slate-950 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Event Picker */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Active Event Venue
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.resourceName})
                </option>
              ))}
            </select>
          </div>

          {/* Entry vs Exit Scan Mode Toggle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Door Gate Scan Mode
            </label>
            <div className="flex rounded-xl bg-slate-900 p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setScanMode('ENTRY')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  scanMode === 'ENTRY'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entry Scan
              </button>
              <button
                type="button"
                onClick={() => setScanMode('EXIT')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                  scanMode === 'EXIT'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Exit Scan {currentEvent?.dualScanRequired && '(Dual-Req)'}
              </button>
            </div>
          </div>

          {/* Basement / Offline Mode Toggle */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Connectivity
            </label>
            <button
              onClick={handleToggleOffline}
              className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isOfflineMode
                  ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {isOfflineMode ? (
                <><WifiOff className="w-3.5 h-3.5 text-amber-400" /> Basement Mode Active</>
              ) : (
                <><Wifi className="w-3.5 h-3.5 text-emerald-400" /> Switch to Basement Mode</>
              )}
            </button>
          </div>
        </div>

        {/* Offline Sync Banner if pending scans exist */}
        {isOfflineMode && offlinePendingScans.length > 0 && (
          <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
            <span>{offlinePendingScans.length} scans queued offline in browser memory.</span>
            <button
              onClick={handleSyncOfflineScans}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Sync Scans Now
            </button>
          </div>
        )}

        {/* Scanner Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Flash Feedback Banner */}
          {scanResult && (
            <div
              className={`p-5 rounded-2xl border text-left transition-all animate-in zoom-in-95 duration-200 ${
                scanResult.type === 'SUCCESS'
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100 shadow-xl shadow-emerald-950/50'
                  : scanResult.type === 'DUPLICATE'
                  ? 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-xl shadow-rose-950/50 animate-bounce'
                  : 'bg-amber-950/80 border-amber-500 text-amber-100'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {scanResult.type === 'SUCCESS' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                ) : scanResult.type === 'DUPLICATE' ? (
                  <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-black tracking-wide">{scanResult.title}</h4>
                  <p className="text-xs mt-1 leading-relaxed">{scanResult.message}</p>

                  {scanResult.details && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs space-y-1">
                      {scanResult.details.name && (
                        <p><span className="text-slate-400 font-semibold">Attendee:</span> <strong>{scanResult.details.name}</strong></p>
                      )}
                      {scanResult.details.attendeeName && (
                        <p><span className="text-slate-400 font-semibold">Registered Holder:</span> <strong>{scanResult.details.attendeeName}</strong></p>
                      )}
                      {scanResult.details.originalCheckInAt && (
                        <p className="text-rose-300">
                          <span className="text-rose-400 font-semibold">First Checked-In At:</span> {new Date(scanResult.details.originalCheckInAt).toLocaleTimeString()} ({scanResult.details.checkedInBy || 'Main Gate'})
                        </p>
                      )}
                      {scanResult.timestamp && (
                        <p className="text-[10px] text-slate-400">Scan attempt time: {scanResult.timestamp}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Ticket Simulator Selector */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-indigo-400" />
              Interactive Door Ticket Simulator
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Select any registered ticket below to test: <strong>First Scan (flashes green)</strong> vs. <strong>Duplicate Scan (flashes red 409 conflict)</strong>!
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Choose Registered Student Ticket
                </label>
                <select
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {eventTickets.map((t) => (
                    <option key={t.ticketId} value={t.ticketId}>
                      {t.userName} ({t.userEmail}) — [{t.status}] {t.checkedIn ? '• ALREADY CHECKED-IN' : '• UNUSED PASS'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSimulateSelectScan}
                disabled={isProcessing || !selectedTicketId}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-2"
              >
                <Scan className="w-4 h-4" />
                {isProcessing ? 'Verifying HMAC Signature...' : `Simulate Door Scan (${scanMode} Mode)`}
              </button>
            </div>
          </div>

          {/* Live Attendee Manifest Snapshot */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Live Event Manifest ({eventTickets.length} Attendees)</span>
              <span className="text-[11px] text-slate-500">Real-time status updates</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 bg-slate-900/40">
              {eventTickets.map((t) => (
                <div key={t.id} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-slate-850/50">
                  <div>
                    <span className="font-bold text-slate-200">{t.userName}</span>
                    <span className="text-[11px] text-slate-400 ml-2 font-mono">{t.ticketId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.checkedIn 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {t.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                    </span>
                    {t.exitScanCompleted && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        EXIT VERIFIED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
