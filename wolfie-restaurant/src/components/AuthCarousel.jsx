import React, { useState, useEffect } from 'react';
import { Shield, Zap } from 'lucide-react';

const slides = [
  {
    image: '/assets/onboarding_burger.png',
    title: 'Control Your Kitchen In Real Time',
    description: 'Manage live orders, monitor prep times, adjust settings, and inspect financial payouts with ease.',
    badgeIcon1: <Shield size={14} className="text-[#FFE100]" />,
    badgeText1: 'Encrypted',
    badgeIcon2: <Zap size={14} className="text-[#FFE100]" />,
    badgeText2: 'Real-Time Sync'
  },
  {
    image: '/assets/onboarding_bklyn.jpg',
    title: 'Maximize Your Earning Potential',
    description: "Join NYC's elite culinary network. Keep more of your profits with flat, transparent commission structures.",
    badgeIcon1: <Shield size={14} className="text-[#FFE100]" />,
    badgeText1: 'Encrypted',
    badgeIcon2: <Zap size={14} className="text-[#FFE100]" />,
    badgeText2: '12-18% Commission'
  },
  {
    image: '/assets/onboarding_radar_ny.png',
    title: 'Active Courier Integration',
    description: 'Direct integration with active Manhattan courier radars ensures lightning-fast delivery times for your customers.',
    badgeIcon1: <Shield size={14} className="text-[#FFE100]" />,
    badgeText1: 'Encrypted',
    badgeIcon2: <Zap size={14} className="text-[#FFE100]" />,
    badgeText2: 'Radar Guided'
  }
];

export default function AuthCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex flex-col justify-end relative overflow-hidden h-full p-16 select-none">
      {/* Background images for smooth cross-fading */}
      <div className="absolute inset-0 z-0 bg-black">
        {slides.map((slide, idx) => (
          <img 
            key={idx}
            src={slide.image} 
            alt={slide.title} 
            className={`absolute inset-0 w-full h-full object-cover transform scale-105 transition-opacity duration-1000 ease-in-out ${
              currentSlide === idx ? 'opacity-70' : 'opacity-0'
            }`} 
          />
        ))}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent z-10" />
      </div>

      {/* Ambient glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FFE100] opacity-[0.04] blur-[120px] pointer-events-none z-10" />
      
      {/* Content overlay */}
      <div className="relative z-20 max-w-xl text-left">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl" role="img" aria-label="wolf">🐺</span>
          <div className="text-left">
            <span className="font-extrabold text-[24px] text-white tracking-tight block leading-none font-['Poppins',sans-serif]">
              Wolfie <span className="text-[#FFE100]">OS</span>
            </span>
            <span className="font-black text-[9px] text-[#FFE100] tracking-[0.25em] uppercase mt-1 block font-['Poppins',sans-serif]">
              Partner Portal
            </span>
          </div>
        </div>

        <div className="w-10 h-1 bg-[#FFE100] mb-6 shadow-[0_0_10px_#FFE100]" />

        {/* Transition container for text */}
        <div key={currentSlide} className="animate-fade-in">
          <h2 className="text-white text-4xl font-extrabold tracking-tight mb-4 leading-tight font-['Poppins',sans-serif] min-h-[96px]">
            {slides[currentSlide].title}
          </h2>
          <p className="text-[#94a3b8] text-[15px] leading-relaxed mb-8 font-['Poppins',sans-serif] min-h-[72px]">
            {slides[currentSlide].description}
          </p>

          {/* Trust badges */}
          <div className="flex items-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-[#94a3b8] font-bold font-['Poppins',sans-serif]">
              {slides[currentSlide].badgeIcon1}
              {slides[currentSlide].badgeText1}
            </div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-[#94a3b8] font-bold font-['Poppins',sans-serif]">
              {slides[currentSlide].badgeIcon2}
              {slides[currentSlide].badgeText2}
            </div>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex gap-2.5">
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 border-none cursor-pointer ${
                currentSlide === idx 
                  ? 'w-10 bg-[#FFE100] shadow-[0_0_10px_rgba(255,225,0,0.5)]' 
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
