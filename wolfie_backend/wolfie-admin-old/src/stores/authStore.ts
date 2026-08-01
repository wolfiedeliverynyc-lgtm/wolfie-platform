// src/stores/authStore.ts
import { create } from 'zustand';
import { User } from '@/types';
import authService from '@/services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  initialize: () => Promise<User | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.login(email, password);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return data.user;
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const message = errorResponse.response?.data?.message || errorResponse.response?.data?.error || errorResponse.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  initialize: async () => {
    // Skip if SSR
    if (typeof window === 'undefined') return null;

    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      set({ isAuthenticated: false, isLoading: false });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const user = await authService.getProfile();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch {
      // Token might be expired, api interceptor would have tried to refresh it.
      // If it fails, clean up state.
      console.warn('Auth initialization failed, clearing token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
