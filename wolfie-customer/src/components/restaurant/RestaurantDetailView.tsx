'use client';

import React, { useState } from 'react';
import { Restaurant, FoodItem } from '@/services/restaurantService';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import { useCartStore, CartItem } from '@/store/useCartStore';
import { handleImageError } from '@/utils/image';
import dynamic from 'next/dynamic';
import { logger } from '@/utils/logger';

// Lazy load the reviews tab component
const RestaurantReviews = dynamic(() => import('./RestaurantReviews'), {
  loading: () => <div className="p-6 bg-white border border-gray-100 rounded-[28px] text-gray-500 font-roboto text-[14px]">Loading verified reviews...</div>,
  ssr: false
});

interface RestaurantDetailViewProps {
  restaurant: Restaurant;
  onBack: () => void;
  onSelectFoodItem: (item: FoodItem) => void;
  onProceedToCheckout: () => void;
}

const mockReviews = [
  { id: 'rev_1', author: 'John D.', avatar: '/assets/avatar.png', rating: 5, date: 'Today', comment: "Always fresh, hot and exactly as ordered! The Wendy's burger is a NYC classic." },
  { id: 'rev_2', author: 'Sarah M.', avatar: '/assets/user.png', rating: 4, date: 'Yesterday', comment: "Spicy chicken nuggets were super crispy. Delivery was incredibly fast." },
  { id: 'rev_3', author: 'David K.', avatar: '/assets/user.png', rating: 5, date: '3 days ago', comment: "Best fast food burgers in Manhattan. The double stack is amazing!" }
];

export default function RestaurantDetailView({ restaurant, onBack, onSelectFoodItem, onProceedToCheckout }: RestaurantDetailViewProps) {
  const { menuItems, isLoading } = useRestaurantMenu(restaurant.id, restaurant.name);
  const { items: cartItems, addItem, updateQuantity, removeItem, getTotalPrice, getTotalItems } = useCartStore();

  const [restaurantTab, setRestaurantTab] = useState<'overview' | 'menu' | 'reviews'>('menu');
  const [menuActiveCategory, setMenuActiveCategory] = useState('All');
  const [isFavorite, setIsFavorite] = useState(false);

  const getCartQuantity = (itemId: string) => {
    return cartItems
      .filter(ci => ci.foodItem.id === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0);
  };

  const addRestaurantItemToCart = (item: FoodItem) => {
    const existingIndex = cartItems.findIndex(ci => ci.foodItem.id === item.id);
    if (existingIndex > -1) {
      updateQuantity(cartItems[existingIndex].cartId, cartItems[existingIndex].quantity + 1);
    } else {
      const cartItem: CartItem = {
        cartId: `${item.id}_M_${Date.now()}`,
        foodItem: {
          id: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
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
    }
  };

  const removeRestaurantItemFromCart = (item: FoodItem) => {
    const matchingItems = cartItems.filter(ci => ci.foodItem.id === item.id);
    if (matchingItems.length > 0) {
      // Decrement the last matching item in cart
      const target = matchingItems[matchingItems.length - 1];
      if (target.quantity > 1) {
        updateQuantity(target.cartId, target.quantity - 1);
      } else {
        removeItem(target.cartId);
      }
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left pb-16 px-4">
      {/* Cover Photo */}
      <div className="w-full h-[320px] relative rounded-[32px] overflow-hidden bg-gray-100 mb-8 shadow-sm">
        <img 
          src={restaurant.cover} 
          alt={restaurant.name} 
          onError={(e) => handleImageError(e, '/assets/restaurant_cover_wendys.png')}
          className="w-full h-full object-cover" 
        />
        <button 
          onClick={onBack}
          className="absolute left-6 top-6 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all focus:outline-none cursor-pointer hover:bg-gray-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        
        <div className="absolute right-6 top-6 flex gap-3">
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all focus:outline-none cursor-pointer hover:bg-gray-50"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill={isFavorite ? "#EF2A39" : "none"} 
              stroke={isFavorite ? "#EF2A39" : "#3C2F2F"} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Brand Details Bar */}
      <div className="flex gap-6 items-end mb-8 relative">
        <div className="w-[120px] h-[120px] rounded-[28px] overflow-hidden bg-white border-4 border-white shadow-md flex items-center justify-center shrink-0 -mt-16 z-10">
          <img 
            src={restaurant.logo} 
            alt={restaurant.name} 
            onError={(e) => handleImageError(e, '/assets/restaurant_logo_wendys.png')}
            className="w-full h-full object-cover" 
          />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] leading-none">{restaurant.name}</h2>
            <svg className="w-6 h-6 text-blue-500 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#0066FF"/>
            </svg>
          </div>
          <p className="font-roboto text-[14px] text-[#A6A6A6] mt-2">{restaurant.tags.join(' • ')}</p>
        </div>

        {/* Tab Selection */}
        <div className="bg-gray-100 p-1 rounded-full flex gap-1 select-none">
          {['overview', 'menu', 'reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setRestaurantTab(tab as any)}
              className={`px-6 py-2.5 rounded-full font-roboto font-bold text-[13.5px] uppercase transition-all cursor-pointer focus:outline-none ${
                restaurantTab === tab 
                  ? 'bg-[#EF2A39] text-white shadow-sm'
                  : 'text-[#6A6A6A] hover:text-[#3C2F2F]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Storefront content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          {restaurantTab === 'overview' && (
            <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-6 animate-fadeIn">
              <div>
                <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] mb-3">About Restaurant</h3>
                <p className="font-roboto text-[14.5px] text-[#6A6A6A] leading-relaxed">{restaurant.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center border-t border-gray-100 pt-6">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Avg Time</span>
                  <span className="text-[15px] font-poppins font-bold text-[#3C2F2F] block">{restaurant.deliveryTime}</span>
                </div>
                <div className="space-y-1 border-x border-gray-100">
                  <span className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Del Fee</span>
                  <span className="text-[15px] font-poppins font-bold text-[#3C2F2F] block">${restaurant.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Min Order</span>
                  <span className="text-[15px] font-poppins font-bold text-[#3C2F2F] block">${restaurant.minOrder.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {restaurantTab === 'menu' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {['All', 'Burgers', 'Sides', 'Drinks', 'Specials'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setMenuActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-full font-roboto font-bold text-[13px] border transition-all cursor-pointer focus:outline-none ${
                      menuActiveCategory === cat 
                        ? 'bg-[#3C2F2F] border-[#3C2F2F] text-white shadow-sm' 
                        : 'bg-white border-gray-150 text-[#6A6A6A] hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-gray-500 font-roboto">Loading menu dishes...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {menuItems
                    .filter(item => menuActiveCategory === 'All' || item.category === menuActiveCategory)
                    .map(item => {
                      const qty = getCartQuantity(item.id);
                      return (
                        <div 
                          key={item.id}
                          onClick={() => onSelectFoodItem(item)}
                          className="bg-white border border-gray-100 rounded-[24px] p-4.5 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-4 group active:scale-[0.99] relative"
                        >
                          <div className="w-[100px] h-[100px] bg-gray-50 rounded-[18px] overflow-hidden flex items-center justify-center shrink-0 relative">
                            <img src={item.image} alt={item.name} className="w-[85px] h-[85px] object-contain group-hover:scale-105 transition-transform" />
                          </div>
                          <div className="text-left flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <h4 className="font-poppins font-bold text-[15px] text-[#3C2F2F] group-hover:text-[#EF2A39] transition-colors truncate">{item.name}</h4>
                              <p className="font-roboto text-[12px] text-[#6A6A6A] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-poppins font-black text-[16px] text-[#EF2A39]">${item.price.toFixed(2)}</span>
                              
                              <div 
                                onClick={(e) => e.stopPropagation()} 
                                className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 gap-2"
                              >
                                <button 
                                  onClick={() => removeRestaurantItemFromCart(item)}
                                  className="w-5.5 h-5.5 rounded-full bg-white shadow-sm flex items-center justify-center text-[12px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100"
                                >
                                  -
                                </button>
                                <span className="font-roboto font-bold text-[12.5px] text-[#3C2F2F] min-w-[12px] text-center">{qty}</span>
                                <button 
                                  onClick={() => addRestaurantItemToCart(item)}
                                  className="w-5.5 h-5.5 rounded-full bg-white shadow-sm flex items-center justify-center text-[12px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {restaurantTab === 'reviews' && (
            <RestaurantReviews 
              restaurantName={restaurant.name} 
              rating={restaurant.rating} 
              reviews={mockReviews} 
            />
          )}
        </div>

        {/* Sticky Cart Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm text-left sticky top-[100px]">
            <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
              <span>Active Basket</span>
              <span className="bg-[#EF2A39]/10 text-[#EF2A39] text-[11.5px] font-bold px-2.5 py-1 rounded-full uppercase">
                {getTotalItems()} Items
              </span>
            </h3>

            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-roboto text-[13.5px]">
                Your basket is empty. Add some delicious burgers from the menu!
              </div>
            ) : (
              <>
                <div className="overflow-y-auto space-y-3.5 pr-1 scrollbar-hide max-h-[300px] mb-4">
                  {cartItems.map(item => (
                    <div key={item.cartId} className="flex gap-3 items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <img src={item.foodItem.image} alt={item.foodItem.name} className="w-12 h-12 object-contain" />
                      <div className="flex-1 text-left min-w-0">
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

                <div className="border-t border-gray-100 pt-4 space-y-2.5 font-roboto text-[13.5px] font-bold text-[#6A6A6A] mb-5">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
