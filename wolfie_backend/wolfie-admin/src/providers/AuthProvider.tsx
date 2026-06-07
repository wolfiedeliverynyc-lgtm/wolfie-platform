// src/providers/AuthProvider.tsx
"use client";
import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/types';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading, initialize, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Run initialization on mount
    initialize();

    // Listen for session expiry event from Axios interceptor
    const handleSessionExpired = () => {
      logout();
      router.push('/login');
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, [initialize, logout, router]);

  // Protected route checking
  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = pathname === '/login';
      if (!isAuthenticated && !isPublicPath) {
        // Optional: Redirect to login if user is not authenticated.
        // For a demonstration dashboard, you might want to skip redirection or allow mock mode.
        // We will do a soft-check here; we can let the developer decide or hook up a strict guard.
      } else if (isAuthenticated && isPublicPath) {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
