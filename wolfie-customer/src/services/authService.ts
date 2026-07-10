import { apiClient } from '@/lib/axios';

export interface RegisterPayload {
  email: string;
  password?: string;
  full_name: string;
  phone: string;
  role: 'customer';
}

export const authService = {
  login: async (email: string, password?: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  sendOtp: async (phone: string) => {
    const res = await apiClient.post('/auth/otp/send', { phone });
    return res.data;
  },

  verifyOtp: async (phone: string, code: string) => {
    const res = await apiClient.post('/auth/otp/verify', { phone, code });
    return res.data;
  },

  register: async (payload: RegisterPayload) => {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },

  updateProfile: async (data: Partial<RegisterPayload> & { dietary_preferences?: string[]; allergy_preferences?: string[] }) => {
    const res = await apiClient.patch('/auth/me', data);
    return res.data;
  }
};
