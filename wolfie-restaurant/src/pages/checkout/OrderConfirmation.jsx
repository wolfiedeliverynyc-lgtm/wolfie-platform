import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, Navigation } from 'lucide-react';
import '../../styles/checkout.css';

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Order Received - Wolfie Burgers";
  }, []);

  return (
    <div className="checkout-container flex flex-col items-center justify-center min-h-screen text-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="glass-panel p-8 md:p-12 max-w-xl w-full z-10"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500"
        >
          <CheckCircle2 size={48} />
        </motion.div>

        <h1 className="text-3xl font-black uppercase gold-text mb-2">Order Confirmed!</h1>
        <p className="text-neutral-400 font-medium mb-8">
          The pack is preparing your feast. Order <span className="text-white font-bold">{orderId}</span>.
        </p>

        {/* Preparation Timeline Mock */}
        <div className="space-y-6 text-left mb-10 bg-black/40 p-6 rounded-[2.5rem] border border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Order Received</h4>
              <p className="text-xs text-neutral-500">Sent to kitchen</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 relative">
            <div className="absolute top-[-30px] left-4 w-[1px] h-6 bg-emerald-500/50" />
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 relative z-10 animate-pulse">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Preparing</h4>
              <p className="text-xs text-neutral-500">Grilling your patties</p>
            </div>
          </div>

          <div className="flex items-start gap-4 relative opacity-40">
            <div className="absolute top-[-30px] left-4 w-[1px] h-6 bg-white/10" />
            <div className="w-8 h-8 rounded-full border-2 border-white/10 flex items-center justify-center shrink-0 relative z-10 bg-[#111]">
              <MapPin size={14} className="text-neutral-500" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Out for Delivery</h4>
              <p className="text-xs text-neutral-500">Driver will be assigned soon</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="btn-cinematic w-full py-4 rounded-[2.5rem] font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2"
        >
          <Navigation size={18} className="text-amber-500" /> Track Order
        </button>
      </motion.div>
    </div>
  );
}
