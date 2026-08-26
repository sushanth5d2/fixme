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
  userId?: string;
  ownerName: string;
  companyName: string;
  gstin?: string | null;
  panNumber?: string | null;
  businessRegNo?: string | null;
  experienceYears: number;
  emergencyService: boolean;
  verificationStatus: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  profilePhotoKey?: string | null;
  workshopPhotos?: string[];
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
    gstin?: string;
    panNumber?: string;
    businessRegNo?: string;
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    experienceYears?: number;
    description?: string;
    profilePhotoKey?: string;
    workshopPhotos?: string[];
  }) => Promise<void>;
  logout: () => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setFixerProfile: (profile: FixerProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  fixerProfile: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
    const payload = data?.data?.data || data?.data || data;
    if (payload?.tokens) {
      await apiClient.setTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
      set({ user: payload.user, isAuthenticated: true });
      await get().refreshProfile();
    }
  },

  signup: async (signupData) => {
    const cleanMobile = signupData.phone.replace(/\D/g, '').slice(-10);
    const name = signupData.firstName || signupData.ownerName || 'Fixer';
    const payloadBody: any = {
      email: signupData.email.trim().toLowerCase(),
      mobile: cleanMobile,
      password: signupData.password,
      firstName: name,
      lastName: signupData.lastName || '',
      role: 'FIXER',
      companyName: signupData.companyName || `${name}'s Repairs`,
    };

    if (signupData.gstin) payloadBody.gstin = signupData.gstin.trim().toUpperCase();
    if (signupData.panNumber) payloadBody.panNumber = signupData.panNumber.trim().toUpperCase();
    if (signupData.businessRegNo) payloadBody.businessRegNo = signupData.businessRegNo.trim();
    if (signupData.addressLine) payloadBody.addressLine = signupData.addressLine.trim();
    if (signupData.city) payloadBody.city = signupData.city.trim();
    if (signupData.state) payloadBody.state = signupData.state.trim();
    if (signupData.pincode) payloadBody.pincode = signupData.pincode.trim();
    if (signupData.experienceYears) payloadBody.experienceYears = Number(signupData.experienceYears);
    if (signupData.description) payloadBody.description = signupData.description.trim();
    if (signupData.profilePhotoKey) payloadBody.profilePhotoKey = signupData.profilePhotoKey;
    if (signupData.workshopPhotos) payloadBody.workshopPhotos = signupData.workshopPhotos;

    const { data } = await api.post('/auth/signup', payloadBody);
    const payload = data?.data?.data || data?.data || data;
    if (payload?.tokens) {
      await apiClient.setTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
      set({ user: payload.user, isAuthenticated: true });
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    await apiClient.clearTokens();
    set({ user: null, fixerProfile: null, isAuthenticated: false });
  },

  verifyOtp: async (phone, otp) => {
    const cleanMobile = phone.replace(/\D/g, '').slice(-10);
    const { data } = await api.post('/auth/otp/verify', { mobile: cleanMobile, otp: otp.trim() });
    const payload = data?.data?.data || data?.data || data;
    if (payload?.tokens) {
      await apiClient.setTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
      set({ user: payload.user, isAuthenticated: true });
      await get().refreshProfile();
    }
  },

  refreshProfile: async () => {
    try {
      const { data } = await api.get('/fixers/me');
      const profile = data?.data?.profile || data?.data;
      if (profile) {
        set((state) => ({
          fixerProfile: profile,
          user: state.user ? {
            ...state.user,
            profilePhotoKey: profile.profilePhotoKey || (state.user as any)?.profilePhotoKey,
            fullName: profile.fullName || profile.ownerName || profile.companyName || (state.user as any)?.fullName,
          } : state.user,
        }));
      }
    } catch (err: any) {
      try {
        const { data } = await api.get('/fixers/me/member-profile');
        const memberProf = data?.data || data;
        if (memberProf) {
          set((state) => ({
            fixerProfile: memberProf,
            user: state.user ? {
              ...state.user,
              profilePhotoKey: memberProf.profilePhotoKey,
              fullName: memberProf.fullName,
              phone: memberProf.phone,
            } : state.user,
          }));
        }
      } catch {}
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
        if (profile?.fullName && !profile?.companyName) {
          // This is a member profile
          userData = {
            id: profile?.userId || profile?.id,
            userId: profile?.userId || profile?.id,
            fullName: profile?.fullName,
            email: profile?.email,
            phone: profile?.phone,
            profilePhotoKey: profile?.profilePhotoKey,
            role: 'FIXER_MEMBER',
            fixerId: profile?.fixerId,
          };
        } else {
          userData = profile?.user
            ? { ...profile.user, fixerId: profile.id, userId: profile.userId || profile.user.id, profilePhotoKey: profile.profilePhotoKey, role: 'FIXER' }
            : { id: profile?.userId || profile?.id, userId: profile?.userId || profile?.id, role: 'FIXER', profilePhotoKey: profile?.profilePhotoKey, ...profile };
        }
      } catch (err: any) {
        const { data } = await api.get('/fixers/me/member-profile');
        profile = data?.data || data;
        userData = {
          id: profile?.userId || profile?.id,
          userId: profile?.userId || profile?.id,
          fullName: profile?.fullName,
          email: profile?.email,
          phone: profile?.phone,
          profilePhotoKey: profile?.profilePhotoKey,
          role: 'FIXER_MEMBER',
          fixerId: profile?.fixerId,
        };
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
