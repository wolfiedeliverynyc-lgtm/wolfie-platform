import React from 'react';
import { MapPin, Navigation, Info, Clock } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';

export default function AddressPanel() {
  const { addressInfo, setAddressInfo } = useCartStore();

  return (
    <div className="glass-panel overflow-hidden mb-6">
      {/* Fake Map Header */}
      <div className="relative h-32 bg-neutral-900 w-full overflow-hidden">
        {/* Placeholder map pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', 
            backgroundSize: '20px 20px' 
          }}
        />
        <div className="absolute inset-0 map-gradient-overlay" />
        
        {/* Map Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 drop-shadow-lg flex flex-col items-center">
          <MapPin size={32} fill="#D4AF37" color="#000" />
          <div className="w-4 h-1 bg-black/50 rounded-[100%] mt-1 blur-[1px]" />
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Navigation size={18} className="text-amber-500" /> 
          Delivery Details
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1 block">
              Street Address
            </label>
            <input 
              type="text" 
              value={addressInfo.street}
              onChange={(e) => setAddressInfo({ street: e.target.value })}
              placeholder="123 Wolfie Blvd..." 
              className="w-full dark-input py-3 px-4 rounded-[2.5rem] text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1 block">
                Apt / Suite
              </label>
              <input 
                type="text" 
                value={addressInfo.apartment}
                onChange={(e) => setAddressInfo({ apartment: e.target.value })}
                placeholder="Apt 4B" 
                className="w-full dark-input py-3 px-4 rounded-[2.5rem] text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-1 block">
                Dropoff Preference
              </label>
              <select 
                value={addressInfo.instructions}
                onChange={(e) => setAddressInfo({ instructions: e.target.value })}
                className="w-full dark-input py-3 px-4 rounded-[2.5rem] text-sm appearance-none"
              >
                <option value="Leave at door">Leave at door</option>
                <option value="Meet outside">Meet outside</option>
                <option value="Hand to me">Hand to me</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
