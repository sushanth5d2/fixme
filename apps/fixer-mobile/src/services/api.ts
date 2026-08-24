import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * API URL resolution strategy:
 *
 * 1. In development (Expo Go):
 *    Use the SAME host as the Expo dev server (Metro bundler).
 *    Metro is configured with a proxy that forwards /api/* → localhost:3000/api/*
 *    This way the phone reaches the API through the Expo tunnel,
 *    avoiding DNS issues with *.app.github.dev domains.
 *
 * 2. In production:
 *    Use the production API domain.
 */
function getApiBaseUrl(): string {
  if (!__DEV__) {
    return 'https://api.fixme.dev/api/v1';
  }

  // Get the Expo dev server host (works for tunnel, LAN, and localhost)
  const hostUri: string =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants.manifest as any)?.debuggerHost ??
    '';

  if (hostUri) {
    // hostUri is like "raldrcm-anonymous-8081.exp.direct" (tunnel)
    // or "192.168.1.5:8081" (LAN) or "localhost:8081" (local)
    const protocol = hostUri.includes('.exp.direct') ? 'https' : 'http';
    // Remove port from hostUri if present, Metro proxy handles /api/* on same port
    return `${protocol}://${hostUri}/api/v1`;
  }

  // Fallback: try Codespace URL from app.config.js
  const configUrl = (Constants.expoConfig?.extra as any)?.apiUrl;
  if (configUrl) return configUrl;

  // Final fallback for emulator
  return 'http://10.0.2.2:3000/api/v1';
}

const API_BASE_URL = getApiBaseUrl();

console.log('[FixMe API] Using URL:', API_BASE_URL);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fixme_access_token',
  REFRESH_TOKEN: 'fixme_refresh_token',
};

class ApiClient {
  public readonly instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
  }> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.instance.interceptors.request.use(this.onRequest);
    this.instance.interceptors.response.use(
      (res) => res,
      this.onResponseError,
    );
  }

  private onRequest = async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  };

  private processQueue = (error: unknown, token: string | null) => {
    this.failedQueue.forEach((prom) => {
      if (error) prom.reject(error);
      else prom.resolve(token!);
    });
    this.failedQueue = [];
  };

  private onResponseError = async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(this.instance(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      this.isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
          refreshToken,
        });

        await this.setTokens(data.data.accessToken, data.data.refreshToken);
        this.processQueue(null, data.data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return this.instance(originalRequest);
      } catch (refreshError) {
        this.processQueue(refreshError, null);
        await this.clearTokens();
        return Promise.reject(refreshError);
      } finally {
        this.isRefreshing = false;
      }
    }

    return Promise.reject(error);
  };

  public async setTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  public async clearTokens() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  }

  public async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  }
}

export const apiClient = new ApiClient();
export const api = apiClient.instance;
