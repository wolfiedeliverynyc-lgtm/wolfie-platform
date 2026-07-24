'use client';

import React, { useState } from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCartStore, CartItem } from '@/store/useCartStore';
import { Restaurant, FoodItem } from '@/services/restaurantService';
import { mockRestaurants, mockFoodItems } from '@/lib/mockData';
import { handleImageError } from '@/utils/image';
import RestaurantCard from '@/components/restaurant/RestaurantCard';

interface HomeViewProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onSelectFoodItem: (item: FoodItem) => void;
  onProceedToCheckout: () => void;
}

export default function HomeView({ onSelectRestaurant, onSelectFoodItem, onProceedToCheckout }: HomeViewProps) {
  const { restaurants: liveRestaurants, isLoading } = useRestaurants();
  const { items: cartItems, addItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [restaurantFilter, setRestaurantFilter] = useState<'all' | 'near' | 'rating' | 'best_seller'>('all');
  
  // Desktop Filters State
  const [desktopPriceFilter, setDesktopPriceFilter] = useState<'all' | 'under3' | 'under5' | 'over5'>('all');
  const [desktopRatingFilter, setDesktopRatingFilter] = useState<'all' | 'high' | 'veryhigh'>('all');
  const [desktopTimeFilter, setDesktopTimeFilter] = useState<'all' | 'fast' | 'veryfast'>('all');

  const categoriesList = ['Burgers', 'Sides', 'Drinks', 'Specials'];

  // Fallback to mock data if live endpoints fail or load empty
  const restaurants = liveRestaurants.length > 0 ? liveRestaurants : mockRestaurants;
  const activeDishes = mockFoodItems;

  const getFilteredItemsForCategory = (cat: string) => {
    return activeDishes.filter(item => {
      // Category check
      const itemCat = item.category || 'Burgers';
      if (itemCat !== cat) return false;

      // Search check
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Price filter check
      if (desktopPriceFilter === 'under3' && item.price >= 3.00) return false;
      if (desktopPriceFilter === 'under5' && item.price >= 5.00) return false;
      if (desktopPriceFilter === 'over5' && item.price < 5.00) return false;

      // Rating filter check
      if (desktopRatingFilter === 'high' && item.rating < 4.7) return false;
      if (desktopRatingFilter === 'veryhigh' && item.rating < 4.9) return false;

      // Speed filter check
      const mins = parseInt(item.deliveryTime);
      if (desktopTimeFilter === 'fast' && mins > 25) return false;
      if (desktopTimeFilter === 'veryfast' && mins > 20) return false;

      return true;
    });
  };

  const activeRestaurantList = restaurants.filter(item => {
    if (restaurantFilter === 'all') return true;
    if (restaurantFilter === 'near') return item.deliveryTime.includes('1') || item.deliveryTime.includes('20');
    if (restaurantFilter === 'rating') return item.rating >= 4.8;
    if (restaurantFilter === 'best_seller') return item.isBestSeller;
    return true;
  });

  const addToCartDirect = (item: FoodItem) => {
    const cartItem: CartItem = {
      cartId: `${item.id}_M_${Date.now()}`,
      foodItem: {
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        restaurantId: 'rest_wendys', // Default / fallback mock restaurant ID
        restaurantName: item.brand,
      },
      quantity: 1,
      size: 'M',
      toppings: [],
      addons: [],
      drinks: [],
      spicy: 57,
      pricePerUnit: item.price,
    };
    addItem(cartItem);
  };

  return (
    <div className="max-w-[1400px] mx-auto flex gap-8 select-none animate-fadeIn text-left py-6 px-4">
      <div className="flex-1 min-w-0">
        
        {/* Promo Banner Section */}
        <div className="w-full h-[280px] bg-gradient-to-r from-[#EF2A39] to-[#C21A28] rounded-[32px] p-10 text-white relative overflow-hidden mb-8 shadow-[0_15px_30px_rgba(239,42,57,0.15)] flex items-center justify-between">
          <div className="max-w-[500px] z-10 text-left">
            <span className="font-poppins font-bold text-[14px] bg-white/20 px-4 py-1.5 rounded-full uppercase tracking-wider">NYC Gourmet Delivery</span>
            <h2 className="font-poppins font-bold text-[34px] mt-4 mb-3 leading-tight">Order premium burgers & meals under 25 mins!</h2>
            <p className="font-roboto text-[16px] text-white/80">Tailored dietary screening protects your lifestyle and allergy preferences.</p>
          </div>
          <img 
            src="/assets/onboarding_burger.png" 
            alt="Promo Burger" 
            onError={(e) => handleImageError(e, '/assets/onboarding_burger.png')}
            className="w-[280px] object-contain scale-[1.25] -rotate-12 transform translate-x-4 z-10 filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.3)] transition-transform hover:scale-[1.3] duration-500" 
          />
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-[1.5]" />
        </div>

        {/* Search Input Bar */}
        <div className="mb-6">
          <input 
            type="text"
            placeholder="Search premium dishes or restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[60px] border border-gray-200 rounded-[20px] px-6 font-roboto text-[16px] outline-none focus:border-[#EF2A39] transition-colors shadow-sm"
          />
        </div>

        {/* Desktop Filters section */}
        <div className="mb-8 bg-white border border-gray-100/80 rounded-[24px] p-5 shadow-sm flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[10px] h-[10px] rounded-full bg-[#EF2A39] animate-pulse" />
            <span className="font-poppins font-bold text-[16px] text-[#3C2F2F]">Gourmet Filters</span>
          </div>
          
          <div className="flex flex-wrap gap-5 items-center">
            {/* Price filter */}
            <div className="flex items-center gap-2">
              <span className="font-roboto font-bold text-[13px] text-[#A6A6A6] uppercase tracking-wider">Price</span>
              <div className="flex gap-1.5 bg-gray-50 border border-gray-100 p-1 rounded-full">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'under3', label: '<$3' },
                  { id: 'under5', label: '<$5' },
                  { id: 'over5', label: '$5+' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDesktopPriceFilter(p.id as any)}
                    className={`px-3 py-1 text-[12px] font-bold font-roboto rounded-full transition-all cursor-pointer focus:outline-none ${
                      desktopPriceFilter === p.id 
                        ? 'bg-[#EF2A39] text-white shadow-sm' 
                        : 'text-[#6A6A6A] hover:bg-gray-150/40'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating filter */}
            <div className="flex items-center gap-2">
              <span className="font-roboto font-bold text-[13px] text-[#A6A6A6] uppercase tracking-wider">Rating</span>
              <div className="flex gap-1.5 bg-gray-50 border border-gray-100 p-1 rounded-full">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'high', label: '4.7+ ★' },
                  { id: 'veryhigh', label: '4.9+ ★' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDesktopRatingFilter(r.id as any)}
                    className={`px-3 py-1 text-[12px] font-bold font-roboto rounded-full transition-all cursor-pointer focus:outline-none ${
                      desktopRatingFilter === r.id 
                        ? 'bg-[#EF2A39] text-white shadow-sm' 
                        : 'text-[#6A6A6A] hover:bg-gray-150/40'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed filter */}
            <div className="flex items-center gap-2">
              <span className="font-roboto font-bold text-[13px] text-[#A6A6A6] uppercase tracking-wider">Speed</span>
              <div className="flex gap-1.5 bg-gray-50 border border-gray-100 p-1 rounded-full">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'fast', label: '<25m' },
                  { id: 'veryfast', label: '<20m' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setDesktopTimeFilter(s.id as any)}
                    className={`px-3 py-1 text-[12px] font-bold font-roboto rounded-full transition-all cursor-pointer focus:outline-none ${
                      desktopTimeFilter === s.id 
                        ? 'bg-[#EF2A39] text-white shadow-sm' 
                        : 'text-[#6A6A6A] hover:bg-gray-150/40'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Manhattan Storefronts Row */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-poppins font-bold text-[22px] text-[#3C2F2F]">Manhattan Storefronts</h3>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All Stores' },
                { id: 'near', label: 'Near' },
                { id: 'rating', label: 'Rating 4.8+' },
                { id: 'best_seller', label: 'Best Seller' }
              ].map(pill => (
                <button 
                  key={pill.id}
                  onClick={() => setRestaurantFilter(pill.id as any)}
                  className={`px-4 py-1.5 font-roboto font-bold text-[13px] rounded-full border transition-all cursor-pointer focus:outline-none ${
                    restaurantFilter === pill.id 
                      ? 'bg-[#3C2F2F] border-[#3C2F2F] text-white shadow-sm' 
                      : 'bg-white border-gray-200 text-[#6A6A6A] hover:bg-gray-50'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeRestaurantList.map(res => (
              <RestaurantCard 
                key={res.id} 
                restaurant={res} 
                onClick={() => onSelectRestaurant(res)} 
              />
            ))}
          </div>
        </div>

        {/* Dishes by Category */}
        <div className="space-y-10">
          {categoriesList.map(catName => {
            const categoryItems = getFilteredItemsForCategory(catName);
            if (categoryItems.length === 0) return null;
            
            return (
              <div key={catName} className="animate-fadeIn">
                <h3 className="font-poppins font-bold text-[22px] text-[#3C2F2F] mb-5 border-b border-gray-50 pb-2 flex items-center justify-between">
                  <span>{catName === 'Specials' ? 'Chef Specials' : catName === 'Drinks' ? 'Beverages & Shakes' : catName}</span>
                  <span className="text-[12px] font-roboto font-bold text-[#A6A6A6] bg-gray-50 px-2.5 py-1 rounded-full">
                    {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {categoryItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => onSelectFoodItem(item)}
                      className="bg-white rounded-[26px] border border-gray-100 p-4 shadow-[0_5px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex gap-4 group active:scale-[0.99] relative"
                    >
                      <div className="w-[110px] h-[110px] bg-gray-50/70 rounded-[20px] overflow-hidden flex items-center justify-center shrink-0 relative p-1">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          onError={(e) => handleImageError(e, '/assets/hamburger_1.png')}
                          className="max-h-[95px] max-w-[95px] object-contain group-hover:scale-105 transition-transform" 
                        />
                      </div>
                      <div className="text-left flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-poppins font-bold text-[15.5px] text-[#3C2F2F] group-hover:text-[#EF2A39] transition-colors truncate pr-1">{item.name}</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCartDirect(item);
                              }}
                              className="w-7 h-7 rounded-full bg-[#EF2A39] hover:bg-[#D61B29] hover:scale-110 active:scale-95 text-white flex items-center justify-center font-bold text-[16px] transition-all cursor-pointer shadow-sm shrink-0 focus:outline-none"
                            >
                              +
                            </button>
                          </div>
                          <p className="font-roboto text-[11px] text-[#A6A6A6] mt-0.5">{item.brand}</p>
                          <p className="font-roboto text-[12.5px] text-[#6A6A6A] mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-gray-50">
                          <span className="font-poppins font-black text-[16px] text-[#EF2A39]">${item.price.toFixed(2)}</span>
                          <div className="flex items-center gap-2 text-[#A6A6A6] font-roboto font-bold text-[11px]">
                            <span className="text-[#FFE100]">★</span>
                            <span className="text-[#3C2F2F]">{item.rating}</span>
                            <span>• {item.deliveryTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {categoriesList.every(cat => getFilteredItemsForCategory(cat).length === 0) && (
            <div className="text-center py-12 bg-white rounded-[24px] border border-gray-100/70 p-8">
              <span className="text-[40px] block mb-2">🔍</span>
              <h4 className="font-poppins font-bold text-[18px] text-[#3C2F2F]">No dishes match your filters</h4>
              <p className="font-roboto text-[14px] text-[#A6A6A6] mt-1">Try adjusting your pricing, rating, speed filters or search query.</p>
              <button
                onClick={() => {
                  setDesktopPriceFilter('all');
                  setDesktopRatingFilter('all');
                  setDesktopTimeFilter('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-6 py-2 bg-[#EF2A39] text-white text-[13.5px] font-bold font-roboto rounded-full active:scale-95 transition-transform cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer sidebar */}
      {cartItems.length > 0 && (
        <div className="w-[380px] shrink-0">
          <div className="sticky top-[110px] bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm flex flex-col max-h-[calc(100vh-140px)]">
            <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
              <span>Active Basket</span>
              <span className="bg-[#EF2A39]/10 text-[#EF2A39] text-[11px] font-bold px-2.5 py-1 rounded-full uppercase">
                {getTotalItems()} Items
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-hide max-h-[300px] mb-4">
              {cartItems.map(item => (
                <div key={item.cartId} className="flex gap-3 items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <img src={item.foodItem.image} alt={item.foodItem.name} className="w-12 h-12 object-contain" />
                  <div className="flex-1 text-left">
                    <h4 className="font-poppins font-bold text-[13px] text-[#3C2F2F] truncate">{item.foodItem.name}</h4>
                    <p className="font-roboto text-[10.5px] text-[#A6A6A6] mt-0.5">Size: {item.size}</p>
                    <span className="font-poppins font-bold text-[12px] text-[#EF2A39]">${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
                  </div>

                  <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-2 py-1 gap-2.5">
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                      className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center text-[12px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="font-roboto font-bold text-[12px] text-[#3C2F2F]">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                      className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center text-[12px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2.5 font-roboto text-[13.5px] font-bold text-[#6A6A6A] mb-5 text-left">
              {(() => {
                const subtotal = getTotalPrice();
                const deliveryFee = 3.00;
                const serviceFee = 1.50;
                const tax = subtotal * 0.08875;
                const total = subtotal + deliveryFee + serviceFee + tax;
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-[#3C2F2F]">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="text-[#3C2F2F]">${deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-50 pt-2 text-[15px] font-black text-[#3C2F2F]">
                      <span>Est. Total</span>
                      <span className="text-[#EF2A39]">${total.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <button 
              onClick={onProceedToCheckout}
              className="w-full h-[54px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[15px] rounded-[16px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
