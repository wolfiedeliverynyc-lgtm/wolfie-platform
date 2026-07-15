import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import CartItemCard from './CartItemCard';

export default function StickyCart({ onCheckoutProceed }) {
  const { cartItems, subtotal, deliveryFee, serviceFee, tax, total, tipAmount } = useCartStore();

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="glass-panel p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-neutral-500">
          <ShoppingBag size={24} />
        </div>
        <h3 className="font-bold text-lg mb-2">Your cart is hungry</h3>
        <p className="text-xs text-neutral-400">Add some premium burgers to get started.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel flex flex-col h-[calc(100vh-120px)] sticky top-24"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
        <h2 className="font-black text-xl flex items-center gap-2">
          <ShoppingBag className="text-amber-500" />
          <span>Your Order</span>
        </h2>
        <motion.span 
          key={totalItems}
          initial={{ scale: 1.5, color: '#D4AF37' }}
          animate={{ scale: 1, color: '#fff' }}
          className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold"
        >
          {totalItems} items
        </motion.span>
      </div>

      {/* Cart Items Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 checkout-scroll">
        <AnimatePresence initial={false}>
          {cartItems.map((item) => (
            <CartItemCard key={item.cartItemId} item={item} />
          ))}
        </AnimatePresence>
      </div>

      {/* Summary Footer */}
      <div className="p-6 border-t border-white/10 bg-black/40 shrink-0 space-y-4">
        {/* Promo Code */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Promo Code" 
              className="w-full dark-input py-2 pl-9 pr-4 rounded-2xl text-xs"
            />
          </div>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-colors">
            Apply
          </button>
        </div>

        {/* Fees breakdown */}
        <div className="space-y-2 text-xs font-medium text-neutral-400 pt-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-white">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span className="text-white">${deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Fee</span>
            <span className="text-white">${serviceFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Tax</span>
            <span className="text-white">${tax.toFixed(2)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-amber-500">
              <span>Courier Tip</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Total & CTA */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex justify-between items-end mb-4">
            <span className="font-bold text-neutral-300">Total</span>
            <motion.span 
              key={total + tipAmount}
              initial={{ scale: 1.1, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black gold-text"
            >
              ${(total + tipAmount).toFixed(2)}
            </motion.span>
          </div>

          <button 
            onClick={onCheckoutProceed}
            className="w-full btn-checkout-primary py-4 rounded-[2.5rem] flex items-center justify-center gap-2 text-sm"
          >
            Go to Checkout <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
