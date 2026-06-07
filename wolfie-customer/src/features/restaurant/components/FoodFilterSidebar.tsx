'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, Heart, Clock, Star, Percent, History } from 'lucide-react';
import { useUiStore } from '../../../stores/useUiStore';
import { useAuthStore } from '../../../stores/useAuthStore';

export default function FoodFilterSidebar() {
  const { 
    exploreFilter, 
    setExploreFilter, 
    sidebarFilter, 
    setSidebarFilter 
  } = useUiStore();
  
  const { favorites, history } = useAuthStore();

  const handleSpotlightToggle = (filter: string) => {
    if (sidebarFilter === filter) {
      setSidebarFilter(null);
    } else {
      setSidebarFilter(filter);
    }
  };

  const categories = [
    { name: 'All', icon: '🍽️' },
    { name: 'Japanese / Ramen', icon: '🍜' },
    { name: 'Fine Dining / Italian', icon: '🍝' },
    { name: 'Healthy / Vegan', icon: '🥗' },
    { name: 'Dessert / Sweet', icon: '🍦' },
    { name: 'Burgers & Pizza', icon: '🍔' },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6 text-left font-sans select-none" id="left-sidebar-navigation">
      
      {/* Category selector */}
      <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.005)]">
        <div className="flex items-center space-x-2 text-[10px] uppercase font-black text-slate-400 tracking-wider mb-4">
          <Compass className="w-4 h-4 text-slate-450" />
          <span>Food Categories</span>
        </div>
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setExploreFilter(cat.name)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                exploreFilter === cat.name
                  ? 'bg-orange-50/40 text-[#F15A24] font-black'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className="text-sm leading-none">{cat.icon}</span>
                <span>{cat.name.split(' / ')[0]}</span>
              </div>
              {exploreFilter === cat.name && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#F15A24]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Spotlights */}
      <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.005)]">
        <div className="flex items-center space-x-2 text-[10px] uppercase font-black text-slate-400 tracking-wider mb-4">
          <Star className="w-4 h-4 text-slate-450" />
          <span>Spotlight Filters</span>
        </div>
        
        <div className="space-y-1.5">
          {/* Favorites */}
          <button
            onClick={() => handleSpotlightToggle('favorite')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sidebarFilter === 'favorite'
                ? 'bg-orange-50/40 text-[#F15A24] font-black'
                : 'hover:bg-slate-50 text-slate-650'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Heart className={`w-4 h-4 shrink-0 ${sidebarFilter === 'favorite' ? 'text-red-500 fill-red-500' : 'text-slate-450'}`} />
              <span>Gourmet Favorites</span>
            </div>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
              {favorites.length}
            </span>
          </button>

          {/* History */}
          <button
            onClick={() => handleSpotlightToggle('history')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sidebarFilter === 'history'
                ? 'bg-orange-50/40 text-[#F15A24] font-black'
                : 'hover:bg-slate-50 text-slate-650'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <History className={`w-4 h-4 shrink-0 ${sidebarFilter === 'history' ? 'text-indigo-500' : 'text-slate-450'}`} />
              <span>Order History</span>
            </div>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
              {history.length}
            </span>
          </button>

          {/* Closest */}
          <button
            onClick={() => handleSpotlightToggle('closest')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sidebarFilter === 'closest'
                ? 'bg-orange-50/40 text-[#F15A24] font-black'
                : 'hover:bg-slate-50 text-slate-650'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Clock className={`w-4 h-4 shrink-0 ${sidebarFilter === 'closest' ? 'text-emerald-500' : 'text-slate-450'}`} />
              <span>Fastest Transit (&lt;22 min)</span>
            </div>
          </button>

          {/* Best Seller */}
          <button
            onClick={() => handleSpotlightToggle('best_seller')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sidebarFilter === 'best_seller'
                ? 'bg-orange-50/40 text-[#F15A24] font-black'
                : 'hover:bg-slate-50 text-slate-650'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Star className={`w-4 h-4 shrink-0 ${sidebarFilter === 'best_seller' ? 'text-amber-500 fill-amber-500' : 'text-slate-450'}`} />
              <span>Top-Tier Rated (4.85+)</span>
            </div>
          </button>

          {/* Promos */}
          <button
            onClick={() => handleSpotlightToggle('promos')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              sidebarFilter === 'promos'
                ? 'bg-orange-50/40 text-[#F15A24] font-black'
                : 'hover:bg-slate-50 text-slate-650'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Percent className={`w-4 h-4 shrink-0 ${sidebarFilter === 'promos' ? 'text-purple-500' : 'text-slate-450'}`} />
              <span>Low Transit Fee (&lt;$1.50)</span>
            </div>
          </button>
        </div>
      </div>
      
    </aside>
  );
}
