import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, MenuItem, MenuItemCustomization } from '../lib/types';

interface CartState {
  cart: CartItem[];
  cartNote: string;
  
  // Actions
  addItem: (
    item: MenuItem, 
    restaurantId: string, 
    customization?: MenuItemCustomization, 
    quantity?: number,
    force?: boolean
  ) => { success: boolean; requiresConfirm: boolean };
  removeItem: (item: MenuItem, restaurantId: string, customization?: MenuItemCustomization) => void;
  clearCart: () => void;
  setCartNote: (note: string) => void;
  
  // Helpers
  getCartSubtotal: () => number;
  getTotalCount: () => number;
}

export const getCartItemPrice = (ci: CartItem) => {
  let price = ci.menuItem.price;
  if (ci.customization) {
    if (ci.customization.size) price += ci.customization.size.price;
    if (ci.customization.side) price += ci.customization.side.price;
    if (ci.customization.addons) {
      price += ci.customization.addons.reduce((sum, add) => sum + add.price, 0);
    }
  }
  return price;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      cartNote: '',

      addItem: (item, restaurantId, customization, quantity = 1, force = false) => {
        const { cart } = get();

        // Check if adding from a different restaurant
        if (cart.length > 0 && cart[0].restaurantId !== restaurantId) {
          if (!force) {
            return { success: false, requiresConfirm: true };
          }
          // Force reset cart with new item
          const cartItemId = customization ? `${item.id}_${Date.now()}` : item.id;
          const newItem: CartItem = {
            cartItemId,
            menuItem: item,
            quantity,
            restaurantId,
            customization
          };
          set({ cart: [newItem], cartNote: '' });
          return { success: true, requiresConfirm: false };
        }

        // Find existing matching item (match ID and customizations stringified)
        const existingIndex = cart.findIndex((ci) => {
          if (ci.menuItem.id !== item.id) return false;
          if (!ci.customization && !customization) return true;
          if (JSON.stringify(ci.customization) === JSON.stringify(customization)) return true;
          return false;
        });

        let updatedCart = [...cart];

        if (existingIndex > -1) {
          const existing = cart[existingIndex];
          updatedCart[existingIndex] = {
            ...existing,
            quantity: existing.quantity + (customization ? quantity : 1)
          };
        } else {
          const cartItemId = customization ? `${item.id}_${Date.now()}` : item.id;
          updatedCart.push({
            cartItemId,
            menuItem: item,
            quantity,
            restaurantId,
            customization
          });
        }

        set({ cart: updatedCart });
        return { success: true, requiresConfirm: false };
      },

      removeItem: (item, restaurantId, customization) => {
        const { cart } = get();
        const existingIndex = cart.findIndex((ci) => {
          if (ci.menuItem.id !== item.id) return false;
          if (!ci.customization && !customization) return true;
          if (JSON.stringify(ci.customization) === JSON.stringify(customization)) return true;
          return false;
        });

        if (existingIndex === -1) return;

        let updatedCart = [...cart];
        const existing = cart[existingIndex];

        if (existing.quantity > 1) {
          updatedCart[existingIndex] = {
            ...existing,
            quantity: existing.quantity - 1
          };
        } else {
          updatedCart = updatedCart.filter((_, idx) => idx !== existingIndex);
        }

        set({ cart: updatedCart });
      },

      clearCart: () => set({ cart: [], cartNote: '' }),
      setCartNote: (note) => set({ cartNote: note }),

      getCartSubtotal: () => {
        return get().cart.reduce((acc, curr) => acc + getCartItemPrice(curr) * curr.quantity, 0);
      },

      getTotalCount: () => {
        return get().cart.reduce((acc, curr) => acc + curr.quantity, 0);
      }
    }),
    {
      name: 'wolfie-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
