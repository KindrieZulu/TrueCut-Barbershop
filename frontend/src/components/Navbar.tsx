import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, LayoutDashboard, Tag, Home, Settings, Sun, Moon } from 'lucide-react';
import truecutLogo from '../assets/truecut-logo.webp';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [harareTime, setHarareTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Africa/Harare',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setHarareTime(timeStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getDashboardPath = () => {
    if (!user) return '/catalogue';
    switch (user.role) {
      case 'RECEPTIONIST': return '/receptionist';
      case 'BARBER': return '/barber';
      case 'COMPANY_ADMIN': return '/admin';
      case 'SYSTEM_ADMIN': return '/sysadmin';
      default: return '/dashboard';
    }
  };

  // Once a user is already sitting on their own operational console (their
  // dashboard route), a "go to Dashboard" button just points at the current
  // page, and staff have no need for the public "Prices" marketing link -
  // both are clutter, not navigation, in that context.
  const isOnOwnDashboard = user ? location.pathname === getDashboardPath() : false;
  const isStaff = user && user.role !== 'CLIENT';
  const isOnSettings = location.pathname === '/settings';
  const isOnHomePage = location.pathname === '/' || location.pathname === '/welcome';

  return (
    <nav className="bg-dark-800/80 backdrop-blur-xl border-b border-dark-700 sticky top-0 z-50 px-4 py-3">
      {/* Live Harare Clock - absolutely centered on the navbar itself
          (rather than a flex child of the brand/links row) so it stays
          truly centered regardless of how wide either side is. Moved here
          from the WelcomePage hero per explicit user request ("remove
          this and put it in the navbar and center justify"). */}
      <div className="hidden md:flex items-center space-x-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-dark-900 px-3 py-1.5 rounded-full border border-dark-600 text-xs text-gold-400">
        <Clock className="w-3.5 h-3.5 animate-pulse text-gold-500" />
        <span className="font-mono font-bold">HARARE MAIN BRANCH: {harareTime} CAT</span>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Home Navigation */}
        <div className="flex items-center space-x-3">
          {/* Return Home - every page used to render its own copy of this
              button in its own content (duplicated across 7 pages); it now
              lives once, here, in the same top-left slot the old per-page
              "Back" button used to occupy. Per explicit user request ("put
              the 'return home' button, where the back button [is]"). */}
          {!isOnHomePage && (
            <button
              onClick={() => navigate('/welcome')}
              className="flex items-center space-x-1.5 bg-dark-900 hover:bg-dark-700 text-gray-300 hover:text-white border border-dark-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              title="Return Home"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Return Home</span>
            </button>
          )}
          <Link to="/welcome" className="flex items-center space-x-2">
            <img src={truecutLogo} alt="TrueCut Barber" className="w-10 h-10 rounded-full object-cover shadow-lg shadow-gold-500/20" />
            <div>
              <span className="text-xl font-extrabold tracking-wider text-white font-display">TRUE<span className="text-gold-500">CUT</span></span>
              <span className="text-xs text-gray-400 block -mt-1 font-medium">HARARE, ZIMBABWE</span>
            </div>
          </Link>
        </div>

        {/* Navigation Links - tight spacing below `sm` since a logged-in
            user can have up to 5 items here (Prices, theme toggle,
            Dashboard, Settings, Logout) at once, which overflows a phone
            width at the default spacing/visibility. */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {!isStaff && (
            <Link
              to="/catalogue"
              className="hidden sm:flex text-xs sm:text-sm text-gray-300 hover:text-gold-400 px-2 py-1 transition-colors items-center space-x-1"
            >
              <Tag className="w-3.5 h-3.5 text-gold-500" />
              <span>Prices</span>
            </Link>
          )}

          {/* Theme toggle - always visible, including on the public welcome
              page, so a visitor can switch the site's color theme without
              needing to log in first (Settings' toggle stays too, for
              logged-in users who land there directly). */}
          <button
            onClick={toggleTheme}
            className="bg-dark-900 hover:bg-dark-700 border border-dark-600 text-gray-300 hover:text-gold-400 p-1.5 rounded-full transition-colors"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              {!isOnOwnDashboard && (
                <Link
                  to={getDashboardPath()}
                  className="flex items-center space-x-1 bg-gold-500 hover:bg-gold-600 text-gray-50 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              )}

              {!isOnSettings && (
                <Link
                  to="/settings"
                  className="text-gray-400 hover:text-gold-400 p-1.5 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}

              {!isOnHomePage && (
                <button
                  onClick={() => {
                    logout();
                    // Hard navigation (not React Router's navigate) so the
                    // authenticated dashboard is fully torn down rather than
                    // left sitting in memory - see AuthContext's `pageshow`
                    // handler, which forces a reload if the browser's
                    // back/forward cache ever tries to restore this exact
                    // page state after logout.
                    window.location.href = '/welcome';
                  }}
                  className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <Link
              to="/book"
              className="bg-gold-500 hover:bg-gold-600 text-gray-50 font-semibold text-xs sm:text-sm px-4 py-1.5 rounded-lg transition-colors shadow-lg shadow-gold-500/10"
            >
              Book Now
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
