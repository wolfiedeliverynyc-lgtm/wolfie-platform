import { BarChart3, ChevronRight, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function EarningsPage() {
  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] overflow-y-auto pb-24 text-white">
      <div className="pt-12 px-6 pb-6">
        <h1 className="text-2xl font-bold mb-6">Earnings</h1>
        
        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#151515] rounded-2xl p-6 border border-[#222222] mb-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-[#FF5A00]">
            <DollarSign size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-[#A3A3A3] text-sm mb-1">Available Balance</p>
            <h2 className="text-5xl font-bold text-white mb-4">$342.50</h2>
            <button className="w-full py-3 bg-[#FF5A00] rounded-xl text-white font-bold uppercase tracking-wider active:scale-95 transition-transform">
              Cash Out
            </button>
          </div>
        </div>

        {/* This Week Stats */}
        <h2 className="text-lg font-bold mb-4">This Week</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#151515] rounded-xl p-4 border border-[#222222]">
            <div className="text-[#FF5A00] mb-2"><BarChart3 size={20} /></div>
            <p className="text-[#A3A3A3] text-xs mb-1">Total Earnings</p>
            <p className="text-xl font-bold">$480.20</p>
            <p className="text-[#28A745] text-xs flex items-center mt-1"><ArrowUpRight size={12} /> 12% vs last week</p>
          </div>
          <div className="bg-[#151515] rounded-xl p-4 border border-[#222222]">
            <div className="text-[#3b82f6] mb-2"><BarChart3 size={20} /></div>
            <p className="text-[#A3A3A3] text-xs mb-1">Trips</p>
            <p className="text-xl font-bold">42</p>
            <p className="text-[#ef4444] text-xs flex items-center mt-1"><ArrowDownRight size={12} /> 3% vs last week</p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="bg-[#151515] rounded-xl p-4 border border-[#222222] mb-8 h-48 flex items-end justify-between px-6 pb-6 relative">
          <p className="absolute top-4 left-4 text-[#A3A3A3] text-sm font-bold">Daily Earnings</p>
          <div className="w-8 h-[60%] bg-[#222222] rounded-t-sm hover:bg-[#FF5A00]/50 transition-colors"></div>
          <div className="w-8 h-[40%] bg-[#222222] rounded-t-sm hover:bg-[#FF5A00]/50 transition-colors"></div>
          <div className="w-8 h-[80%] bg-[#FF5A00] rounded-t-sm relative">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold">$128</span>
          </div>
          <div className="w-8 h-[30%] bg-[#222222] rounded-t-sm hover:bg-[#FF5A00]/50 transition-colors"></div>
          <div className="w-8 h-[50%] bg-[#222222] rounded-t-sm hover:bg-[#FF5A00]/50 transition-colors"></div>
        </div>

        {/* Recent Transactions */}
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold">Recent Transactions</h2>
          <button className="text-[#FF5A00] text-sm font-semibold">View All</button>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="bg-[#151515] rounded-xl p-4 border border-[#222222] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-full flex items-center justify-center text-[#FF5A00]">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Delivery #WF-202{i}</p>
                  <p className="text-[#A3A3A3] text-xs">Today, {10 - i}:30 AM</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#28A745]">+${(8.75 + i).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Driver Fee Clarification */}
        <div className="mt-8 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl">
          <p className="text-xs text-neutral-400 leading-relaxed">
            <span className="font-bold text-[#FF5A00]">Note:</span> A flat $0.30 platform fee is automatically deducted per order to cover payout processing and platform maintenance. The earnings shown above are your <span className="text-white font-semibold">net earnings</span> after this deduction.
          </p>
        </div>

      </div>
    </div>
  )
}
