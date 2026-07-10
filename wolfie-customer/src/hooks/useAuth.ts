import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, RegisterPayload } from '@/services/authService';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setAuth, logout: logoutStore, user, isAuthenticated, token, updateUser } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password?: string }) => {
      logger.info(`Attempting login for ${email}`);
      const data = await authService.login(email, password);
      return data; // contains access_token and user_id
    },
    onSuccess: async (data, variables) => {
      logger.info('Login response success, fetching profile...');
      // Set temporary auth info so subsequent profile call is authorized
      setAuth({ id: data.user_id, email: variables.email }, data.access_token);
      
      try {
        const profile = await authService.getCurrentUser();
        setAuth({
          id: data.user_id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          dietary_preferences: profile.dietary_preferences,
          allergy_preferences: profile.allergy_preferences,
        }, data.access_token);
      } catch (err) {
        logger.error('Failed to fetch full user profile. Continuing with basic auth data.', err);
      }
      
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      logger.info(`Sending OTP to ${phone}`);
      return await authService.sendOtp(phone);
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      logger.info(`Verifying OTP for ${phone}`);
      return await authService.verifyOtp(phone, code);
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      logger.info(`Registering user ${payload.email}`);
      return await authService.register(payload);
    },
    onSuccess: async (data, variables) => {
      logger.info('Registration successful, fetching user details...');
      setAuth({ id: data.user_id, email: variables.email, full_name: variables.full_name, phone: variables.phone }, data.access_token);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<RegisterPayload> & { dietary_preferences?: string[]; allergy_preferences?: string[] }) => {
      return await authService.updateProfile(data);
    },
    onSuccess: (data) => {
      updateUser(data);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const logout = () => {
    logger.info('Logging out user...');
    logoutStore();
    queryClient.clear();
    router.push('/login');
  };

  return {
    user,
    isAuthenticated,
    token,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    
    sendOtp: sendOtpMutation.mutateAsync,
    isSendingOtp: sendOtpMutation.isPending,
    
    verifyOtp: verifyOtpMutation.mutateAsync,
    isVerifyingOtp: verifyOtpMutation.isPending,
    
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    
    logout,
  };
}
