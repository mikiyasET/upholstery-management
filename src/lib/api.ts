import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If no error.response, it's a network error (e.g. server down or offline)
    if (!error.response) {
      window.dispatchEvent(new CustomEvent('network-error', { detail: { isOffline: !navigator.onLine } }));
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (refreshError: any) {
          if (!refreshError.response) {
            // Network error during refresh
            window.dispatchEvent(new CustomEvent('network-error', { detail: { isOffline: !navigator.onLine } }));
            return Promise.reject(refreshError);
          }
          // Refresh token invalid or expired
          useAuthStore.getState().logout();
          if (window.location.pathname !== '/login') window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    } else if (error.response?.status === 401) {
       // Catch-all for missing/invalid token after retry
       useAuthStore.getState().logout();
       if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
