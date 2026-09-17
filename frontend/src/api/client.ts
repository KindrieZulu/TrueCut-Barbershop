import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
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
