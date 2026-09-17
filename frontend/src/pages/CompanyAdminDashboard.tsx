import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useRealtimeEvents } from '../api/events';
import {
  DollarSign, TrendingUp, Scissors, Settings, Users,
  BarChart3, RefreshCw, Plus, Edit2, Check, Shield, Download, Home, UserPlus
} from 'lucide-react';

export const CompanyAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'financial' | 'catalogue' | 'settings' | 'staff'>('financial');

  // Catalogue state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Staff registration state
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('Password123!');
  const [staffRole, setStaffRole] = useState<'BARBER' | 'RECEPTIONIST' | 'COMPANY_ADMIN'>('BARBER');
  const [staffMsg, setStaffMsg] = useState('');

  const fetchAdminData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/reports/daily/financial'),
      apiClient.get('/services/admin'),
      apiClient.get('/config'),
    ]).then(([repRes, servRes, cfgRes]) => {
      setReport(repRes.data);
      setServices(servRes.data);
      setSettings(cfgRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useRealtimeEvents((evt) => {
    if (evt.type === 'BOOKING_CONFIRMED' || evt.type === 'LEDGER_APPENDED' || evt.type === 'BOOKING_SERVED') {
      fetchAdminData();
    }
  });

  const handleExportCsv = () => {
    const exportUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/ledger/export/csv`
      : '/api/v1/ledger/export/csv';
    window.open(exportUrl, '_blank');
  };

  const handleCreateService = async () => {
    if (!newServiceName || !newServicePrice || !newServiceDuration) return;
    try {
      await apiClient.post('/services', {
        name: newServiceName,
        description: newServiceDesc,
        price: parseFloat(newServicePrice),
        durationMinutes: parseInt(newServiceDuration),
      });
      alert('Service added to catalogue');
      setNewServiceName(''); setNewServicePrice(''); setNewServiceDuration(''); setNewServiceDesc('');
      fetchAdminData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create service');
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await apiClient.patch(`/config/${key}`, { value });
      alert(`Setting ${key} updated to ${value}`);
      fetchAdminData();
    } catch (e: any) {
      alert('Failed to update setting');
    }
  };

  const handleRegisterStaff = async () => {
    if (!staffName || !staffPhone || !staffPassword) {
      setStaffMsg('Name, Phone, and Password are required');
      return;
    }
    setStaffMsg('');
    try {
      await apiClient.post('/auth/register', {
        name: staffName,
        phone: staffPhone,
        email: staffEmail || undefined,
        password: staffPassword,
        role: staffRole,
      });
      setStaffMsg(`Staff account (${staffRole}) registered successfully!`);
      setStaffName(''); setStaffPhone(''); setStaffEmail('');
    } catch (e: any) {
      setStaffMsg(e.response?.data?.message || 'Failed to register staff member');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Return Home Header */}
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={() => navigate('/welcome')}
          className="bg-dark-800 hover:bg-dark-700 text-gold-400 border border-dark-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-gold-400 bg-gold-500/10 px-2.5 py-0.5 rounded border border-gold-500/20">COMPANY ADMIN & ACCOUNTANT</span>
          <h1 className="text-2xl font-extrabold text-white mt-1">Multi-Branch Executive Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="bg-dark-800 hover:bg-dark-700 text-gold-400 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-dark-700 flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Financial Ledger CSV</span>
          </button>
          <div className="flex bg-dark-800 border border-dark-700 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('financial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'financial' ? 'bg-gold-500 text-black' : 'text-gray-400'
              }`}
            >
              Financial Reports
            </button>
            <button
              onClick={() => setActiveTab('catalogue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'catalogue' ? 'bg-gold-500 text-black' : 'text-gray-400'
              }`}
            >
              Price Catalogue
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'staff' ? 'bg-gold-500 text-black' : 'text-gray-400'
              }`}
            >
              Staff Registration
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'settings' ? 'bg-gold-500 text-black' : 'text-gray-400'
              }`}
            >
              System Rules
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500 animate-pulse text-sm">Loading company records...</div>
      ) : (
        <>
          {/* TAB 1: Financial Reports */}
          {activeTab === 'financial' && report && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">Total Net Revenue</span>
                  <span className="text-2xl font-extrabold text-gold-400">${report.totalNetRevenue.toFixed(2)}</span>
                </div>
                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">Booking Fees Revenue</span>
                  <span className="text-2xl font-extrabold text-white">${report.breakdown.bookingFeeRevenue.toFixed(2)}</span>
                </div>
                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">Emergency Surcharges</span>
                  <span className="text-2xl font-extrabold text-amber-400">${report.breakdown.emergencyFeeRevenue.toFixed(2)}</span>
                </div>
                <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">House Call Travel Fees</span>
                  <span className="text-2xl font-extrabold text-blue-400">${report.breakdown.houseCallRevenue.toFixed(2)}</span>
                </div>
              </div>

              {/* Revenue per Barber */}
              <div className="bg-dark-800 border border-dark-700 p-6 rounded-2xl">
                <h3 className="font-bold text-white text-sm mb-4">Barber Performance Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(report.revenuePerBarber || {}).map(([id, info]: any) => (
                    <div key={id} className="flex justify-between items-center p-3 bg-dark-900 rounded-xl border border-dark-700 text-xs">
                      <span className="font-bold text-white">{info.name}</span>
                      <span className="font-extrabold text-gold-400">${info.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Price Catalogue */}
          {activeTab === 'catalogue' && (
            <div className="space-y-6">
              <div className="bg-dark-800 border border-dark-700 p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-sm">Add New Service to Catalogue</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Service Name"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Price ($)"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Duration (Minutes)"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Service Description"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none"
                />
                <button
                  onClick={handleCreateService}
                  className="bg-gold-500 hover:bg-gold-600 text-black font-extrabold px-4 py-2.5 rounded-xl text-xs"
                >
                  Save Service
                </button>
              </div>

              <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden divide-y divide-dark-700">
                {services.map((s) => (
                  <div key={s.id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-white">{s.name}</h4>
                      <p className="text-gray-400">{s.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-gold-400 text-sm block">${Number(s.price).toFixed(2)}</span>
                      <span className="text-gray-500">{s.durationMinutes} mins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Staff Registration */}
          {activeTab === 'staff' && (
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-bold text-white text-base">Register Operational Staff Member</h3>
                <p className="text-xs text-gray-400 mt-1">Register new Barbers, Receptionists, or Company Admins for the barbershop.</p>
              </div>

              {staffMsg && (
                <div className={`p-4 rounded-xl text-xs font-bold ${
                  staffMsg.includes('successfully') ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {staffMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Farai Stylist"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+263771000008"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="farai@truecut.co.zw"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Operational Role</label>
                  <select
                    value={staffRole}
                    onChange={(e: any) => setStaffRole(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500 font-bold"
                  >
                    <option value="BARBER">BARBER / STYLIST</option>
                    <option value="RECEPTIONIST">RECEPTIONIST / CASHIER</option>
                    <option value="COMPANY_ADMIN">COMPANY ADMIN / ACCOUNTANT</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <button
                onClick={handleRegisterStaff}
                className="bg-gold-500 hover:bg-gold-600 text-black font-extrabold px-6 py-3 rounded-xl text-xs flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Staff Account</span>
              </button>
            </div>
          )}

          {/* TAB 4: System Rules */}
          {activeTab === 'settings' && (
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm mb-2">Dynamic System Settings & Policy Configurator</h3>
              <div className="space-y-3">
                {settings.map((s) => (
                  <div key={s.key} className="bg-dark-900 border border-dark-700 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-gold-400 block">{s.key}</span>
                      <span className="text-gray-400">{s.description}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        defaultValue={s.value}
                        onBlur={(e) => {
                          if (e.target.value !== s.value) {
                            handleUpdateSetting(s.key, e.target.value);
                          }
                        }}
                        className="bg-dark-800 border border-dark-700 rounded-lg p-2 text-white font-bold text-center w-28 outline-none focus:border-gold-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
