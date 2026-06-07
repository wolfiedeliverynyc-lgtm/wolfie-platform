import React from 'react';
import { Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DeliveryETA() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 mb-6 border-l-4 border-l-amber-500 flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
          <Clock size={20} />
        </div>
        <div>
          <h4 className="font-extrabold text-white text-sm">Delivery in 25-35 min</h4>
          <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
            <TrendingUp size={10} className="text-emerald-400" />
            Kitchen is running fast today
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
          Priority
        </span>
        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 w-3/4 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}
