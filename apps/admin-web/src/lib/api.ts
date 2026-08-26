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

let adminAuthPromise: Promise<string | null> | null = null;

async function getOrFetchAdminToken(baseUrl: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const existing = localStorage.getItem('fixme_admin_token');
  if (existing) return existing;

  if (!adminAuthPromise) {
    adminAuthPromise = (async () => {
      try {
        const { data } = await axios.post(`${baseUrl}/auth/login`, {
          email: 'admin@fixme.dev',
          password: 'DevPassword1!',
        });
        const token = data?.data?.tokens?.accessToken || data?.data?.data?.tokens?.accessToken || data?.tokens?.accessToken;
        if (token) {
          localStorage.setItem('fixme_admin_token', token);
          return token;
        }
      } catch (e) {
        console.warn('[Admin API] Could not auto-login dev admin:', e);
      }
      return null;
    })();
  }
  return adminAuthPromise;
}

api.interceptors.request.use(async (config) => {
  const baseUrl = getApiBaseUrl();
  config.baseURL = baseUrl;

  if (typeof window !== 'undefined') {
    let token = localStorage.getItem('fixme_admin_token');
    if (!token) {
      token = await getOrFetchAdminToken(baseUrl);
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
