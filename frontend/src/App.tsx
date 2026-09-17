import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { WelcomePage } from './pages/WelcomePage';
import { PublicCatalogue } from './pages/PublicCatalogue';
import { BookingWizard } from './pages/BookingWizard';
import { ClientDashboard } from './pages/ClientDashboard';
import { ReceptionistPortal } from './pages/ReceptionistPortal';
import { BarberDashboard } from './pages/BarberDashboard';
import { CompanyAdminDashboard } from './pages/CompanyAdminDashboard';
import { SystemAdminDashboard } from './pages/SystemAdminDashboard';
import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 font-sans">
      <Navbar />
      <main className="pb-12">
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
