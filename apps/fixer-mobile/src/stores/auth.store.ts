import { create } from 'zustand';
import { api, apiClient } from '../services/api';

interface User {
  id: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface FixerProfile {
  id: string;
  companyName: string;
  ownerName: string;
  verificationStatus: string;
}

interface AuthState {
  user: User | null;
  fixerProfile: FixerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    phone: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setFixerProfile: (profile: FixerProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  fixerProfile: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await apiClient.setTokens(data.data.accessToken, data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true });
  },

  signup: async (signupData) => {
    const { data } = await api.post('/auth/signup', {
      ...signupData,
      role: 'FIXER',
    });
    await apiClient.setTokens(data.data.accessToken, data.data.refreshToken);
    set({ user: data.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    await apiClient.clearTokens();
    set({ user: null, fixerProfile: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const token = await apiClient.getAccessToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const { data } = await api.get('/fixers/me');
      set({
        user: data.data?.user || null,
        fixerProfile: data.data || null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await apiClient.clearTokens();
      set({ user: null, fixerProfile: null, isAuthenticated: false, isLoading: false });
    }
  },

  setFixerProfile: (profile) => set({ fixerProfile: profile }),
}));
