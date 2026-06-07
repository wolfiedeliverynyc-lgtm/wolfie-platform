// src/hooks/useAuth.ts
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, error, login, logout, clearError } = useAuthStore();
  
  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}

export default useAuth;
