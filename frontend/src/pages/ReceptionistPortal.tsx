import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useRealtimeEvents } from '../api/events';
import { getHarareDateString } from '../utils/date';
import {
  Clock, UserPlus, Scissors, CheckCircle, AlertCircle,
  Zap, DollarSign, Search, RefreshCw, Wifi, WifiOff, Home, Printer
} from 'lucide-react';

// Feeds both the on-screen receipt modal and the printed version - printing
// uses the #printable-receipt CSS rule in index.css (window.print() on the
// current page, with everything else hidden) rather than window.open(),
// which popup blockers can silently kill even on a direct user click.
function getReceiptFeeRows(booking: any) {
  const fee = (n: any) => Number(n || 0).toFixed(2);
  return [
    ['Service Fee', booking.serviceFee],
    ['Booking Fee', booking.bookingFee],
    ['Emergency Fee', booking.emergencyFee],
    ['House Call Fee', booking.houseCallFee],
    ['Squeeze-in Fee', booking.squeezeInFee],
  ]
    .filter(([, amount]) => Number(amount) > 0)
    .map(([label, amount]) => ({ label: label as string, amount: fee(amount) }));
}

export const ReceptionistPortal: React.FC = () => {
  const navigate = useNavigate();
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isSqueezeIn, setIsSqueezeIn] = useState(false);
  const [squeezeInReason, setSqueezeInReason] = useState('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'ECOCASH'>('CASH');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastReceipt, setLastReceipt] = useState<{ booking: any; payment: any } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Fetched on mount rather than hardcoded - 'HARARE-MAIN' is the branch's
  // human-readable code (Branch.code), not its id, and every backend query
  // here filters by the real UUID (Branch.id). The hardcoded code silently
  // matched nothing, so the barber dropdown was always empty and walk-in
  // registration was completely non-functional.
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchTodaySchedule = () => {
    if (!branchId) return;
    setLoading(true);
    apiClient.get(`/bookings/branch/today?branchId=${branchId}`)
      .then(res => setTodayBookings(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiClient.get('/branches').then(res => {
      if (res.data.length > 0) setBranchId(res.data[0].id);
    });
    apiClient.get('/services').then(res => {
      setServices(res.data);
      if (res.data.length > 0) setSelectedServiceId(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    fetchTodaySchedule();
  }, [branchId]);

  useRealtimeEvents((evt) => {
    if (evt.type === 'BOOKING_CONFIRMED' || evt.type === 'HOLD_CREATED' || evt.type === 'SQUEEZE_IN_ADDED' || evt.type === 'BOOKING_SERVED') {
      fetchTodaySchedule();
    }
  });

  useEffect(() => {
    if (branchId && selectedServiceId) {
      apiClient.get(`/barbers?branchId=${branchId}&serviceId=${selectedServiceId}`)
        .then(res => {
          setBarbers(res.data);
          if (res.data.length > 0) setSelectedBarberId(res.data[0].id);
        });
    }
  }, [branchId, selectedServiceId]);

  useEffect(() => {
    setSelectedSlot(null);
    if (branchId && selectedBarberId && selectedServiceId) {
      setSlotsLoading(true);
      const todayDate = getHarareDateString();
      apiClient.get(`/availability?branchId=${branchId}&barberId=${selectedBarberId}&serviceId=${selectedServiceId}&date=${todayDate}`)
        .then(res => setSlots(res.data))
        .finally(() => setSlotsLoading(false));
    } else {
      setSlots([]);
    }
  }, [branchId, selectedBarberId, selectedServiceId]);

  const handleSendOtp = async () => {
    if (!clientPhone) { setErrorMsg('Phone is required'); return; }
    try {
      await apiClient.post('/auth/otp/request', { phone: clientPhone });
      setOtpSent(true);
      setErrorMsg('');
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'OTP request failed');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await apiClient.post('/auth/otp/verify', { phone: clientPhone, code: otpCode });
      setOtpVerified(true);
      setErrorMsg('');
    } catch (e: any) {
      setErrorMsg('Invalid OTP code');
    }
  };

  const handleCompleteWalkIn = async () => {
    if (!selectedSlot && !isSqueezeIn) { setErrorMsg('Select a slot or enable Squeeze-in'); return; }
    setErrorMsg('');
    try {
      const startTimeStr = selectedSlot ? selectedSlot.startTime : new Date().toISOString();
      const res = await apiClient.post('/receptionist/walk-in', {
        clientName,
        clientPhone,
        branchId,
        barberId: selectedBarberId,
        serviceId: selectedServiceId,
        startTimeStr,
        paymentType,
        isSqueezeIn,
        squeezeInReason: isSqueezeIn ? squeezeInReason : undefined,
      });

      const booking = res.data.booking;
      const payment = res.data.payment;
      setLastReceipt({ booking, payment });
      setShowReceiptModal(true);
      setSuccessMsg(`Walk-in booked successfully for ${clientName} - $${Number(booking.totalAmount).toFixed(2)} collected`);
      setShowWalkInModal(false);
      fetchTodaySchedule();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Failed to complete walk-in');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-800 border border-dark-700 p-6 rounded-2xl mb-8">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-bold text-gold-400 bg-gold-500/10 px-2.5 py-0.5 rounded border border-gold-500/20">RECEPTIONIST PWA</span>
            {isOnline ? (
              <span className="flex items-center text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                <Wifi className="w-3 h-3 mr-1" /> Online
              </span>
            ) : (
              <span className="flex items-center text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <WifiOff className="w-3 h-3 mr-1" /> Offline Queue Active
              </span>
            )}
          </div>
          <h1 className="text-2xl font-display font-extrabold text-white">Harare Main Branch Schedule</h1>
        </div>

        <button
          onClick={() => setShowWalkInModal(true)}
          className="bg-gold-500 hover:bg-gold-600 text-gray-50 font-extrabold px-5 py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-gold-500/10"
        >
          <UserPlus className="w-5 h-5" />
          <span>Register Walk-in Client</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-sm flex items-center justify-between gap-3">
          <span>{successMsg}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {lastReceipt && (
              <button
                onClick={() => setShowReceiptModal(true)}
                className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            )}
            <button onClick={() => setSuccessMsg('')} className="text-xs font-bold">Dismiss</button>
          </div>
        </div>
      )}

      {/* Schedule Table */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-sm">Today's Appointments ({todayBookings.length})</h3>
          <button onClick={fetchTodaySchedule} className="p-1.5 text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gold-500 animate-pulse text-sm">Loading branch schedule...</div>
        ) : todayBookings.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No walk-in or online bookings for today yet.</div>
        ) : (
          <div className="divide-y divide-dark-700">
            {todayBookings.map((b) => (
              <div key={b.id} className="card-3d p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-dark-900/50">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-mono text-xs font-bold text-gold-400">{b.bookingCode}</span>
                    <span className="text-xs text-gray-400">({b.bookingType})</span>
                    {b.isSqueezeIn && <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded font-bold">Squeeze-in</span>}
                  </div>
                  <h4 className="font-bold text-white text-sm">{b.client?.name} ({b.client?.phone})</h4>
                  <p className="text-xs text-gray-400">Service: {b.service?.name} | Barber: {b.barber?.name}</p>
                </div>
                <div className="text-right">
                  <div className="font-data text-xs font-bold text-gold-400">{new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <span className="font-data text-xs font-extrabold text-white">${Number(b.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Walk-in Registration Modal */}
      {showWalkInModal && (
        <div className="modal-backdrop-in fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-panel-in bg-dark-800 border border-dark-700 rounded-2xl p-6 max-w-lg w-full space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-dark-700 pb-3">
              <h3 className="font-display font-bold text-white text-lg">Walk-In Client Registration</h3>
              <button onClick={() => setShowWalkInModal(false)} className="text-gray-400 text-sm font-bold">✕</button>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">{errorMsg}</div>
            )}

            {/* Client Info */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Client Name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Client Phone (+263...)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm outline-none"
                />
                <button
                  onClick={handleSendOtp}
                  className="bg-gold-500 text-gray-50 font-bold text-xs px-3 rounded-xl whitespace-nowrap"
                >
                  Send OTP
                </button>
              </div>

              {otpSent && !otpVerified && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm outline-none"
                  />
                  <button
                    onClick={handleVerifyOtp}
                    className="bg-green-500 text-black font-bold text-xs px-3 rounded-xl whitespace-nowrap"
                  >
                    Verify OTP
                  </button>
                </div>
              )}
            </div>

            {/* Service & Barber Selector */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Service</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm"
                >
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - ${Number(s.price).toFixed(2)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Barber</label>
                <select
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm"
                >
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Time Slot Picker - hidden while Squeeze-in is on, since that
                path intentionally books "now" and overlaps the schedule
                instead of using a real open slot. */}
            {!isSqueezeIn && (
              <div>
                <label className="text-xs text-gray-400 uppercase font-semibold block mb-2">
                  Time Slot <span className="text-gold-500">*</span>
                </label>
                {slotsLoading ? (
                  <div className="text-xs text-gold-500 animate-pulse p-3 text-center bg-dark-900 rounded-xl border border-dark-700">
                    Loading today's schedule...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-3 bg-dark-900 rounded-xl border border-dark-700 text-center text-xs text-gray-400">
                    No available slots left today for this barber. Try another barber, or use Squeeze-in below.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                    {slots.map((s: any, idx: number) => {
                      const timeLabel = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const isSelected = selectedSlot?.startTime === s.startTime;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!s.isAvailable}
                          onClick={() => setSelectedSlot(s)}
                          className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                            !s.isAvailable
                              ? 'border-dark-700 bg-dark-900/50 text-gray-600 cursor-not-allowed line-through'
                              : isSelected
                              ? 'border-gold-500 bg-gold-500 text-gray-50'
                              : 'border-dark-700 bg-dark-900 text-gray-300 hover:border-gold-500/50'
                          }`}
                        >
                          {timeLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Squeeze-in Toggle */}
            <div className="bg-dark-900 p-3 rounded-xl border border-dark-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-amber-400 block">Squeeze-in Override ($3 Fee)</span>
                <span className="text-xs text-gray-500">Allow manual time overlap for walk-in</span>
              </div>
              <input
                type="checkbox"
                checked={isSqueezeIn}
                onChange={(e) => {
                  setIsSqueezeIn(e.target.checked);
                  if (e.target.checked) setSelectedSlot(null);
                }}
                className="w-5 h-5 accent-gold-500"
              />
            </div>

            {isSqueezeIn && (
              <input
                type="text"
                placeholder="Reason for squeeze-in (required for audit)"
                value={squeezeInReason}
                onChange={(e) => setSqueezeInReason(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm outline-none"
              />
            )}

            {/* Payment Method */}
            <div>
              <label className="text-xs text-gray-400 uppercase font-semibold block mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('CASH')}
                  className={`p-2.5 rounded-xl text-xs font-bold border ${
                    paymentType === 'CASH' ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-dark-700 bg-dark-900 text-gray-400'
                  }`}
                >
                  Cash Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('ECOCASH')}
                  className={`p-2.5 rounded-xl text-xs font-bold border ${
                    paymentType === 'ECOCASH' ? 'border-gold-500 bg-gold-500/10 text-gold-400' : 'border-dark-700 bg-dark-900 text-gray-400'
                  }`}
                >
                  EcoCash
                </button>
              </div>
            </div>

            <button
              onClick={handleCompleteWalkIn}
              disabled={!selectedSlot && !isSqueezeIn}
              className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-50 font-extrabold py-3.5 rounded-xl transition-colors text-sm"
            >
              Confirm Walk-in & Record Payment
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal - the #printable-receipt element is what stays
          visible per the print CSS rule in index.css when Print is clicked. */}
      {showReceiptModal && lastReceipt && (
        <div className="modal-backdrop-in fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-white print:backdrop-blur-none">
          <div className="modal-panel-in bg-white text-black rounded-2xl p-6 max-w-sm w-full space-y-3 font-mono text-sm print:shadow-none print:rounded-none">
            <div id="printable-receipt" className="printable-area">
              <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
                <h3 className="font-bold text-base tracking-wide">TRUECUT BARBERSHOP</h3>
                <p className="text-xs text-gray-600">Harare Main Branch</p>
                <p className="text-xs text-gray-600">100 Samora Machel Avenue, Harare Central</p>
              </div>

              <p className="text-xs text-gray-500 mb-2">{new Date().toLocaleString()}</p>
              <p>Booking Code: <strong>{lastReceipt.booking.bookingCode}</strong></p>
              <p>Client: {lastReceipt.booking.client?.name}</p>
              <p>Barber: {lastReceipt.booking.barber?.name}</p>
              <p>Service: {lastReceipt.booking.service?.name}</p>

              <div className="border-t border-dashed border-gray-400 mt-3 pt-2 space-y-1">
                {getReceiptFeeRows(lastReceipt.booking).map((row) => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span>{row.label}</span>
                    <span>${row.amount}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t border-dashed border-gray-400 pt-2 mt-1 text-base">
                  <span>TOTAL PAID</span>
                  <span>${Number(lastReceipt.booking.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 mt-3 pt-2 text-xs text-gray-600 space-y-0.5">
                <p>Payment Method: {lastReceipt.payment.paymentType}</p>
                <p>Status: {lastReceipt.payment.status}</p>
                <p>Provider Ref: {lastReceipt.payment.providerReference || 'N/A'}</p>
              </div>

              <p className="text-center text-xs text-gray-500 mt-3 pt-2 border-t border-dashed border-gray-400">
                Thank you for choosing TrueCut.
              </p>
            </div>

            <div className="flex gap-2 pt-2 print:hidden">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-black font-bold py-2.5 rounded-xl text-sm"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="w-full bg-gold-500 hover:bg-gold-600 text-gray-50 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
