import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Award, 
  Calendar, 
  Building, 
  User, 
  Lock, 
  ArrowLeft 
} from 'lucide-react';

interface PublicVerifyPageProps {
  initialHash?: string;
  onBack: () => void;
}

export const PublicVerifyPage: React.FC<PublicVerifyPageProps> = ({
  initialHash = 'ORCH-A89F-3B42-7F91',
  onBack,
}) => {
  const [hashInput, setHashInput] = useState(initialHash);
  const [verificationData, setVerificationData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performLookup = async (hashToVerify: string) => {
    if (!hashToVerify.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setVerificationData(null);

    try {
      const data = await api.verifyCertificate(hashToVerify.trim().toUpperCase());
      setVerificationData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Hash not found in registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialHash) {
      performLookup(initialHash);
    }
  }, [initialHash]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Navigation */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orchestr Portal
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-xl shadow-indigo-950 ring-1 ring-white/20">
            <Award className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Official Credential Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Public registry to verify cryptographically issued campus event completion credentials
          </p>
        </div>

        {/* Search Hash Form */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Enter Certificate Verification Hash / Token
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="e.g. ORCH-XXXX-XXXX-XXXX"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
            <button
              onClick={() => performLookup(hashInput)}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>

        {/* Verification Result Card */}
        {verificationData && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            {/* Status Banner */}
            <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                  Official Record Found
                </span>
                <span className="text-sm font-bold text-white">
                  Cryptographically Verified & Authentic
                </span>
              </div>
            </div>

            {/* Credential Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Recipient Scholar</span>
                <p className="text-base font-bold text-white mt-0.5">{verificationData.recipientName}</p>
                <p className="text-xs text-indigo-400 font-medium">{verificationData.affiliation}</p>
                {verificationData.studentId && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {verificationData.studentId}</p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Event Completed</span>
                <p className="text-base font-bold text-white mt-0.5">{verificationData.eventTitle}</p>
                <p className="text-xs text-slate-400 mt-0.5">{verificationData.clubName}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Issuance Date</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {new Date(verificationData.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-[11px] text-slate-400">Door Checked In: {new Date(verificationData.checkedInAt).toLocaleTimeString()}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Verification Seal</span>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {verificationData.securitySeal}
                </div>
              </div>
            </div>

            {/* Tamper Proof Hash Snippet */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-center text-xs">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider mb-1">
                Permanent Registry Token
              </span>
              <span className="text-indigo-300 font-black tracking-widest text-sm">
                {verificationData.certificateHash}
              </span>
            </div>
          </div>
        )}

        {/* Error Card */}
        {errorMsg && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Verification Failed</h3>
            <p className="text-xs text-rose-300 max-w-sm mx-auto">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
};
