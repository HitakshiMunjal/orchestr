import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api, setCurrentUserId } from '../services/api';
import { 
  Users, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Building, 
  Mail, 
  Lock, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface RoleSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChanged: (user: User) => void;
  usersList: User[];
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  usersList,
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState<UserRole>('STUDENT');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    setCurrentUserId(user.id);
    onUserChanged(user);
    onClose();
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Frontend validation for .edu / .ac.in
    const normalized = customEmail.trim().toLowerCase();
    const isCampusEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|ac\.in)$/.test(normalized);

    if (!isCampusEmail) {
      setErrorMsg('Login restricted to verified college emails (.edu or .ac.in). Personal email domains (gmail.com, yahoo.com) are strictly prohibited.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login(normalized, customName, customRole);
      setCurrentUserId(res.user.id);
      onUserChanged(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Campus login authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Campus Role Switcher & Authentication</h2>
              <p className="text-xs text-slate-400">Select a pre-configured persona or sign in with any .edu / .ac.in email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Persona Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Instant Demo Personas (1-Click Switch)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {usersList.map((user) => {
                const isSelected = currentUser?.id === user.id;
                const isBlocked = user.role === 'STUDENT' && user.strikes >= 3;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-950/50'
                        : 'border-slate-800 bg-slate-850/50 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-200 shrink-0">
                        {user.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-bold text-white truncate">{user.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-indigo-300 font-medium truncate">{user.department}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {user.role}
                        </span>

                        {user.role === 'STUDENT' && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              user.strikes === 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : user.strikes < 3
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                            }`}
                          >
                            {user.strikes >= 3 ? (
                              <><ShieldAlert className="w-3 h-3" /> Suspended ({user.strikes} strikes)</>
                            ) : (
                              <><AlertTriangle className="w-3 h-3" /> {user.strikes} {user.strikes === 1 ? 'Strike' : 'Strikes'}</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Campus Login Section */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-400" />
              Sign In With Verified Campus Email
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Enforces domain restriction: must end with <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">.edu</code> or <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">.ac.in</code>.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCustomLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@stanford.edu or student@iitd.ac.in"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="ORGANIZER">Club Organizer</option>
                    <option value="RESOURCE_MANAGER">Resource/Lab Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Verifying Campus Affiliation...' : 'Verify & Enter Orchestr'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
