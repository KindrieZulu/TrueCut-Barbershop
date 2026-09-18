import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { WelcomePage } from './pages/WelcomePage';
import { useAuth } from './context/AuthContext';

// WelcomePage is the default landing route, so it stays in the main bundle for
// a fast first paint. Every other page is role-gated or secondary, so they are
// only fetched when a user actually navigates to them - this keeps a client
// booking a haircut from downloading the admin dashboards, and vice versa.
const PublicCatalogue = lazy(() => import('./pages/PublicCatalogue').then((m) => ({ default: m.PublicCatalogue })));
const BookingWizard = lazy(() => import('./pages/BookingWizard').then((m) => ({ default: m.BookingWizard })));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard').then((m) => ({ default: m.ClientDashboard })));
const ReceptionistPortal = lazy(() =>
  import('./pages/ReceptionistPortal').then((m) => ({ default: m.ReceptionistPortal })),
);
const BarberDashboard = lazy(() => import('./pages/BarberDashboard').then((m) => ({ default: m.BarberDashboard })));
const CompanyAdminDashboard = lazy(() =>
  import('./pages/CompanyAdminDashboard').then((m) => ({ default: m.CompanyAdminDashboard })),
);
const SystemAdminDashboard = lazy(() =>
  import('./pages/SystemAdminDashboard').then((m) => ({ default: m.SystemAdminDashboard })),
);
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24 text-gold-500 animate-pulse">Loading...</div>
);

export const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 font-sans">
      <Navbar />
      <main className="pb-12">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/catalogue" element={<PublicCatalogue />} />
            <Route path="/book" element={<BookingWizard />} />
            <Route path="/dashboard" element={user ? <ClientDashboard /> : <Navigate to="/book" />} />
            <Route path="/receptionist" element={user ? <ReceptionistPortal /> : <Navigate to="/welcome" />} />
            <Route path="/barber" element={user ? <BarberDashboard /> : <Navigate to="/welcome" />} />
            <Route path="/admin" element={user ? <CompanyAdminDashboard /> : <Navigate to="/welcome" />} />
            <Route path="/sysadmin" element={user ? <SystemAdminDashboard /> : <Navigate to="/welcome" />} />
            <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/welcome" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};

export default App;
