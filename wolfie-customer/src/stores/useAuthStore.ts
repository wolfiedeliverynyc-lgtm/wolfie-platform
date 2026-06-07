import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Address, PaymentMethod } from '../lib/types';
import { INITIAL_ADDRESSES, INITIAL_PAYMENT_METHODS } from '../lib/data';

interface AuthState {
  userEmail: string;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  favorites: string[];
  history: string[];

  // Actions
  setSession: (email: string) => void;
  addAddress: (address: Omit<Address, 'id' | 'isDefault'>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  addPaymentMethod: (payment: Omit<PaymentMethod, 'id' | 'isDefault'>) => void;
  deletePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;
  toggleFavorite: (restaurantId: string) => void;
  addHistory: (restaurantId: string) => void;
  
  // Getters
  getDefaultAddress: () => Address | undefined;
  getDefaultPaymentMethod: () => PaymentMethod | undefined;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userEmail: 'wolfie_connoisseur@nyc.delivery',
      addresses: INITIAL_ADDRESSES,
      paymentMethods: INITIAL_PAYMENT_METHODS,
      favorites: ['rest_1', 'rest_4'],
      history: ['rest_2', 'rest_5'],

      setSession: (email) => set({ userEmail: email }),

      addAddress: (newAddr) => {
        const { addresses } = get();
        const isFirst = addresses.length === 0;
        const item: Address = {
          ...newAddr,
          id: `addr_${Date.now()}`,
          isDefault: isFirst
        };
        set({ addresses: [...addresses, item] });
      },

      deleteAddress: (id) => {
        set((state) => {
          const target = state.addresses.find((a) => a.id === id);
          let updated = state.addresses.filter((a) => a.id !== id);
          if (target?.isDefault && updated.length > 0) {
            updated[0] = { ...updated[0], isDefault: true };
          }
          return { addresses: updated };
        });
      },

      setDefaultAddress: (id) => {
        set((state) => ({
          addresses: state.addresses.map((a) => ({
            ...a,
            isDefault: a.id === id
          }))
        }));
      },

      addPaymentMethod: (newPay) => {
        const { paymentMethods } = get();
        const isFirst = paymentMethods.length === 0;
        const item: PaymentMethod = {
          ...newPay,
          id: `pay_${Date.now()}`,
          isDefault: isFirst
        };
        set({ paymentMethods: [...paymentMethods, item] });
      },

      deletePaymentMethod: (id) => {
        set((state) => {
          const target = state.paymentMethods.find((p) => p.id === id);
          let updated = state.paymentMethods.filter((p) => p.id !== id);
          if (target?.isDefault && updated.length > 0) {
            updated[0] = { ...updated[0], isDefault: true };
          }
          return { paymentMethods: updated };
        });
      },

      setDefaultPaymentMethod: (id) => {
        set((state) => ({
          paymentMethods: state.paymentMethods.map((p) => ({
            ...p,
            isDefault: p.id === id
          }))
        }));
      },

      toggleFavorite: (restaurantId) => {
        set((state) => {
          const isFav = state.favorites.includes(restaurantId);
          return {
            favorites: isFav
              ? state.favorites.filter((id) => id !== restaurantId)
              : [...state.favorites, restaurantId]
          };
        });
      },

      addHistory: (restaurantId) => {
        set((state) => {
          const filtered = state.history.filter((id) => id !== restaurantId);
          return { history: [restaurantId, ...filtered].slice(0, 10) }; // cap history at 10 items
        });
      },

      getDefaultAddress: () => {
        const { addresses } = get();
        return addresses.find((a) => a.isDefault) || addresses[0];
      },

      getDefaultPaymentMethod: () => {
        const { paymentMethods } = get();
        return paymentMethods.find((p) => p.isDefault) || paymentMethods[0];
      }
    }),
    {
      name: 'wolfie-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
