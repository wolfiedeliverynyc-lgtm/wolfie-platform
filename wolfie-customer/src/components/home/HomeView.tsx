'use client';

import React, { useState } from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCartStore, CartItem } from '@/store/useCartStore';
import { Restaurant, FoodItem } from '@/services/restaurantService';
import { mockRestaurants, mockFoodItems } from '@/lib/mockData';
import { handleImageError } from '@/utils/image';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import FlowingMenu from '@/app/FlowingMenu';


interface HomeViewProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onSelectFoodItem: (item: FoodItem) => void;
  onProceedToCheckout: () => void;
  
  sortBy: 'all' | 'near' | 'rating' | 'best_seller';
  setSortBy: (val: 'all' | 'near' | 'rating' | 'best_seller') => void;
  priceFilter: 'all' | 'under3' | 'under5' | 'over5';
  setPriceFilter: (val: 'all' | 'under3' | 'under5' | 'over5') => void;
  feeFilter: 'all' | 'under1' | 'under2';
  setFeeFilter: (val: 'all' | 'under1' | 'under2') => void;
  selectedDiets: string[];
  setSelectedDiets: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCuisines: string[];
  setSelectedCuisines: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function HomeView({ 
  onSelectRestaurant, 
  onSelectFoodItem, 
  onProceedToCheckout,
  sortBy: restaurantFilter,
  setSortBy: setRestaurantFilter,
  priceFilter: desktopPriceFilter,
  setPriceFilter: setDesktopPriceFilter,
  feeFilter,
  setFeeFilter,
  selectedDiets,
  setSelectedDiets,
  selectedCuisines,
  setSelectedCuisines
}: HomeViewProps) {
  const { restaurants: liveRestaurants, isLoading } = useRestaurants();
  const { items: cartItems, addItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Desktop Filters State (Only local rating and speed)
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
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (restaurantFilter === 'near' && item.distance > 0.5) return false;
    if (restaurantFilter === 'rating' && item.rating < 4.7) return false;
    if (restaurantFilter === 'best_seller' && !item.isBestSeller) return false;

    // Price Filter Check
    if (desktopPriceFilter === 'under3' && item.deliveryFee >= 1.00) return false;
    if (desktopPriceFilter === 'under5' && item.deliveryFee >= 2.00) return false;
    if (desktopPriceFilter === 'over5' && item.deliveryFee < 2.00) return false;

    // Max Delivery Fee Check
    if (feeFilter === 'under1' && item.deliveryFee >= 1.00) return false;
    if (feeFilter === 'under2' && item.deliveryFee >= 2.00) return false;

    // Dietary preferences
    if (selectedDiets.length > 0) {
      const match = selectedDiets.every(diet => 
        item.tags.some(tag => tag.toLowerCase() === diet.toLowerCase()) ||
        item.description.toLowerCase().includes(diet.toLowerCase())
      );
      if (!match) return false;
    }

    // Cuisine Tags
    if (selectedCuisines.length > 0) {
      const match = selectedCuisines.some(cuisine =>
        item.tags.some(tag => tag.toLowerCase() === cuisine.toLowerCase())
      );
      if (!match) return false;
    }

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
        
        {/* Minimalist Hero Section */}
        <div className="w-full h-[260px] bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden mb-8 shadow-sm flex items-center justify-between border border-slate-800">
          <div className="max-w-[480px] z-10 text-left">
            <span className="text-[12px] font-semibold bg-white/10 text-slate-200 px-3.5 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md">NYC Gourmet Delivery</span>
            <h2 className="font-bold text-[32px] mt-4 mb-2.5 leading-tight tracking-tight text-white">Order premium meals delivered under 25 mins.</h2>
            <p className="text-[14px] text-slate-400 font-normal">Tailored dietary screening protects your lifestyle and allergy preferences.</p>
          </div>
          <img 
            src="/assets/onboarding_burger.png" 
            alt="Promo Burger" 
            onError={(e) => handleImageError(e, '/assets/onboarding_burger.png')}
            className="w-[260px] object-contain scale-110 -rotate-6 transform translate-x-2 z-10 filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-125 duration-500" 
          />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-rose-500/30 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Minimalist Search Bar */}
        <div className="mb-6 relative">
          <input 
            type="text"
            placeholder="Search premium dishes or restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[56px] minimal-input px-6 font-medium text-[15px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#EF2A39] transition-all shadow-xs"
          />
        </div>

        {/* Minimalist Desktop Filters section */}
        <div className="mb-8 bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#EF2A39]" />
            <span className="font-semibold text-[14px] text-slate-900">Filters</span>
          </div>
          
          <div className="flex flex-wrap gap-5 items-center">
            {/* Price filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Price</span>
              <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'under3', label: '<$3' },
                  { id: 'under5', label: '<$5' },
                  { id: 'over5', label: '$5+' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDesktopPriceFilter(p.id as any)}
                    className={`px-3 py-1 text-[12px] font-medium rounded-lg transition-all cursor-pointer focus:outline-none ${
                      desktopPriceFilter === p.id 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Rating</span>
              <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'high', label: '4.7+ ★' },
                  { id: 'veryhigh', label: '4.9+ ★' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDesktopRatingFilter(r.id as any)}
                    className={`px-3 py-1 text-[12px] font-medium rounded-lg transition-all cursor-pointer focus:outline-none ${
                      desktopRatingFilter === r.id 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed filter */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider">Speed</span>
              <div className="flex gap-1 bg-slate-100/70 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'fast', label: '<25m' },
                  { id: 'veryfast', label: '<20m' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setDesktopTimeFilter(s.id as any)}
                    className={`px-3 py-1 text-[12px] font-medium rounded-lg transition-all cursor-pointer focus:outline-none ${
                      desktopTimeFilter === s.id 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gourmet Categories (FlowingMenu) */}
        <div className="mb-10 animate-fadeIn">
          <h3 className="font-poppins font-bold text-[22px] text-[#3C2F2F] mb-5">Browse Cuisines</h3>
          <div style={{ height: '350px', position: 'relative', borderRadius: '24px', overflow: 'hidden' }} className="shadow-lg border border-gray-100">
            <FlowingMenu 
              items={[
                { 
                  link: '#', 
                  text: selectedCuisines.includes('Burgers') ? '✓ Burgers' : 'Burgers', 
                  image: '/assets/hamburger_1.png',
                  onClick: () => {
                    setSelectedCuisines(prev => prev.includes('Burgers') ? prev.filter(c => c !== 'Burgers') : [...prev, 'Burgers']);
                  }
                },
                { 
                  link: '#', 
                  text: selectedCuisines.includes('Fast Food') ? '✓ Fast Food' : 'Fast Food', 
                  image: '/assets/hamburger_details.png',
                  onClick: () => {
                    setSelectedCuisines(prev => prev.includes('Fast Food') ? prev.filter(c => c !== 'Fast Food') : [...prev, 'Fast Food']);
                  }
                },
                { 
                  link: '#', 
                  text: selectedCuisines.includes('Fries') ? '✓ Fries' : 'Fries', 
                  image: '/assets/hamburger_3.png',
                  onClick: () => {
                    setSelectedCuisines(prev => prev.includes('Fries') ? prev.filter(c => c !== 'Fries') : [...prev, 'Fries']);
                  }
                },
                { 
                  link: '#', 
                  text: selectedCuisines.includes('Shakes') ? '✓ Shakes' : 'Shakes', 
                  image: '/assets/hamburger_4.png',
                  onClick: () => {
                    setSelectedCuisines(prev => prev.includes('Shakes') ? prev.filter(c => c !== 'Shakes') : [...prev, 'Shakes']);
                  }
                }
              ]}
              speed={4}
              textColor="#ffffff"
              bgColor="#3C2F2F"
              marqueeBgColor="#EF2A39"
              marqueeTextColor="#ffffff"
              borderColor="rgba(255, 255, 255, 0.15)"
            />
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
                  className={`px-4 py-1.5 font-medium text-[13px] rounded-full border transition-all cursor-pointer focus:outline-none ${
                    restaurantFilter === pill.id 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
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
                <h3 className="font-bold text-[20px] text-slate-900 mb-4 border-b border-slate-200/50 pb-2.5 flex items-center justify-between">
                  <span>{catName === 'Specials' ? 'Chef Specials' : catName === 'Drinks' ? 'Beverages & Shakes' : catName}</span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {categoryItems.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => onSelectFoodItem(item)}
                      className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-xs hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex gap-4 group active:scale-[0.99] relative"
                    >
                      <div className="w-[100px] h-[100px] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0 relative p-1.5">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          onError={(e) => handleImageError(e, '/assets/hamburger_1.png')}
                          className="max-h-[90px] max-w-[90px] object-contain group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                      <div className="text-left flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-[15px] text-slate-900 group-hover:text-[#EF2A39] transition-colors truncate pr-1">{item.name}</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCartDirect(item);
                              }}
                              className="w-7 h-7 rounded-full bg-slate-900 hover:bg-[#EF2A39] hover:scale-110 active:scale-95 text-white flex items-center justify-center font-semibold text-[15px] transition-all cursor-pointer shadow-xs shrink-0 focus:outline-none"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">{item.brand}</p>
                          <p className="text-[12px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                          <span className="font-bold text-[15px] text-slate-900">${item.price.toFixed(2)}</span>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                            <span className="text-amber-500 font-semibold">★</span>
                            <span className="text-slate-800 font-semibold">{item.rating}</span>
                            <span className="text-slate-300">•</span>
                            <span>{item.deliveryTime}</span>
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
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/60 p-8 shadow-xs">
              <span className="text-[36px] block mb-2 opacity-75">🔍</span>
              <h4 className="font-bold text-[17px] text-slate-900">No dishes match your filters</h4>
              <p className="text-[13px] text-slate-500 mt-1">Try adjusting your pricing, rating, speed filters or search query.</p>
              <button
                onClick={() => {
                  setDesktopPriceFilter('all');
                  setDesktopRatingFilter('all');
                  setDesktopTimeFilter('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-5 py-2 bg-slate-900 hover:bg-[#EF2A39] text-white text-[13px] font-medium rounded-full active:scale-95 transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer sidebar */}
      {cartItems.length > 0 && (
        <div className="w-[360px] shrink-0">
          <div className="sticky top-[100px] bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col max-h-[calc(100vh-120px)]">
            <h3 className="font-bold text-[17px] text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <span>Active Basket</span>
              <span className="bg-slate-100 text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase">
                {getTotalItems()} Items
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-hide max-h-[300px] mb-4">
              {cartItems.map(item => (
                <div key={item.cartId} className="flex gap-3 items-center border-b border-slate-100/60 pb-3 last:border-0 last:pb-0">
                  <img src={item.foodItem.image} alt={item.foodItem.name} className="w-11 h-11 object-contain shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold text-[13px] text-slate-900 truncate">{item.foodItem.name}</h4>
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
