import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="flex flex-col items-center space-y-5">
        {/* Admin Operational Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>

        <div className="space-y-1">
          <h2 className="font-poppins font-black text-[18px] text-white tracking-wide uppercase">
            Syncing Terminal Data
          </h2>
          <p className="font-roboto text-xs text-gray-500 tracking-wide uppercase">
            Resolving operational node status...
          </p>
        </div>
      </div>
    </div>
  );
}
