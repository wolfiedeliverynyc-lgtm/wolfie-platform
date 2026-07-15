// src/hooks/useAuthGuard.ts
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AdminType } from '@/types';

interface AuthGuardOptions {
  allowedAdmins?: AdminType[];
  fallbackUrl?: string;
}

export function useAuthGuard(options: AuthGuardOptions = {}) {
  const { allowedAdmins, fallbackUrl = '/' } = options;
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (allowedAdmins && user) {
        const hasAccess = user.admin_type && allowedAdmins.includes(user.admin_type);
        if (!hasAccess && user.admin_type !== 'super_admin') {
          // Redirect if not authorized, unless they are a super_admin
          router.push(fallbackUrl);
        }
      }
    }
  }, [isLoading, isAuthenticated, user, allowedAdmins, fallbackUrl, router]);

  return { isLoading, isAuthenticated, user };
}

export default useAuthGuard;
