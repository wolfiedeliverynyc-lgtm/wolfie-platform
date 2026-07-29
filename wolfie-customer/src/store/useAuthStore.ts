import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Sentry from '@sentry/nextjs';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  dietary_preferences?: string[];
  allergy_preferences?: string[];
  profile_picture?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

// Helper for cross-tab logout messaging
const authChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('wolfie_auth')
  : null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        
        // Sentry Context & Breadcrumbs
        Sentry.setUser({ id: user.id, email: user.email, username: user.full_name });
        Sentry.setTag("user_role", "customer");
        Sentry.setTag("user_id", user.id);
        Sentry.addBreadcrumb({
          category: "auth",
          message: `User logged in: ${user.email}`,
          level: "info",
        });

        if (typeof window !== 'undefined') {
          // Set unified cookie (expires in 7 days)
          document.cookie = `wolfie_auth_token=${token}; path=/; max-age=604800; SameSite=Lax; Secure`;
          localStorage.setItem('wolfie_auth_user_id', user.id);
        }
      },
      
      logout: () => {
        const wasAuthenticated = get().isAuthenticated;
        
        // Sentry Context & Breadcrumbs
        Sentry.setUser(null);
        Sentry.addBreadcrumb({
          category: "auth",
          message: "User logged out",
          level: "info",
        });

        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          // Clear legacy local storage tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('wolfie_auth_token');
          localStorage.removeItem('wolfie_auth_user_id');
          localStorage.removeItem('wolfie-auth-storage');
          
          // Clear cookie
          document.cookie = 'wolfie_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

          // Clear Service Worker Caches
          if ('caches' in window) {
            caches.keys().then((names) => {
              return Promise.all(names.map((name) => caches.delete(name)));
            }).catch(() => {});
          }

          // Notify other tabs if logout initiated here
          if (wasAuthenticated && authChannel) {
            authChannel.postMessage({ type: 'LOGOUT' });
          }

          // Redirect to login
          window.location.href = '/login';
        }
      },

      updateUser: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null
      }))
    }),
    {
      name: 'wolfie-auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Listen to multi-tab logout events from other tabs
if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data?.type === 'LOGOUT') {
      const store = useAuthStore.getState();
      if (store.isAuthenticated) {
        store.logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
  };
}

