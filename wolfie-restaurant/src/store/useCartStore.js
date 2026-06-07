import { create } from 'zustand';

// Calculate order totals
const calculateTotals = (items) => {
  const subtotal = items.reduce((acc, item) => {
    let itemTotal = item.basePrice;
    
    // Add modifier prices
    if (item.selectedModifiers) {
      Object.values(item.selectedModifiers).forEach(modOptions => {
        modOptions.forEach(opt => {
          itemTotal += opt.price || 0;
        });
      });
    }

    // Add/subtract extra ingredients
    if (item.removedIngredients && item.removedIngredients.length > 0) {
      // Typically removed ingredients don't reduce price, but we could handle it if needed
    }
    
    return acc + (itemTotal * item.quantity);
  }, 0);

  const deliveryFee = subtotal > 0 ? 3.99 : 0;
  const serviceFee = subtotal * 0.15; // 15% service fee
  const tax = subtotal * 0.08875; // NY tax rate
  const total = subtotal + deliveryFee + serviceFee + tax;

  return { subtotal, deliveryFee, serviceFee, tax, total };
};

export const useCartStore = create((set, get) => ({
  cartItems: [],
  tipAmount: 0,
  promoCode: null,
  savings: 0,
  addressInfo: {
    street: '',
    apartment: '',
    instructions: 'Leave at door',
    coordinates: null
  },
  
  addToCart: (item) => set((state) => {
    // Generate a unique ID for the cart item (combining product ID + timestamp)
    const cartItemId = `${item.productId}-${Date.now()}`;
    const newItems = [...state.cartItems, { ...item, cartItemId, quantity: item.quantity || 1 }];
    return { cartItems: newItems, ...calculateTotals(newItems) };
  }),

  removeFromCart: (cartItemId) => set((state) => {
    const newItems = state.cartItems.filter(i => i.cartItemId !== cartItemId);
    return { cartItems: newItems, ...calculateTotals(newItems) };
  }),

  updateQuantity: (cartItemId, newQuantity) => set((state) => {
    if (newQuantity <= 0) {
      return get().removeFromCart(cartItemId);
    }
    const newItems = state.cartItems.map(i => 
      i.cartItemId === cartItemId ? { ...i, quantity: newQuantity } : i
    );
    return { cartItems: newItems, ...calculateTotals(newItems) };
  }),

  setTipAmount: (amount) => set({ tipAmount: amount }),
  
  setAddressInfo: (info) => set((state) => ({ 
    addressInfo: { ...state.addressInfo, ...info } 
  })),

  clearCart: () => set({
    cartItems: [],
    subtotal: 0,
    deliveryFee: 0,
    serviceFee: 0,
    tax: 0,
    total: 0,
    tipAmount: 0
  })
}));
