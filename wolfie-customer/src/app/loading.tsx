import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fadeInSimple">
      <div className="flex flex-col items-center space-y-5">
        {/* Glowing Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#EF2A39] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>

        {/* Mascot brand element or friendly feedback text */}
        <div className="space-y-1">
          <h2 className="font-poppins font-black text-[18px] text-[#3C2F2F] tracking-wide uppercase">
            Wolfing it down...
          </h2>
          <p className="font-roboto text-xs text-[#A6A6A6] tracking-wide uppercase">
            Loading your premium feast
          </p>
        </div>
      </div>
    </div>
  );
}
