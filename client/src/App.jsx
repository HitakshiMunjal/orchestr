import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import Logo from "./components/Logo";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import BrowseEvents from "./pages/student/BrowseEvents";
import MyTickets from "./pages/student/MyTickets";
import NewBooking from "./pages/organizer/NewBooking";
import MyEvents from "./pages/organizer/MyEvents";
import DoorScanner from "./pages/organizer/DoorScanner";
import ApprovalQueue from "./pages/ApprovalQueue";
import Analytics from "./pages/Analytics";

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="animate-pulse">
        <Logo size={56} />
      </div>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Every Event. Perfectly Coordinated.</p>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, booting } = useAuth();
  if (booting) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route
                path="catalog"
                element={
                  <RequireRole roles={["organizer", "incharge", "osa_dean", "admin"]}>
                    <Catalog />
                  </RequireRole>
                }
              />
              <Route
                path="events"
                element={
                  <RequireRole roles={["student"]}>
                    <BrowseEvents />
                  </RequireRole>
                }
              />
              <Route
                path="tickets"
                element={
                  <RequireRole roles={["student"]}>
                    <MyTickets />
                  </RequireRole>
                }
              />
              <Route
                path="book"
                element={
                  <RequireRole roles={["organizer", "admin"]}>
                    <NewBooking />
                  </RequireRole>
                }
              />
              <Route
                path="my-events"
                element={
                  <RequireRole roles={["organizer", "admin"]}>
                    <MyEvents />
                  </RequireRole>
                }
              />
              <Route
                path="my-events/:eventId/scanner"
                element={
                  <RequireRole roles={["organizer", "osa_dean", "admin"]}>
                    <DoorScanner />
                  </RequireRole>
                }
              />
              <Route
                path="approvals"
                element={
                  <RequireRole roles={["incharge", "osa_dean", "admin"]}>
                    <ApprovalQueue />
                  </RequireRole>
                }
              />
              <Route
                path="analytics"
                element={
                  <RequireRole roles={["osa_dean", "admin"]}>
                    <Analytics />
                  </RequireRole>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
