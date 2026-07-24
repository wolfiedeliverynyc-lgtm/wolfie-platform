import React from 'react';
import { Restaurant } from '@/services/restaurantService';
import { handleImageError } from '@/utils/image';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
}

export default function RestaurantCard({ restaurant, onClick }: RestaurantCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[26px] border border-gray-105 overflow-hidden shadow-[0_5px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group active:scale-[0.99]"
    >
      <div className="h-[140px] relative overflow-hidden bg-gray-150">
        <img 
          src={restaurant.cover} 
          alt={restaurant.name} 
          onError={(e) => handleImageError(e, '/assets/restaurant_cover_wendys.png')}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
        />
        {restaurant.isBestSeller && (
          <span className="absolute left-4 top-4 bg-[#FFE100] text-[#3C2F2F] font-roboto font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider shadow">
            Best Seller
          </span>
        )}
      </div>
      <div className="p-5 flex gap-3.5 relative">
        <div className="w-[54px] h-[54px] rounded-[16px] bg-white border border-gray-100 shadow-sm overflow-hidden flex items-center justify-center shrink-0 -mt-10 relative z-10">
          <img 
            src={restaurant.logo} 
            alt={restaurant.name} 
            onError={(e) => handleImageError(e, '/assets/restaurant_logo_wendys.png')}
            className="w-full h-full object-cover" 
          />
        </div>
        <div className="text-left flex-1">
          <h4 className="font-poppins font-bold text-[16px] text-[#3C2F2F] group-hover:text-[#EF2A39] transition-colors">
            {restaurant.name}
          </h4>
          <p className="font-roboto text-[12px] text-[#A6A6A6] mt-0.5">
            {restaurant.tags.join(' • ')}
          </p>
          <div className="flex items-center gap-3.5 mt-2.5 font-roboto text-[12px] font-bold text-[#6A6A6A]">
            <span className="flex items-center gap-0.5 text-yellow-500">★ {restaurant.rating}</span>
            <span>• {restaurant.distance} miles</span>
            <span>• Free Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
}
