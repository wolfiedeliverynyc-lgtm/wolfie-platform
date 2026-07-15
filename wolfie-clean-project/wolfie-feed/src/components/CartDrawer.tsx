import { X, Minus, Plus, ShoppingBag, Trash2, ChevronRight } from 'lucide-react';
import { CartItem } from '../types';

interface Props {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ cart, onClose, onUpdateQty, onCheckout }: Props) {
  const subtotal = cart.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
  const deliveryFee = cart.length > 0 ? 2.00 : 0;
  const tax = subtotal * 0.088;
  const total = subtotal + deliveryFee + tax;

  // Group by restaurant
  const byRestaurant = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
    const key = item.restaurant.id;
    return { ...acc, [key]: [...(acc[key] || []), item] };
  }, {});

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-[80] glass rounded-t-3xl max-w-lg mx-auto flex flex-col"
        style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="drag-handle mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#FF6B00]" />
            <h3 className="text-white font-bold text-base">My Cart</h3>
            {cart.length > 0 && (
              <span className="gradient-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            id="cart-close-btn"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass-light"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
              <div className="w-20 h-20 rounded-full glass-light flex items-center justify-center">
                <ShoppingBag size={36} className="text-white/30" />
              </div>
              <p className="text-white font-semibold text-lg">Your cart is empty</p>
              <p className="text-white/40 text-sm text-center">Scroll your feed and add dishes you love!</p>
              <button
                onClick={onClose}
                className="btn-order px-6 py-2.5 rounded-2xl text-white font-semibold text-sm mt-2"
              >
                Explore Feed
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-5">
              {Object.entries(byRestaurant).map(([restId, items]) => {
                const rest = items[0].restaurant;
                return (
                  <div key={restId}>
                    {/* Restaurant label */}
                    <div className="flex items-center gap-2 mb-3">
                      <img src={rest.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-white/60 text-sm font-medium">{rest.name}</span>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img
                            src={item.menuItem.image}
                            alt={item.menuItem.name}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{item.menuItem.name}</p>
                            <p className="text-[#FF6B00] font-semibold text-sm mt-0.5">
                              ${(item.menuItem.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          {/* Qty controls */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              id={`cart-minus-${item.id}`}
                              onClick={() => onUpdateQty(item.id, -1)}
                              className="w-7 h-7 rounded-full glass-light flex items-center justify-center active:scale-90 transition-transform"
                            >
                              {item.quantity === 1
                                ? <Trash2 size={12} className="text-red-400" />
                                : <Minus size={12} className="text-white" />
                              }
                            </button>
                            <span className="text-white font-semibold text-sm w-4 text-center">{item.quantity}</span>
                            <button
                              id={`cart-plus-${item.id}`}
                              onClick={() => onUpdateQty(item.id, +1)}
                              className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center active:scale-90 transition-transform"
                            >
                              <Plus size={12} className="text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Order summary */}
              <div className="glass-light rounded-2xl p-4 space-y-2 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal</span>
                  <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">🐺 Wolfie Delivery</span>
                  <span className="text-green-400 font-medium">${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Tax</span>
                  <span className="text-white font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="h-px bg-white/10 my-1" />
                <div className="flex justify-between">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-[#FF6B00] font-bold text-lg">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checkout CTA */}
        {cart.length > 0 && (
          <div className="px-4 py-3 border-t border-white/8">
            <button
              id="checkout-btn"
              onClick={onCheckout}
              className="btn-order w-full py-3.5 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
