'use client';

import React, { useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { toppingOptions, addonOptions, drinkOptions, MAPBOX_TOKEN } from '@/lib/constants';

interface CartViewProps {
  deliveryAddress: string;
  setDeliveryAddress: (address: string) => void;
  isEditingAddress: boolean;
  setIsEditingAddress: (val: boolean) => void;
  deliveryLocations: Array<{ id: string; name: string; address: string }>;
  onKeepOrdering: () => void;
  onCheckout: () => void;
}

export default function CartView({
  deliveryAddress,
  setDeliveryAddress,
  isEditingAddress,
  setIsEditingAddress,
  deliveryLocations,
  onKeepOrdering,
  onCheckout,
}: CartViewProps) {
  const { items: cartItems, updateQuantity, removeItem } = useCartStore();
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
  const deliveryFee = 3.00;
  const serviceFee = 1.50;
  const tax = subtotal * 0.08875;
  const total = subtotal + deliveryFee + serviceFee + tax;

  const fetchGPSAddress = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=address`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const firstFeature = data.features[0];
              const fullAddress = firstFeature.place_name.replace(', United States', '');
              const placeName = firstFeature.text || 'Detected Location';
              setDeliveryAddress(`${placeName}: ${fullAddress}`);
            } else {
              alert('No address found for these coordinates.');
            }
          } else {
            alert('Mapbox geocoding service failed.');
          }
        } catch (err) {
          console.error(err);
          alert('Failed to connect to geocoding service.');
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (err) => {
        console.error(err);
        alert('Permission denied or location lookup failed.');
        setIsFetchingLocation(false);
      }
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left pb-16">
      <h2 className="font-poppins font-bold text-[28px] text-[#3C2F2F] mb-8">Your Active Basket</h2>

      {cartItems.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[28px] p-16 text-center shadow-sm select-none flex flex-col items-center justify-center">
          <div className="w-[100px] h-[100px] bg-red-50 rounded-full flex items-center justify-center mb-6 text-[#EF2A39]">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <span className="font-poppins font-bold text-[20px] text-[#3C2F2F]">Your Basket is Empty</span>
          <p className="font-roboto text-[14.5px] text-[#A6A6A6] max-w-[360px] mt-2 leading-relaxed">
            Explore Wendy's and Shake Shack storefronts to add some gourmet burgers and sides!
          </p>
          <button 
            onClick={onKeepOrdering}
            className="mt-6 px-8 py-3 bg-[#FFE100] text-[#3C2F2F] font-roboto font-bold text-[14.5px] rounded-full active:scale-95 transition-all shadow-sm focus:outline-none cursor-pointer"
          >
            Go Shop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-4">
              {cartItems.map(item => (
                <div key={item.cartId} className="flex gap-4 items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="w-[74px] h-[74px] bg-gray-50 rounded-[14px] flex items-center justify-center shrink-0">
                    <img src={item.foodItem.image} alt={item.foodItem.name} className="w-14 h-14 object-contain" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-poppins font-bold text-[15px] text-[#3C2F2F] truncate">{item.foodItem.name}</h4>
                    <p className="font-roboto text-[11px] text-[#A6A6A6] mt-0.5">{item.foodItem.restaurantName} • Size: {item.size} • Spicy: {item.spicy}%</p>
                    
                    {/* Customization Details */}
                    {((item.toppings || []).length > 0 || (item.addons || []).length > 0 || (item.drinks || []).length > 0) && (
                      <p className="font-roboto text-[11.5px] text-[#6A6A6A] mt-1 leading-snug truncate">
                        {[
                          ...item.toppings.map(id => toppingOptions.find(o => o.id === id)?.name),
                          ...item.addons.map(id => addonOptions.find(o => o.id === id)?.name),
                          ...item.drinks.map(id => drinkOptions.find(o => o.id === id)?.name)
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <span className="font-roboto font-bold text-[12px] text-[#A6A6A6] block mt-1.5">
                      ${item.pricePerUnit.toFixed(2)} each
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 gap-3">
                      <button 
                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                        className="w-5.5 h-5.5 rounded-full bg-white shadow-sm flex items-center justify-center text-[12px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100 focus:outline-none"
                      >
                        -
                      </button>
                      <span className="font-roboto font-bold text-[13.5px] text-[#3C2F2F]">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                        className="w-5.5 h-5.5 rounded-full bg-white shadow-sm flex items-center justify-center text-[12px] text-[#3C2F2F] font-bold cursor-pointer hover:bg-gray-100 focus:outline-none"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => removeItem(item.cartId)}
                      className="text-[#EF2A39] hover:bg-red-50 p-2.5 rounded-full transition-colors focus:outline-none cursor-pointer"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery Details Card */}
            <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                <span className="font-poppins font-bold text-[15.5px] text-[#3C2F2F]">Delivery Details</span>
                
                {isEditingAddress ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditingAddress(false)}
                      className="text-[12px] font-roboto font-bold text-[#A6A6A6] bg-gray-50 px-3 py-1 rounded-full border border-gray-100 cursor-pointer focus:outline-none"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditingAddress(true)}
                    className="text-[12.5px] font-roboto font-bold text-[#EF2A39] hover:bg-red-50/50 px-3 py-1 rounded-full cursor-pointer focus:outline-none transition-colors"
                  >
                    Change
                  </button>
                )}
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="w-[42px] h-[42px] bg-red-50 text-[#EF2A39] rounded-[14px] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  {isEditingAddress ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="flex-1 bg-[#F9FAFB] border border-gray-150 rounded-[16px] px-4 py-3 text-[14.5px] font-medium text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30"
                          placeholder="Enter custom delivery address..."
                        />
                        <button 
                          type="button"
                          disabled={isFetchingLocation}
                          onClick={fetchGPSAddress}
                          className="px-4 bg-[#EF2A39]/10 hover:bg-[#EF2A39]/15 text-[#EF2A39] font-roboto font-bold text-[12.5px] rounded-[16px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {isFetchingLocation ? 'Locating...' : 'Use GPS'}
                        </button>
                      </div>

                      {deliveryLocations.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11.5px] font-poppins font-bold text-[#A6A6A6] uppercase tracking-wider block">Select Saved Location:</span>
                          <div className="flex flex-wrap gap-2">
                            {deliveryLocations.map(loc => {
                              const isSel = deliveryAddress === `${loc.name}: ${loc.address}` || deliveryAddress === loc.address;
                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => setDeliveryAddress(`${loc.name}: ${loc.address}`)}
                                  className={`px-3.5 py-2 rounded-full text-[12.5px] font-roboto font-bold border transition-all cursor-pointer ${
                                    isSel 
                                      ? 'border-[#EF2A39] bg-[#EF2A39]/5 text-[#EF2A39]' 
                                      : 'border-gray-200 bg-white text-[#3C2F2F] hover:bg-gray-50'
                                  }`}
                                >
                                  📍 {loc.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button 
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="w-full py-3 bg-[#FFE100] hover:bg-[#FFE100]/95 text-[#3C2F2F] font-poppins font-bold text-[13.5px] rounded-[16px] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                      >
                        Confirm Address
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block">Deliver to:</span>
                      <span className="font-roboto text-[13.5px] text-[#A6A6A6] block mt-0.5 truncate">{deliveryAddress}</span>
                      <div className="flex items-center gap-1.5 text-green-600 font-roboto text-[11.5px] font-bold mt-2">
                        <span>🛵 estimated arrival in 25 mins</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary breakdown panel */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm text-left sticky top-[100px] space-y-6">
              <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F] border-b border-gray-100 pb-3">Order Summary</h3>
              
              <div className="space-y-3 font-roboto text-[14px] font-bold text-[#6A6A6A] border-b border-gray-100 pb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-[#3C2F2F]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="text-[#3C2F2F]">${deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee</span>
                  <span className="text-[#3C2F2F]">${serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>NY Tax (8.875%)</span>
                  <span className="text-[#3C2F2F]">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[18px] font-black text-[#3C2F2F]">
                <span>Total Amount</span>
                <span className="text-[#EF2A39]">${total.toFixed(2)}</span>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={onKeepOrdering}
                  className="w-[120px] h-[52px] bg-white border border-gray-200 hover:bg-gray-50 text-[#3C2F2F] rounded-[16px] font-roboto font-bold text-[13.5px] transition-all cursor-pointer focus:outline-none"
                >
                  Keep Ordering
                </button>
                
                <button 
                  onClick={onCheckout}
                  className="flex-1 h-[52px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[14.5px] rounded-[16px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center gap-1.5"
                >
                  Checkout
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
