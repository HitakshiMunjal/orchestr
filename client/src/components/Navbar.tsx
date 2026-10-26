import React from 'react';
import { User, UserRole } from '../types';
import { 
  Sparkles, 
  Shield, 
  Scan, 
  AlertTriangle, 
  Users, 
  Calendar, 
  Key, 
  Ticket, 
  BarChart3, 
  FileText, 
  Boxes,
  Lock
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenRoleSwitcher: () => void;
  onOpenScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenRoleSwitcher,
  onOpenScanner,
}) => {
  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1"><Shield className="w-3 h-3" /> Super Admin</span>;
      case 'RESOURCE_MANAGER':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1"><Boxes className="w-3 h-3" /> Lab Manager</span>;
      case 'ORGANIZER':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Club Organizer</span>;
      case 'STUDENT':
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"><Ticket className="w-3 h-3" /> Student</span>;
    }
  };

  const isBlocked = currentUser?.role === 'STUDENT' && (currentUser.strikes >= 3) && currentUser.isBlockedUntil && new Date() < new Date(currentUser.isBlockedUntil);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      {/* Strike Warning Alert Banner if student has strikes */}
      {currentUser && currentUser.role === 'STUDENT' && currentUser.strikes > 0 && (
        <div className={`px-4 py-1.5 text-xs font-medium flex items-center justify-between transition-colors ${
          isBlocked 
            ? 'bg-rose-950/80 text-rose-300 border-b border-rose-800/60'
            : 'bg-amber-950/60 text-amber-300 border-b border-amber-800/40'
        }`}>
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertTriangle className={`w-4 h-4 shrink-0 ${isBlocked ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <span>
              {isBlocked ? (
                <strong>ACCOUNT SUSPENDED: You have reached 3 strikes for event no-shows. Registration is blocked until {new Date(currentUser.isBlockedUntil!).toLocaleDateString()}.</strong>
              ) : (
                <span>No-Show Strike Alert: You currently have <strong>{currentUser.strikes} {currentUser.strikes === 1 ? 'strike' : 'strikes'}</strong>. 3 strikes result in an automated 14-day campus event suspension.</span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('events')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  Orchestr
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">MERN</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block tracking-wide">
                “Every Event. Perfectly Coordinated.”
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Events Catalog
            </button>

            {currentUser?.role === 'STUDENT' && (
              <button
                onClick={() => setActiveTab('student_dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'student_dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                My Tickets & Waitlist
              </button>
            )}

            {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setActiveTab('organizer_dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'organizer_dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Organizer Portal
              </button>
            )}

            {(currentUser?.role === 'RESOURCE_MANAGER' || currentUser?.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setActiveTab('resource_manager')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'resource_manager'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                Resource & Gear Booking
              </button>
            )}

            {currentUser?.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setActiveTab('admin_dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin_dashboard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Admin Analytics & Audit
              </button>
            )}
          </nav>

          {/* Right Actions: QR Scanner Button & Persona Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Door QR Scanner launch button */}
            <button
              onClick={onOpenScanner}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-950"
              title="Launch QR Door Scanner & Duplicate-Scan Prevention"
            >
              <Scan className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Door Check-In</span>
            </button>

            {/* Role Switcher Pill */}
            <button
              onClick={onOpenRoleSwitcher}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all group text-left"
              title="Click to switch persona or test other user roles"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 group-hover:ring-indigo-500"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                  {currentUser?.name ? currentUser.name.charAt(0) : '?'}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {currentUser?.name || 'Guest'}
                  </span>
                  {getRoleBadge(currentUser?.role)}
                </div>
                <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                  {currentUser?.email || 'No email'}
                </p>
              </div>
              <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors ml-1" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
