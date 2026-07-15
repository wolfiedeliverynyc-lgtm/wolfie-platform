import React, { useState } from 'react';
import { CreditCard, Wallet, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSection() {
  const [selectedMethod, setSelectedMethod] = useState('card');

  return (
    <div className="glass-panel p-6 mb-6">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <CreditCard size={18} className="text-amber-500" /> 
        Payment Method
      </h3>

      <div className="space-y-3">
        {/* Apple Pay Mock */}
        <label 
          className={`flex items-center gap-4 p-4 rounded-[2.5rem] border cursor-pointer transition-all ${
            selectedMethod === 'applepay' ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <input 
            type="radio" 
            name="payment" 
            checked={selectedMethod === 'applepay'} 
            onChange={() => setSelectedMethod('applepay')}
            className="w-4 h-4 accent-amber-500"
          />
          <Smartphone size={24} className="text-white" />
          <span className="font-bold">Apple Pay</span>
        </label>

        {/* Card Mock */}
        <div 
          className={`border rounded-[2.5rem] overflow-hidden transition-all ${
            selectedMethod === 'card' ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <label className="flex items-center gap-4 p-4 cursor-pointer">
            <input 
              type="radio" 
              name="payment" 
              checked={selectedMethod === 'card'} 
              onChange={() => setSelectedMethod('card')}
              className="w-4 h-4 accent-amber-500"
            />
            <CreditCard size={24} className="text-white" />
            <span className="font-bold">Credit / Debit Card</span>
          </label>
          
          {/* Card Form expansion */}
          {selectedMethod === 'card' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-4 pb-4 space-y-4"
            >
              <input 
                type="text" 
                placeholder="Card Number" 
                className="w-full dark-input py-3 px-4 rounded-[2.5rem] text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="MM/YY" 
                  className="w-full dark-input py-3 px-4 rounded-[2.5rem] text-sm"
                />
                <input 
                  type="text" 
                  placeholder="CVC" 
                  className="w-full dark-input py-3 px-4 rounded-[2.5rem] text-sm"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Wallet Mock */}
        <label 
          className={`flex items-center gap-4 p-4 rounded-[2.5rem] border cursor-pointer transition-all ${
            selectedMethod === 'wallet' ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <input 
            type="radio" 
            name="payment" 
            checked={selectedMethod === 'wallet'} 
            onChange={() => setSelectedMethod('wallet')}
            className="w-4 h-4 accent-amber-500"
          />
          <Wallet size={24} className="text-white" />
          <div className="flex-1">
            <span className="font-bold block">Wolfie Wallet Credits</span>
            <span className="text-[10px] text-neutral-400">Available: $0.00</span>
          </div>
        </label>
      </div>
    </div>
  );
}
