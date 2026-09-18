import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Palette, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'System Admin',
  COMPANY_ADMIN: 'Company Admin',
  RECEPTIONIST: 'Receptionist',
  BARBER: 'Barber',
  CLIENT: 'Client',
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-display font-extrabold text-white mb-1">Settings</h1>
      <p className="text-gray-400 text-sm mb-8">Manage your appearance and account preferences.</p>

      <section className="card-3d bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-gold-500" />
          <h2 className="font-display font-bold text-white">Appearance</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">Choose how TrueCut looks on this device.</p>
        <ThemeToggle />
      </section>

      <section className="card-3d bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-gold-500" />
          <h2 className="font-display font-bold text-white">Profile</h2>
        </div>
        {user ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-dark-700 pb-2">
              <dt className="text-gray-400">Name</dt>
              <dd className="text-white font-medium">{user.name}</dd>
            </div>
            <div className="flex justify-between border-b border-dark-700 pb-2">
              <dt className="text-gray-400">Phone</dt>
              <dd className="text-white font-medium font-data">{user.phone}</dd>
            </div>
            {user.email && (
              <div className="flex justify-between border-b border-dark-700 pb-2">
                <dt className="text-gray-400">Email</dt>
                <dd className="text-white font-medium">{user.email}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-400">Role</dt>
              <dd className="text-gold-400 font-semibold">{ROLE_LABELS[user.role] || user.role}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-gray-500 text-sm">Not signed in.</p>
        )}
      </section>

      <section className="card-3d bg-dark-800 border border-dark-700 rounded-2xl p-6 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-gold-500" />
          <h2 className="font-display font-bold text-white">Notifications</h2>
        </div>
        <p className="text-gray-400 text-sm">
          SMS booking reminders are on by default for every client. Per-user notification
          controls are coming soon.
        </p>
      </section>
    </div>
  );
};
