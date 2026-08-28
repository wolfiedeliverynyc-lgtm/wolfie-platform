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
      className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group active:scale-[0.99]"
    >
      <div className="h-[145px] relative overflow-hidden bg-slate-100">
        <img 
          src={restaurant.cover} 
          alt={restaurant.name} 
          onError={(e) => handleImageError(e, '/assets/restaurant_cover_wendys.png')}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        {restaurant.isBestSeller && (
          <span className="absolute left-3.5 top-3.5 bg-slate-900/90 backdrop-blur-md text-white font-medium text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
            Best Seller
          </span>
        )}
      </div>
      <div className="p-4 flex gap-3.5 relative">
        <div className="w-[52px] h-[52px] rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center shrink-0 -mt-9 relative z-10 p-0.5">
          <img 
            src={restaurant.logo} 
            alt={restaurant.name} 
            onError={(e) => handleImageError(e, '/assets/restaurant_logo_wendys.png')}
            className="w-full h-full object-cover rounded-lg" 
          />
        </div>
        <div className="text-left flex-1 min-w-0">
          <h4 className="font-semibold text-[15px] text-slate-900 group-hover:text-[#EF2A39] transition-colors truncate">
            {restaurant.name}
          </h4>
          <p className="text-[12px] text-slate-500 mt-0.5 truncate">
            {restaurant.tags.join(' • ')}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[12px] font-medium text-slate-600">
            <span className="flex items-center gap-1 text-amber-500 font-semibold">★ {restaurant.rating}</span>
            <span className="text-slate-300">•</span>
            <span>{restaurant.distance} miles</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-600 font-medium">Free Delivery</span>
          </div>
        </div>
      </div>
    </div>
  );
}
