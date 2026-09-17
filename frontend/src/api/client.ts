import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

const SAFE_METHODS = new Set(['get', 'head', 'options']);

apiClient.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie('truecut_csrf');
    if (csrfToken) {
      config.headers.set('X-CSRF-Token', csrfToken);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status === 401 && request && !request._retry && !request.url?.endsWith('/auth/refresh')) {
      request._retry = true;
      try {
        await apiClient.post('/auth/refresh');
        return apiClient(request);
      } catch {
        localStorage.removeItem('user_info');
      }
    }
    return Promise.reject(error);
  },
);
