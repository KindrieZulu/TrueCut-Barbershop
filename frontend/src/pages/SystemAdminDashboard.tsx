import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  Shield, Activity, Database, Server, RefreshCw, FileText, Home,
  Building2, UserCheck, Scissors, User, Sparkles, UserPlus
} from 'lucide-react';

export const SystemAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Company Admin registration - System Admin is the only role allowed to
  // create a Company Admin account (enforced server-side in
  // auth.service.ts); a Company Admin can't create a peer admin itself.
  const [caName, setCaName] = useState('');
  const [caPhone, setCaPhone] = useState('');
  const [caEmail, setCaEmail] = useState('');
  const [caPassword, setCaPassword] = useState('');
  const [caMsg, setCaMsg] = useState('');

  const fetchSysAdminData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/health'),
      apiClient.get('/audit-logs'),
    ]).then(([hRes, aRes]) => {
      setHealth(hRes.data);
      setAuditLogs(aRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSysAdminData();
  }, []);

  const handleRegisterCompanyAdmin = async () => {
    if (!caName || !caPhone || !caPassword) {
      setCaMsg('Name, Phone, and Password are required');
      return;
    }
    if (caPassword.length < 8) {
      setCaMsg('Password must be at least 8 characters');
      return;
    }
    setCaMsg('');
    try {
      await apiClient.post('/auth/register', {
        name: caName,
        phone: caPhone,
        email: caEmail || undefined,
        password: caPassword,
        role: 'COMPANY_ADMIN',
      });
      setCaMsg('Company Admin account registered successfully!');
      setCaName(''); setCaPhone(''); setCaEmail(''); setCaPassword('');
    } catch (e: any) {
      setCaMsg(e.response?.data?.message || 'Failed to register Company Admin');
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20">SYSTEM ADMIN MASTER CONTROL</span>
          <h1 className="text-2xl font-display font-extrabold text-white mt-1">Infrastructure & Cross-Portal Management</h1>
        </div>
        <button onClick={fetchSysAdminData} className="p-2 bg-dark-800 border border-dark-700 text-gold-400 rounded-xl">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* System Admin Cross-Portal Switcher */}
      <div className="bg-dark-800 border border-dark-700 p-6 rounded-2xl mb-8 space-y-3">
        <div className="flex items-center space-x-2 text-gold-400">
          <Shield className="w-5 h-5 text-red-400" />
          <h3 className="font-display font-bold text-white text-sm">System-Wide Operational Access</h3>
        </div>
        <p className="text-xs text-gray-400">As System Administrator, you have full privileges across all feature modules and role views.</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <Link
            to="/admin"
            className="card-3d p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span>Company Admin</span>
          </Link>

          <Link
            to="/receptionist"
            className="card-3d p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <UserCheck className="w-5 h-5 text-blue-400" />
            <span>Receptionist</span>
          </Link>

          <Link
            to="/barber"
            className="card-3d p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <Scissors className="w-5 h-5 text-amber-400" />
            <span>Barber Station</span>
          </Link>

          <Link
            to="/dashboard"
            className="card-3d p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <User className="w-5 h-5 text-gold-400" />
            <span>Client Portal</span>
          </Link>

          <Link
            to="/catalogue"
            className="card-3d p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Price Catalogue</span>
          </Link>
        </div>
      </div>

      {/* Company Admin Registration - top of the real registration
          hierarchy: System Admin creates Company Admins, who in turn
          create Receptionists/Barbers on their own dashboard. */}
      <div className="card-3d bg-dark-800 border border-dark-700 p-6 rounded-2xl mb-8 space-y-4">
        <div>
          <h3 className="font-display font-bold text-white text-sm">Register Company Admin</h3>
          <p className="text-xs text-gray-400 mt-1">Create a Company Admin account with a real password. Company Admins then register their own Receptionists and Barbers.</p>
        </div>

        {caMsg && (
          <div className={`p-3 rounded-xl text-xs font-bold ${
            caMsg.includes('successfully') ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            {caMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Chipo Marufu"
              value={caName}
              onChange={(e) => setCaName(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="+263771000009"
              value={caPhone}
              onChange={(e) => setCaPhone(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email Address</label>
            <input
              type="email"
              placeholder="chipo@truecut.co.zw"
              value={caEmail}
              onChange={(e) => setCaEmail(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Set Their Password (min. 8 characters)</label>
            <input
              type="password"
              placeholder="Enter a real password for this account"
              value={caPassword}
              onChange={(e) => setCaPassword(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-gold-500"
            />
          </div>
        </div>

        <button
          onClick={handleRegisterCompanyAdmin}
          className="bg-gold-500 hover:bg-gold-600 text-black font-extrabold px-6 py-3 rounded-xl text-xs flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Company Admin</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500 animate-pulse text-sm">Inspecting system infrastructure...</div>
      ) : (
        <div className="space-y-6">
          {/* Health Status Cards */}
          {health && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card-3d bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Database (SQLite/PostgreSQL)</span>
                  <span className="text-lg font-data font-extrabold text-green-400">{health.services.database}</span>
                </div>
                <Database className="w-6 h-6 text-green-400" />
              </div>
              <div className="card-3d bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Backend API Node</span>
                  <span className="text-lg font-data font-extrabold text-green-400">{health.services.api}</span>
                </div>
                <Server className="w-6 h-6 text-green-400" />
              </div>
              <div className="card-3d bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Timezone Scope</span>
                  <span className="text-lg font-data font-extrabold text-gold-400">{health.services.timezone}</span>
                </div>
                <Activity className="w-6 h-6 text-gold-400" />
              </div>
            </div>
          )}

          {/* Technical Audit Logs */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
            <h3 className="font-display font-bold text-white text-sm mb-4">Technical Audit Trail</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-dark-900 border border-dark-700 p-3 rounded-xl text-xs font-mono flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="text-gold-400 font-bold">[{log.action}]</span> <span className="text-gray-300">{log.entityName}</span>
                    <span className="text-gray-500 block">Correlation: {log.correlationId || 'N/A'}</span>
                  </div>
                  <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
