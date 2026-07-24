'use client';

import React, { useState } from 'react';
import { FoodItem } from '@/services/restaurantService';
import { useCartStore, CartItem } from '@/store/useCartStore';
import { mockFoodItems } from '@/lib/mockData';
import { toppingOptions, addonOptions, drinkOptions } from '@/lib/constants';
import { handleImageError } from '@/utils/image';

interface FoodItemDetailViewProps {
  foodItem: FoodItem;
  onBack: () => void;
  onVisitStore: () => void;
  onGoToCart: () => void;
  onSelectFoodItem: (item: FoodItem) => void;
}

export default function FoodItemDetailView({ foodItem, onBack, onVisitStore, onGoToCart, onSelectFoodItem }: FoodItemDetailViewProps) {
  const { items: cartItems, addItem, updateQuantity, removeItem } = useCartStore();

  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('M');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
  const [portionCount, setPortionCount] = useState(1);
  const [spicyLevel, setSpicyLevel] = useState(57);
  const [activeCustomizerTab, setActiveCustomizerTab] = useState<'toppings' | 'addons' | 'drinks' | null>(null);
  const [addedToCartFeedback, setAddedToCartFeedback] = useState(false);

  // Recommendations: exclude current customized food item
  const otherMenuItems = mockFoodItems.filter(item => item.id !== foodItem.id);

  const getNutritionValues = (itemId: string) => {
    switch(itemId) {
      case 'food_1': return { kcal: '472 kcal', fat: '26g', saturates: '10g', sugars: '18g', salt: '1.2g' };
      case 'food_2': return { kcal: '320 kcal', fat: '14g', saturates: '4g', sugars: '8g', salt: '0.8g' };
      case 'food_3': return { kcal: '410 kcal', fat: '18g', saturates: '6g', sugars: '12g', salt: '1.0g' };
      case 'food_4': return { kcal: '490 kcal', fat: '24g', saturates: '9g', sugars: '10g', salt: '1.4g' };
      case 'food_5': return { kcal: '620 kcal', fat: '38g', saturates: '16g', sugars: '14g', salt: '1.8g' };
      case 'food_6': return { kcal: '280 kcal', fat: '10g', saturates: '2g', sugars: '16g', salt: '0.6g' };
      case 'food_7': return { kcal: '310 kcal', fat: '15g', saturates: '3g', sugars: '6g', salt: '0.7g' };
      case 'food_8': return { kcal: '350 kcal', fat: '22g', saturates: '12g', sugars: '2g', salt: '1.1g' };
      case 'food_9': return { kcal: '120 kcal', fat: '0g', saturates: '0g', sugars: '28g', salt: '0.05g' };
      case 'food_10': return { kcal: '450 kcal', fat: '16g', saturates: '10g', sugars: '48g', salt: '0.3g' };
      case 'food_11': return { kcal: '380 kcal', fat: '19g', saturates: '6g', sugars: '1g', salt: '1.5g' };
      case 'food_12': return { kcal: '520 kcal', fat: '28g', saturates: '8g', sugars: '11g', salt: '1.3g' };
      default: return { kcal: '420 kcal', fat: '20g', saturates: '20g', sugars: '10g', salt: '1.0g' };
    }
  };

  const getCartItemQuantity = (itemId: string) => {
    return cartItems
      .filter(ci => ci.foodItem.id === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0);
  };

  const adjustCartItemQuantityDirect = (item: FoodItem, delta: number) => {
    const matching = cartItems.filter(ci => ci.foodItem.id === item.id);
    if (matching.length > 0) {
      const target = matching[matching.length - 1];
      if (target.quantity + delta >= 1) {
        updateQuantity(target.cartId, target.quantity + delta);
      } else {
        removeItem(target.cartId);
      }
    } else if (delta > 0) {
      addToCartDirect(item);
    }
  };

  const addToCartDirect = (item: FoodItem) => {
    const cartItem: CartItem = {
      cartId: `${item.id}_M_${Date.now()}`,
      foodItem: {
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        restaurantId: 'rest_wendys',
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

  const toggleOption = (optionId: string, type: 'toppings' | 'addons' | 'drinks') => {
    if (type === 'toppings') {
      setSelectedToppings(prev => 
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    } else if (type === 'addons') {
      setSelectedAddons(prev => 
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    } else if (type === 'drinks') {
      setSelectedDrinks(prev => 
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    }
  };

  const handleAddToBasket = () => {
    // Calculate custom unit price
    const basePrice = foodItem.price;
    const sizeOffset = selectedSize === 'S' ? -0.50 : selectedSize === 'L' ? 1.00 : 0;
    const toppingsPrice = selectedToppings.reduce((sum, id) => sum + (toppingOptions.find(o => o.id === id)?.price || 0), 0);
    const addonsPrice = selectedAddons.reduce((sum, id) => sum + (addonOptions.find(o => o.id === id)?.price || 0), 0);
    const drinksPrice = selectedDrinks.reduce((sum, id) => sum + (drinkOptions.find(o => o.id === id)?.price || 0), 0);
    
    const finalPricePerUnit = basePrice + sizeOffset + toppingsPrice + addonsPrice + drinksPrice;

    const cartItem: CartItem = {
      cartId: `${foodItem.id}_${selectedSize}_${Date.now()}`,
      foodItem: {
        id: foodItem.id,
        name: foodItem.name,
        image: foodItem.image,
        price: foodItem.price,
        restaurantId: 'rest_wendys',
        restaurantName: foodItem.brand,
      },
      quantity: portionCount,
      size: selectedSize,
      toppings: selectedToppings,
      addons: selectedAddons,
      drinks: selectedDrinks,
      spicy: spicyLevel,
      pricePerUnit: finalPricePerUnit,
    };

    addItem(cartItem);
    setAddedToCartFeedback(true);
    setTimeout(() => setAddedToCartFeedback(false), 2000);
  };

  const currentItemNutrition = getNutritionValues(foodItem.id);

  // Compute live customized total price
  const sizeOffset = selectedSize === 'S' ? -0.50 : selectedSize === 'L' ? 1.00 : 0;
  const toppingsTotal = selectedToppings.reduce((sum, id) => sum + (toppingOptions.find(o => o.id === id)?.price || 0), 0);
  const addonsTotal = selectedAddons.reduce((sum, id) => sum + (addonOptions.find(o => o.id === id)?.price || 0), 0);
  const drinksTotal = selectedDrinks.reduce((sum, id) => sum + (drinkOptions.find(o => o.id === id)?.price || 0), 0);
  const totalItemPrice = ((foodItem.price + sizeOffset + toppingsTotal + addonsTotal + drinksTotal) * portionCount);

  return (
    <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left flex flex-col lg:flex-row gap-8 py-6 px-4">
      {/* Left Side: Selected Item Customizer & Details Card */}
      <div className="flex-1 bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-between">
        <div>
          {/* Top row indicators */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-2 rounded-full ${i === 0 ? 'w-6 bg-[#EF2A39]' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
            <span className="text-[13px] font-roboto font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full shadow-xs border border-gray-100">{currentItemNutrition.kcal}</span>
          </div>

          {/* Back button and Visit Store */}
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center shadow-xs active:scale-95 transition-all focus:outline-none cursor-pointer hover:bg-gray-100"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>

            <button 
              onClick={onVisitStore}
              className="px-5 py-2 bg-[#EF2A39]/10 hover:bg-[#EF2A39]/15 border border-[#EF2A39]/20 rounded-full text-[13px] font-roboto font-bold text-[#EF2A39] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
            >
              <span>Visit Store</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Image display */}
          <div className="relative flex items-center justify-center h-[260px] w-full mb-6 bg-gray-50/40 rounded-[28px] p-6">
            <img 
              src={foodItem.image} 
              alt={foodItem.name} 
              onError={(e) => handleImageError(e, '/assets/hamburger_1.png')}
              className="max-h-[220px] max-w-[220px] object-contain hover:scale-105 transition-transform duration-300" 
            />
          </div>

          {/* Nutrition Pills */}
          <div className="flex gap-2.5 flex-wrap my-5 select-none">
            <span className="font-roboto font-bold text-[12px] text-gray-500 bg-gray-50 border border-gray-100/70 px-4 py-1.5 rounded-full">Fat: {currentItemNutrition.fat}</span>
            <span className="font-roboto font-bold text-[12px] text-gray-500 bg-gray-50 border border-gray-100/70 px-4 py-1.5 rounded-full">Saturates: {currentItemNutrition.saturates}</span>
            <span className="font-roboto font-bold text-[12px] text-gray-500 bg-gray-50 border border-gray-100/70 px-4 py-1.5 rounded-full">Sugars: {currentItemNutrition.sugars}</span>
            <span className="font-roboto font-bold text-[12px] text-gray-500 bg-gray-50 border border-gray-100/70 px-4 py-1.5 rounded-full">Salt: {currentItemNutrition.salt}</span>
          </div>

          {/* Item Info */}
          <div className="space-y-4">
            <div>
              <span className="font-roboto font-bold text-[12.5px] text-[#EF2A39] uppercase tracking-[0.15em] block">{foodItem.brand}</span>
              <h2 className="font-poppins font-bold text-[30px] text-[#3C2F2F] mt-1 mb-2 leading-tight">{foodItem.name}</h2>
              <div className="flex items-center gap-2 text-[#FFE100] text-[14.5px]">
                <span>★ {foodItem.rating.toFixed(1)}</span>
                <span className="text-gray-300 font-normal">•</span>
                <span className="font-roboto text-[13px] font-bold text-[#A6A6A6]">{foodItem.deliveryTime} delivery speed</span>
              </div>
            </div>

            <p className="font-roboto text-[15px] text-[#6A6A6A] leading-relaxed">{foodItem.description}</p>
            
            {/* Customizer Capsules */}
            <div className="space-y-3 pt-3 border-t border-gray-50">
              <span className="font-roboto font-semibold text-[13.5px] text-[#A6A6A6] uppercase tracking-wider block">Add Customizations</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveCustomizerTab('toppings')}
                  className={`px-4.5 py-2.5 rounded-full border flex items-center gap-2 font-inter font-medium text-[12.5px] transition-all cursor-pointer focus:outline-none bg-white ${
                    selectedToppings.length > 0 ? 'border-[#EF2A39] text-[#EF2A39] bg-[#EF2A39]/5 shadow-sm' : 'border-gray-200 text-[#3C2F2F] hover:border-gray-300'
                  }`}
                >
                  <span className="text-[#EF2A39] font-bold text-[15px]">+</span> Toppings
                  {selectedToppings.length > 0 && <span className="bg-[#EF2A39] text-white text-[9.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">{selectedToppings.length}</span>}
                </button>

                <button
                  onClick={() => setActiveCustomizerTab('addons')}
                  className={`px-4.5 py-2.5 rounded-full border flex items-center gap-2 font-inter font-medium text-[12.5px] transition-all cursor-pointer focus:outline-none bg-white ${
                    selectedAddons.length > 0 ? 'border-[#EF2A39] text-[#EF2A39] bg-[#EF2A39]/5 shadow-sm' : 'border-gray-200 text-[#3C2F2F] hover:border-gray-300'
                  }`}
                >
                  <span className="text-[#EF2A39] font-bold text-[15px]">+</span> Addons
                  {selectedAddons.length > 0 && <span className="bg-[#EF2A39] text-white text-[9.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">{selectedAddons.length}</span>}
                </button>

                <button
                  onClick={() => setActiveCustomizerTab('drinks')}
                  className={`px-4.5 py-2.5 rounded-full border flex items-center gap-2 font-inter font-medium text-[12.5px] transition-all cursor-pointer focus:outline-none bg-white ${
                    selectedDrinks.length > 0 ? 'border-[#EF2A39] text-[#EF2A39] bg-[#EF2A39]/5 shadow-sm' : 'border-gray-200 text-[#3C2F2F] hover:border-gray-300'
                  }`}
                >
                  <span className="text-[#EF2A39] font-bold text-[15px]">+</span> Drinks
                  {selectedDrinks.length > 0 && <span className="bg-[#EF2A39] text-white text-[9.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">{selectedDrinks.length}</span>}
                </button>
              </div>
            </div>

            {/* Portion & Spicy */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-50">
              <div className="space-y-2.5">
                <span className="font-roboto font-semibold text-[14px] text-[#3C2F2F] block">Spicy level</span>
                <div className="relative flex items-center h-5 w-full">
                  <div className="absolute left-0 right-0 h-[4px] bg-gray-100 rounded-full" />
                  <div className="absolute left-0 h-[4px] bg-[#EF2A39] rounded-full" style={{ width: `${spicyLevel}%` }} />
                  <div className="absolute w-3.5 h-3.5 bg-[#EF2A39] rounded-full shadow-sm -translate-x-1/2 pointer-events-none" style={{ left: `${spicyLevel}%` }} />
                  <input type="range" min="0" max="100" value={spicyLevel} onChange={(e) => setSpicyLevel(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                </div>
                <div className="flex justify-between text-[11px] font-roboto font-bold">
                  <span className="text-green-500">Mild</span>
                  <span className="text-[#EF2A39]">Hot</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="font-roboto font-semibold text-[14px] text-[#3C2F2F] block">Portion count</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPortionCount(p => Math.max(1, p - 1))} className="w-8.5 h-8.5 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center text-[#EF2A39] hover:bg-gray-50 active:scale-90 cursor-pointer focus:outline-none text-[16px] font-bold">-</button>
                  <span className="font-poppins font-black text-[16px] text-[#3C2F2F] w-5 text-center">{portionCount}</span>
                  <button onClick={() => setPortionCount(p => p + 1)} className="w-8.5 h-8.5 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center text-[#EF2A39] hover:bg-gray-50 active:scale-90 cursor-pointer focus:outline-none text-[16px] font-bold">+</button>
                </div>
              </div>
            </div>

            {/* Size selector */}
            <div className="pt-4 border-t border-gray-50 text-left">
              <span className="font-roboto font-semibold text-[14px] text-[#A6A6A6] uppercase tracking-wider block mb-2.5">Size</span>
              <div className="flex gap-3">
                {['S', 'M', 'L'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size as any)}
                    className={`px-4.5 py-2.5 rounded-xl font-poppins font-black text-[13.5px] cursor-pointer active:scale-95 transition-all focus:outline-none ${
                      selectedSize === size ? 'bg-[#FFE100] text-[#3C2F2F] shadow-sm' : 'bg-gray-50 border border-gray-100 text-[#3C2F2F] hover:bg-gray-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing bottom and Add button */}
        <div className="flex items-center gap-5 pt-6 mt-6 border-t border-gray-100">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-2 text-center shrink-0">
            <span className="text-[9.5px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Total Price</span>
            <span className="font-poppins font-black text-[22px] text-[#3C2F2F]">
              ${totalItemPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex-1 flex gap-3.5">
            <button 
              onClick={handleAddToBasket}
              className="flex-1 h-[54px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[15px] rounded-[16px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center font-bold"
            >
              {addedToCartFeedback ? "✓ ADDED TO BASKET!" : "ADD TO BASKET"}
            </button>
            <button 
              onClick={onGoToCart}
              className="w-[54px] h-[54px] bg-[#EF2A39] hover:bg-[#D61B29] rounded-[16px] flex items-center justify-center cursor-pointer active:scale-95 transition-all focus:outline-none shrink-0 relative shadow-sm"
            >
              {/* Basket Icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartItems.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-white text-[#EF2A39] border border-[#EF2A39] text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Other Menu Items Grid */}
      <div className="w-full lg:w-[620px] xl:w-[660px] shrink-0 flex flex-col justify-start">
        <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm flex-1 flex flex-col">
          <h3 className="font-poppins font-bold text-[19px] text-[#3C2F2F] mb-5 border-b border-gray-50 pb-3 flex items-center justify-between">
            <span>Other Delicious Choices</span>
            <span className="text-[12px] font-roboto font-bold text-[#A6A6A6]">Explore More</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto max-h-[750px] pr-1 scrollbar-hide">
            {otherMenuItems.map(item => {
              const itemQty = getCartItemQuantity(item.id);
              const nutrition = getNutritionValues(item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => {
                    // Update main foodItem being customized
                    // Rather than standard navigation, trigger local state reset in props
                    // But we can simply trigger onSelectFoodItem
                    // Since it's passed as a callback
                    onSelectFoodItem(item);
                    setSelectedSize('M');
                    setSelectedToppings([]);
                    setSelectedAddons([]);
                    setSelectedDrinks([]);
                    setPortionCount(1);
                    setSpicyLevel(57);
                    setActiveCustomizerTab(null);
                  }}
                  className="bg-white rounded-[24px] border border-gray-100 p-4.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between group h-[300px]"
                >
                  <div>
                    {/* Card header */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((x) => (
                          <div key={x} className={`w-1.5 h-1.5 rounded-full ${x === 0 ? 'bg-orange-400' : 'bg-gray-250'}`} />
                        ))}
                      </div>
                      <span className="text-[9.5px] font-bold text-gray-400 bg-gray-50 border border-gray-100/60 px-2 py-0.5 rounded-full">{nutrition.kcal}</span>
                    </div>

                    {/* Image */}
                    <div className="w-full h-[95px] flex items-center justify-center bg-gray-50/20 rounded-[16px] overflow-hidden mb-3">
                      <img src={item.image} alt={item.name} className="max-h-[85px] max-w-[85px] object-contain group-hover:scale-105 transition-transform" />
                    </div>

                    {/* Title & Description */}
                    <h4 className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] group-hover:text-[#EF2A39] transition-colors truncate">{item.name}</h4>
                    <p className="font-roboto text-[11.5px] text-[#A6A6A6] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                  </div>

                  {/* Bottom controls */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="font-poppins font-black text-[15.5px] text-[#3C2F2F]">${item.price.toFixed(2)}</span>

                    <div className="flex items-center gap-2">
                      {/* Selector [- N +] */}
                      <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-2 py-1 gap-2 shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustCartItemQuantityDirect(item, -1);
                          }}
                          className="w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center text-[10px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="font-roboto font-bold text-[11px] text-[#3C2F2F] w-3 text-center">{itemQty}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustCartItemQuantityDirect(item, 1);
                          }}
                          className="w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center text-[10px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Cart Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCartDirect(item);
                        }}
                        className="w-7 h-7 rounded-full bg-green-55/10 hover:bg-green-55/20 text-[#2AA05B] flex items-center justify-center font-bold text-[14px] transition-all cursor-pointer border border-[#2AA05B]/20 shrink-0 bg-green-50/50"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Customizer Popup for Options (Toppings/Addons/Drinks) */}
      {activeCustomizerTab && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-[480px] p-7 shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] animate-scaleUp text-left">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-50">
              <h3 className="font-poppins font-bold text-[20px] text-[#3C2F2F] capitalize">
                Choose {activeCustomizerTab}
              </h3>
              <button 
                onClick={() => setActiveCustomizerTab(null)}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-hide">
              {(activeCustomizerTab === 'toppings' ? toppingOptions : activeCustomizerTab === 'addons' ? addonOptions : drinkOptions).map((option) => {
                const isSelected = activeCustomizerTab === 'toppings' 
                  ? selectedToppings.includes(option.id)
                  : activeCustomizerTab === 'addons' 
                    ? selectedAddons.includes(option.id)
                    : selectedDrinks.includes(option.id);
                
                return (
                  <div 
                    key={option.id}
                    onClick={() => toggleOption(option.id, activeCustomizerTab)}
                    className={`flex items-center justify-between p-3.5 rounded-[16px] border transition-all cursor-pointer select-none active:scale-[0.99] ${
                      isSelected 
                        ? 'border-[#FFE100] bg-[#FFE100]/5' 
                        : 'border-gray-100 bg-white hover:border-gray-250'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-[20px] h-[20px] rounded-[6px] border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-[#EF2A39] border-[#EF2A39]' : 'border-gray-300 bg-white'
                      }`}>
                        {isSelected && (
                          <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="font-roboto font-medium text-[15px] text-[#3C2F2F]">{option.name}</span>
                    </div>
                    <span className="font-roboto font-semibold text-[15px] text-[#EF2A39]">+${option.price.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={() => setActiveCustomizerTab(null)}
              className="mt-6 w-full h-[54px] bg-[#FFE100] hover:brightness-95 active:scale-95 text-[#3C2F2F] font-roboto font-bold text-[15.5px] rounded-[18px] shadow-sm transition-all cursor-pointer focus:outline-none flex items-center justify-center"
            >
              Apply Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
