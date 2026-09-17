import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Navbar Component UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand title TRUECUT and navigation links when unauthenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      logout: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

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

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();

    const logoutBtn = screen.getByTitle('Logout');
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
