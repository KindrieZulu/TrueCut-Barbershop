import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WelcomePage } from '../pages/WelcomePage';
import { useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const renderWelcomePage = () =>
  render(
    <ThemeProvider>
      <BrowserRouter>
        <WelcomePage />
      </BrowserRouter>
    </ThemeProvider>
  );

describe('WelcomePage UI Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders headline, feature highlights, and role options', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      login: vi.fn(),
      requestOtp: vi.fn(),
      verifyOtpAndLogin: vi.fn(),
    });

    renderWelcomePage();

    expect(screen.getByText(/Precision Grooming/i)).toBeInTheDocument();
    expect(screen.getByText(/Barbershop Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Executive Client/i)).toBeInTheDocument();
    expect(screen.getByText(/Barber & Stylist/i)).toBeInTheDocument();
    expect(screen.getByText(/^Receptionist$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Company Admin$/i)).toBeInTheDocument();
    expect(screen.getByText(/System Administrator/i)).toBeInTheDocument();
  });

  it('opens role login modal when a role card is clicked', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      login: vi.fn(),
    });

    renderWelcomePage();

    const clientCard = screen.getByText('Executive Client');
    fireEvent.click(clientCard);

    expect(screen.getByText('Quick Demo Sign-In')).toBeInTheDocument();
    expect(screen.getByText('Custom Phone OTP')).toBeInTheDocument();
    expect(screen.getByText('+263771000007')).toBeInTheDocument();
  });
});
