import { create } from 'zustand';
import { api, apiClient } from '../services/api';

interface User {
  id: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
}

interface AuthState {
  user: User | null;
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
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await apiClient.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
    set({ user: data.data.user, isAuthenticated: true });
  },

  signup: async (signupData) => {
    const cleanMobile = signupData.phone.replace(/\D/g, '').slice(-10);
    await api.post('/auth/signup', {
      email: signupData.email.trim().toLowerCase(),
      mobile: cleanMobile,
      password: signupData.password,
      firstName: signupData.firstName.trim(),
      lastName: signupData.lastName.trim(),
      role: 'CUSTOMER',
    });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — clear local state regardless
    }
    await apiClient.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  verifyOtp: async (phone, otp) => {
    const cleanMobile = phone.replace(/\D/g, '').slice(-10);
    const { data } = await api.post('/auth/otp/verify', { mobile: cleanMobile, otp });
    if (data?.data?.tokens) {
      await apiClient.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      set({ user: data.data.user, isAuthenticated: true });
    }
  },

  forgotPassword: async (email) => {
    await api.post('/auth/password/forgot', { email: email.trim().toLowerCase() });
  },

  resetPassword: async (token, password) => {
    await api.post('/auth/password/reset', { token, newPassword: password });
  },

  checkAuth: async () => {
    try {
      const token = await apiClient.getAccessToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const { data } = await api.get('/customers/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      await apiClient.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
