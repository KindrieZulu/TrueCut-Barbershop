import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Logout only renders outside the public welcome page (see Navbar's
// `isOnHomePage` check), so tests that need it render on a dashboard route.
const renderNavbar = (initialPath = '/welcome') =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Navbar />
      </MemoryRouter>
    </ThemeProvider>
  );

describe('Navbar Component UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand title TRUECUT and navigation links when unauthenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      logout: vi.fn(),
    });

    renderNavbar();

    expect(screen.getByText(/TRUE/i)).toBeInTheDocument();
    expect(screen.getByText(/CUT/i)).toBeInTheDocument();
    expect(screen.getByText(/HARARE, ZIMBABWE/i)).toBeInTheDocument();
    expect(screen.getByText(/Book Now/i)).toBeInTheDocument();
  });

  it('renders Dashboard link and call logout when user is authenticated as BARBER', () => {
    const mockLogout = vi.fn();
    (useAuth as any).mockReturnValue({
      user: { id: 'b1', name: 'Barber Dave', role: 'BARBER' },
      logout: mockLogout,
    });

    // A route that's neither the public welcome page nor this BARBER's own
    // dashboard (/barber), so both the Dashboard link and Logout button
    // are expected to render.
    renderNavbar('/settings');

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();

    const logoutBtn = screen.getByTitle('Logout');
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('hides the Logout button on the public welcome page even when authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'b1', name: 'Barber Dave', role: 'BARBER' },
      logout: vi.fn(),
    });

    renderNavbar('/welcome');

    expect(screen.queryByTitle('Logout')).not.toBeInTheDocument();
  });
});
