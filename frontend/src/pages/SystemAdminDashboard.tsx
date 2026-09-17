import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import {
  Shield, Activity, Database, Server, RefreshCw, FileText, Home,
  Building2, UserCheck, Scissors, User, Sparkles
} from 'lucide-react';

export const SystemAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-2xl font-extrabold text-white mt-1">Infrastructure & Cross-Portal Management</h1>
        </div>
        <button onClick={fetchSysAdminData} className="p-2 bg-dark-800 border border-dark-700 text-gold-400 rounded-xl">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* System Admin Cross-Portal Switcher */}
      <div className="bg-dark-800 border border-dark-700 p-6 rounded-2xl mb-8 space-y-3">
        <div className="flex items-center space-x-2 text-gold-400">
          <Shield className="w-5 h-5 text-red-400" />
          <h3 className="font-bold text-white text-sm">System-Wide Operational Access</h3>
        </div>
        <p className="text-xs text-gray-400">As System Administrator, you have full privileges across all feature modules and role views.</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <Link
            to="/admin"
            className="p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <Building2 className="w-5 h-5 text-emerald-400" />
            <span>Company Admin</span>
          </Link>

          <Link
            to="/receptionist"
            className="p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <UserCheck className="w-5 h-5 text-blue-400" />
            <span>Receptionist</span>
          </Link>

          <Link
            to="/barber"
            className="p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <Scissors className="w-5 h-5 text-amber-400" />
            <span>Barber Station</span>
          </Link>

          <Link
            to="/dashboard"
            className="p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <User className="w-5 h-5 text-gold-400" />
            <span>Client Portal</span>
          </Link>

          <Link
            to="/catalogue"
            className="p-3 bg-dark-900 hover:bg-dark-700 border border-dark-600 rounded-xl text-xs font-bold text-white flex flex-col items-center justify-center space-y-1 transition-all"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Price Catalogue</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gold-500 animate-pulse text-sm">Inspecting system infrastructure...</div>
      ) : (
        <div className="space-y-6">
          {/* Health Status Cards */}
          {health && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Database (SQLite/PostgreSQL)</span>
                  <span className="text-lg font-extrabold text-green-400">{health.services.database}</span>
                </div>
                <Database className="w-6 h-6 text-green-400" />
              </div>
              <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Backend API Node</span>
                  <span className="text-lg font-extrabold text-green-400">{health.services.api}</span>
                </div>
                <Server className="w-6 h-6 text-green-400" />
              </div>
              <div className="bg-dark-800 border border-dark-700 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 block">Timezone Scope</span>
                  <span className="text-lg font-extrabold text-gold-400">{health.services.timezone}</span>
                </div>
                <Activity className="w-6 h-6 text-gold-400" />
              </div>
            </div>
          )}

          {/* Technical Audit Logs */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
            <h3 className="font-bold text-white text-sm mb-4">Technical Audit Trail</h3>
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
