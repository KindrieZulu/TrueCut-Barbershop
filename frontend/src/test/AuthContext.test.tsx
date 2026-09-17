import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const TestComponent = () => {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user-name">{user ? user.name : 'Logged Out'}</span>
      <button onClick={() => login('+263771234567', 'password123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides default unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('Logged Out');
  });

  it('logs in user successfully without exposing tokens to localStorage', async () => {
    const mockUser = { id: 'u1', name: 'Alexander', phone: '+263771234567', role: 'CLIENT' };
    (apiClient.post as any).mockResolvedValue({
      data: {
        user: mockUser,
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginBtn = screen.getByText('Login');
    await act(async () => {
      loginBtn.click();
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Alexander');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('logs out user and clears localStorage', async () => {
    localStorage.setItem('user_info', JSON.stringify({ id: 'u1', name: 'Alexander', role: 'CLIENT' }));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('Alexander');

    const logoutBtn = screen.getByText('Logout');
    act(() => {
      logoutBtn.click();
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Logged Out');
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
