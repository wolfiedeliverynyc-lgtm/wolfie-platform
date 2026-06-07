/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Heart, Clock, MapPin, Flame, Gift, Sparkles, Filter, Sliders, Search, Menu } from 'lucide-react';

interface FoodFilterItem {
  id: string;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface FoodFilterSidebarProps {
  activeFilter: string | null;
  onFilterChange: (id: string | null) => void;
  favoritesCount: number;
}

export default function FoodFilterSidebar({
  activeFilter,
  onFilterChange,
  favoritesCount,
}: FoodFilterSidebarProps) {
  const filterItems: FoodFilterItem[] = [
    {
      id: 'favorite',
      label: 'Favorites',
      emoji: '💖',
      icon: <Heart className="w-5 h-5" />,
      color: 'from-rose-400 to-pink-500',
      description: 'Your loved kitchens',
    },
    {
      id: 'history',
      label: 'History',
      emoji: '🕒',
      icon: <Clock className="w-5 h-5" />,
      color: 'from-blue-400 to-indigo-500',
      description: 'Recent orders',
    },
    {
      id: 'closest',
      label: 'Closest',
      emoji: '📍',
      icon: <MapPin className="w-5 h-5" />,
      color: 'from-emerald-400 to-teal-500',
      description: 'Fast active delivery',
    },
    {
      id: 'best_seller',
      label: 'Best Seller',
      emoji: '🔥',
      icon: <Flame className="w-5 h-5" />,
      color: 'from-amber-400 to-orange-500',
      description: 'Top culinary hits',
    },
    {
      id: 'promos',
      label: 'Promos',
      emoji: '🎁',
      icon: <Gift className="w-5 h-5" />,
      color: 'from-purple-400 to-violet-500',
      description: 'Free delivery & codes',
    },
  ];

  return (
    <div 
      className="w-full lg:w-24 shrink-0 font-sans" 
      id="food-filter-sidebar-container"
    >
      {/* DESKTOP VIEW: Sleek vertical menu bar on the left (matches uploaded style) */}
      <div className="hidden lg:flex flex-col items-center py-8 bg-[#FFD54F] rounded-[2.5rem] shadow-[0_15px_45px_rgba(241,179,36,0.18)] border border-amber-300/40 relative min-h-[580px] w-20 overflow-visible select-none sticky top-28">
        
        {/* Top Header Decor: Custom Three-Stripe Menu and Search */}
        <div className="flex flex-col items-center space-y-4 mb-10">
          <button 
            onClick={() => onFilterChange(null)}
            className="w-12 h-12 bg-amber-400/30 hover:bg-amber-400/50 rounded-2xl flex items-center justify-center text-slate-900 transition-colors active:scale-95 cursor-pointer"
            title="Show All Kitchens"
          >
            <Menu className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          <button 
            className="w-12 h-12 bg-amber-400/30 hover:bg-amber-400/50 rounded-2xl flex items-center justify-center text-slate-900 transition-colors active:scale-95 cursor-pointer"
            title="Instant Search"
            onClick={() => {
              const el = document.querySelector('input[placeholder*="Search for restaurants"]');
              if (el) (el as HTMLElement).focus();
            }}
          >
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Central Filter Buttons */}
        <div className="flex flex-col items-center space-y-7 w-full relative">
          {filterItems.map((item) => {
            const isActive = activeFilter === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onFilterChange(isActive ? null : item.id)}
                className="group relative w-full flex items-center justify-center py-2 cursor-pointer outline-none"
                title={`${item.label}: ${item.description}`}
                id={`sidebar-filter-${item.id}`}
              >
                {/* Visual active notch outline indicator container */}
                {isActive && (
                  <motion.div
                    layoutId="activeNotch"
                    className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-l-full flex items-center justify-center"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  >
                    {/* SVG Curve for seamless notch match image */}
                    <div className="absolute top-[-16px] right-0 w-4 h-4 bg-[#FFD54F]">
                      <div className="w-full h-full bg-white rounded-br-full" />
                    </div>
                    
                    {/* Inner active dot arc line */}
                    <div className="w-2.5 h-6 bg-white rounded-l-full border-l-2 border-amber-400" />

                    <div className="absolute bottom-[-16px] right-0 w-4 h-4 bg-[#FFD54F]">
                      <div className="w-full h-full bg-white rounded-tr-full" />
                    </div>
                  </motion.div>
                )}

                {/* Main animated emoji/icon container */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.25 : 1,
                    y: isActive ? -4 : 0,
                  }}
                  whileHover={{ scale: 1.15, y: -2 }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center relative transition-shadow ${
                    isActive
                      ? 'bg-white text-[#F15A24] shadow-[0_8px_20px_rgba(241,90,36,0.15)] z-20'
                      : 'text-slate-800 hover:bg-amber-400/30'
                  }`}
                >
                  <span className="text-2xl filter drop-shadow-sm select-none">{item.emoji}</span>

                  {/* Tiny counter badge for Favorites */}
                  {item.id === 'favorite' && favoritesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#FFD54F]">
                      {favoritesCount}
                    </span>
                  )}
                </motion.div>

                {/* Floating tooltips displaying filter details */}
                <div className="absolute left-18 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 z-50 bg-[#1E293B] text-white text-[10px] font-bold p-2.5 rounded-xl whitespace-nowrap shadow-lg">
                  <div className="flex items-center space-x-1.5">
                    <span>{item.emoji}</span>
                    <span className="uppercase tracking-wider font-extrabold">{item.label}</span>
                  </div>
                  <p className="text-[9px] text-slate-300 font-normal mt-0.5">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Filter/Slider Utilities Icon matches image footer */}
        <div className="mt-auto pt-8">
          <button 
            onClick={() => onFilterChange(null)}
            className="w-12 h-12 bg-amber-400/30 hover:bg-amber-400/50 rounded-2xl flex items-center justify-center text-slate-900 transition-colors active:scale-95 cursor-pointer"
            title="Reset Filters"
          >
            <Sliders className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* MOBILE & TABLET VIEW: Horizontal responsive filter bar on top of lists */}
      <div 
        className="flex lg:hidden flex-col space-y-3 w-full p-4 bg-amber-50/80 backdrop-blur-md rounded-3xl border border-amber-100/60 shadow-[0_6px_20px_rgba(241,179,36,0.04)]"
        id="food-filter-horizontal-responsive"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Spotlight Feeds
          </h3>
          {activeFilter && (
            <button
              onClick={() => onFilterChange(null)}
              className="text-[10px] uppercase font-black text-rose-600 hover:underline cursor-pointer"
            >
              Reset [×]
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
          {filterItems.map((item) => {
            const isActive = activeFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onFilterChange(isActive ? null : item.id)}
                className={`py-2 px-4 rounded-2xl flex items-center space-x-2 shrink-0 transition-all border text-xs font-bold leading-none cursor-pointer ${
                  isActive
                    ? 'bg-[#FFD54F] border-amber-400 text-slate-900 shadow-md scale-102'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg leading-none">{item.emoji}</span>
                <span>{item.label}</span>
                {item.id === 'favorite' && favoritesCount > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black ml-1.5">
                    {favoritesCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
