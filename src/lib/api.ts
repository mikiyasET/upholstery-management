import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function sanitizeServerError(msg: unknown): string {
  if (typeof msg !== 'string') return 'An unexpected server error occurred.';
  const lower = msg.toLowerCase();
  if (
    lower.includes('prisma') ||
    lower.includes('libquery_engine') ||
    lower.includes('libssl') ||
    lower.includes('node_modules') ||
    lower.includes('invocation') ||
    lower.includes('error loading shared library') ||
    lower.includes('select ') ||
    lower.includes('insert ') ||
    lower.includes('update ') ||
    lower.includes('delete ') ||
    lower.includes('request failed with status code') ||
    msg.includes(' at ') ||
    msg.includes('Error:')
  ) {
    return 'A server error occurred. Please try again later.';
  }
  return msg;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If no error.response, it's a network error (e.g. server down or offline)
    if (!error.response) {
      window.dispatchEvent(new CustomEvent('network-error', { detail: { isOffline: !navigator.onLine } }));
      return Promise.reject(error);
    }

    // Sanitize any server traces from response error objects
    if (error.response?.data?.error?.message) {
      error.response.data.error.message = sanitizeServerError(error.response.data.error.message);
    }
    if (error.response?.data?.message) {
      error.response.data.message = sanitizeServerError(error.response.data.message);
    }

    const originalRequest = error.config;
    const isLoginEndpoint = originalRequest?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !originalRequest._retry && !isLoginEndpoint) {
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
    } else if (error.response?.status === 401 && !isLoginEndpoint) {
       // Catch-all for missing/invalid token after retry
       useAuthStore.getState().logout();
       if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
