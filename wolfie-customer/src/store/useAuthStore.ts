import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  dietary_preferences?: string[];
  allergy_preferences?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
          localStorage.setItem('wolfie_auth_token', token);
          localStorage.setItem('wolfie_auth_user_id', user.id);
          // Set cookie for middleware access (expires in 7 days)
          const maxAge = 7 * 24 * 60 * 60;
          document.cookie = `wolfie_auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
        }
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('wolfie_auth_token');
          localStorage.removeItem('wolfie_auth_user_id');
          // Clear cookie for middleware
          document.cookie = 'wolfie_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }
      },

      updateUser: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null
      }))
    }),
    {
      name: 'wolfie-auth-storage', // name of item in the storage (must be unique)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated, token: state.token }),
    }
  )
);
