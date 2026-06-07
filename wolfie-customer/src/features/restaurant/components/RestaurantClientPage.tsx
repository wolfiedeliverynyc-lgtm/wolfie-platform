'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Clock, 
  MapPin, 
  Search, 
  Plus, 
  Minus, 
  Award, 
  Heart, 
  Utensils,
  Phone,
  Layout,
  ArrowLeft
} from 'lucide-react';

// Custom inline SVG icons to fix Lucide-react export mismatches
const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
import Header from '../../../components/Header';
import NotificationsPanel from '../../../components/NotificationsPanel';
import ItemCustomizerModal from './ItemCustomizerModal';
import { Restaurant, MenuItem, MenuItemCustomization } from '../../../lib/types';
import { restaurantApi } from '../../../services/api';
import { useCartStore, getCartItemPrice } from '../../../stores/useCartStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import CartDrawer from '../../cart/components/CartDrawer';

interface RestaurantClientPageProps {
  id: string;
  initialData?: Restaurant;
}

export default function RestaurantClientPage({ id, initialData }: RestaurantClientPageProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customizerItem, setCustomizerItem] = useState<MenuItem | null>(null);

  // Zustand stores
  const cart = useCartStore((s) => s.cart);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const { setCheckoutOpen } = useUiStore();
  const { favorites, toggleFavorite, addHistory } = useAuthStore();

  // TanStack Query for dynamic restaurant retrieval
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => restaurantApi.getRestaurantById(id),
    initialData,
  });

  // Track page history onboarding
  useEffect(() => {
    if (restaurant) {
      addHistory(restaurant.id);
    }
  }, [restaurant?.id]);

  // Group Categories from menu
  const categories = useMemo(() => {
    if (!restaurant) return ['All'];
    const cats = new Set<string>();
    restaurant.menu.forEach((item) => cats.add(item.category));
    return ['All', ...Array.from(cats)];
  }, [restaurant]);

  // Filtered Menu
  const filteredMenu = useMemo(() => {
    if (!restaurant) return [];
    return restaurant.menu.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [restaurant, searchQuery, selectedCategory]);

  const isFav = restaurant ? favorites.includes(restaurant.id) : false;

  const getItemQuantity = (itemId: string) => {
    if (!restaurant) return 0;
    const match = cart.find((ci) => ci.menuItem.id === itemId && ci.restaurantId === restaurant.id);
    return match ? match.quantity : 0;
  };

  const handleAddToCart = (item: MenuItem, customization?: MenuItemCustomization, quantity = 1) => {
    if (!restaurant) return;
    const res = addItem(item, restaurant.id, customization, quantity);
    
    if (res.requiresConfirm) {
      if (window.confirm("Switch restaurants? Adding this will clear your current selections from another gourmet kitchen.")) {
        addItem(item, restaurant.id, customization, quantity, true);
      }
    }
  };

  const handleRemoveFromCart = (item: MenuItem) => {
    if (!restaurant) return;
    removeItem(item, restaurant.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#F15A24] animate-spin" />
          <p className="text-xs text-slate-400 font-bold">Interfacing with restaurant details...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 select-none">
          <Utensils className="w-12 h-12 text-slate-350" />
          <h2 className="text-md font-black text-slate-800">Restaurant Not Found</h2>
          <p className="text-xs text-slate-400 font-bold max-w-sm text-center">
            This workspace link may have expired or the onboarding has not been compiled yet.
          </p>
        </div>
      </div>
    );
  }

  const lay = restaurant.layout || 'bento';

  return (
    <div className={`min-h-screen flex flex-col ${
      lay === 'cyberpunk' ? 'bg-[#0D0E12] text-slate-100' :
      lay === 'elegant' ? 'bg-[#FCFAF2] text-slate-800' :
      'bg-white text-slate-800'
    }`} id={`restaurant-viewport-${restaurant.id}`}>
      
      <Header />
      <NotificationsPanel />

      <main className="flex-1 flex flex-col pb-20 select-none">
        
        {/* ==================== BENTO GRID LAYOUT ==================== */}
        {lay === 'bento' && (
          <div className="max-w-7xl mx-auto px-4 md:px-0 pt-6 pb-2 w-full text-slate-800 bg-white">
            {/* Hero Bento */}
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#FAF9F5] to-[#F3F4F6] border border-slate-105 p-8 md:p-14 overflow-hidden flex flex-col md:grid md:grid-cols-12 items-center gap-8 min-h-[380px] shadow-xs">
              <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#F15A24_1px,transparent_1px)] [background-size:24px_24px]" />
              
              <div className="md:col-span-7 space-y-6 z-10 text-left w-full">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 bg-[#FFF2ED] text-[#F15A24] font-black tracking-widest text-[9px] uppercase px-3 py-1.5 rounded-full border border-orange-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F15A24]" />
                    {restaurant.category}
                  </span>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none">
                    {restaurant.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium font-sans">
                    {restaurant.category} • Gastronomy Hub • $$
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-amber-500 text-xs font-extrabold">
                  <span className="text-lg leading-none">★</span>
                  <span>{restaurant.rating}</span>
                  <span className="text-slate-400 font-medium">({restaurant.ratingCount})</span>
                  <button 
                    onClick={() => toggleFavorite(restaurant.id)}
                    className="ml-4 p-2 bg-white rounded-full shadow-sm hover:scale-105 transition-all text-slate-600 border border-slate-100"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-605'}`} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3.5 pt-1">
                  <div className="bg-white/95 border border-slate-100 shadow-xs px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-slate-800 font-bold">
                    <Clock className="w-4 h-4 text-[#F15A24]" />
                    <span>{restaurant.deliveryTimeMin}—{restaurant.deliveryTimeMin + 10} min delivery</span>
                  </div>
                  <div className="bg-white/95 border border-slate-100 shadow-xs px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-[#F15A24] font-black">
                    <span>$</span>
                    <span className="text-slate-800 font-bold">{restaurant.deliveryFee === 0 ? 'FREE Delivery' : `$${restaurant.deliveryFee.toFixed(2)} Delivery`}</span>
                  </div>
                </div>

                {/* Social media indicators */}
                {(restaurant.instagram || restaurant.facebook || restaurant.phone) && (
                  <div className="flex items-center space-x-4 pt-2 text-slate-400 text-xs">
                    {restaurant.instagram && (
                      <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" className="flex items-center gap-1 hover:text-[#F15A24] transition-colors">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span>@{restaurant.instagram}</span>
                      </a>
                    )}
                    {restaurant.facebook && (
                      <span className="flex items-center gap-1">
                        <Facebook className="w-4 h-4 text-blue-600" />
                        <span>{restaurant.facebook}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-5 relative w-full h-full min-h-[260px] md:min-h-0 flex items-center justify-center">
                <div className="md:absolute md:-right-8 md:top-1/2 md:-translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] rounded-full overflow-hidden shadow-lg border-4 border-white select-none shrink-0">
                  <img
                    src={restaurant.heroImage}
                    alt={`${restaurant.name} Hero`}
                    className="w-full h-full object-cover scale-102 hover:scale-108 transition-transform duration-[8000ms] cursor-pointer"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== CYBERPUNK / SYNTHWAVE LAYOUT ==================== */}
        {lay === 'cyberpunk' && (
          <div className="max-w-7xl mx-auto px-4 md:px-0 pt-6 pb-2 w-full text-slate-100">
            {/* Cyberpunk Neon Header */}
            <div className="relative rounded-[2.5rem] bg-[#0E0F14] border border-[#2E313D] p-8 md:p-14 overflow-hidden flex flex-col md:grid md:grid-cols-12 items-center gap-8 min-h-[380px] shadow-[0_15px_45px_rgba(187,134,252,0.03)]">
              {/* Retro grid lines */}
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#BB86FC_1px,transparent_1px)] [background-size:20px_20px]" />
              
              <div className="md:col-span-7 space-y-6 z-10 text-left w-full">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 bg-[#1F142D] text-[#BB86FC] font-black tracking-widest text-[9px] uppercase px-3 py-1.5 rounded-full border border-[#3E255C]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#BB86FC] animate-ping" />
                    {restaurant.category}
                  </span>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-none uppercase drop-shadow-[0_2px_10px_rgba(187,134,252,0.15)]">
                    {restaurant.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium font-sans">
                    {restaurant.category} • CYBERNETIC GRUB STATION • $$
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-extrabold">
                  <span className="text-lg leading-none">★</span>
                  <span>{restaurant.rating}</span>
                  <span className="text-slate-500 font-medium">({restaurant.ratingCount})</span>
                  <button 
                    onClick={() => toggleFavorite(restaurant.id)}
                    className="ml-4 p-2 bg-[#1B1D26] rounded-full shadow-sm hover:scale-105 transition-all text-slate-350 border border-[#2E313D]"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500 text-pink-500' : 'text-slate-350'}`} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3.5 pt-1">
                  <div className="bg-[#151720] border border-[#2E313D] px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-slate-200 font-bold">
                    <Clock className="w-4 h-4 text-[#BB86FC]" />
                    <span>ETA: {restaurant.deliveryTimeMin}—{restaurant.deliveryTimeMin + 10} min</span>
                  </div>
                  <div className="bg-[#151720] border border-[#2E313D] px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-[#03DAC6] font-black">
                    <span>$</span>
                    <span className="text-slate-200 font-bold">{restaurant.deliveryFee === 0 ? 'FREE TELEPORT' : `$${restaurant.deliveryFee.toFixed(2)} Transit`}</span>
                  </div>
                </div>

                {/* Social media indicators */}
                {(restaurant.instagram || restaurant.facebook || restaurant.phone) && (
                  <div className="flex items-center space-x-4 pt-2 text-slate-400 text-xs font-mono">
                    {restaurant.instagram && (
                      <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" className="flex items-center gap-1 hover:text-[#BB86FC] transition-colors">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span>@{restaurant.instagram}</span>
                      </a>
                    )}
                    {restaurant.facebook && (
                      <span className="flex items-center gap-1">
                        <Facebook className="w-4 h-4 text-blue-500" />
                        <span>{restaurant.facebook}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-5 relative w-full h-full min-h-[260px] md:min-h-0 flex items-center justify-center">
                <div className="md:absolute md:-right-8 md:top-1/2 md:-translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] rounded-full overflow-hidden shadow-[0_5px_30px_rgba(187,134,252,0.2)] border-4 border-[#2E313D] select-none shrink-0">
                  <img
                    src={restaurant.heroImage}
                    alt={`${restaurant.name} Hero`}
                    className="w-full h-full object-cover scale-102 hover:scale-108 transition-transform duration-[8000ms] cursor-pointer"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ELEGANT / CLASSY LAYOUT ==================== */}
        {lay === 'elegant' && (
          <div className="max-w-7xl mx-auto px-4 md:px-0 pt-6 pb-2 w-full text-slate-800 bg-[#FCFAF2]">
            {/* Elegant Luxury Header */}
            <div className="relative rounded-[2.5rem] bg-white border border-[#E5C158]/30 p-8 md:p-14 overflow-hidden flex flex-col md:grid md:grid-cols-12 items-center gap-8 min-h-[380px] shadow-xs">
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#E5C158_1px,transparent_1px)] [background-size:30px_30px]" />
              
              <div className="md:col-span-7 space-y-6 z-10 text-left w-full">
                <div className="space-y-3 font-serif">
                  <span className="inline-flex items-center gap-1.5 bg-[#F9F6ED] text-[#B89047] font-black tracking-widest text-[9px] uppercase px-3.5 py-2 rounded-full border border-[#E5C158]/20 font-sans">
                    <Award className="w-3.5 h-3.5 text-[#B89047]" />
                    {restaurant.category}
                  </span>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-905 tracking-tight leading-none font-serif italic">
                    {restaurant.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium font-sans italic">
                    {restaurant.category} • Selected Gastronomique • $$$$
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[#B89047] text-xs font-extrabold">
                  <span className="text-lg leading-none">★</span>
                  <span>{restaurant.rating}</span>
                  <span className="text-slate-450 font-medium">({restaurant.ratingCount} reviews)</span>
                  <button 
                    onClick={() => toggleFavorite(restaurant.id)}
                    className="ml-4 p-2 bg-[#FCFAF2] rounded-full shadow-sm hover:scale-105 transition-all text-slate-600 border border-[#E5C158]/25"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-605'}`} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3.5 pt-1 font-sans">
                  <div className="bg-[#FCFAF2] border border-[#E5C158]/20 shadow-xs px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-slate-700 font-bold">
                    <Clock className="w-4 h-4 text-[#B89047]" />
                    <span>Livreur Estimé: {restaurant.deliveryTimeMin}—{restaurant.deliveryTimeMin + 10} min</span>
                  </div>
                  <div className="bg-[#FCFAF2] border border-[#E5C158]/20 shadow-xs px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-[#B89047] font-black">
                    <span className="text-slate-700">{restaurant.deliveryFee === 0 ? 'Complimentary Delivery' : `$${restaurant.deliveryFee.toFixed(2)} Service`}</span>
                  </div>
                </div>

                {/* Social media indicators */}
                {(restaurant.instagram || restaurant.facebook || restaurant.phone) && (
                  <div className="flex items-center space-x-4 pt-2 text-slate-500 text-xs italic font-serif">
                    {restaurant.instagram && (
                      <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" className="flex items-center gap-1 hover:text-[#B89047] transition-colors font-sans">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span>@{restaurant.instagram}</span>
                      </a>
                    )}
                    {restaurant.facebook && (
                      <span className="flex items-center gap-1 font-sans">
                        <Facebook className="w-4 h-4 text-blue-650" />
                        <span>{restaurant.facebook}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-5 relative w-full h-full min-h-[260px] md:min-h-0 flex items-center justify-center">
                <div className="md:absolute md:-right-8 md:top-1/2 md:-translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] rounded-full overflow-hidden shadow-[0_12px_35px_rgba(212,175,55,0.06)] border-4 border-[#E5C158]/20 select-none shrink-0">
                  <img
                    src={restaurant.heroImage}
                    alt={`${restaurant.name} Hero`}
                    className="w-full h-full object-cover scale-102 hover:scale-108 transition-transform duration-[8000ms] cursor-pointer"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== MINIMALIST LAYOUT ==================== */}
        {lay === 'minimalist' && (
          <div className="max-w-7xl mx-auto px-4 md:px-0 pt-6 pb-2 w-full text-slate-800 bg-white">
            {/* Minimalist Hero Layout */}
            <div className="relative border-b border-slate-200 py-10 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 text-left select-none">
              <div className="space-y-6 max-w-xl">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block">{restaurant.category}</span>
                  <h1 className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight leading-none font-sans">
                    {restaurant.name}
                  </h1>
                  <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                    {restaurant.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-mono">
                  <div className="flex items-center space-x-1">
                    <span>Score:</span>
                    <span className="font-bold">{restaurant.rating} ★</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>ETA:</span>
                    <span className="font-bold">{restaurant.deliveryTimeMin}m</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>Delivery:</span>
                    <span className="font-bold">${restaurant.deliveryFee.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Minimalist Square image */}
              <div className="w-56 h-56 rounded-none overflow-hidden border border-slate-200 select-none shrink-0 relative">
                <img
                  src={restaurant.heroImage}
                  alt={`${restaurant.name} Hero`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. Menu Navigation Row ==================== */}
        <div className={`sticky top-20 z-20 border-b py-3 mb-8 ${
          lay === 'cyberpunk' ? 'bg-[#0D0E12]/90 backdrop-blur-md border-[#2E313D]' :
          lay === 'elegant' ? 'bg-[#FCFAF2]/90 backdrop-blur-md border-[#E5C158]/20' :
          'bg-white/90 backdrop-blur-md border-slate-100'
        }`} id="restaurant-category-navigator">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Category horizontal scrolling tab */}
            <div className="flex items-center space-x-8 pr-1.5 overflow-x-auto scrollbar-none scroll-smooth">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`pb-2.5 text-xs sm:text-sm tracking-wide capitalize whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    selectedCategory === cat
                      ? (lay === 'cyberpunk' ? 'text-[#BB86FC] border-b-2 border-[#BB86FC] font-black' :
                         lay === 'elegant' ? 'text-[#B89047] border-b-2 border-[#B89047] font-black font-serif italic' :
                         'text-slate-900 border-b-2 border-[#F15A24] font-black')
                      : 'text-slate-400 hover:text-[#F15A24] font-bold border-b-2 border-transparent'
                  }`}
                >
                  {cat === 'All' ? 'Popular' : cat}
                </button>
              ))}
            </div>

            {/* Local Search input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-full border text-xs focus:outline-none transition-all font-sans shadow-sm ${
                  lay === 'cyberpunk' ? 'bg-[#1B1D26] border-[#2E313D] text-slate-100 focus:ring-1 focus:ring-[#BB86FC]' :
                  lay === 'elegant' ? 'bg-white border-[#E5C158]/35 text-slate-800 focus:ring-1 focus:ring-[#B89047]' :
                  'bg-slate-50 border-slate-100 text-slate-800 focus:ring-1 focus:ring-[#F15A24] focus:bg-white focus:border-[#F15A24]'
                }`}
                id="search-menu-items"
              />
            </div>
          </div>
        </div>

        {/* ==================== 3. Menu Content grid ==================== */}
        <div className="max-w-7xl mx-auto px-4 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Food cards listing */}
            <div className="lg:col-span-7 space-y-4" id="filtered-food-list-deck">
              {filteredMenu.length === 0 ? (
                <div className={`text-center py-20 rounded-[2rem] border border-dashed ${
                  lay === 'cyberpunk' ? 'border-[#2E313D] bg-[#151720]/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-black">No Food Menu Matches</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-sans">
                    Try adjusting categories, expanding spelling, or cleaning search queries.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMenu.map((item) => {
                    const qty = getItemQuantity(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setCustomizerItem(item)}
                        className={`group rounded-3xl p-4 flex items-center justify-between border transition-all duration-300 w-full cursor-pointer ${
                          lay === 'cyberpunk' ? 'bg-[#151720]/80 border-[#2E313D] hover:border-[#BB86FC] hover:shadow-[0_8px_30px_rgba(187,134,252,0.04)] text-left' :
                          lay === 'elegant' ? 'bg-white border-[#E5C158]/20 hover:border-[#B89047] hover:shadow-[0_8px_30px_rgba(212,175,55,0.03)] text-left' :
                          lay === 'minimalist' ? 'bg-white border-b border-slate-100 rounded-none shadow-none hover:shadow-none hover:translate-y-0 text-left px-0' :
                          'bg-white/75 backdrop-blur-md border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.03)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)] hover:-translate-y-1 text-left'
                        }`}
                        id={`item-card-${item.id}`}
                      >
                        <div className="flex items-center space-x-4 max-w-full overflow-hidden">
                          {/* Circle image */}
                          <div className={`relative w-20 h-20 rounded-full overflow-hidden bg-slate-50 border flex-shrink-0 shadow-xs ${
                            lay === 'minimalist' ? 'rounded-none border-slate-205' : 'border-slate-100'
                          }`}>
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover scale-102 group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            {item.isVegetarian && (
                              <span className="absolute bottom-1 right-1 bg-emerald-500 text-white font-mono font-bold text-[7px] tracking-wider p-0.5 px-1.5 rounded-full uppercase">
                                VEG
                              </span>
                            )}
                          </div>

                          {/* Details */}
                          <div className="text-left">
                            <div className="flex items-center space-x-2">
                              <h3 className={`text-[15px] font-black tracking-tight transition-colors ${
                                lay === 'cyberpunk' ? 'text-white group-hover:text-[#BB86FC]' :
                                lay === 'elegant' ? 'text-slate-900 font-serif italic group-hover:text-[#B89047]' :
                                'text-slate-800 group-hover:text-[#F15A24]'
                              }`}>
                                {item.name}
                              </h3>
                              {item.isPopular && (
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border ${
                                  lay === 'cyberpunk' ? 'bg-[#1F142D] border-[#3E255C] text-[#BB86FC]' :
                                  'bg-[#FFF8F5] border-orange-100 text-[#F15A24]'
                                }`}>
                                  Popular
                                </span>
                              )}
                            </div>
                            
                            <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed font-sans line-clamp-2">
                              {item.description}
                            </p>
                            
                            <span className="text-[13px] font-extrabold font-mono mt-1 w-fit block">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Quantity picker control */}
                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          {qty > 0 ? (
                            <div className={`flex items-center space-x-1.5 p-1 border rounded-full shadow-xs ${
                              lay === 'cyberpunk' ? 'bg-[#1B1D26] border-[#2E313D]' : 'bg-slate-50 border-slate-100'
                            }`}>
                              <button
                                onClick={() => handleRemoveFromCart(item)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-xs active:scale-90 font-bold ${
                                  lay === 'cyberpunk' ? 'bg-[#151720] hover:bg-[#1B1D26] text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-650'
                                }`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono font-black px-1 min-w-[18px] text-center">
                                {qty}
                              </span>
                              <button
                                onClick={() => handleAddToCart(item)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-xs active:scale-90 font-bold ${
                                  lay === 'cyberpunk' ? 'bg-[#151720] hover:bg-[#1B1D26] text-[#BB86FC]' : 'bg-white hover:bg-slate-100 text-[#F15A24]'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(item)}
                              className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer font-black text-lg ${
                                lay === 'cyberpunk' ? 'bg-[#1F142D] border-[#3E255C] text-[#BB86FC] hover:bg-[#BB86FC] hover:text-white' :
                                lay === 'elegant' ? 'bg-[#F9F6ED] border-[#E5C158]/35 text-[#B89047] hover:bg-[#B89047] hover:text-white' :
                                'bg-[#FFF2ED] border-orange-50 text-[#F15A24] hover:bg-[#F15A24] hover:text-white'
                              }`}
                            >
                              <Plus className="w-5 h-5 font-bold" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right side: about details */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card A: About info */}
              <div className={`rounded-[2rem] p-6 sm:p-7.5 border shadow-xs space-y-4 text-left ${
                lay === 'cyberpunk' ? 'bg-[#151720]/80 border-[#2E313D]' :
                lay === 'elegant' ? 'bg-white border-[#E5C158]/20' :
                'bg-white border-slate-100'
              }`}>
                <h3 className={`text-[17px] font-black tracking-tight ${
                  lay === 'elegant' ? 'font-serif italic' : ''
                }`}>
                  About Kitchen
                </h3>
                <p className="text-xs leading-relaxed text-slate-400 font-sans">
                  {restaurant.description}
                </p>
                
                <div className="grid grid-cols-3 gap-3 border-t border-slate-100/50 pt-5">
                  <div className={`flex flex-col items-center justify-center p-3 text-center rounded-2xl ${
                    lay === 'cyberpunk' ? 'bg-[#1E202B]' : 'bg-slate-50'
                  }`}>
                    <span className="text-sm font-black">1.2k+</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider font-sans">Orders</span>
                  </div>
                  <div className={`flex flex-col items-center justify-center p-3 text-center rounded-2xl ${
                    lay === 'cyberpunk' ? 'bg-[#1E202B]' : 'bg-slate-50'
                  }`}>
                    <div className="flex items-center text-amber-500 text-xs font-black">
                      <span className="text-[13px] leading-none mr-0.5">★</span>
                      <span>{restaurant.rating}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider font-sans">Rating</span>
                  </div>
                  <div className={`flex flex-col items-center justify-center p-3 text-center rounded-2xl ${
                    lay === 'cyberpunk' ? 'bg-[#1E202B]' : 'bg-slate-50'
                  }`}>
                    <div className="flex items-center text-emerald-500 text-xs font-black">
                      <span className="text-[12px] leading-none mr-0.5">🏆</span>
                      <span>Top</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider font-sans">Brand</span>
                  </div>
                </div>

                {/* social handle list links */}
                <div className="pt-2 flex flex-col space-y-2 text-xs text-slate-400 font-sans border-t border-slate-100/50">
                  {restaurant.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <span>{restaurant.phone}</span>
                    </div>
                  )}
                  {restaurant.instagram && (
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      <span>Instagram: @{restaurant.instagram}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card B: static promo offer */}
              <div className={`rounded-[2.5rem] p-6.5 border flex items-center justify-between gap-4 text-left ${
                lay === 'cyberpunk' ? 'bg-gradient-to-br from-[#151720] to-[#1F142D] border-[#3E255C]' :
                lay === 'elegant' ? 'bg-gradient-to-br from-white to-[#F9F6ED] border-[#E5C158]/30 shadow-xs' :
                'bg-gradient-to-br from-white to-[#FFFAF9] border-[#FFECE4]'
              }`}>
                <div>
                  <span className={`inline-block text-[8px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full border ${
                    lay === 'cyberpunk' ? 'bg-[#1F142D] border-[#3E255C] text-[#BB86FC]' :
                    'bg-[#FFF2ED] border-orange-100 text-[#F15A24]'
                  }`}>
                    Best Combo Deal
                  </span>
                  <h4 className="text-[15px] font-black tracking-tight leading-snug mt-2.5 max-w-[140px]">
                    Signature Main + Iced Elixir Combo
                  </h4>
                  <div className="flex items-baseline mt-3">
                    <span className="text-[17px] font-black font-mono text-[#F15A24]">$24.99</span>
                    <span className="text-[11px] font-bold text-slate-400 font-mono line-through ml-2.5">$32.99</span>
                  </div>
                </div>

                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-lg shrink-0 rotate-3 select-none">
                  <img
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&h=150&q=80"
                    alt="Combo Deal Plate"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ==================== 4. Bottom Chef & Story Section ==================== */}
        <div className={`border-t bg-slate-50/50 mt-12 py-14 ${
          lay === 'cyberpunk' ? 'border-[#2E313D] bg-[#0E0F14]' :
          lay === 'elegant' ? 'border-[#E5C158]/20 bg-[#F9F6ED]/40' :
          'border-slate-100 bg-slate-50/30'
        }`} id="restaurant-about-deck-bottom">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-4 text-left">
              <div className="flex items-center space-x-2 font-mono text-[10px] uppercase tracking-widest font-extrabold text-[#F15A24]">
                <Utensils className="w-4 h-4 text-[#F15A24]" />
                <span>Brand Story & Culinary Philosophy</span>
              </div>
              <h2 className={`text-2xl font-black tracking-tight ${
                lay === 'elegant' ? 'font-serif italic' : ''
              }`}>
                Meet the Culinary Dream
              </h2>
              <p className="text-sm leading-relaxed text-slate-500 font-sans">
                {restaurant.story}
              </p>
              <div className={`p-5 border rounded-2xl shadow-xs ${
                lay === 'cyberpunk' ? 'bg-[#151720] border-[#2E313D] text-slate-400' : 'bg-white border-slate-100 text-slate-500'
              }`}>
                <p className="text-xs font-mono italic leading-relaxed">
                  &ldquo;{restaurant.bio}&rdquo;
                </p>
              </div>
            </div>

            {/* Chef spotlight card */}
            <div className={`rounded-[2rem] p-6 border shadow-xs flex items-start space-x-4 text-left lg:col-span-4 ${
              lay === 'cyberpunk' ? 'bg-[#151720] border-[#2E313D]' : 'bg-white border-slate-100'
            }`}>
              <img
                src={restaurant.chefImage}
                alt={restaurant.chefName}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-100 select-none shadow-sm flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 space-y-1">
                <div className="inline-flex items-center px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded text-[9px] font-mono text-[#F15A24] uppercase tracking-wider font-black mb-1">
                  Chef Spotlight
                </div>
                <h4 className="text-sm font-black">{restaurant.chefName}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-1">
                  {restaurant.chefBio}
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Item Customizer Overlay Modal */}
      <AnimatePresence>
        {customizerItem && (
          <ItemCustomizerModal
            item={customizerItem}
            menuItems={restaurant.menu}
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            rating={restaurant.rating}
            deliveryTimeMin={restaurant.deliveryTimeMin}
            onClose={() => setCustomizerItem(null)}
            onConfirm={(selectedItem, customization, quantity) => {
              handleAddToCart(selectedItem, customization, quantity);
            }}
            onCheckout={() => {
              setCustomizerItem(null);
              setCheckoutOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        <CartDrawer />
      </AnimatePresence>
    </div>
  );
}
export type { CartItem } from '../../../lib/types';
export type { MenuItemCustomization } from '../../../lib/types';
