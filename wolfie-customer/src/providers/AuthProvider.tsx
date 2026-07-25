'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist to hydration
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => {
      unsub();
    };
  }, []);

  // Monitor network connectivity to verify active sessions on reconnect
  useEffect(() => {
    if (!isHydrated) return;

    const handleOnline = () => {
      // Check if auth token cookie is missing when we reconnect
      const tokenExists = document.cookie.includes('wolfie_auth_token=');
      const store = useAuthStore.getState();
      if (store.isAuthenticated && !tokenExists) {
        console.warn('[AuthProvider] Connection restored, but session has expired. Logging out.');
        store.logout();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isHydrated]);

  // Prevent rendering until hydration is complete to avoid hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return <>{children}</>;
}
