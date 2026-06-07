/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Restaurant, MenuItem, CartItem } from '../types';
import { Star, Clock, MapPin, Search, Plus, Minus, UserCheck, Check, Heart, HelpCircle, Utensils, Award } from 'lucide-react';
import ItemCustomizerModal from './ItemCustomizerModal';

interface RestaurantLandingProps {
  restaurant: Restaurant;
  cartItems: CartItem[];
  onAddToCart: (item: MenuItem, restaurantId: string, customization?: any, quantity?: number) => void;
  onRemoveFromCart: (item: MenuItem, restaurantId: string, customization?: any) => void;
  onBackToExplore: () => void;
  onCheckoutTrigger?: () => void;
}

export default function RestaurantLanding({
  restaurant,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
  onBackToExplore,
  onCheckoutTrigger,
}: RestaurantLandingProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customizerItem, setCustomizerItem] = useState<MenuItem | null>(null);

  // Group categories from menu items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    restaurant.menu.forEach((item) => cats.add(item.category));
    return ['All', ...Array.from(cats)];
  }, [restaurant]);

  // Filter menu items by search query and category tab
  const filteredMenu = useMemo(() => {
    return restaurant.menu.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [restaurant, searchQuery, selectedCategory]);

  // Quick quantity check helper
  const getItemQuantity = (itemId: string) => {
    const item = cartItems.find((ci) => ci.menuItem.id === itemId && ci.restaurantId === restaurant.id);
    return item ? item.quantity : 0;
  };

  return (
    <div className="w-full text-slate-800 bg-white" id={`restaurant-landing-${restaurant.id}`}>
      
      {/* 1. Header Hero Banner - Custom bento card design with circular plate */}
      <div className="max-w-7xl mx-auto px-4 md:px-0 pt-6 pb-2" id="restaurant-hero-bento">
        <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#FAF9F5] to-[#F3F4F6] border border-slate-100 p-8 md:p-14 overflow-hidden flex flex-col md:grid md:grid-cols-12 items-center gap-8 min-h-[380px] shadow-[0_10px_45px_rgba(0,0,0,0.012)]">
          {/* Subtle design grid overlay inside the hero for premium depth */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#F15A24_1px,transparent_1px)] [background-size:24px_24px]" />
          
          {/* Left details grid block */}
          <div className="md:col-span-7 space-y-6 z-10 text-left w-full">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 bg-[#FFF2ED] text-[#F15A24] font-black tracking-widest text-[9px] uppercase px-3 py-1.5 rounded-full border border-orange-100/40">
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

            <div className="flex items-center gap-1.5 text-amber-500 text-xs font-extrabold" id="restaurant-rating-row">
              <span className="text-lg leading-none">★</span>
              <span>{restaurant.rating}</span>
              <span className="text-slate-400 font-medium">({restaurant.ratingCount || '1,280+'})</span>
            </div>

            {/* Twin rounded-full pills detailing stats */}
            <div className="flex flex-wrap gap-3.5 pt-1">
              <div className="bg-white/95 border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.015)] px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-slate-800 font-bold">
                <Clock className="w-4 h-4 text-[#F15A24]" />
                <span>{restaurant.deliveryTimeMin}—{restaurant.deliveryTimeMin + 10} min delivery</span>
              </div>
              <div className="bg-white/95 border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.015)] px-4 py-2 rounded-full flex items-center space-x-2 text-xs text-[#F15A24] font-black">
                <span>$</span>
                <span className="text-slate-800 font-bold">{restaurant.deliveryFee === 0 ? 'FREE Delivery' : `$${restaurant.deliveryFee.toFixed(2)} Delivery`}</span>
              </div>
            </div>
          </div>

          {/* Right Circular Floating Plate image */}
          <div className="md:col-span-5 relative w-full h-full min-h-[260px] md:min-h-0 flex items-center justify-center">
            <div className="md:absolute md:-right-8 md:top-1/2 md:-translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] rounded-full overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.08)] border-4 border-white select-none shrink-0">
              <img
                src={restaurant.heroImage}
                alt={`${restaurant.name} Signature Dish`}
                className="w-full h-full object-cover select-none scale-102 hover:scale-108 transition-transform duration-[8000ms] cursor-pointer"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Horizontal Categories Tabs with search inline */}
      <div className="sticky top-20 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 py-3 mb-8" id="restaurant-category-navigator">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Flat category text links with underbars */}
          <div className="flex items-center space-x-8 pr-1.5 overflow-x-auto scrollbar-none scroll-smooth">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`pb-2.5 text-xs sm:text-sm tracking-wide capitalize whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat
                    ? 'text-slate-900 border-b-2 border-[#F15A24] font-black'
                    : 'text-slate-400 hover:text-[#F15A24] font-bold border-b-2 border-transparent'
                }`}
                id={`cat-tab-${cat}`}
              >
                {cat === 'All' ? 'Popular' : cat}
              </button>
            ))}
          </div>

          {/* Localized Search Container */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gourmet items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 pl-10 pr-4 py-2 rounded-full border border-slate-100 text-xs focus:ring-1 focus:ring-[#F15A24] focus:bg-white focus:border-[#F15A24] focus:outline-none placeholder-slate-400 transition-all font-sans shadow-sm"
              id="search-menu-items"
            />
          </div>

        </div>
      </div>

      {/* 3. Main Split Column Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: List of Food Items */}
          <div className="lg:col-span-7 space-y-4" id="filtered-food-list-deck">
            {filteredMenu.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-150">
                <Utensils className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-700">No Food Menu Matches</h3>
                <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto font-sans">
                  Try adjusting categories, expanding spelling, or cleaning search targets.
                </p>
              </div>
            ) : (
              <div className="space-y-4.5">
                {filteredMenu.map((item) => {
                  const qty = getItemQuantity(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setCustomizerItem(item)}
                      className="group bg-white/75 backdrop-blur-md rounded-3xl p-4 flex items-center justify-between border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.03)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all duration-300 w-full cursor-pointer"
                      id={`item-card-${item.id}`}
                    >
                      {/* Left contents */}
                      <div className="flex items-center space-x-4 max-w-full overflow-hidden">
                        {/* Circular Image Thumbnail */}
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 shadow-sm">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover select-none scale-102 group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          {item.isVegetarian && (
                            <span className="absolute bottom-1 right-1 bg-emerald-500 text-white font-mono font-bold text-[7px] tracking-wider p-0.5 px-1.5 rounded-full uppercase" title="Vegetarian Selection">
                              VEG
                            </span>
                          )}
                        </div>

                        {/* Middle detailed columns */}
                        <div className="text-left">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-[15px] font-black text-slate-800 tracking-tight transition-colors group-hover:text-[#F15A24]">
                              {item.name}
                            </h3>
                            {item.isPopular && (
                              <span className="bg-[#FFF8F5] text-[#F15A24] text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider border border-orange-100/30">
                                Popular
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed font-sans line-clamp-2">
                            {item.description}
                          </p>
                          
                          <span className="text-[13px] font-extrabold text-slate-800 font-mono mt-1 w-fit block">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Right Control Plus indicator buttons */}
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        {qty > 0 ? (
                          <div className="flex items-center space-x-1.5 p-1 bg-slate-50 border border-slate-105 rounded-full shadow-sm">
                            <button
                              onClick={() => onRemoveFromCart(item, restaurant.id)}
                              className="w-7 h-7 bg-white hover:bg-slate-100 text-slate-600 hover:text-[#F15A24] rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-sm active:scale-90 font-bold"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-black text-slate-800 px-1 min-w-[18px] text-center">
                              {qty}
                            </span>
                            <button
                              onClick={() => onAddToCart(item, restaurant.id)}
                              className="w-7 h-7 bg-white hover:bg-[#FFF2ED] text-[#F15A24] rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-sm active:scale-90 font-bold"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onAddToCart(item, restaurant.id)}
                            className="w-10 h-10 rounded-full border border-orange-50 bg-[#FFF2ED] text-[#F15A24] hover:bg-[#F15A24] hover:text-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer font-black text-lg"
                            title="Add item to your selection order"
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

          {/* Right Column: Information Widgets */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Widget A: About Restaurant metadata */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-7.5 border border-slate-100 shadow-[0_6px_30px_rgba(0,0,0,0.015)] space-y-4">
              <h3 className="text-[17px] font-black text-slate-900 tracking-tight text-left">
                About Restaurant
              </h3>
              <p className="text-xs leading-relaxed text-slate-500 font-sans text-left">
                {restaurant.description || 'Authentic gourmet treats crafted with the freshest premium ingredients and dynamic passion.'}
              </p>
              
              <div className="grid grid-cols-3 gap-3 border-t border-slate-50 pt-5">
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 text-center rounded-2xl">
                  <span className="text-sm font-black text-slate-800">1,200+</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Orders</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 text-center rounded-2xl">
                  <div className="flex items-center text-amber-500 text-xs font-black">
                    <span className="text-[13px] leading-none text-amber-500 mr-0.5">★</span>
                    <span>{restaurant.rating}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Rating</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 text-center rounded-2xl">
                  <div className="flex items-center text-[#F15A24] text-xs font-black">
                    <span className="text-[12px] leading-none text-[#F15A24] mr-0.5">🏆</span>
                    <span>5</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Years</span>
                </div>
              </div>
            </div>

            {/* Widget B: Best Deal promotional plate section */}
            <div className="rounded-[2.5rem] p-6.5 border border-[#FFECE4]/90 bg-gradient-to-br from-white to-[#FFFAF9] shadow-[0_8px_30px_rgba(241,90,36,0.02)] flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="inline-block bg-[#FFF2ED] text-[#F15A24] text-[8px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full border border-orange-100/30">
                  Best Deal Offer
                </span>
                <h4 className="text-[15px] font-black text-slate-800 tracking-tight leading-snug mt-2.5 max-w-[140px]">
                  Large Pizza + 2 Ice Drinks Combo
                </h4>
                <div className="flex items-baseline mt-3">
                  <span className="text-[17px] font-black text-[#F15A24] font-mono">$29.99</span>
                  <span className="text-[11px] font-bold text-slate-400 font-mono line-through ml-2.5">$39.99</span>
                </div>
              </div>

              {/* Float combo illustration */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-lg shrink-0 rotate-3 select-none">
                <img
                  src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&h=150&q=80"
                  alt="Combo Deal Plate"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 4. Brand Story / Bio section placed "down the page" below layout blocks */}
      <div className="border-t border-slate-100 bg-slate-50/50 mt-12 py-14" id="restaurant-about-deck-bottom">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-4 text-left">
            <div className="flex items-center space-x-2 text-[#F15A24] font-mono text-[10px] uppercase tracking-widest font-extrabold">
              <Utensils className="w-4 h-4 text-[#F15A24]" />
              <span>Brand Story & Culinary Philosophy</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Meet the Culinary Dream</h2>
            {restaurant.story ? (
              <p className="text-sm text-slate-600 font-sans leading-relaxed">
                {restaurant.story}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic font-sans">
                The brand story for this kitchen has not been configured yet.
              </p>
            )}
            {restaurant.bio ? (
              <div className="mt-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <p className="text-xs font-mono italic leading-relaxed text-slate-500">
                  &ldquo;{restaurant.bio}&rdquo;
                </p>
              </div>
            ) : (
              <div className="mt-4 p-5 bg-white/50 border border-dashed border-slate-200 rounded-2xl text-center text-[10px] text-slate-450 italic font-mono">
                No culinary motto set.
              </div>
            )}
          </div>

          {/* Chef spotlight card sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.01)] text-left">
            {restaurant.chefName ? (
              <div className="flex items-start space-x-4">
                {restaurant.chefImage ? (
                  <img
                    src={restaurant.chefImage}
                    alt={restaurant.chefName}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-100 select-none shadow-sm flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 font-mono text-[10px] flex-shrink-0 uppercase font-black">
                    No Chef Image
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <div className="inline-flex items-center px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded text-[9px] font-mono text-[#F15A24] uppercase tracking-wider font-black mb-1">
                    <Award className="w-3 h-3 mr-0.5 text-[#F15A24]" /> Chef Spotlight
                  </div>
                  <h4 className="text-sm font-black text-slate-900">{restaurant.chefName}</h4>
                  {restaurant.chefBio ? (
                    <p className="text-[11px] text-slate-505 leading-relaxed font-sans mt-1">
                      {restaurant.chefBio}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic font-sans mt-1">
                      Chef biography not configured.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-6 text-center text-[11px] text-slate-400 font-sans italic">
                <Utensils className="w-5 h-5 text-slate-300 mb-2" />
                <span>Chef spotlight is empty for this restaurant.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Customizer Overlay Popup Modal */}
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
              onAddToCart(selectedItem, restaurant.id, customization, quantity);
            }}
            onCheckout={() => {
              setCustomizerItem(null);
              if (onCheckoutTrigger) {
                onCheckoutTrigger();
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
