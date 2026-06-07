'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShoppingBag,
  User,
  X,
  Settings,
  ArrowLeft,
  Heart,
  MapPin,
  Bike,
  Compass,
  Map,
  Plus
} from 'lucide-react';
import { useCartStore } from '../stores/useCartStore';
import { useUiStore } from '../stores/useUiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useRealtimeStore } from '../stores/useRealtimeStore';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Zustand State bindings
  const totalCartCount = useCartStore((s) => s.getTotalCount());
  const { 
    isHeaderMenuOpen, 
    setHeaderMenuOpen, 
    setCartDrawerOpen 
  } = useUiStore();
  const { userEmail, getDefaultAddress } = useAuthStore();
  const { activeOrder, addNotification } = useRealtimeStore();

  const defaultAddress = getDefaultAddress();
  const isRestaurantPage = pathname.startsWith('/restaurant/');
  const isRegisterPage = pathname === '/restaurant/new';

  return (
    <header className="sticky top-0 z-45 bg-white border-b border-slate-100 px-4 sm:px-10 py-5 flex items-center justify-between shadow-sm" id="master-header">
      <div className="flex items-center space-x-4">
        {/* Back button visible only on dynamic sub-routes */}
        {(isRestaurantPage || isRegisterPage || pathname !== '/') && (
          <button 
            onClick={() => router.push('/')}
            className="p-1 px-1.5 hover:bg-slate-50 rounded text-slate-800 transition-colors cursor-pointer flex items-center justify-center font-bold"
            title="Back to kitchens"
            id="btn-header-back"
          >
            <ArrowLeft className="w-5.5 h-5.5 text-slate-800 font-bold" />
          </button>
        )}

        {/* WOLFIE Branding and Logo */}
        <Link href="/" className="flex items-center space-x-2 cursor-pointer select-none">
          <svg className="w-6.5 h-6.5 text-[#F15A24] fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M4.5 10.5C5.88 10.5 7 9.38 7 8C7 6.62 5.88 5.5 4.5 5.5C3.12 5.5 2 6.62 2 8C2 9.38 3.12 10.5 4.5 10.5ZM9 7C10.38 7 11.5 5.88 11.5 4.5C11.5 3.12 10.38 2 9 2C7.62 2 6.5 3.12 6.5 4.5C6.5 5.88 7.62 7 9 7ZM15 7C16.38 7 17.5 5.88 17.5 4.5C17.5 3.12 16.38 2 15 2C13.62 2 12.5 3.12 12.5 4.5C12.5 5.88 13.62 7 15 7ZM19.5 10.5C20.88 10.5 22 9.38 22 8C22 6.62 20.88 5.5 19.5 5.5C18.12 5.5 17 6.62 17 8C17 9.38 18.12 10.5 19.5 10.5ZM17.2 11.5C16.3 11.1 14.55 10.8 12 10.8C9.45 10.8 7.7 11.1 6.8 11.5C5.25 12.2 4 14.2 4 16.5C4 20.1 7.6 23 12 23C16.4 23 20 20.1 20 16.5C20 14.2 18.75 12.2 17.2 11.5Z" />
          </svg>
          <span className="text-xl font-black tracking-widest text-[#1E293B] block leading-none">
            WOLFIE
          </span>
        </Link>
      </div>

      {/* Navigation links matching the mockup photo */}
      <nav className="hidden lg:flex items-center space-x-10 text-xs font-black tracking-wide text-slate-800">
        <Link href="/" className={`hover:text-[#F15A24] transition-colors cursor-pointer ${pathname === '/' ? 'text-[#F15A24] font-black' : 'text-slate-700 font-bold'}`}>
          Home
        </Link>
        <Link href="/restaurant/new" className={`hover:text-[#F15A24] transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF2ED] text-[#F15A24] rounded-xl border border-orange-100/60 ${pathname === '/restaurant/new' ? 'bg-[#F15A24] text-white border-transparent' : ''}`}>
          <Plus className="w-3.5 h-3.5" />
          <span>Register Restaurant</span>
        </Link>
        <button 
          onClick={() => {
            if (activeOrder) {
              router.push('/tracking');
            } else {
              addNotification('Status update 🔔', 'Zero orders active on dispatch lines. Checkout a plate first!', 'info');
            }
          }}
          className={`text-slate-600 hover:text-[#F15A24] font-bold transition-colors cursor-pointer ${pathname === '/tracking' ? 'text-[#F15A24] font-black' : ''}`}
        >
          Track Order
        </button>
        <button 
          onClick={() => router.push('/driver')}
          className={`hover:text-[#F15A24] transition-colors cursor-pointer flex items-center space-x-1.5 uppercase px-3 py-1.5 bg-[#111827] text-white rounded-xl hover:bg-[#F15A24] text-[10px] font-black tracking-widest ${pathname === '/driver' ? 'bg-[#F15A24]' : ''}`}
          title="Sleek Driver Companion App"
        >
          <span className="relative flex h-1.5 w-1.5 bg-emerald-400 rounded-full">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>Driver App</span>
        </button>
      </nav>

      {/* Location Picker and Shopping Cart Drawer trigger */}
      <div className="flex items-center space-x-4">
        {/* Deliver Location Coordinates */}
        <div 
          onClick={() => router.push('/profile')}
          className="hidden md:flex items-center space-x-1.5 bg-[#FFF2ED] hover:bg-[#FFE6DC] text-[#F15A24] text-[11px] font-black tracking-wider uppercase p-2 px-4 rounded-full shadow-sm cursor-pointer transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{mounted && defaultAddress ? defaultAddress.city : 'New York, NY'}</span>
          <span className="text-[9px] font-light leading-none ml-1">▼</span>
        </div>

        {/* Shopping Cart Icon trigger */}
        <button
          onClick={() => setCartDrawerOpen(true)}
          className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-700 relative transition-all active:scale-95 shadow-sm cursor-pointer"
          id="floating-cart-btn"
        >
          <ShoppingBag className="w-4.5 h-4.5 text-slate-800" />
          {mounted && totalCartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#F15A24] text-white font-mono font-extrabold text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
              {totalCartCount}
            </span>
          )}
        </button>

        {/* Global Configuration dropdown selector */}
        <div className="relative">
          <button
            onClick={() => {
              setHeaderMenuOpen(!isHeaderMenuOpen);
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
              isHeaderMenuOpen 
                ? 'bg-[#F15A24]/10 border-[#F15A24]/30 text-[#F15A24] shadow-[0_4px_12px_rgba(241,90,36,0.12)]' 
                : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100 hover:shadow-sm'
            }`}
            title="Account & Workspace Settings"
          >
            <motion.div
              animate={{ rotate: isHeaderMenuOpen ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              {isHeaderMenuOpen ? (
                <X className="w-5 h-5 text-[#F15A24] stroke-[2.5]" />
              ) : (
                <Settings className="w-5 h-5 stroke-[2.2] text-slate-700" />
              )}
            </motion.div>
          </button>

          {/* Suspended Settings Menu Dropdown */}
          <AnimatePresence>
            {isHeaderMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4.5 shadow-[0_15px_40px_rgba(0,0,0,0.08)] z-50 font-sans"
              >
                <div className="flex items-center space-x-3 pb-3 mb-3 border-b border-slate-100/70 select-none">
                  <span className="text-lg leading-none">⚙️</span>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Quick Settings</h4>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Control center options</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      router.push('/profile');
                      setHeaderMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-600 hover:text-[#F15A24] cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>Client Account</span>
                  </button>

                  <button
                    onClick={() => {
                      if (activeOrder) {
                        router.push('/tracking');
                      } else {
                        addNotification('Status update 🔔', 'Zero orders active on dispatch lines. Checkout a plate first!', 'info');
                      }
                      setHeaderMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-600 hover:text-[#F15A24] cursor-pointer"
                  >
                    <Map className="w-4 h-4 text-emerald-500" />
                    <span>Track Orders</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/driver');
                      setHeaderMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-600 hover:text-[#F15A24] cursor-pointer"
                  >
                    <Bike className="w-4 h-4 text-amber-500" />
                    <span className="flex items-center gap-1.5">
                      <span>Driver Companion App</span>
                      <span className="bg-emerald-505 w-1.5 h-1.5 rounded-full animate-ping" />
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/restaurant/new');
                      setHeaderMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left text-xs font-bold text-slate-600 hover:text-[#F15A24] cursor-pointer border-t border-slate-50 pt-2"
                  >
                    <Plus className="w-4 h-4 text-indigo-500" />
                    <span>Register Restaurant</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
