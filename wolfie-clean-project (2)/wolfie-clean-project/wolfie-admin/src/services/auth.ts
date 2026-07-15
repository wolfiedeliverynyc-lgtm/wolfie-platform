// src/services/auth.ts
import api from './api';
import { AuthResponse, ApiResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    // Fallback if structure is flat
    if (response.data && typeof response.data === 'object' && 'access_token' in response.data) {
      return response.data as unknown as AuthResponse;
    }
    throw new Error(response.data.message || response.data.error || 'Authentication failed');
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
  },

  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    if (response.data && typeof response.data === 'object' && 'id' in response.data) {
      return response.data as unknown as User;
    }
    throw new Error(response.data.message || response.data.error || 'Failed to fetch profile');
  },
};

export default authService;
