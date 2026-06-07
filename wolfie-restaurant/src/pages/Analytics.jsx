import React from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { DollarSign, TrendingUp, Clock, ShoppingBag, Award, BarChart3, Target } from 'lucide-react';

export default function Analytics() {
  const { metrics, hourlyData, topItems } = useRestaurantStore();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Business Intelligence & Stats
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Realtime restaurant performance metrics, sales patterns, and order breakdowns.
        </p>
      </div>

      {/* Hero Stats Card */}
      <div 
        className="p-6 rounded-xl border flex flex-col md:flex-row justify-between gap-6"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex-1 flex gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Revenue Today</span>
            <h2 className="mono text-3xl font-black mt-1" style={{ color: 'var(--text)' }}>
              ${metrics.revenueToday.toFixed(2)}
            </h2>
            <p className="text-[11px] text-green-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> +14.2% from last week
            </p>
          </div>
        </div>

        <div className="h-[1px] md:h-16 w-full md:w-[1px]" style={{ backgroundColor: 'var(--border)' }} />

        <div className="flex-1 flex gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Orders Filled</span>
            <h2 className="mono text-3xl font-black mt-1" style={{ color: 'var(--text)' }}>
              {metrics.ordersToday}
            </h2>
            <p className="text-[11px] text-green-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> +8.5% from last week
            </p>
          </div>
        </div>

        <div className="h-[1px] md:h-16 w-full md:w-[1px]" style={{ backgroundColor: 'var(--border)' }} />

        <div className="flex-1 flex gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Award size={24} />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Avg. Order Value</span>
            <h2 className="mono text-3xl font-black mt-1" style={{ color: 'var(--text)' }}>
              ${metrics.avgOrderValue.toFixed(2)}
            </h2>
            <p className="text-[11px] text-neutral-400 font-bold flex items-center gap-1 mt-1">
              Stable ticket size
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Revenue Flow Area Chart */}
        <div 
          className="p-6 rounded-xl border flex flex-col"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
            Hourly Sales Flow ($)
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="h" stroke="#94A3B8" tickLine={false} />
                <YAxis stroke="#94A3B8" tickLine={false} />
                <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Bar Chart */}
        <div 
          className="p-6 rounded-xl border flex flex-col"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
            Hourly Order Volumes (Count)
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="h" stroke="#94A3B8" tickLine={false} />
                <YAxis stroke="#94A3B8" tickLine={false} />
                <Tooltip formatter={(v) => [v, 'Orders']} />
                <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SLA & Top Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Performance metrics breakdown */}
        <div 
          className="lg:col-span-1 p-6 rounded-xl border space-y-6"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            Operational Health
          </h3>
          
          {/* Prep Time */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-neutral-400">Avg Preparation Time</span>
              <span className="mono font-bold text-neutral-900">{metrics.avgPrepTime} mins</span>
            </div>
            <div className="h-2 rounded bg-neutral-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded" style={{ width: '45%' }} />
            </div>
            <p className="text-[10px] text-neutral-400">Average target prep SLA is 15 minutes.</p>
          </div>

          {/* SLA Performance */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-neutral-400">SLA Success Rate</span>
              <span className="mono font-bold text-neutral-900">{metrics.slaPerfPercent}%</span>
            </div>
            <div className="h-2 rounded bg-neutral-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded" style={{ width: `${metrics.slaPerfPercent}%` }} />
            </div>
            <p className="text-[10px] text-neutral-400">Goal is to maintain &gt;90% order handoff SLA.</p>
          </div>

          {/* Peak hour info */}
          <div 
            className="p-4 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Peak Rush Hour</span>
            </div>
            <span className="mono text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-700">
              {metrics.peakHour}
            </span>
          </div>
        </div>

        {/* Top menu items leaderboard table */}
        <div 
          className="lg:col-span-2 p-6 rounded-xl border flex flex-col"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
            Best Sellers Today
          </h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b text-neutral-400" style={{ borderColor: 'var(--border)' }}>
                  <th className="pb-3 font-semibold">Rank</th>
                  <th className="pb-3 font-semibold">Item Name</th>
                  <th className="pb-3 font-semibold text-center">Units Sold</th>
                  <th className="pb-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 font-bold text-neutral-500">#{idx + 1}</td>
                    <td className="py-3 font-bold" style={{ color: 'var(--text)' }}>{item.name}</td>
                    <td className="py-3 text-center mono font-bold text-neutral-600">{item.sold}</td>
                    <td className="py-3 text-right mono font-extrabold" style={{ color: 'var(--text)' }}>
                      ${item.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
