import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  cartId: string; // Unique ID for the cart line item
  foodItem: {
    id: string;
    name: string;
    image: string;
    price: number;
    restaurantId: string;
    restaurantName: string;
  };
  quantity: number;
  size: 'S' | 'M' | 'L';
  toppings: string[];
  addons: string[];
  drinks: string[];
  spicy: number;
  pricePerUnit: number; // Includes the base price + selected options
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  
  addItem: (item: CartItem) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Computed (getters)
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,

      addItem: (item) => set((state) => {
        // Enforce single restaurant per cart logic
        if (state.restaurantId && state.restaurantId !== item.foodItem.restaurantId && state.items.length > 0) {
          // If trying to add from a different restaurant, we clear the cart first
          // Or throw an error. For now, we auto-clear and replace.
          return {
            items: [item],
            restaurantId: item.foodItem.restaurantId
          };
        }

        // Check if identical item (same ID, same options) exists to merge quantity
        const existingIndex = state.items.findIndex(i => 
          i.foodItem.id === item.foodItem.id &&
          i.size === item.size &&
          i.spicy === item.spicy &&
          JSON.stringify(i.toppings) === JSON.stringify(item.toppings) &&
          JSON.stringify(i.addons) === JSON.stringify(item.addons) &&
          JSON.stringify(i.drinks) === JSON.stringify(item.drinks)
        );

        if (existingIndex >= 0) {
          const newItems = [...state.items];
          newItems[existingIndex].quantity += item.quantity;
          return { items: newItems, restaurantId: item.foodItem.restaurantId };
        }

        return { 
          items: [...state.items, item],
          restaurantId: item.foodItem.restaurantId
        };
      }),

      removeItem: (cartId) => set((state) => {
        const newItems = state.items.filter(item => item.cartId !== cartId);
        return {
          items: newItems,
          restaurantId: newItems.length === 0 ? null : state.restaurantId
        };
      }),

      updateQuantity: (cartId, quantity) => set((state) => ({
        items: state.items.map(item => 
          item.cartId === cartId ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      })),

      clearCart: () => set({ items: [], restaurantId: null }),

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      }
    }),
    {
      name: 'wolfie-cart-storage'
    }
  )
);
