import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useRealtimeEvents } from '../api/events';
import { Clock, Calendar, MapPin, User, CheckCircle, AlertCircle, RefreshCw, PlusCircle, CheckCircle2, XCircle, History, Home } from 'lucide-react';

const HISTORY_BADGE: Record<string, string> = {
  SERVED: 'text-green-400 bg-green-500/10 border-green-500/30',
  NO_SHOW: 'text-red-400 bg-red-500/10 border-red-500/30',
  CANCELLED: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

export const BarberDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showBlockOutModal, setShowBlockOutModal] = useState(false);

  // Block out form
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [reason, setReason] = useState('');

  // 'HARARE-MAIN' used to be hardcoded here, but that is the branch's
  // human-readable code (Branch.code), not its id - the backend FK expects
  // the real UUID, so every block-out submission failed. Fetched on mount
  // instead, matching the same fix applied to ReceptionistPortal.
  const [branchId, setBranchId] = useState('');

  const fetchAppointments = () => {
    setLoading(true);
    apiClient.get('/barbers/me/appointments')
      .then(res => setAppointments(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  // Companion to fetchAppointments - "Today's Appointment Schedule" only
  // shows actionable (CONFIRMED/HELD) bookings, so once the no-show sweep
  // (runs every minute server-side) flips a missed one to NO_SHOW, it used
  // to just vanish with no way for the barber to see what happened to it.
  const fetchHistory = () => {
    setHistoryLoading(true);
    apiClient.get('/barbers/me/history')
      .then(res => setHistory(res.data))
      .catch(err => console.error(err))
      .finally(() => setHistoryLoading(false));
  };

  const fetchAll = () => {
    fetchAppointments();
    fetchHistory();
  };

  useEffect(() => {
    fetchAll();
    apiClient.get('/branches').then(res => {
      if (res.data.length > 0) setBranchId(res.data[0].id);
    });
  }, []);

  // Real-time Event Listener: Refreshes agenda when booking is confirmed or created
  useRealtimeEvents((evt) => {
    if (evt.type === 'BOOKING_CONFIRMED' || evt.type === 'HOLD_CREATED' || evt.type === 'SQUEEZE_IN_ADDED') {
      fetchAppointments();
    }
  });

  const handleMarkServed = async (bookingId: string) => {
    try {
      await apiClient.post(`/bookings/${bookingId}/serve`);
      fetchAll();
    } catch (e: any) {
      alert('Failed to update booking status');
    }
  };

  const handleAddBlockOut = async () => {
    if (!blockStart || !blockEnd || !reason) {
      alert('Please fill out all fields');
      return;
    }
    if (!branchId) {
      alert('Branch information still loading, please try again in a moment');
      return;
    }
    try {
      await apiClient.post(`/barbers/me/block-out`, {
        branchId,
        startTime: new Date(blockStart).toISOString(),
        endTime: new Date(blockEnd).toISOString(),
        reason,
      });
      alert('Block-out time added');
      setShowBlockOutModal(false);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add block-out');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Navigation Return Header */}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-dark-800 border border-dark-700 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-bold text-gold-400 bg-gold-500/10 px-2.5 py-0.5 rounded border border-gold-500/20">BARBER STATION</span>
          <h1 className="text-2xl font-display font-extrabold text-white mt-1">Today's Appointment Schedule</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBlockOutModal(true)}
            className="flex-1 sm:flex-initial justify-center bg-dark-700 hover:bg-dark-600 text-gold-400 text-xs font-bold px-3 py-2 rounded-xl border border-dark-600 transition-colors flex items-center space-x-1"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Leave / Block-Out</span>
          </button>
          <button onClick={fetchAll} className="p-2 bg-dark-700 text-gray-300 rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Appointment Cards */}
      {loading ? (
        <div className="text-center py-12 text-gold-500 animate-pulse text-sm">Loading today's schedule...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-12 text-center text-gray-400">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-semibold">No appointments scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((a) => (
            <div key={a.id} className="card-3d bg-dark-800 border border-dark-700 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-dark-700 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded">{a.bookingCode}</span>
                  <span className="text-xs text-gray-400 font-bold uppercase">({a.bookingType})</span>
                </div>
                <div className="flex items-center text-xs text-gold-400 font-bold space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-data">{new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Client</span>
                  <strong className="text-white text-sm">{a.client?.name}</strong>
                  <span className="text-gray-400 block">{a.client?.phone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Service Requested</span>
                  <strong className="text-gold-400 text-sm">{a.service?.name}</strong>
                  <span className="text-gray-400 block">{a.service?.durationMinutes} mins</span>
                </div>
              </div>

              {a.houseCallAddress && (
                <div className="bg-dark-900 border border-blue-500/30 p-3 rounded-xl text-xs text-blue-400 flex items-start space-x-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white">House Call Destination Address:</strong>
                    <span>{a.houseCallAddress}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-dark-700 flex justify-end">
                {a.status === 'SERVED' ? (
                  <span className="text-xs text-green-400 font-bold flex items-center space-x-1 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed & Served</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleMarkServed(a.id)}
                    className="bg-green-500 hover:bg-green-600 text-black font-extrabold text-xs px-4 py-2 rounded-xl transition-colors flex items-center space-x-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Client as Served</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's History - completed, missed, and cancelled appointments
          that have dropped off the actionable schedule above. */}
      <div className="mt-8">
        <h2 className="text-sm font-display font-bold text-white flex items-center space-x-2 mb-4">
          <History className="w-4 h-4 text-gray-500" />
          <span>Today's History</span>
        </h2>

        {historyLoading ? (
          <div className="text-center py-8 text-gold-500 animate-pulse text-sm">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-8 text-center text-gray-400">
            <p className="text-sm font-semibold">No completed, missed, or cancelled appointments yet today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((a) => (
              <div key={a.id} className="card-3d bg-dark-800 border border-dark-700 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded">{a.bookingCode}</span>
                  <div>
                    <strong className="text-white text-sm block">{a.client?.name}</strong>
                    <span className="text-xs text-gray-400">{a.service?.name} - {new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <span className={`text-xs font-bold flex items-center space-x-1 px-3 py-1 rounded-lg border ${HISTORY_BADGE[a.status] || 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                  {a.status === 'SERVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {a.status === 'NO_SHOW' && <AlertCircle className="w-3.5 h-3.5" />}
                  {a.status === 'CANCELLED' && <XCircle className="w-3.5 h-3.5" />}
                  <span>{a.status === 'NO_SHOW' ? 'No-Show' : a.status === 'SERVED' ? 'Served' : 'Cancelled'}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block Out Modal */}
      {showBlockOutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-display font-bold text-white text-base">Add Leave / Block-Out Period</h3>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">End Time</label>
              <input
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Reason</label>
              <input
                type="text"
                placeholder="Personal leave / Lunch break"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowBlockOutModal(false)} className="w-full bg-dark-700 text-gray-300 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={handleAddBlockOut} className="w-full bg-gold-500 text-black font-bold py-3 rounded-xl">Save Block-Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
