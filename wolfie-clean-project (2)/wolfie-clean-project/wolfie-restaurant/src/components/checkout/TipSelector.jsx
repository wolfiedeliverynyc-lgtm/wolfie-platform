import React from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartStore } from '../../store/useCartStore';

export default function TipSelector() {
  const { subtotal, tipAmount, setTipAmount } = useCartStore();

  // Preset percentages
  const presets = [
    { label: '15%', value: subtotal * 0.15 },
    { label: '20%', value: subtotal * 0.20 },
    { label: '25%', value: subtotal * 0.25 }
  ];

  // Also include a fixed custom logic if desired, for now let's just use presets + None
  
  return (
    <div className="glass-panel p-6 mb-6">
      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
        <Heart size={18} className="text-amber-500" /> 
        Courier Tip
      </h3>
      <p className="text-[11px] text-neutral-400 mb-4">
        100% of your tip goes directly to the courier. Drivers prioritize tipped deliveries ❤️
      </p>

      <div className="flex gap-3 mb-2">
        {presets.map((preset) => {
          const isSelected = Math.abs(tipAmount - preset.value) < 0.01;
          return (
            <motion.button
              key={preset.label}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTipAmount(preset.value)}
              className={`flex-1 py-3 rounded-[2.5rem] border flex flex-col items-center justify-center transition-all ${
                isSelected 
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                  : 'border-white/10 bg-white/5 text-white hover:border-white/30'
              }`}
            >
              <span className="font-black text-sm">{preset.label}</span>
              <span className="text-[10px] opacity-70">${preset.value.toFixed(2)}</span>
            </motion.button>
          );
        })}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTipAmount(0)}
          className={`flex-1 py-3 rounded-[2.5rem] border flex flex-col items-center justify-center transition-all ${
            tipAmount === 0 
              ? 'border-white/50 bg-white/10 text-white' 
              : 'border-white/10 bg-white/5 text-white hover:border-white/30'
          }`}
        >
          <span className="font-bold text-xs">Other</span>
        </motion.button>
      </div>
    </div>
  );
}
