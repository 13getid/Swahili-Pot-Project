import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Redirect to login on auth failure, except on the public attend page
    // and the login request itself (so we can show inline errors there).
    const status = err.response?.status;
    const path = window.location.pathname;
    const url = err.config?.url || '';
    const isAuthCheck = url.includes('/auth/login') || url.includes('/auth/me');
    if (status === 401 && !path.startsWith('/attend') && !path.startsWith('/login') && !isAuthCheck) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
