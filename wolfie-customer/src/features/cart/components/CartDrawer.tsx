'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Trash2, Plus, Minus, ArrowRight, Clipboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore, getCartItemPrice } from '../../../stores/useCartStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useRealtimeStore } from '../../../stores/useRealtimeStore';
import { RESTAURANTS } from '../../../lib/data';
import { restaurantApi } from '../../../services/api';
import PaymentModal from '../../checkout/components/PaymentModal';

export default function CartDrawer() {
  const router = useRouter();
  const { cart, cartNote, removeItem, addItem, clearCart, setCartNote, getCartSubtotal, getTotalCount } = useCartStore();
  const { isCartDrawerOpen, setCartDrawerOpen, isCheckoutOpen, setCheckoutOpen } = useUiStore();
  const { startOrderSimulation } = useRealtimeStore();

  const { data: restaurants = [] } = useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantApi.getRestaurants,
  });

  const handleCheckoutTrigger = () => {
    if (cart.length === 0) return;
    setCartDrawerOpen(false);
    setCheckoutOpen(true);
  };

  const activeRestaurant = useMemo(() => {
    if (cart.length === 0) return null;
    const rId = cart[0].restaurantId;
    return restaurants.find((r) => r.id === rId) || RESTAURANTS.find((r) => r.id === rId) || null;
  }, [cart, restaurants]);

  const subtotal = getCartSubtotal();
  const totalCount = getTotalCount();

  return (
    <>
      {/* Cart Drawer Overlay */}
      <AnimatePresence>
        {isCartDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" id="cart-drawer-container">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartDrawerOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Drawer Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-[0_0_30px_rgba(0,0,0,0.15)] flex flex-col justify-between z-10 text-left font-sans"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between select-none">
                <div className="flex items-center space-x-3.5">
                  <div className="bg-[#FFF2ED] p-2 rounded-xl text-[#F15A24]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-md font-black text-slate-900 tracking-tight">Your Selections</h3>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">{totalCount} Item{totalCount !== 1 && 's'} in order</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-slate-400 hover:text-red-500 font-bold cursor-pointer transition-colors"
                      title="Clear All Selections"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setCartDrawerOpen(false)}
                    className="p-2 bg-slate-55 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center border border-slate-105"
                    title="Close Drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-none">
                {cart.length === 0 ? (
                  <div className="text-center py-20 select-none">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-black text-slate-700">Settle your cravings!</h4>
                    <p className="text-xs text-slate-400 font-bold max-w-[220px] mx-auto mt-2 leading-relaxed">
                      Add artisan ramen, woodfired pizzas or custom gelato to fill your box.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((ci) => {
                      const itemPrice = getCartItemPrice(ci);
                      const hasAddons = ci.customization && (
                        ci.customization.size.price > 0 ||
                        ci.customization.side.price > 0 ||
                        (ci.customization.addons && ci.customization.addons.length > 0)
                      );

                      return (
                        <div
                          key={ci.cartItemId}
                          className="flex items-start justify-between border-b border-slate-50 pb-4 w-full"
                        >
                          {/* Item details */}
                          <div className="flex items-start space-x-4 max-w-[70%]">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 shadow-xs">
                              <img
                                src={ci.menuItem.image}
                                alt={ci.menuItem.name}
                                className="w-full h-full object-cover select-none"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="text-left">
                              <h4 className="text-xs font-black text-slate-800 tracking-tight leading-tight">
                                {ci.menuItem.name}
                              </h4>
                              
                              {/* Customization Details */}
                              {hasAddons && ci.customization && (
                                <div className="mt-1 space-y-0.5 select-none">
                                  {ci.customization.size.name && (
                                    <span className="text-[9px] text-slate-400 font-bold block">
                                      Size: {ci.customization.size.name} (+${ci.customization.size.price})
                                    </span>
                                  )}
                                  {ci.customization.side.name && ci.customization.side.name !== 'None' && (
                                    <span className="text-[9px] text-slate-400 font-bold block">
                                      Side: {ci.customization.side.name} (+${ci.customization.side.price})
                                    </span>
                                  )}
                                  {ci.customization.addons && ci.customization.addons.length > 0 && (
                                    <span className="text-[9px] text-slate-400 font-bold block truncate max-w-[200px]">
                                      Addons: {ci.customization.addons.map((a) => a.name).join(', ')}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <span className="text-xs font-extrabold text-[#F15A24] font-mono mt-1 block">
                                ${(itemPrice * ci.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Adjust quantities */}
                          <div className="flex items-center space-x-1.5 p-1 bg-slate-50 border border-slate-100 rounded-full">
                            <button
                              onClick={() => removeItem(ci.menuItem, ci.restaurantId, ci.customization)}
                              className="w-6 h-6 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                            >
                              <Minus className="w-2.5 h-2.5 text-slate-550" />
                            </button>
                            <span className="text-xs font-mono font-black text-slate-855 min-w-[14px] text-center">
                              {ci.quantity}
                            </span>
                            <button
                              onClick={() => addItem(ci.menuItem, ci.restaurantId, ci.customization, 1, true)}
                              className="w-6 h-6 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                            >
                              <Plus className="w-2.5 h-2.5 text-[#F15A24]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Order Notes */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center space-x-2 text-xs font-black text-slate-500 mb-2 uppercase tracking-wider">
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Chef Delivery Notes</span>
                      </div>
                      <textarea
                        placeholder="Gate code, allergies, or dropoff details..."
                        value={cartNote}
                        onChange={(e) => setCartNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-300 focus:bg-white transition-all min-h-[70px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Subtotal / Checkout trigger */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 space-y-4 shrink-0 select-none">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Subtotal</span>
                    <span className="text-lg font-black text-slate-900 font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <button
                    onClick={handleCheckoutTrigger}
                    className="w-full bg-[#F15A24] hover:bg-[#E04D1B] text-white py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-[0_8px_20px_rgba(241,90,36,0.25)] flex items-center justify-between transition-all cursor-pointer active:scale-98"
                  >
                    <span>Verify Checkout Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Portal Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && activeRestaurant && (
          <PaymentModal
            restaurant={activeRestaurant}
            onClose={() => setCheckoutOpen(false)}
            onPlaceOrder={(address, payment, notes) => {
              // Trigger order simulation state
              const checkoutOrder = {
                id: `ord_${Math.floor(Math.random() * 90000) + 10000}`,
                restaurant: activeRestaurant,
                items: cart,
                subtotal: cart.reduce((acc, c) => acc + getCartItemPrice(c) * c.quantity, 0),
                deliveryFee: activeRestaurant.deliveryFee,
                serviceFee: parseFloat((cart.reduce((acc, c) => acc + getCartItemPrice(c) * c.quantity, 0) * 0.05).toFixed(2)),
                tax: parseFloat((cart.reduce((acc, c) => acc + getCartItemPrice(c) * c.quantity, 0) * 0.088).toFixed(2)),
                grandTotal: parseFloat((cart.reduce((acc, c) => acc + getCartItemPrice(c) * c.quantity, 0) + activeRestaurant.deliveryFee + (cart.reduce((acc, c) => acc + getCartItemPrice(c) * c.quantity, 0) * 0.05) + (cart.reduce((acc, c) => acc + getCartItemPrice(c) * c.quantity, 0) * 0.088)).toFixed(2)),
                address,
                paymentMethod: payment,
                status: 'placed' as const,
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                notes,
              };

              startOrderSimulation(checkoutOrder);
              clearCart(); // clear cart
              setCheckoutOpen(false);
              router.push('/tracking');
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
export type { CartItem } from '../../../lib/types';
