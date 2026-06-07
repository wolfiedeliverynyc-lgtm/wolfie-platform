import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { ArrowUpRight, X, Clock, Settings, Wallet, Menu } from 'lucide-react';

// Pages
import Orders from './Orders';
import KitchenDisplay from './KitchenDisplay';
import MenuManagement from './MenuManagement';
import Analytics from './Analytics';
import FinanceDashboard from './Finance';
import SettingsPage from './SettingsPage';

export default function RestaurantDashboard() {
  const [selectedId, setSelectedId] = useState(null);
  const { metrics, orders } = useRestaurantStore();

  const handleClose = () => setSelectedId(null);

  // Data helpers
  const newOrdersCount = orders.filter((o) => o.status === 'new_order').length;

  const cardVariants = {
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#080808] text-[#e8dcc8] font-sans selection:bg-[#FF6129] selection:text-[#080808]">
      
      {/* Grid View */}
      <AnimatePresence>
        {!selectedId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full p-8 overflow-y-auto"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-12 mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" role="img" aria-label="wolf">🐺</span>
                  <h1 className="text-4xl font-light tracking-tight text-white">Wolfie <span className="font-bold text-[#FF6129]">OS</span></h1>
                </div>
                <div className="bg-[#0d0b09] border border-[rgba(255,97,41,0.12)] px-4 py-2 rounded-full text-xs tracking-[0.2em] uppercase text-[#FF6129]">
                  Connected
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-[280px]">
                
                {/* 0. User Profile */}
                <motion.div
                  layoutId="profile"
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedId('settings')}
                  className="col-span-1 md:col-span-1 relative overflow-hidden rounded-[2.5rem] bg-[#110f0c] border border-white/5 p-6 cursor-pointer group flex flex-col items-center justify-center"
                >
                  <div className="w-24 h-24 rounded-full bg-[#FF6129] mb-4 overflow-hidden border-4 border-[#080808] shadow-[0_0_20px_rgba(255,97,41,0.2)]">
                    <img src="https://i.pravatar.cc/150?u=louis" alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide">Louis Carter</h3>
                  <span className="bg-white/5 px-6 py-1.5 rounded-full text-[10px] uppercase tracking-widest text-[rgba(232,220,200,0.7)] border border-white/10 group-hover:bg-white/10 group-hover:text-white transition-colors">Edit Account</span>
                </motion.div>

                {/* 1. Analytics / Insights (Orange Glow) */}
                <motion.div
                  layoutId="analytics"
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedId('analytics')}
                  className="col-span-1 md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-[#0d0b09] border border-[rgba(255,97,41,0.08)] p-8 shadow-[0_0_50px_-12px_rgba(255,97,41,0.1)] cursor-pointer group"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(255,97,41,0.15)_0%,transparent_60%)] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-[rgba(232,220,200,0.75)] font-medium">Insights</span>
                      <div className="bg-white/5 px-3 py-1 rounded-full text-[10px] text-[rgba(232,220,200,0.5)] border border-white/10">Daily <span className="ml-1 opacity-50">v</span></div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#FF6129] mb-2">Revenue Growth</p>
                      <div className="text-7xl font-light text-white tracking-tighter flex justify-center items-start gap-1">
                        ${metrics.revenueToday.toLocaleString()}
                        <ArrowUpRight size={28} className="text-[#FF6129] mt-2" />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-0 w-full h-32 pointer-events-none opacity-80">
                      <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                        <path d="M0,80 L100,50 L200,20 L300,20 L400,40" fill="none" stroke="#FF6129" strokeWidth="2" />
                        <path d="M0,80 L100,50 L200,20 L300,20 L400,40 L400,100 L0,100 Z" fill="url(#grad-gold)" opacity="0.1" />
                        <defs>
                          <linearGradient id="grad-gold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF6129" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#FF6129" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </motion.div>

                {/* 2. Live Orders (Blue Glow) */}
                <motion.div
                  layoutId="orders"
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedId('orders')}
                  className="col-span-1 md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-[#0d0b09] border border-[#0284c7]/20 p-8 shadow-[0_0_50px_-12px_rgba(2,132,199,0.15)] cursor-pointer group"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(2,132,199,0.2)_0%,transparent_50%)] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-[rgba(232,220,200,0.75)] font-medium">Conversion</span>
                      <div className="bg-white/5 px-3 py-1 rounded-full text-[10px] text-[rgba(232,220,200,0.5)] border border-white/10">Daily <span className="ml-1 opacity-50">v</span></div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#38bdf8] mb-2">Live Orders</p>
                      <div className="text-7xl font-light text-white tracking-tighter flex justify-center items-start gap-1">
                        {metrics.ordersToday}
                        <ArrowUpRight size={28} className="text-[#38bdf8] mt-2" />
                      </div>
                    </div>
                    <div className="absolute bottom-8 left-0 w-full h-32 pointer-events-none opacity-80">
                      <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                        <path d="M0,70 C50,70 80,40 100,50 C130,65 170,80 200,40 C230,-10 270,-10 300,50 C330,100 370,50 400,60" fill="none" stroke="#38bdf8" strokeWidth="3" filter="drop-shadow(0 0 8px rgba(56,189,248,0.8))" />
                        <circle cx="200" cy="40" r="6" fill="#fff" filter="drop-shadow(0 0 10px #38bdf8)" />
                      </svg>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-3 mt-auto border border-white/10 flex justify-between items-center relative z-10">
                      <span className="text-[9px] text-[rgba(232,220,200,0.5)]">Orders set to rise this evening.</span>
                      <span className="text-[10px] text-[#e8dcc8]">Explore more +</span>
                    </div>
                  </div>
                </motion.div>

                {/* 3. KDS (Neon Green) */}
                <motion.div
                  layoutId="kds"
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedId('kds')}
                  className="relative overflow-hidden rounded-[2.5rem] bg-[#1a2e1a] p-8 shadow-[0_10px_40px_-10px_rgba(34,197,94,0.2)] cursor-pointer border border-[#22c55e]/30 group"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.4)_0%,transparent_70%)] pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity" />
                  <div className="relative z-10 flex flex-col h-full justify-between text-white">
                    <span className="text-sm font-bold tracking-wider">KDS</span>
                    <div className="text-center">
                      <span className="text-6xl font-black block">{newOrdersCount}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 mt-2 block">Pending Tickets</span>
                    </div>
                    <div className="text-[10px] text-center font-sans opacity-60">Open Kitchen View &rarr;</div>
                  </div>
                </motion.div>

                {/* 4. Menu Management (Solid Yellow style) */}
                <motion.div
                  layoutId="menu"
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedId('menu')}
                  className="relative overflow-hidden rounded-[2.5rem] bg-[#FF6129] p-8 text-[#080808] cursor-pointer shadow-[0_10px_40px_-10px_rgba(255,97,41,0.3)] group"
                >
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="text-sm font-bold tracking-wide">Menu</span>
                    <Menu size={18} />
                  </div>
                  <div className="flex flex-col items-center justify-center h-full relative z-10 -mt-4">
                    <span className="text-4xl font-black">Edit</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mt-1">Catalog & Prices</span>
                  </div>
                </motion.div>

                {/* 5. Finance (Dark grey) */}
                <motion.div
                  layoutId="finance"
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedId('finance')}
                  className="relative overflow-hidden rounded-[2.5rem] bg-[#110f0c] border border-white/5 p-8 cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4 text-[rgba(232,220,200,0.5)]">
                    <Wallet size={20} className="group-hover:text-white transition-colors" />
                  </div>
                  <div className="mt-auto">
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1 text-[rgba(232,220,200,0.5)]">Wallet</p>
                    <h3 className="text-3xl font-light text-white">$12,450</h3>
                  </div>
                </motion.div>

                {/* 6. Settings */}
                <motion.div
                  layoutId="settings"
                  variants={cardVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setSelectedId('settings')}
                  className="relative overflow-hidden rounded-[2.5rem] bg-[#110f0c] border border-white/5 p-8 cursor-pointer flex flex-col items-center justify-center group"
                >
                  <Settings size={32} className="text-[rgba(232,220,200,0.5)] group-hover:text-white group-hover:rotate-90 transition-all duration-500 mb-4" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[rgba(232,220,200,0.7)]">Settings</span>
                </motion.div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Page View */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            layoutId={selectedId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="absolute inset-0 z-50 bg-[#080808] flex flex-col"
          >
            {/* Expanded Header / Back Button */}
            <div className="h-20 px-8 flex items-center justify-between shrink-0 border-b border-[rgba(255,97,41,0.1)] bg-[#0d0b09]/80 backdrop-blur-md">
              <button
                onClick={handleClose}
                className="flex items-center gap-2 text-sm font-medium text-[rgba(232,220,200,0.7)] hover:text-white transition-colors uppercase tracking-[0.2em]"
              >
                <X size={20} /> Back to Hub
              </button>
              <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#FF6129]">
                Wolfie OS
              </div>
            </div>

            {/* Render actual component */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              {selectedId === 'orders' && <Orders />}
              {selectedId === 'kds' && <KitchenDisplay />}
              {selectedId === 'menu' && <MenuManagement />}
              {selectedId === 'analytics' && <Analytics />}
              {selectedId === 'finance' && <FinanceDashboard />}
              {selectedId === 'settings' && <SettingsPage />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
