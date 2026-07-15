import React, { useState } from 'react';
import ClassicDashboard from './ClassicDashboard';
import MinimalistDashboard from './MinimalistDashboard';

export default function Dashboard() {
  // Default to the new minimalist dashboard
  const [isMinimalist, setIsMinimalist] = useState(true);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Toggle Switch */}
      <div className="absolute top-[-20px] right-0 z-50 flex items-center gap-3 bg-[#0d0b09] p-2 rounded-full border border-[rgba(255,97,41,0.2)] shadow-xl">
        <span className={`text-[10px] uppercase tracking-widest font-bold ml-2 ${!isMinimalist ? 'text-[#FF6129]' : 'text-slate-500'}`}>Classic</span>
        <button
          onClick={() => setIsMinimalist(!isMinimalist)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
          style={{ backgroundColor: isMinimalist ? '#FF6129' : '#334155' }}
        >
          <span className="sr-only">Toggle Dashboard Design</span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isMinimalist ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-[10px] uppercase tracking-widest font-bold mr-2 ${isMinimalist ? 'text-[#FF6129]' : 'text-slate-500'}`}>Minimalist</span>
      </div>

      {/* Render selected dashboard */}
      <div className="flex-1 mt-8">
        {isMinimalist ? <MinimalistDashboard /> : <ClassicDashboard />}
      </div>
    </div>
  );
}
