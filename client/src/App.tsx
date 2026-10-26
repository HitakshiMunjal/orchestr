import React, { useState, useEffect } from 'react';
import { api, getCurrentUserId, setCurrentUserId } from './services/api';
import { User, EventItem, CampusResource, Registration } from './types';
import { Navbar } from './components/Navbar';
import { RoleSwitcher } from './components/RoleSwitcher';
import { EventsCatalog } from './components/EventsCatalog';
import { StudentDashboard } from './components/StudentDashboard';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { ResourceManagerDashboard } from './components/ResourceManagerDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TicketModal } from './components/TicketModal';
import { QRScannerModal } from './components/QRScannerModal';
import { ConcurrencyStressModal } from './components/ConcurrencyStressModal';
import { PublicVerifyPage } from './components/PublicVerifyPage';
import { Sparkles, Calendar, Ticket, Boxes, BarChart3, Scan, Shield } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [resources, setResources] = useState<CampusResource[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [activeTab, setActiveTab] = useState<string>('events');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isStressTestOpen, setIsStressTestOpen] = useState<boolean>(false);
  const [ticketModalData, setTicketModalData] = useState<{
    isOpen: boolean;
    registration: Registration | null;
    event: EventItem | null;
  }>({
    isOpen: false,
    registration: null,
    event: null,
  });

  // Public Verification Route
  const [verifyHash, setVerifyHash] = useState<string | null>(null);

  // Check URL on boot for /verify/ORCH-...
  useEffect(() => {
    const checkHashRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/verify/')) {
        const hash = path.replace('/verify/', '');
        if (hash) setVerifyHash(hash);
      }
    };
    checkHashRoute();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, eventsRes, resRes] = await Promise.all([
        api.getDemoUsers(),
        api.getEvents(),
        api.getResources(),
      ]);

      setUsersList(usersRes.users || []);
      setEvents(eventsRes.events || []);
      setResources(resRes.resources || []);

      // Find active user
      const savedId = getCurrentUserId();
      const matched = usersRes.users?.find((u) => u.id === savedId) || usersRes.users?.[0] || null;
      setCurrentUser(matched);

      if (matched) {
        const myRegs = await api.getMyRegistrations();
        setMyRegistrations(myRegs.registrations || []);
      }
    } catch (err) {
      console.error('Initial data load failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When active user switches:
  const handleUserChanged = async (newUser: User) => {
    setCurrentUser(newUser);
    setCurrentUserId(newUser.id);

    try {
      const myRegs = await api.getMyRegistrations();
      setMyRegistrations(myRegs.registrations || []);
    } catch (err) {
      console.error('Failed to load my registrations for switched user:', err);
    }

    // Adapt active tab to the role
    if (newUser.role === 'STUDENT') setActiveTab('events');
    else if (newUser.role === 'ORGANIZER') setActiveTab('organizer_dashboard');
    else if (newUser.role === 'RESOURCE_MANAGER') setActiveTab('resource_manager');
    else if (newUser.role === 'SUPER_ADMIN') setActiveTab('admin_dashboard');
  };

  const handleRefreshEvents = async () => {
    try {
      const [eventsRes, myRegs] = await Promise.all([
        api.getEvents(),
        api.getMyRegistrations(),
      ]);
      setEvents(eventsRes.events || []);
      setMyRegistrations(myRegs.registrations || []);
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  };

  const handleOpenTicket = (reg: Registration, event?: EventItem) => {
    const matchedEvent = event || events.find((e) => e.id === reg.eventId) || null;
    setTicketModalData({
      isOpen: true,
      registration: reg,
      event: matchedEvent,
    });
  };

  if (verifyHash) {
    return (
      <PublicVerifyPage
        initialHash={verifyHash}
        onBack={() => {
          setVerifyHash(null);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar with Quick Persona Pill */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Synchronizing campus records...</p>
          </div>
        ) : (
          <>
            {/* View 1: Events Catalog */}
            {activeTab === 'events' && (
              <EventsCatalog
                currentUser={currentUser}
                events={events}
                myRegistrations={myRegistrations}
                onOpenTicket={handleOpenTicket}
                onRefreshData={handleRefreshEvents}
                onOpenStressTest={() => setIsStressTestOpen(true)}
              />
            )}

            {/* View 2: Student Dashboard */}
            {activeTab === 'student_dashboard' && currentUser && (
              <StudentDashboard
                currentUser={currentUser}
                onViewTicket={handleOpenTicket}
                onOpenVerify={(hash) => setVerifyHash(hash)}
                onRefreshUser={loadInitialData}
              />
            )}

            {/* View 3: Club Organizer Dashboard */}
            {activeTab === 'organizer_dashboard' && currentUser && (
              <OrganizerDashboard
                currentUser={currentUser}
                events={events}
                resources={resources}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenStressTest={() => setIsStressTestOpen(true)}
                onRefreshEvents={handleRefreshEvents}
              />
            )}

            {/* View 4: Resource & Lab Manager Dashboard */}
            {activeTab === 'resource_manager' && currentUser && (
              <ResourceManagerDashboard
                currentUser={currentUser}
                resources={resources}
                onRefreshResources={loadInitialData}
              />
            )}

            {/* View 5: Super Admin Oversight */}
            {activeTab === 'admin_dashboard' && currentUser && (
              <SuperAdminDashboard
                currentUser={currentUser}
                usersList={usersList}
                onRefreshUsers={loadInitialData}
              />
            )}
          </>
        )}
      </main>

      {/* Interactive Modals */}
      <RoleSwitcher
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        usersList={usersList}
      />

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        events={events}
        onScanComplete={handleRefreshEvents}
      />

      <TicketModal
        isOpen={ticketModalData.isOpen}
        onClose={() => setTicketModalData({ isOpen: false, registration: null, event: null })}
        registration={ticketModalData.registration}
        event={ticketModalData.event}
      />

      <ConcurrencyStressModal
        isOpen={isStressTestOpen}
        onClose={() => setIsStressTestOpen(false)}
        events={events}
        onComplete={handleRefreshEvents}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>Orchestr</strong> — “Every Event. Perfectly Coordinated.” • Built with the MERN Stack.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Verified Domains (.edu / .ac.in)</span>
            <span>•</span>
            <span>HMAC-SHA256 Tickets</span>
            <span>•</span>
            <span>30-Min Waitlist TTL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
