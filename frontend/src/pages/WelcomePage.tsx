import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Scissors, User, UserCheck, Shield, Building2, Clock, Tag,
  ArrowRight, KeyRound, LogIn, ChevronRight, CheckCircle2, Zap, Home,
  CreditCard, Smartphone, ChevronDown, CheckCircle
} from 'lucide-react';
import truecutLogo from '../assets/truecut-logo.webp';
import { useTheme } from '../context/ThemeContext';

interface RoleOption {
  id: string;
  role: 'CLIENT' | 'BARBER' | 'RECEPTIONIST' | 'COMPANY_ADMIN' | 'SYSTEM_ADMIN';
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  path: string;
  demoPhone: string;
  demoAccounts?: { name: string; phone: string }[];
  badge: string;
  gradient: string;
}

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, requestOtp, verifyOtpAndLogin } = useAuth();
  const { theme } = useTheme();

  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [authMode, setAuthMode] = useState<'DEMO' | 'PHONE'>('DEMO');
  const [harareTime, setHarareTime] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [selectedDemoPhone, setSelectedDemoPhone] = useState('');

  // Custom Phone Sign-in / Sign-up state (Client role - OTP, no password)
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Staff Password Login state - for a real staff account (registered by
  // a System Admin or Company Admin with its own password), not one of
  // the fixed demo accounts above. Staff never use OTP; only clients do.
  const [staffLoginPhone, setStaffLoginPhone] = useState('');
  const [staffLoginPassword, setStaffLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live Harare Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setHarareTime(now.toLocaleTimeString('en-US', {
        timeZone: 'Africa/Harare',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const roles: RoleOption[] = [
    {
      id: 'client',
      role: 'CLIENT',
      title: 'Executive Client',
      subtitle: 'Self-Service Booking Portal',
      description: 'Browse price catalogue, reserve real-time slots, configure recurring bookings & EcoCash payments.',
      icon: User,
      path: '/dashboard',
      demoPhone: '+263771000007',
      badge: 'Client Portal',
      gradient: 'from-amber-500/20 via-gold-500/10 to-transparent border-gold-500/30',
    },
    {
      id: 'barber',
      role: 'BARBER',
      title: 'Barber & Stylist',
      subtitle: 'Station Agenda & Countdowns',
      description: 'View today\'s appointment countdowns, client details, house call locations & manage leave block-outs.',
      icon: Scissors,
      path: '/barber',
      demoPhone: '+263771000004',
      demoAccounts: [
        { name: 'Tinashe Barber', phone: '+263771000004' },
        { name: 'Farai Stylist', phone: '+263771000005' },
        { name: 'Blessing MasterBarber', phone: '+263771000006' },
      ],
      badge: 'Barber Portal',
      gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent border-amber-500/30',
    },
    {
      id: 'receptionist',
      role: 'RECEPTIONIST',
      title: 'Receptionist',
      subtitle: 'Branch Cashier & Squeeze-Ins',
      description: 'Register walk-in clients with OTP, execute $3 squeeze-ins, record cash/EcoCash & manage branch schedule.',
      icon: UserCheck,
      path: '/receptionist',
      demoPhone: '+263771000003',
      badge: 'Branch Reception',
      gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30',
    },
    {
      id: 'admin',
      role: 'COMPANY_ADMIN',
      title: 'Company Admin',
      subtitle: 'Multi-Branch Analytics & Catalogue',
      description: 'Executive financial ledger, revenue breakdown, catalogue pricing editor & system settings configurator.',
      icon: Building2,
      path: '/admin',
      demoPhone: '+263771000002',
      badge: 'Company Executive',
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30',
    },
    {
      id: 'sysadmin',
      role: 'SYSTEM_ADMIN',
      title: 'System Administrator',
      subtitle: 'Infrastructure & Health Operations',
      description: 'Monitor API health, database connections, Redis queues, and trace technical audit logs.',
      icon: Shield,
      path: '/sysadmin',
      demoPhone: '+263771000001',
      badge: 'System Core',
      gradient: 'from-red-500/20 via-rose-500/10 to-transparent border-red-500/30',
    },
  ];

  const handleQuickDemoLogin = async (roleOption: RoleOption) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const phone = selectedDemoPhone || roleOption.demoPhone;
      await login(phone, password);
      navigate(roleOption.path);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffPasswordLogin = async () => {
    if (!staffLoginPhone || !staffLoginPassword) { setErrorMsg('Phone and password are required'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      await login(staffLoginPhone, staffLoginPassword);
      if (selectedRole) navigate(selectedRole.path);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!customPhone) { setErrorMsg('Phone number is required'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      await requestOtp(customPhone);
      setOtpSent(true);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpLogin = async () => {
    if (!otpCode) { setErrorMsg('Enter OTP code'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      await verifyOtpAndLogin(customName || 'User', customPhone, otpCode);
      if (selectedRole) navigate(selectedRole.path);
    } catch (e: any) {
      const message = e.response?.data?.message;
      setErrorMsg(Array.isArray(message) ? message.join(', ') : message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const scrollToRoles = () => {
    const rolesElement = document.getElementById('roles-section');
    if (rolesElement) {
      rolesElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] relative flex flex-col justify-between">
      {/* SECTION 1: Brand Hero Welcome Landing - a full-bleed band that's
          always dark, regardless of the site's light/dark theme toggle
          (a fixed hex, not a --tc-* token), so it reads as a distinct,
          contrasting band under the navbar rather than blending into
          whatever the current theme's background happens to be - matching
          a car-marketplace reference site's light-navbar/dark-hero look.
          Every color inside this band is likewise hardcoded rather than
          theme-reactive, since it must stay legible against this fixed
          dark backdrop no matter which theme is active. */}
      <div
        className="relative overflow-hidden py-8 px-4"
        style={{ backgroundColor: theme === 'dark' ? '#050403' : '#15100d' }}
      >
        {theme === 'dark' ? (
          /* Dark theme: a "fire" glow - four corner blobs alternating blue
             and orange, dancing in diagonal pairs (top-left + bottom-right
             move together one way while top-right + bottom-left move the
             opposite way, in sync - see .hero-corner-a/b in index.css) -
             evoking flame colors against a black backdrop. Per explicit
             user request ("dancing in the corners, opposite but
             simultaneous" and "black with fire animation that is
             blueish and orange"). */
          <>
            <div className="hero-corner-a absolute -top-24 -left-24 w-[480px] h-[480px] bg-[#e2924d] opacity-10 rounded-full blur-[150px] pointer-events-none" />
            <div className="hero-corner-b absolute -top-24 -right-24 w-[480px] h-[480px] bg-[#3b82f6] opacity-10 rounded-full blur-[150px] pointer-events-none" />
            <div className="hero-corner-b absolute -bottom-24 -left-24 w-[440px] h-[440px] bg-[#c97b3d] opacity-10 rounded-full blur-[140px] pointer-events-none" />
            <div className="hero-corner-a absolute -bottom-24 -right-24 w-[440px] h-[440px] bg-[#2563eb] opacity-10 rounded-full blur-[140px] pointer-events-none" />
          </>
        ) : (
          /* Light theme: the same corner-dance motion, but a calmer,
             single-hue copper palette - "distinct but classic" rather
             than the dark theme's livelier multi-color fire effect. */
          <>
            <div className="hero-corner-a absolute -top-24 -left-24 w-[480px] h-[480px] bg-[#c97b3d] opacity-10 rounded-full blur-[150px] pointer-events-none" />
            <div className="hero-corner-b absolute -top-24 -right-24 w-[480px] h-[480px] bg-[#9c5a28] opacity-10 rounded-full blur-[150px] pointer-events-none" />
            <div className="hero-corner-b absolute -bottom-24 -left-24 w-[440px] h-[440px] bg-[#9c5a28] opacity-10 rounded-full blur-[140px] pointer-events-none" />
            <div className="hero-corner-a absolute -bottom-24 -right-24 w-[440px] h-[440px] bg-[#c97b3d] opacity-10 rounded-full blur-[140px] pointer-events-none" />
          </>
        )}

        {/* Glass panel - the animated corner glows sit behind/around this
            card and blur through its translucent backdrop, giving the
            content a frosted-glass look rather than sitting directly on
            the flat dark band. Per explicit user request ("make the hero
            band glassy"). Dark theme gets a stronger, gradient "sheen" and
            brighter border - against the near-black dark-theme backdrop, the
            same subtle light-theme treatment read as barely-there rather
            than glassy; against light theme's warm dark band it already
            stood out fine, so that treatment is unchanged. */}
        <div
          className={`max-w-5xl mx-auto text-center relative z-10 space-y-6 px-6 sm:px-12 py-10 rounded-3xl backdrop-blur-xl border shadow-2xl ${
            theme === 'dark'
              ? 'bg-gradient-to-b from-white/[0.14] via-white/[0.07] to-white/[0.03] border-white/20 shadow-black/50'
              : 'bg-white/[0.06] border-white/10'
          }`}
        >
          <img
            src={truecutLogo}
            alt="TrueCut Barber"
            className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full object-cover shadow-2xl shadow-[#c97b3d]/30 border-4 border-black/30"
          />

          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs text-[#e2924d] font-mono shadow-xl">
            <Clock className="w-3.5 h-3.5 text-[#c97b3d] animate-pulse" />
            <span>HARARE MAIN BRANCH: {harareTime} CAT</span>
          </div>

          <span className="block text-xs sm:text-sm font-extrabold uppercase tracking-[0.15em] text-[#e2924d]">
            Zimbabwe's Premier Barbershop
          </span>

          <h1 className="text-4xl sm:text-6xl font-display font-black tracking-tight text-gray-50 leading-tight">
            Precision Grooming & Executive <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#e2924d] via-[#c97b3d] to-[#9c5a28] bg-clip-text text-transparent">
              Barbershop Platform
            </span>
          </h1>

          <p className="text-[#b5a179] max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Harare's premier barbershop. Enjoy real-time slot holds, house call deliveries, instant EcoCash checkout, and priority squeeze-in access.
          </p>

          {/* Feature Pill Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-semibold text-gray-200">
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[#c97b3d]" />
              <span>Zero Double-Booking Guarantee</span>
            </span>
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
              <Home className="w-3.5 h-3.5 text-blue-300" />
              <span>10km House Calls</span>
            </span>
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
              <Smartphone className="w-3.5 h-3.5 text-green-300" />
              <span>EcoCash Integration</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={scrollToRoles}
              className="w-full sm:w-auto bg-gradient-to-r from-[#c97b3d] to-[#9c5a28] hover:from-[#e2924d] hover:to-[#c97b3d] text-gray-50 font-extrabold text-sm px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-[#c97b3d]/20 flex items-center justify-center space-x-2"
            >
              <span>Get Started / Select Role</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>

            <Link
              to="/catalogue"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-[#e2924d] font-bold text-sm px-6 py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2"
            >
              <Tag className="w-4 h-4 text-[#c97b3d]" />
              <span>View Public Prices</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-dark-900 text-white flex-1 flex flex-col justify-between py-8 px-4">
      {/* SECTION 2: Role Selection & Sign-In / Sign-Up Grid */}
      <div id="roles-section" className="max-w-6xl mx-auto w-full relative z-10 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono font-bold text-gold-400 uppercase tracking-widest">Portal Access</span>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">Select Your Operational Role</h2>
          <p className="text-xs text-gray-400">Click a card below to enter portal with quick demo credentials or custom OTP sign-in.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {roles.map((r) => {
            const Icon = r.icon;
            const isCurrentActiveRole = user?.role === r.role;

            return (
              <div
                key={r.id}
                onClick={() => { setSelectedRole(r); setSelectedDemoPhone(r.demoAccounts ? r.demoAccounts[0].phone : r.demoPhone); }}
                className={`card-3d group relative bg-dark-800 hover:bg-dark-700 border ${r.gradient} rounded-2xl p-5 cursor-pointer transition-colors flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-dark-900 border border-dark-600 rounded-xl text-gold-400 group-hover:bg-gold-500 group-hover:text-gray-50 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    {isCurrentActiveRole && (
                      <span className="bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] uppercase tracking-wider font-mono text-gold-400 block mb-1">{r.badge}</span>
                  <h3 className="font-display font-bold text-white text-base leading-snug">{r.title}</h3>
                  <p className="text-xs text-gray-400 font-medium mb-3">{r.subtitle}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{r.description}</p>
                </div>

                <div className="pt-4 border-t border-dark-700 flex items-center justify-between text-xs font-bold text-gold-400 group-hover:text-amber-300 transition-colors">
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Sign-In / Sign-Up Glass Modal */}
      {selectedRole && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800/95 border border-dark-600 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-dark-700 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-gold-400 bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/20">
                  {selectedRole.badge}
                </span>
                <h3 className="text-xl font-display font-black text-white mt-2">{selectedRole.title}</h3>
                <p className="text-xs text-gray-400">{selectedRole.subtitle}</p>
              </div>
              <button
                onClick={() => { setSelectedRole(null); setErrorMsg(''); }}
                className="text-gray-400 hover:text-white p-1 text-sm font-bold rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}

            {/* Auth Mode Toggle */}
            <div className="flex bg-dark-900 p-1 rounded-xl border border-dark-600 text-xs font-bold">
              <button
                onClick={() => setAuthMode('DEMO')}
                className={`w-1/2 py-2 rounded-lg transition-all ${
                  authMode === 'DEMO' ? 'bg-gold-500 text-gray-50' : 'text-gray-400'
                }`}
              >
                Quick Demo Sign-In
              </button>
              <button
                onClick={() => setAuthMode('PHONE')}
                className={`w-1/2 py-2 rounded-lg transition-all ${
                  authMode === 'PHONE' ? 'bg-gold-500 text-gray-50' : 'text-gray-400'
                }`}
              >
                {selectedRole.role === 'CLIENT' ? 'Custom Phone OTP' : 'Staff Password Login'}
              </button>
            </div>

            {/* DEMO AUTH MODE */}
            {authMode === 'DEMO' ? (
              <div className="space-y-4">
                {selectedRole.demoAccounts ? (
                  <div className="bg-dark-900/80 border border-dark-600 p-4 rounded-2xl space-y-2 text-xs">
                    <span className="text-gray-400 block mb-1">Choose which demo account to sign in as:</span>
                    <div className="space-y-1.5">
                      {selectedRole.demoAccounts.map((acct) => (
                        <label
                          key={acct.phone}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            selectedDemoPhone === acct.phone
                              ? 'border-gold-500 bg-gold-500/10'
                              : 'border-dark-600 bg-dark-900'
                          }`}
                        >
                          <span className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="demoAccount"
                              checked={selectedDemoPhone === acct.phone}
                              onChange={() => setSelectedDemoPhone(acct.phone)}
                              className="accent-gold-500"
                            />
                            <span className="text-white font-semibold">{acct.name}</span>
                          </span>
                          <strong className="text-gold-400 font-mono">{acct.phone}</strong>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-between text-gray-400 pt-1">
                      <span>Default Password:</span>
                      <strong className="text-white font-mono">Password123!</strong>
                    </div>
                  </div>
                ) : (
                  <div className="bg-dark-900/80 border border-dark-600 p-4 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>Demo Account Phone:</span>
                      <strong className="text-gold-400 font-mono">{selectedRole.demoPhone}</strong>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Default Password:</span>
                      <strong className="text-white font-mono">Password123!</strong>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleQuickDemoLogin(selectedRole)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-gray-50 font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-gold-500/20 flex items-center justify-center space-x-2 text-sm"
                >
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                </button>
              </div>
            ) : selectedRole.role !== 'CLIENT' ? (
              /* STAFF PASSWORD LOGIN MODE - a real registered staff
                 account (System Admin creates Company Admins; Company
                 Admin creates Receptionists/Barbers), signing in with its
                 own phone + password rather than a fixed demo credential. */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={staffLoginPhone}
                    onChange={(e) => setStaffLoginPhone(e.target.value)}
                    placeholder="+263771234567"
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    value={staffLoginPassword}
                    onChange={(e) => setStaffLoginPassword(e.target.value)}
                    placeholder="Your account password"
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
                  />
                </div>
                <button
                  onClick={handleStaffPasswordLogin}
                  disabled={loading}
                  className="w-full bg-gold-500 hover:bg-gold-600 text-gray-50 font-extrabold py-3.5 rounded-xl transition-all text-sm"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            ) : (
              /* CUSTOM PHONE OTP MODE */
              <div className="space-y-4">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. Kudzai Ndlovu"
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="+263771000007"
                        className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-500"
                      />
                    </div>
                    <button
                      onClick={handleRequestOtp}
                      disabled={loading}
                      className="w-full bg-gold-500 hover:bg-gold-600 text-gray-50 font-extrabold py-3 rounded-xl transition-all text-xs"
                    >
                      {loading ? 'Sending OTP...' : 'Send SMS Verification OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gold-400">OTP code sent to {customPhone}. Enter code below:</p>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-center text-lg font-mono text-white outline-none focus:border-gold-500"
                    />
                    <button
                      onClick={handleVerifyOtpLogin}
                      disabled={loading}
                      className="w-full bg-gold-500 hover:bg-gold-600 text-gray-50 font-extrabold py-3.5 rounded-xl transition-all text-sm"
                    >
                      {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 font-mono relative z-10 pt-8">
        TrueCut Barbershop • Production Platform v1.0 • Harare, Zimbabwe
      </div>
      </div>
    </div>
  );
};
