import { create } from 'zustand';
import { api, apiClient } from '../services/api';

interface User {
  id: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
}

interface FixerProfile {
  id: string;
  ownerName: string;
  companyName: string;
  experienceYears: number;
  emergencyService: boolean;
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
    firstName?: string;
    lastName?: string;
    ownerName?: string;
    companyName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setFixerProfile: (profile: FixerProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  fixerProfile: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await apiClient.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
    set({ user: data.data.user, isAuthenticated: true });
  },

  signup: async (signupData) => {
    const cleanMobile = signupData.phone.replace(/\D/g, '').slice(-10);
    const name = signupData.firstName || signupData.ownerName || 'Fixer';
    const { data } = await api.post('/auth/signup', {
      email: signupData.email.trim().toLowerCase(),
      mobile: cleanMobile,
      password: signupData.password,
      firstName: name,
      lastName: signupData.lastName || '',
      role: 'FIXER',
    });
    if (data?.data?.tokens) {
      await apiClient.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      set({ user: data.data.user, isAuthenticated: true });
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    await apiClient.clearTokens();
    set({ user: null, fixerProfile: null, isAuthenticated: false });
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
      let userData: any = null;
      let profile: any = null;
      try {
        const { data } = await api.get('/fixers/me');
        profile = data?.data?.profile || data?.data;
        userData = profile?.user
          ? { ...profile.user, fixerId: profile.id, userId: profile.userId || profile.user.id, role: 'FIXER' }
          : { id: profile?.userId || profile?.id, userId: profile?.userId || profile?.id, role: 'FIXER', ...profile };
      } catch (err: any) {
        if (err?.response?.status === 403) {
          const { data } = await api.get('/fixers/me/member-profile');
          profile = data?.data || data;
          userData = {
            id: profile?.userId || profile?.id,
            userId: profile?.userId || profile?.id,
            fullName: profile?.fullName,
            email: profile?.email,
            role: 'FIXER_MEMBER',
            fixerId: profile?.fixerId,
          };
        } else {
          throw err;
        }
      }

      set({
        user: userData,
        fixerProfile: profile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await apiClient.clearTokens();
      set({ user: null, fixerProfile: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setFixerProfile: (fixerProfile) => set({ fixerProfile }),
}));
