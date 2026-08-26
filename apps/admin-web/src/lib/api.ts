import axios from 'axios';

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Github Codespaces pattern: xxxx-3001.app.github.dev -> xxxx-3000.app.github.dev
    if (host.includes('-3001.app.github.dev')) {
      return `${window.location.protocol}//${host.replace('-3001.', '-3000.')}/api/v1`;
    }
    if (host.includes('-3001.')) {
      return `${window.location.protocol}//${host.replace('-3001.', '-3000.')}/api/v1`;
    }
    if (window.location.port === '3001') {
      return `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;
    }
  }
  return 'http://localhost:3000/api/v1';
}

export const api = axios.create({
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fixme_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
