import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Clock, Calendar, User, Scissors, MapPin, CheckCircle,
  AlertCircle, ShieldCheck, ArrowRight, Home, Zap, CreditCard, RefreshCw, ArrowLeft
} from 'lucide-react';

export const BookingWizard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, requestOtp, verifyOtpAndLogin } = useAuth();

  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  // Selections
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(searchParams.get('serviceId') || '');
  const [selectedBarberId, setSelectedBarberId] = useState(''); // Requires explicit selection
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Options
  const [bookingType, setBookingType] = useState<'GENERAL' | 'EMERGENCY' | 'HOUSE_CALL'>('GENERAL');
  const [houseCallAddress, setHouseCallAddress] = useState('');

  // Auth / Verification State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Hold & Payment State
  const [holdData, setHoldData] = useState<any>(null);
  const [holdTimer, setHoldTimer] = useState<number>(600); // 10 minutes
  const [paymentInstructions, setPaymentInstructions] = useState<string>('');
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch branches and services on mount
  useEffect(() => {
    apiClient.get('/branches').then(res => {
      setBranches(res.data);
      if (res.data.length > 0) setSelectedBranchId(res.data[0].id);
    });

    apiClient.get('/services').then(res => {
      setServices(res.data);
      if (!selectedServiceId && res.data.length > 0) setSelectedServiceId(res.data[0].id);
    });
  }, []);

  // Fetch eligible barbers when branch or service changes
  useEffect(() => {
    if (selectedBranchId && selectedServiceId) {
      apiClient.get(`/barbers?branchId=${selectedBranchId}&serviceId=${selectedServiceId}`)
        .then(res => {
          setBarbers(res.data);
          setSelectedBarberId(''); // Require explicit barber selection
          setSlots([]);
          setSelectedSlot(null);
        });
    }
  }, [selectedBranchId, selectedServiceId]);

  // Fetch available slots ONLY when barber, date, and service are selected
  useEffect(() => {
    if (selectedBranchId && selectedBarberId && selectedServiceId && selectedDate) {
      setLoading(true);
      setSelectedSlot(null);
      const isHouseCall = bookingType === 'HOUSE_CALL';
      apiClient.get(`/availability?branchId=${selectedBranchId}&barberId=${selectedBarberId}&serviceId=${selectedServiceId}&date=${selectedDate}&isHouseCall=${isHouseCall}`)
        .then(res => setSlots(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setSlots([]);
    }
  }, [selectedBranchId, selectedBarberId, selectedServiceId, selectedDate, bookingType]);

  // Countdown timer for hold expiration
  useEffect(() => {
    if (!holdData) return;
    const interval = setInterval(() => {
      setHoldTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMsg('Slot hold has expired. Please re-select a slot.');
          setHoldData(null);
          setStep(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [holdData]);

  // Handle OTP request
  const handleRequestOtp = async () => {
    if (!clientPhone) { setErrorMsg('Phone number is required'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      await requestOtp(clientPhone);
      setOtpSent(true);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async () => {
    if (!otpCode) { setErrorMsg('Please enter OTP code'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      await verifyOtpAndLogin(clientName || 'Client', clientPhone, otpCode);
      setStep(3);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'OTP Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Create Temporary Slot Hold
  const handleCreateHold = async () => {
    if (!selectedBarberId) { setErrorMsg('Please select a barber first'); return; }
    if (!selectedSlot) { setErrorMsg('Please select an available time slot'); return; }
    if (bookingType === 'HOUSE_CALL' && !houseCallAddress) {
      setErrorMsg('Please enter your House Call address');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await apiClient.post('/booking-holds', {
        branchId: selectedBranchId,
        barberId: selectedBarberId,
        serviceId: selectedServiceId,
        startTimeStr: selectedSlot.startTime,
        bookingType,
        houseCallAddress: bookingType === 'HOUSE_CALL' ? houseCallAddress : undefined,
        isEmergency: bookingType === 'EMERGENCY',
      });
      setHoldData(res.data);
      setHoldTimer(600);
      setStep(4);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Slot hold failed');
    } finally {
      setLoading(false);
    }
  };

  // Initiate Payment & Confirm Booking
  const handlePaynowPayment = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const bookingRes = await apiClient.post('/bookings/from-hold', {
        holdToken: holdData.hold.holdToken,
      });

      const booking = bookingRes.data;

      const payRes = await apiClient.post('/payments/initiate', {
        bookingId: booking.id,
        phone: user?.phone || clientPhone,
        paymentType: 'ECOCASH',
      });

      // The backend confirms the booking itself once the payment adapter
      // reports success (see PaymentsService.initiatePayment) - a client
      // was never meant to confirm its own payment directly.
      setPaymentInstructions(payRes.data.instructions || 'EcoCash prompt sent.');
      setBookingConfirmation(booking);
      setStep(5);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedBarberName = barbers.find(b => b.id === selectedBarberId)?.name;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Return & Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/welcome')}
          className="bg-dark-800 hover:bg-dark-700 text-gold-400 border border-dark-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </button>

        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Step</span>
          </button>
        )}
      </div>

      {/* Progress Bar Header */}
      <div className="flex items-center justify-between mb-8 text-xs sm:text-sm font-semibold">
        <span className={step >= 1 ? 'text-gold-400 font-bold' : 'text-gray-500'}>1. Service & Branch</span>
        <span className="text-gray-600">→</span>
        <span className={step >= 2 ? 'text-gold-400 font-bold' : 'text-gray-500'}>2. Verification</span>
        <span className="text-gray-600">→</span>
        <span className={step >= 3 ? 'text-gold-400 font-bold' : 'text-gray-500'}>3. Barber & Slot</span>
        <span className="text-gray-600">→</span>
        <span className={step >= 4 ? 'text-gold-400 font-bold' : 'text-gray-500'}>4. Payment</span>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Service & Branch Selection */}
      {step === 1 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-display font-bold text-white mb-4">Select Service & Branch</h2>

          {/* Service Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Service</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedServiceId(s.id)}
                  className={`card-3d p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedServiceId === s.id
                      ? 'border-gold-500 bg-gold-500/10 text-white'
                      : 'border-dark-700 bg-dark-900 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between font-bold mb-1">
                    <span>{s.name}</span>
                    <span className="text-gold-400">${Number(s.price).toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-gray-500">{s.durationMinutes} mins</span>
                </div>
              ))}
            </div>
          </div>

          {/* Branch Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Branch</label>
            <div className="grid grid-cols-1 gap-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`card-3d p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedBranchId === b.id
                      ? 'border-gold-500 bg-gold-500/10 text-white'
                      : 'border-dark-700 bg-dark-900 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div>
                    <h4 className="font-bold">{b.name}</h4>
                    <p className="text-xs text-gray-400">{b.address}</p>
                  </div>
                  <span className="text-xs text-gold-400 font-mono">{b.openTime} - {b.closeTime}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(user ? 3 : 2)}
            className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <span>Next: Select Barber & Slot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Phone Verification / Auth */}
      {step === 2 && !user && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-display font-bold text-white">Phone Verification (OTP)</h2>
          <p className="text-sm text-gray-400">Phone verification is required for all bookings to prevent spam.</p>

          {!otpSent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Kudzai Ndlovu"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm focus:border-gold-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+263771000007"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm focus:border-gold-500 outline-none"
                />
              </div>
              <button
                onClick={handleRequestOtp}
                disabled={loading}
                className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gold-400">OTP code sent to {clientPhone}. Enter code below:</p>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-center text-xl tracking-widest text-white focus:border-gold-500 outline-none"
              />
              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify OTP & Proceed'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Barber & Time Slot Matrix */}
      {step === 3 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-display font-bold text-white">Select Barber & Time Slot</h2>

          {/* Booking Type Options */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setBookingType('GENERAL')}
              className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                bookingType === 'GENERAL' ? 'border-gold-500 bg-gold-500/10 text-white' : 'border-dark-700 bg-dark-900 text-gray-400'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setBookingType('EMERGENCY')}
              className={`p-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1 ${
                bookingType === 'EMERGENCY' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-dark-700 bg-dark-900 text-gray-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Emergency (+$10)</span>
            </button>
            <button
              onClick={() => setBookingType('HOUSE_CALL')}
              className={`p-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1 ${
                bookingType === 'HOUSE_CALL' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-dark-700 bg-dark-900 text-gray-400'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>House Call (+$5)</span>
            </button>
          </div>

          {bookingType === 'HOUSE_CALL' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">House Call Delivery Address (Harare)</label>
              <input
                type="text"
                value={houseCallAddress}
                onChange={(e) => setHouseCallAddress(e.target.value)}
                placeholder="Enter full street address in Harare"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm focus:border-gold-500 outline-none"
              />
            </div>
          )}

          {/* Barber Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
              1. Select Barber / Stylist <span className="text-gold-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {barbers.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBarberId(b.id);
                    setSelectedSlot(null);
                  }}
                  className={`card-3d p-3.5 rounded-xl border cursor-pointer text-sm font-bold transition-all flex items-center justify-between ${
                    selectedBarberId === b.id
                      ? 'border-gold-500 bg-gold-500/10 text-white shadow-lg shadow-gold-500/10'
                      : 'border-dark-700 bg-dark-900 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <User className={`w-4 h-4 ${selectedBarberId === b.id ? 'text-gold-500' : 'text-gray-500'}`} />
                    <span>{b.name}</span>
                  </div>
                  {selectedBarberId === b.id && (
                    <CheckCircle className="w-4 h-4 text-gold-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">2. Select Date</label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="bg-dark-900 border border-dark-700 rounded-xl p-3 text-white text-sm focus:border-gold-500 outline-none"
            />
          </div>

          {/* Slot Grid - ONLY visible when barber is selected */}
          <div className="pt-2 border-t border-dark-700">
            {!selectedBarberId ? (
              <div className="bg-dark-900/50 border border-dark-700 rounded-xl p-6 text-center text-gray-400 space-y-2">
                <Scissors className="w-8 h-8 text-gold-500/50 mx-auto animate-pulse" />
                <p className="text-sm font-semibold text-white">Please select a Barber above</p>
                <p className="text-xs text-gray-500">Available time slots will load aligned with your selected barber's schedule.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    3. Available Slots for <span className="text-gold-400 font-extrabold">{selectedBarberName}</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-mono">Date: {selectedDate}</span>
                </div>

                {loading ? (
                  <div className="text-xs text-gold-500 animate-pulse p-4 text-center bg-dark-900 rounded-xl border border-dark-700">
                    Loading {selectedBarberName}'s real-time schedule...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-4 bg-dark-900 rounded-xl border border-dark-700 text-center text-xs text-gray-400">
                    No available time slots for {selectedBarberName} on {selectedDate}. Please select another date or barber.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {slots.map((s, idx) => {
                      const timeLabel = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const isSelected = selectedSlot?.startTime === s.startTime;
                      return (
                        <button
                          key={idx}
                          disabled={!s.isAvailable}
                          onClick={() => setSelectedSlot(s)}
                          className={`p-2.5 rounded-lg text-xs font-bold border transition-all ${
                            !s.isAvailable
                              ? 'border-dark-700 bg-dark-900/50 text-gray-600 cursor-not-allowed line-through'
                              : isSelected
                              ? 'border-gold-500 bg-gold-500 text-black shadow-lg shadow-gold-500/20'
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
          </div>

          <button
            onClick={handleCreateHold}
            disabled={!selectedBarberId || !selectedSlot || loading}
            className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Reserving Slot...' : 'Reserve Slot (10-Min Temporary Hold)'}</span>
            <Clock className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 4: Payment & Hold Timer */}
      {step === 4 && holdData && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between bg-gold-500/10 border border-gold-500/30 p-4 rounded-xl text-gold-400">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 animate-spin" />
              <span className="font-bold text-sm">Temporary Slot Hold Active</span>
            </div>
            <span className="font-mono text-xl font-extrabold text-gold-500">
              {Math.floor(holdTimer / 60)}:{(holdTimer % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Pricing Summary */}
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 space-y-2 text-sm">
            <h3 className="font-display font-bold text-white mb-2 pb-2 border-b border-dark-700">Payment Breakdown</h3>
            <div className="flex justify-between text-gray-400">
              <span>Service Price</span>
              <span>${holdData.pricing.servicePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Standard Booking Fee (Non-refundable)</span>
              <span>${holdData.pricing.bookingFee.toFixed(2)}</span>
            </div>
            {holdData.pricing.emergencyFee > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Emergency Priority Fee</span>
                <span>${holdData.pricing.emergencyFee.toFixed(2)}</span>
              </div>
            )}
            {holdData.pricing.houseCallFee > 0 && (
              <div className="flex justify-between text-blue-400">
                <span>House Call Travel Fee</span>
                <span>${holdData.pricing.houseCallFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-white text-base pt-2 border-t border-dark-700">
              <span>Total Payable</span>
              <span className="font-data text-gold-400">${holdData.pricing.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePaynowPayment}
            disabled={loading}
            className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-gold-500/10"
          >
            <CreditCard className="w-5 h-5" />
            <span>{loading ? 'Processing Payment...' : 'Pay via EcoCash / Paynow'}</span>
          </button>
        </div>
      )}

      {/* STEP 5: Booking Confirmation */}
      {step === 5 && bookingConfirmation && (
        <div className="bg-dark-800 border border-green-500/30 rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-gold-400 bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/20">
              {bookingConfirmation.bookingCode}
            </span>
            <h2 className="text-2xl font-display font-extrabold text-white mt-2">Booking Confirmed!</h2>
            <p className="text-sm text-gray-400 mt-1">
              SMS confirmation sent to {bookingConfirmation.client?.phone}.
            </p>
          </div>

          <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 text-left text-xs space-y-2 text-gray-300">
            <div><strong className="text-gray-400">Appointment Time:</strong> {new Date(bookingConfirmation.startTime).toLocaleString()}</div>
            <div><strong className="text-gray-400">Barber:</strong> {bookingConfirmation.barber?.name}</div>
            <div><strong className="text-gray-400">Branch Location:</strong> {bookingConfirmation.branch?.address}</div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gold-500 hover:bg-gold-600 text-black font-bold py-3 rounded-xl transition-colors"
          >
            Go to My Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
