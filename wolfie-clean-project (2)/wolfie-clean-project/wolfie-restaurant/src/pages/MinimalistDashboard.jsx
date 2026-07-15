import React from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { ArrowUpRight, ArrowDownRight, Clock, Target } from 'lucide-react';

export default function MinimalistDashboard() {
  const { metrics, orders } = useRestaurantStore();

  const newOrdersCount = orders.filter((o) => o.status === 'new_order').length;
  const preparingCount = orders.filter((o) => ['accepted', 'preparing', 'almost_ready'].includes(o.status)).length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="p-8 rounded-[2.5rem] bg-[#080808] text-[#e8dcc8] font-sans shadow-2xl overflow-hidden min-h-[800px]">
      
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-medium tracking-tight">Overview</h1>
        <div className="bg-[#0d0b09] border border-[rgba(255,97,41,0.12)] px-4 py-2 rounded-full text-xs tracking-widest uppercase text-[#FF6129]">
          Today
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Insights: Revenue Growth (Orange/Gold Glow) */}
        <div className="col-span-1 lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-[#0d0b09] border border-[rgba(255,97,41,0.08)] p-8 shadow-[0_0_50px_-12px_rgba(255,97,41,0.1)] transition-transform hover:-translate-y-1">
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(255,97,41,0.15)_0%,transparent_60%)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <span className="text-sm text-[rgba(232,220,200,0.75)] font-medium">Revenue Growth</span>
              <div className="bg-white/5 px-3 py-1 rounded-full text-[10px] text-[rgba(232,220,200,0.5)]">Daily <span className="ml-1 opacity-50">v</span></div>
            </div>
            
            <div className="mt-8 mb-16 text-center">
              <div className="text-6xl font-light text-white tracking-tighter flex justify-center items-start gap-1">
                ${metrics.revenueToday.toLocaleString()}
                <ArrowUpRight size={24} className="text-[#FF6129] mt-2" />
              </div>
            </div>

            {/* Fake line chart */}
            <div className="absolute bottom-12 left-0 w-full h-32 pointer-events-none opacity-80">
               <svg viewBox="0 0 400 100" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                 <path d="M0,80 L100,50 L200,20 L300,20 L400,40" fill="none" stroke="#FF6129" strokeWidth="2" />
                 <path d="M0,80 L100,50 L200,20 L300,20 L400,40 L400,100 L0,100 Z" fill="url(#grad-gold)" opacity="0.1" />
                 <defs>
                   <linearGradient id="grad-gold" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#FF6129" stopOpacity="0.5" />
                     <stop offset="100%" stopColor="#FF6129" stopOpacity="0" />
                   </linearGradient>
                 </defs>
               </svg>
            </div>

            <p className="text-xs text-center text-[rgba(232,220,200,0.45)] mt-auto pt-4 relative z-10">
              Expect your revenue to rise and shine before this week closes.
            </p>
          </div>
        </div>

        {/* Conversion / Orders (Blue Glow) */}
        <div className="col-span-1 lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-[#0d0b09] border border-[#0284c7]/20 p-8 shadow-[0_0_50px_-12px_rgba(2,132,199,0.15)] transition-transform hover:-translate-y-1">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(2,132,199,0.2)_0%,transparent_50%)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <span className="text-sm text-[rgba(232,220,200,0.75)] font-medium">Orders Today</span>
              <div className="bg-white/5 px-3 py-1 rounded-full text-[10px] text-[rgba(232,220,200,0.5)]">Daily <span className="ml-1 opacity-50">v</span></div>
            </div>
            
            <div className="mt-8 mb-16 text-center">
              <div className="text-6xl font-light text-white tracking-tighter flex justify-center items-start gap-1">
                {metrics.ordersToday}
                <ArrowUpRight size={24} className="text-[#38bdf8] mt-2" />
              </div>
            </div>

            {/* Fake Bezier Curve */}
            <div className="absolute bottom-20 left-0 w-full h-32 pointer-events-none opacity-80">
               <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                 <path d="M0,70 C50,70 80,40 100,50 C130,65 170,80 200,40 C230,-10 270,-10 300,50 C330,100 370,50 400,60" fill="none" stroke="#38bdf8" strokeWidth="3" filter="drop-shadow(0 0 8px rgba(56,189,248,0.8))" />
                 <circle cx="200" cy="40" r="6" fill="#fff" filter="drop-shadow(0 0 10px #38bdf8)" />
               </svg>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-4 mt-auto border border-white/10 flex justify-between items-center relative z-10">
              <span className="text-[10px] text-[rgba(232,220,200,0.5)] max-w-[120px]">Orders set to rise this evening.</span>
              <span className="text-xs text-[#e8dcc8] cursor-pointer hover:text-white">Explore more +</span>
            </div>
          </div>
        </div>

        {/* Website Traffic / Order Types (Solid Yellow) */}
        <div className="col-span-1 relative overflow-hidden rounded-[2.5rem] bg-[#fef08a] p-8 text-[#080808] transition-transform hover:-translate-y-1 shadow-[0_10px_40px_-10px_rgba(254,240,138,0.3)]">
          <div className="flex justify-between items-start mb-8">
            <span className="text-sm font-bold">Order Types</span>
            <span className="text-xs font-semibold opacity-60">More</span>
          </div>

          <div className="flex justify-center items-center my-6 relative">
            {/* Donut Chart visual */}
            <div className="w-32 h-32 rounded-full border-8 border-[rgba(8,8,8,0.1)] border-t-[#080808] border-r-[#080808] flex items-center justify-center transform -rotate-45">
               <div className="transform rotate-45 text-center">
                 <span className="text-3xl font-black">{metrics.ordersToday}</span>
                 <span className="block text-[10px] font-bold opacity-60">TOTAL</span>
               </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-[#080808]" /> New Orders</div>
              <span>{Math.round((newOrdersCount / (metrics.ordersToday || 1)) * 100)}%</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold opacity-60">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-[#080808] opacity-30" /> Preparing</div>
              <span>{Math.round((preparingCount / (metrics.ordersToday || 1)) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Small Metrics Grid */}
        <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Avg Prep Time */}
          <div className="bg-[#0d0b09] border border-[rgba(255,97,41,0.08)] rounded-[2.5rem] p-6 flex flex-col justify-between hover:bg-[rgba(20,18,15,1)] transition-colors">
            <div className="flex items-center justify-between mb-4 text-[rgba(232,220,200,0.5)]">
              <Clock size={20} />
              <ArrowDownRight size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm mb-1 text-[rgba(232,220,200,0.75)]">Avg Prep Time</p>
              <h3 className="text-3xl font-light text-white">{metrics.avgPrepTime}<span className="text-lg opacity-50 ml-1">min</span></h3>
            </div>
          </div>

          {/* SLA Performance */}
          <div className="bg-[#0d0b09] border border-[rgba(255,97,41,0.08)] rounded-[2.5rem] p-6 flex flex-col justify-between hover:bg-[rgba(20,18,15,1)] transition-colors">
            <div className="flex items-center justify-between mb-4 text-[rgba(232,220,200,0.5)]">
              <Target size={20} />
              <ArrowUpRight size={16} className="text-[#FF6129]" />
            </div>
            <div>
              <p className="text-sm mb-1 text-[rgba(232,220,200,0.75)]">SLA Performance</p>
              <h3 className="text-3xl font-light text-white">{metrics.slaPerfPercent}<span className="text-lg opacity-50 ml-1">%</span></h3>
            </div>
          </div>

          {/* Cancellation Rate */}
          <div className="bg-[#0d0b09] border border-[rgba(255,97,41,0.08)] rounded-[2.5rem] p-6 flex flex-col justify-between hover:bg-[rgba(20,18,15,1)] transition-colors relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-[radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.1)_0%,transparent_70%)] pointer-events-none" />
            <div className="flex items-center justify-between mb-4 text-[rgba(232,220,200,0.5)] relative z-10">
              <span className="text-xs uppercase tracking-widest border border-white/10 px-2 py-1 rounded-md">Status</span>
              <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Healthy</span>
            </div>
            <div className="relative z-10">
              <p className="text-sm mb-1 text-[rgba(232,220,200,0.75)]">Cancellation Rate</p>
              <h3 className="text-3xl font-light text-white">{metrics.cancellationRate}<span className="text-lg opacity-50 ml-1">%</span></h3>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
