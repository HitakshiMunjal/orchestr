import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Registration, EventItem } from '../types';
import { X, ShieldCheck, Calendar, MapPin, User, Clock, QrCode, AlertCircle, Sparkles } from 'lucide-react';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration | null;
  event: EventItem | null;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  registration,
  event,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!registration) return;

    // Encrypt / serialize payload for the QR scanner
    const qrPayload = JSON.stringify({
      ticketId: registration.ticketId,
      eventId: registration.eventId,
      userId: registration.userId,
      timestamp: registration.registeredAt,
      signature: registration.qrSignature,
    });

    QRCode.toDataURL(qrPayload, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate ticket QR:', err));
  }, [registration]);

  if (!isOpen || !registration) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">Tamper-Proof Digital Pass</span>
              <p className="text-[10px] text-slate-400">HMAC-SHA256 Cryptographic Signature</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ticket Body: Boarding pass layout */}
        <div className="p-6 space-y-5">
          {/* Event Header */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {event?.category || 'CAMPUS EVENT'}
              </span>
              {event?.dualScanRequired && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Dual-Scan Required
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-white leading-tight">
              {registration.eventTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{event?.resourceName || 'Campus Main Hall'}</span>
            </p>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden group">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Signed Ticket QR" className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                Generating signed pass...
              </div>
            )}
            <div className="mt-2 text-center">
              <span className="text-[11px] font-mono font-bold text-slate-900 tracking-wider">
                {registration.ticketId}
              </span>
              <p className="text-[10px] text-slate-500 font-medium">Show this at entrance gate to check in</p>
            </div>

            {/* Verification Status Badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              AUTHENTIC
            </div>
          </div>

          {/* Attendee Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Attendee</span>
              <p className="text-slate-200 font-bold truncate">{registration.userName}</p>
              <p className="text-[10px] text-slate-400 truncate">{registration.userEmail}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Status</span>
              <div className="mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  registration.checkedIn
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {registration.checkedIn ? '✓ CHECKED IN' : 'CONFIRMED SEAT'}
                </span>
              </div>
            </div>
          </div>

          {/* Security Signature Snippet */}
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono text-[9px] text-slate-400 break-all">
            <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider mb-0.5">
              Tamper-Proof HMAC-SHA256 Signature:
            </span>
            {registration.qrSignature}
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/40 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
          Single-use ticket. Screenshots shared with others will trigger a 409 Conflict rejection.
        </div>
      </div>
    </div>
  );
};
