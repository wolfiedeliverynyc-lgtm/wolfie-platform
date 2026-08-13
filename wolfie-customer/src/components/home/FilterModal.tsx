'use client';

import React from 'react';
import { Restaurant } from '@/services/restaurantService';
import FlowingMenu from '@/app/FlowingMenu';


interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  
  // Filter States
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
  
  onApply: () => void;
  onClear: () => void;
}

export default function FilterModal({
  isOpen,
  onClose,
  restaurants,
  sortBy,
  setSortBy,
  priceFilter,
  setPriceFilter,
  feeFilter,
  setFeeFilter,
  selectedDiets,
  setSelectedDiets,
  selectedCuisines,
  setSelectedCuisines,
  onApply,
  onClear,
}: FilterModalProps) {
  if (!isOpen) return null;

  // Toggle helpers
  const handleToggleDiet = (diet: string) => {
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  const handleToggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    );
  };

  // Calculate live matching count
  const matchingCount = restaurants.filter(rest => {
    // Sort / Filter tags
    if (sortBy === 'near' && rest.distance > 0.5) return false;
    if (sortBy === 'rating' && rest.rating < 4.7) return false;
    if (sortBy === 'best_seller' && !rest.isBestSeller) return false;

    // Price bracket checks
    // rest.minOrder is a proxy or we can use generic matching
    if (priceFilter === 'under3' && rest.deliveryFee >= 1.00) return false;
    if (priceFilter === 'under5' && rest.deliveryFee >= 2.00) return false;
    if (priceFilter === 'over5' && rest.deliveryFee < 2.00) return false;

    // Delivery Fee Check
    if (feeFilter === 'under1' && rest.deliveryFee >= 1.00) return false;
    if (feeFilter === 'under2' && rest.deliveryFee >= 2.00) return false;

    // Dietary Preferences (rest.tags includes diet)
    if (selectedDiets.length > 0) {
      const match = selectedDiets.every(diet => 
        rest.tags.some(tag => tag.toLowerCase() === diet.toLowerCase()) ||
        rest.description.toLowerCase().includes(diet.toLowerCase())
      );
      if (!match) return false;
    }

    // Cuisine Tags
    if (selectedCuisines.length > 0) {
      const match = selectedCuisines.some(cuisine =>
        rest.tags.some(tag => tag.toLowerCase() === cuisine.toLowerCase())
      );
      if (!match) return false;
    }

    return true;
  }).length;

  return (
    <div className="fixed inset-0 z-[300] flex items-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeInSimple"
        onClick={onClose}
      />
      {/* Slide up panel / Centered Dialog */}
      <div className="relative bg-white w-full max-h-[90vh] lg:max-h-[640px] lg:max-w-[500px] rounded-t-[30px] lg:rounded-[28px] p-6 shadow-2xl animate-slideUp flex flex-col z-[310] select-none text-left border-t lg:border border-gray-100">
        {/* Handle for dragging on mobile */}
        <div className="w-[40px] h-[5px] bg-gray-200 rounded-full mx-auto mb-5 lg:hidden shrink-0" />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="font-poppins font-bold text-[22px] text-[#3C2F2F]">Filters</h3>
          <button 
            onClick={onClear}
            className="text-[14px] font-roboto font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
          >
            Clear All
          </button>
        </div>

        {/* Scrollable Filters Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-hide pb-6">
          
          {/* Sort By Section */}
          <div className="space-y-3">
            <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block">Sort By</span>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: 'all', label: 'Recommended' },
                { id: 'near', label: 'Nearest' },
                { id: 'rating', label: 'Top Rated (4.7+ ★)' },
                { id: 'best_seller', label: 'Popular' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as any)}
                  className={`px-4.5 py-2.5 rounded-full text-[13px] font-roboto font-bold border transition-all cursor-pointer focus:outline-none ${
                    sortBy === opt.id
                      ? 'bg-[#3C2F2F] border-[#3C2F2F] text-white shadow-sm'
                      : 'bg-[#F9FAFB] border-gray-100 text-[#6A6A6A] hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Section ($ brackets) */}
          <div className="space-y-3">
            <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block">Price Range</span>
            <div className="flex gap-3 bg-gray-50 border border-gray-100 p-1.5 rounded-full max-w-[320px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'under3', label: '$' },
                { id: 'under5', label: '$$' },
                { id: 'over5', label: '$$$' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setPriceFilter(opt.id as any)}
                  className={`flex-1 py-2 text-[13px] font-bold font-roboto rounded-full transition-all cursor-pointer focus:outline-none ${
                    priceFilter === opt.id
                      ? 'bg-[#EF2A39] text-white shadow-xs'
                      : 'text-[#6A6A6A] hover:bg-gray-150/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Delivery Fee */}
          <div className="space-y-3">
            <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block">Max Delivery Fee</span>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: 'all', label: 'Any Fee' },
                { id: 'under1', label: 'Under $1.00' },
                { id: 'under2', label: 'Under $2.00' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFeeFilter(opt.id as any)}
                  className={`px-4.5 py-2.5 rounded-full text-[13px] font-roboto font-bold border transition-all cursor-pointer focus:outline-none ${
                    feeFilter === opt.id
                      ? 'bg-[#3C2F2F] border-[#3C2F2F] text-white shadow-sm'
                      : 'bg-[#F9FAFB] border-gray-100 text-[#6A6A6A] hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Shields */}
          <div className="space-y-3">
            <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block">Dietary Restrictions</span>
            <div className="flex flex-wrap gap-2.5">
              {['Healthy', 'Halal', 'Vegan'].map(diet => {
                const isSelected = selectedDiets.includes(diet);
                return (
                  <button
                    key={diet}
                    onClick={() => handleToggleDiet(diet)}
                    className={`px-4.5 py-2.5 rounded-full text-[13px] font-roboto font-bold border transition-all cursor-pointer focus:outline-none ${
                      isSelected
                        ? 'bg-[#EF2A39]/10 border-[#EF2A39] text-[#EF2A39] shadow-sm'
                        : 'bg-[#F9FAFB] border-gray-100 text-[#6A6A6A] hover:bg-gray-100'
                    }`}
                  >
                    {diet}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuisines */}
          <div className="space-y-3">
            <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block">Cuisines (Hover & Click)</span>
            <div style={{ height: '280px', position: 'relative', borderRadius: '20px', overflow: 'hidden' }} className="border border-gray-100">
              <FlowingMenu 
                items={[
                  { 
                    link: '#', 
                    text: selectedCuisines.includes('Burgers') ? '✓ Burgers' : 'Burgers', 
                    image: '/assets/hamburger_1.png',
                    onClick: () => handleToggleCuisine('Burgers')
                  },
                  { 
                    link: '#', 
                    text: selectedCuisines.includes('Fast Food') ? '✓ Fast Food' : 'Fast Food', 
                    image: '/assets/hamburger_details.png',
                    onClick: () => handleToggleCuisine('Fast Food')
                  },
                  { 
                    link: '#', 
                    text: selectedCuisines.includes('Fries') ? '✓ Fries' : 'Fries', 
                    image: '/assets/hamburger_3.png',
                    onClick: () => handleToggleCuisine('Fries')
                  },
                  { 
                    link: '#', 
                    text: selectedCuisines.includes('Shakes') ? '✓ Shakes' : 'Shakes', 
                    image: '/assets/hamburger_4.png',
                    onClick: () => handleToggleCuisine('Shakes')
                  }
                ]}
                speed={4}
                textColor="#3C2F2F"
                bgColor="#F9FAFB"
                marqueeBgColor="#EF2A39"
                marqueeTextColor="#ffffff"
                borderColor="#E5E7EB"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="mt-4 space-y-3 shrink-0">
          <button
            onClick={onApply}
            className="w-full h-[54px] bg-[#FFE100] hover:brightness-95 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[15px] text-[#3C2F2F] shadow-[0_4px_12px_rgba(255,225,0,0.25)] focus:outline-none cursor-pointer flex items-center justify-center gap-2"
          >
            Apply Filters ({matchingCount} {matchingCount === 1 ? 'Store' : 'Stores'})
          </button>
          <button
            onClick={onClose}
            className="w-full h-[54px] bg-white border border-gray-200 hover:bg-gray-50 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[15px] text-gray-500 focus:outline-none cursor-pointer flex items-center justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
