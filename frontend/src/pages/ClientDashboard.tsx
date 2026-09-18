import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Calendar, Clock, Scissors, AlertCircle, XCircle, CheckCircle, RefreshCw, ArrowLeft, Home } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchBookings = () => {
    setLoading(true);
    apiClient.get('/bookings/client')
      .then(res => setBookings(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? Cancellation rules apply.')) return;
    try {
      const res = await apiClient.post(`/bookings/${bookingId}/cancel`);
      setActionMsg(`Booking cancelled. Refund eligible: $${res.data.refundCalculation.eligibleRefund.toFixed(2)}`);
      fetchBookings();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-green-500/10 text-green-400 border border-green-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">Confirmed</span>;
      case 'HELD':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">Slot Held</span>;
      case 'SERVED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">Served</span>;
      case 'CANCELLED':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">Cancelled</span>;
      case 'NO_SHOW':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">No Show</span>;
      default:
        return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">{status}</span>;
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-white">Client Dashboard</h1>
          <p className="text-sm text-gray-400">View and manage your grooming appointments</p>
        </div>
        <button onClick={fetchBookings} className="p-2 bg-dark-800 border border-dark-700 text-gold-400 rounded-lg hover:border-gold-500/50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {actionMsg && (
        <div className="bg-gold-500/10 border border-gold-500/30 text-gold-400 p-4 rounded-xl mb-6 text-sm flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')} className="text-xs font-bold text-gray-400">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gold-500 animate-pulse">Loading appointments...</div>
      ) : bookings.length === 0 ? (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center text-gray-400">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-semibold">You have no booking records yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="card-3d bg-dark-800 border border-dark-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-gold-400 bg-gold-500/10 px-2.5 py-0.5 rounded border border-gold-500/20">{b.bookingCode}</span>
                  {getStatusBadge(b.status)}
                </div>
                <h3 className="text-base font-display font-bold text-white">{b.service?.name}</h3>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <div>Barber: <strong className="text-gray-300">{b.barber?.name}</strong></div>
                  <div>Location: <strong className="text-gray-300">{b.branch?.address}</strong></div>
                  <div>Time: <strong className="text-gold-400 font-data">{new Date(b.startTime).toLocaleString()}</strong></div>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between border-t sm:border-t-0 border-dark-700 pt-3 sm:pt-0">
                <span className="text-lg font-data font-extrabold text-gold-400">${Number(b.totalAmount).toFixed(2)}</span>
                {b.status === 'CONFIRMED' || b.status === 'HELD' ? (
                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Booking</span>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
