'use client';

import React, { useEffect, useState } from 'react';

const slideImages = [
  '/assets/onboarding_burger.png',
  '/assets/onboarding_bklyn.jpg',
  '/assets/onboarding_radar_ny.png'
];
const slideTitles = [
  "Your Diet, Your Rules",
  "Discover Restaurant Profiles",
  "Precision Radar Tracking"
];
const slideTexts = [
  "Save your specific preferences (Healthy, Halal, Vegan) and allergy safeguards. Wolfie screens items to ensure a safe, tailored dining experience.",
  "Browse menus, read verified comments, and check out visual storefront stories modeled like your favorite social feeds.",
  "Watch driver Kenji Sato navigate the Manhattan grid street-by-street on a live Mapbox radar screen, synced with real-time status updates."
];

export default function AuthCarousel() {
  const [onboardingSlide, setOnboardingSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnboardingSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden lg:flex flex-col justify-end relative overflow-hidden h-full min-h-[calc(100vh-80px)]">
      {/* Active background image */}
      <div className="absolute inset-0 z-0 bg-[#3C2F2F]">
        <img 
          src={slideImages[onboardingSlide]} 
          alt="Welcome to Wolfie" 
          className="w-full h-full object-cover transition-all duration-700 ease-in-out transform scale-105" 
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/30 z-10" />
      </div>
      
      {/* Slide Text Content overlay */}
      <div className="z-20 p-16 text-left text-white max-w-xl mb-8 animate-fadeIn select-none">
        <div className="flex items-center gap-3 mb-6">
          <img src="/assets/wolf_logo.png" alt="Wolfie" className="w-12 h-12 object-contain brightness-0 invert" />
          <div className="text-left">
            <span className="font-lustria font-bold text-[24px] text-white tracking-wide block leading-none">WOLFIE</span>
            <span className="font-poppins font-semibold text-[9px] text-[#EF2A39] tracking-[0.2em] uppercase mt-0.5 block">Gourmet Delivery</span>
          </div>
        </div>

        <h2 className="font-poppins font-bold text-[36px] text-white leading-tight mb-4 drop-shadow-md">
          {slideTitles[onboardingSlide]}
        </h2>
        <p className="font-roboto font-normal text-[16.5px] text-gray-200 leading-relaxed mb-8 drop-shadow-sm">
          {slideTexts[onboardingSlide]}
        </p>

        {/* Pagination dots directly over image */}
        <div className="flex gap-2.5">
          {[0, 1, 2].map((idx) => (
            <div 
              key={idx} 
              onClick={() => setOnboardingSlide(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                onboardingSlide === idx ? 'w-8 bg-[#EF2A39]' : 'w-2.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
