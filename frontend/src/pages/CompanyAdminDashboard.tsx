import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useRealtimeEvents } from '../api/events';
import {
  DollarSign, TrendingUp, Scissors, Settings, Users,
  BarChart3, RefreshCw, Plus, Edit2, Check, Shield, Download, Home, UserPlus,
  Circle, Clock3
} from 'lucide-react';

export const CompanyAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'financial' | 'catalogue' | 'settings' | 'staff' | 'weekly'>('financial');
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // Live "who is with a client right now / who is booked in the next 2
  // hours" widget. Separate from fetchAdminData since it needs to refresh
  // on a timer, not just on SSE booking events - a booking silently
  // transitions from "upcoming" to "in progress" as the clock passes its
  // start time, with no event firing at that moment.
  const [branchId, setBranchId] = useState('');
  const [occupancy, setOccupancy] = useState<any[]>([]);

  // Catalogue state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Staff registration state - Company Admin registers Receptionists and
  // Barbers only (a peer Company Admin account can only be created by a
  // System Admin, enforced server-side in auth.service.ts). No default
  // password: each account gets its own real, admin-chosen credential
  // rather than a shared placeholder.
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'BARBER' | 'RECEPTIONIST'>('BARBER');
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
    apiClient.get('/branches').then(res => {
      if (res.data.length > 0) setBranchId(res.data[0].id);
    });
  }, []);

  const fetchOccupancy = () => {
    if (!branchId) return;
    apiClient.get(`/barbers/occupancy?branchId=${branchId}`)
      .then(res => setOccupancy(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchOccupancy();
    // Booking start/end times pass silently with no event to react to, so
    // this needs its own clock-driven refresh alongside the SSE-triggered one.
    const interval = setInterval(fetchOccupancy, 60000);
    return () => clearInterval(interval);
  }, [branchId]);

  useRealtimeEvents((evt) => {
    if (evt.type === 'BOOKING_CONFIRMED' || evt.type === 'LEDGER_APPENDED' || evt.type === 'BOOKING_SERVED') {
      fetchAdminData();
      fetchOccupancy();
    }
  });

  const fetchWeeklyReport = () => {
    setWeeklyLoading(true);
    apiClient.get('/reports/weekly/financial')
      .then(res => setWeeklyReport(res.data))
      .catch(err => console.error(err))
      .finally(() => setWeeklyLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'weekly' && !weeklyReport) {
      fetchWeeklyReport();
    }
  }, [activeTab]);

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
    if (staffPassword.length < 8) {
      setStaffMsg('Password must be at least 8 characters');
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
      setStaffName(''); setStaffPhone(''); setStaffEmail(''); setStaffPassword('');
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
          <h1 className="text-2xl font-display font-extrabold text-white mt-1">Multi-Branch Executive Dashboard</h1>
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
              onClick={() => setActiveTab('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'weekly' ? 'bg-gold-500 text-black' : 'text-gray-400'
              }`}
            >
              Weekly Report
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

      {/* Live Barber Status - always visible regardless of active tab, this
          answers "who is with a client right now, who is booked in the next
          2 hours" that the financial tab's daily numbers do not show. */}
      {occupancy.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 mb-6">
          <h3 className="font-display font-bold text-white text-sm mb-4 flex items-center gap-2">
            <Circle className="w-3 h-3 text-green-400 fill-green-400 animate-pulse" />
            <span>Live Barber Status</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {occupancy.map((b) => (
              <div key={b.barberId} className="card-3d bg-dark-900 border border-dark-700 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{b.name}</span>
                  {b.status === 'WITH_CLIENT' ? (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                      With Client
                    </span>
                  ) : (
                    <span className="bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">
                      Free
                    </span>
                  )}
                </div>

                {b.currentBooking && (
                  <div className="text-gray-400">
                    <span className="text-white font-semibold">{b.currentBooking.client?.name}</span>
                    {' - '}{b.currentBooking.service?.name} until{' '}
                    {new Date(b.currentBooking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {b.upcomingBookings.length > 0 ? (
                  <div className="pt-1.5 border-t border-dark-700 space-y-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock3 className="w-3 h-3" />
                      <span>Next 2 hours:</span>
                    </span>
                    {b.upcomingBookings.map((u: any) => (
                      <div key={u.id} className="text-gray-400 pl-4">
                        {new Date(u.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}{u.client?.name} ({u.service?.name})
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pt-1.5 border-t border-dark-700 text-gray-500">No bookings in the next 2 hours</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gold-500 animate-pulse text-sm">Loading company records...</div>
      ) : (
        <>
          {/* TAB 1: Financial Reports */}
          {activeTab === 'financial' && report && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card-3d bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">Total Net Revenue</span>
                  <span className="text-2xl font-data font-extrabold text-gold-400">${report.totalNetRevenue.toFixed(2)}</span>
                </div>
                <div className="card-3d bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">Booking Fees Revenue</span>
                  <span className="text-2xl font-data font-extrabold text-white">${report.breakdown.bookingFeeRevenue.toFixed(2)}</span>
                </div>
                <div className="card-3d bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">Emergency Surcharges</span>
                  <span className="text-2xl font-data font-extrabold text-amber-400">${report.breakdown.emergencyFeeRevenue.toFixed(2)}</span>
                </div>
                <div className="card-3d bg-dark-800 border border-dark-700 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 block mb-1">House Call Travel Fees</span>
                  <span className="text-2xl font-data font-extrabold text-blue-400">${report.breakdown.houseCallRevenue.toFixed(2)}</span>
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

          {/* TAB: Weekly Revenue & Barber Activity Report */}
          {activeTab === 'weekly' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">7-Day Revenue & Barber Activity</h3>
                <button
                  onClick={() => window.print()}
                  disabled={!weeklyReport}
                  className="bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-black font-extrabold text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  Print Report
                </button>
              </div>

              {weeklyLoading ? (
                <div className="text-center py-12 text-gold-500 animate-pulse text-sm">Compiling weekly report...</div>
              ) : weeklyReport ? (
                <div className="printable-area bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-6 print:bg-white print:text-black print:border-none">
                  <div>
                    <h2 className="font-extrabold text-lg">TrueCut Barbershop - Weekly Report</h2>
                    <p className="text-xs text-gray-400 print:text-gray-600">
                      {new Date(weeklyReport.weekStart).toLocaleDateString()} - {new Date(weeklyReport.weekEnd).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-dark-900 print:bg-gray-100 p-3 rounded-xl">
                      <span className="text-gray-400 print:text-gray-600 block">Total Net Revenue</span>
                      <span className="text-lg font-extrabold text-gold-400 print:text-black">${weeklyReport.totalNetRevenue.toFixed(2)}</span>
                    </div>
                    <div className="bg-dark-900 print:bg-gray-100 p-3 rounded-xl">
                      <span className="text-gray-400 print:text-gray-600 block">Transactions</span>
                      <span className="text-lg font-extrabold print:text-black">{weeklyReport.totalTransactionsCount}</span>
                    </div>
                    <div className="bg-dark-900 print:bg-gray-100 p-3 rounded-xl">
                      <span className="text-gray-400 print:text-gray-600 block">Bookings</span>
                      <span className="text-lg font-extrabold print:text-black">{weeklyReport.totalBookingsCount}</span>
                    </div>
                    <div className="bg-dark-900 print:bg-gray-100 p-3 rounded-xl">
                      <span className="text-gray-400 print:text-gray-600 block">Refunds Issued</span>
                      <span className="text-lg font-extrabold text-red-400 print:text-black">${weeklyReport.breakdown.refundsIssued.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm mb-2">Barber Activity</h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 print:text-gray-600 border-b border-dark-700 print:border-gray-300">
                          <th className="py-1.5">Barber</th>
                          <th className="py-1.5 text-right">Served</th>
                          <th className="py-1.5 text-right">Cancelled</th>
                          <th className="py-1.5 text-right">No-Show</th>
                          <th className="py-1.5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(weeklyReport.activityPerBarber || {}).map(([id, info]: any) => (
                          <tr key={id} className="border-b border-dark-900 print:border-gray-200">
                            <td className="py-1.5 font-semibold">{info.name}</td>
                            <td className="py-1.5 text-right text-green-400 print:text-black">{info.served}</td>
                            <td className="py-1.5 text-right text-red-400 print:text-black">{info.cancelled}</td>
                            <td className="py-1.5 text-right text-amber-400 print:text-black">{info.noShow}</td>
                            <td className="py-1.5 text-right font-bold text-gold-400 print:text-black">
                              ${(weeklyReport.revenuePerBarber?.[id]?.total || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">No report data yet.</div>
              )}
            </div>
          )}

          {/* TAB 3: Staff Registration */}
          {activeTab === 'staff' && (
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-bold text-white text-base">Register Operational Staff Member</h3>
                <p className="text-xs text-gray-400 mt-1">Register new Barbers or Receptionists for the barbershop. Each account gets its own real password - Company Admin accounts are created by a System Admin.</p>
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
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Set Their Password (min. 8 characters)</label>
                  <input
                    type="password"
                    placeholder="Enter a real password for this account"
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
