/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Address, PaymentMethod, CartItem, Restaurant } from '../types';
import { CreditCard, MapPin, Clipboard, ShieldCheck, ShoppingBag, ArrowRight, CheckCircle2, RefreshCw, X } from 'lucide-react';

interface PaymentModalProps {
  restaurant: Restaurant;
  cartItems: CartItem[];
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  onPlaceOrder: (address: Address, paymentMethod: PaymentMethod, notes: string) => void;
  onClose: () => void;
}

export default function PaymentModal({
  restaurant,
  cartItems,
  addresses,
  paymentMethods,
  onPlaceOrder,
  onClose,
}: PaymentModalProps) {
  // Form options selected
  const [selectedAddressId, setSelectedAddressId] = useState(addresses.find(a => a.isDefault)?.id || addresses[0]?.id || '');
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentMethods.find(p => p.isDefault)?.id || paymentMethods[0]?.id || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Payment micro state machine animation
  const [payState, setPayState] = useState<'review' | 'verifying' | 'ledger' | 'done'>('review');

  // Pricing calculations
  const getCartItemPrice = (ci: CartItem) => {
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

  const subtotal = cartItems.reduce((acc, curr) => acc + getCartItemPrice(curr) * curr.quantity, 0);
  const deliveryFee = restaurant.deliveryFee;
  const serviceFee = parseFloat((subtotal * 0.05).toFixed(2));
  const tax = parseFloat((subtotal * 0.088).toFixed(2));
  const grandTotal = parseFloat((subtotal + deliveryFee + serviceFee + tax).toFixed(2));

  const activeAddress = addresses.find(a => a.id === selectedAddressId) || addresses[0];
  const activePayment = paymentMethods.find(p => p.id === selectedPaymentId) || paymentMethods[0];

  const handleProcessOrder = () => {
    if (!activeAddress || !activePayment) return;
    setPayState('verifying');
  };

  useEffect(() => {
    if (payState === 'verifying') {
      const timer = setTimeout(() => {
        setPayState('ledger');
      }, 1600);
      return () => clearTimeout(timer);
    } else if (payState === 'ledger') {
      const timer = setTimeout(() => {
        setPayState('done');
      }, 1400);
      return () => clearTimeout(timer);
    } else if (payState === 'done') {
      const timer = setTimeout(() => {
        onPlaceOrder(activeAddress, activePayment, deliveryNotes);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [payState]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-md overflow-y-auto" id="checkout-drawer-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="w-full max-w-2xl bg-white border border-[#ECEFF2] rounded-3xl overflow-hidden shadow-2xl relative"
        id="payment-portal-card"
      >
        <AnimatePresence mode="wait">
          {payState === 'review' ? (
            <motion.div
              key="payment-review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 md:p-8 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 select-none">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-orange-50 text-[#F15A24] rounded-2xl border border-orange-100">
                    <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight font-sans">Secure Checkout</h3>
                    <p className="text-xs text-slate-400 font-bold font-sans mt-0.5">Order from {restaurant.name}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-800 p-2 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                  id="checkout-close-btn"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Core Layout split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side: Inputs selection */}
                <div className="space-y-5 text-slate-800">
                  {/* Choose Address node */}
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2.5">
                      Select Delivery Address
                    </label>
                    <div className="space-y-2">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-start p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                            selectedAddressId === addr.id
                              ? 'bg-orange-50/30 border-[#F15A24] text-slate-900'
                              : 'bg-slate-50/50 border-slate-200/60 hover:border-slate-350 text-slate-600'
                          }`}
                          id={`checkout-addr-option-${addr.id}`}
                        >
                          <input
                            type="radio"
                            name="checkout_address"
                            className="accent-[#F15A24] h-4 w-4 mt-0.5 cursor-pointer"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                          />
                          <div className="ml-3 text-xs">
                            <div className="font-black text-slate-850 leading-none">{addr.label}</div>
                            <div className="text-[11px] text-slate-400 font-bold mt-1.5 truncate max-w-[200px]">
                              {addr.street}, {addr.city}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Choose Payment node */}
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2.5">
                      Select Payment Source
                    </label>
                    <div className="space-y-2">
                      {paymentMethods.map((pay) => (
                        <label
                          key={pay.id}
                          className={`flex items-start p-3.5 rounded-2xl border cursor-pointer transition-all select-none ${
                            selectedPaymentId === pay.id
                              ? 'bg-orange-50/30 border-[#F15A24] text-slate-900'
                              : 'bg-slate-50/50 border-slate-200/60 hover:border-slate-350 text-slate-600'
                          }`}
                          id={`checkout-pay-option-${pay.id}`}
                        >
                          <input
                            type="radio"
                            name="checkout_payment"
                            className="accent-[#F15A24] h-4 w-4 mt-0.5 cursor-pointer"
                            checked={selectedPaymentId === pay.id}
                            onChange={() => setSelectedPaymentId(pay.id)}
                          />
                          <div className="ml-3 text-xs">
                            <div className="font-black text-slate-850 leading-none">{pay.label}</div>
                            <div className="text-[11px] text-slate-400 font-bold mt-1.5">
                              {pay.type === 'gpay' ? 'Digital linkage' : `Visa ending in •••• ${pay.lastFour}`}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Delivery instructions note */}
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2 flex items-center gap-1.5 select-none">
                      <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                      Rider instructions (Optional)
                    </label>
                    <textarea
                      placeholder="e.g., Leave at the door, building access code 482..."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-[#F5F5F7] text-slate-850 font-semibold text-xs p-3.5 rounded-2xl outline-none border-0 focus:ring-1 focus:ring-slate-200/50 transition-all placeholder-slate-450 font-sans"
                    />
                  </div>
                </div>

                {/* Right Side: Price Breakdown & final Action */}
                <div className="bg-[#FCFCFD] border border-[#ECEFF2] p-6 rounded-3xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100 pb-2.5 select-none">
                      Order Ledger Breakdown
                    </h4>

                    {/* Quick cart items scroller view */}
                    <div className="max-h-36 overflow-y-auto space-y-2 py-3 border-b border-slate-100/80 mb-4 scrollbar-none select-none">
                      {cartItems.map((item) => {
                        const unitPrice = getCartItemPrice(item);
                        return (
                          <div key={item.cartItemId || item.menuItem.id} className="flex flex-col text-xs text-slate-700 py-1.5 border-b border-slate-100/40 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center">
                              <span className="truncate max-w-[170px] font-black text-slate-800 font-sans">
                                {item.quantity}× {item.menuItem.name}
                              </span>
                              <span className="font-mono text-slate-900 font-bold">${(unitPrice * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.customization && (
                              <span className="text-[10px] font-semibold text-slate-400 mt-1 leading-tight font-sans block">
                                {item.customization.size.name} • {item.customization.side.name}
                                {item.customization.addons.length > 0 && ` • Addons: ${item.customization.addons.map(a => a.name).join(', ')}`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3 text-xs select-none">
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Items Subtotal</span>
                        <span className="font-sans font-black text-slate-800">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Courier Delivery</span>
                        <span className="font-sans font-black text-slate-800">${deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Service Fee (5%)</span>
                        <span className="font-sans font-black text-slate-800">${serviceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Local Tax (8.8%)</span>
                        <span className="font-sans font-black text-slate-800">${tax.toFixed(2)}</span>
                      </div>

                      <div className="border-t border-slate-100/90 pt-4 flex justify-between">
                        <span className="text-sm font-sans font-black text-slate-900">Total</span>
                        <span className="font-sans text-base font-black text-[#F15A24]">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 space-y-3.5">
                    <button
                      onClick={handleProcessOrder}
                      disabled={!selectedAddressId || !selectedPaymentId}
                      className="w-full flex items-center justify-center space-x-2 py-4 bg-[#F15A24] hover:bg-[#E04D1B] disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-sm tracking-wide rounded-2xl shadow-md active:scale-98 transition-all cursor-pointer"
                      id="btn-process-checkout"
                    >
                      <span>Authorize Secure Order</span>
                      <ArrowRight className="w-4 h-4 text-white/95" />
                    </button>

                    <div className="flex items-center justify-center space-x-1.5 text-[10px] font-bold text-slate-400 select-none">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 stroke-[2]" />
                      <span>Ledger Verified via Antigravity Secure Vault</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : payState === 'verifying' ? (
            <motion.div
              key="payment-verifying"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="p-10 md:p-14 text-center flex flex-col items-center justify-center space-y-6 h-[400px] text-slate-800 select-none"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-50 border-t-[#F15A24] animate-spin" />
                <CreditCard className="w-6 h-6 text-[#F15A24] absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-2.5 max-w-sm">
                <h4 className="text-lg font-black text-slate-900 tracking-tight font-sans">Authorizing Card Credentials</h4>
                <p className="text-xs text-slate-400 font-bold font-sans leading-relaxed">
                  Interfacing transaction payload with Visa token storage vaults for instant network clearing.
                </p>
              </div>
            </motion.div>
          ) : payState === 'ledger' ? (
            <motion.div
              key="payment-ledger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-10 md:p-14 text-center flex flex-col items-center justify-center space-y-6 h-[400px] text-slate-800 select-none"
            >
              <div className="relative">
                <RefreshCw className="w-14 h-14 text-slate-100 animate-spin animate-reverse animate-duration-3000" />
                <ShieldCheck className="w-6 h-6 text-emerald-500 absolute inset-0 m-auto stroke-[2]" />
              </div>
              <div className="space-y-2.5 max-w-sm">
                <h4 className="text-lg font-black text-slate-900 tracking-tight font-sans">Updating Order Ledger System</h4>
                <p className="text-xs text-slate-400 font-bold font-sans leading-relaxed">
                  Syncing dispatch coordinates and food prep ticket to the kitchen terminal for immediate chef alerts.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="payment-done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10 md:p-14 text-center flex flex-col items-center justify-center space-y-5 h-[400px] text-slate-800 select-none"
            >
              <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce stroke-[2]" />
              <div className="space-y-2">
                <h4 className="text-xl font-black text-slate-900 tracking-tight font-sans">Transaction Cleared!</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Active Dispatch ID: TXN-{Math.floor(Math.random() * 90000) + 10000}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
