import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BookingWizard } from '../pages/BookingWizard';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('BookingWizard UI Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: { id: 'u1', name: 'Test User', phone: '+263771000007', role: 'CLIENT' },
      requestOtp: vi.fn(),
      verifyOtpAndLogin: vi.fn(),
    });

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/branches')) {
        return Promise.resolve({ data: [{ id: 'b1', name: 'Harare Main Branch', address: '123 Samora Machel' }] });
      }
      if (url.includes('/services')) {
        return Promise.resolve({ data: [{ id: 's1', name: 'Executive Haircut', price: 15, durationMinutes: 30 }] });
      }
      if (url.includes('/barbers')) {
        return Promise.resolve({ data: [{ id: 'barber1', name: 'Master Barber Dave' }] });
      }
      if (url.includes('/availability')) {
        return Promise.resolve({
          data: [
            { startTime: '2026-09-15T09:00:00Z', endTime: '2026-09-15T09:30:00Z', available: true, label: '09:00 AM' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders step 1 (Select Service & Branch) and loads initial options', async () => {
    render(
      <BrowserRouter>
        <BookingWizard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Select Service & Branch/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Harare Main Branch')).toBeInTheDocument();
      expect(screen.getByText('Executive Haircut')).toBeInTheDocument();
    });
  });

  it('navigates to step 2 when next button is clicked', async () => {
    render(
      <BrowserRouter>
        <BookingWizard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Harare Main Branch')).toBeInTheDocument();
    });

    const nextBtn = screen.getByText(/Next: Select Barber & Slot/i);
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Verification/i)).toBeInTheDocument();
    });
  });
});
