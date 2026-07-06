import React from 'react';
import { Shield, Award, Users, AlertTriangle, Route, Clock, ThumbsUp, HelpCircle } from 'lucide-react';
import { DriverStats } from '../types';

interface PerformanceDashProps {
  stats: DriverStats;
}

export default function PerformanceDash({ stats }: PerformanceDashProps) {
  // Check Alpha Driver qualifiers:
  // Rating >= 4.7, Acceptance Rate >= 70%, Completion Rate >= 95%, Lifetime deliveries >= 100
  const isTopDasher = stats.rating >= 4.70 && stats.acceptanceRate >= 70 && stats.completionRate >= 95 && stats.lifetimeDeliveries >= 100;

  return (
    <div id="ratings-panel" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Performance & Ratings</h2>
        <p className="text-sm text-slate-400">Review your eligibility status for VIP catering, top-tier orders, and deactivation safeguards.</p>
      </div>

      {/* ALPHA DRIVER CARD STATUS */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row gap-5 items-center justify-between ${isTopDasher ? 'bg-gradient-to-r from-orange-950/40 via-orange-900/10 to-transparent border-orange-500/30' : 'bg-slate-900 border-slate-800'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl"></div>
        
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isTopDasher ? 'bg-orange-500 text-slate-100 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
            <Award className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h3 className="text-lg font-bold text-slate-100">Alpha Driver Tier</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTopDasher ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {isTopDasher ? 'ACTIVE' : 'INELIGIBLE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
              {isTopDasher
                ? 'Excellent work! You are currently an Alpha Driver. Enjoy premium order matching priority, catering dispatches, and the ability to schedule/dash at any time!'
                : 'Alpha Driver rewards give you priority on high-paying matching orders. Boost your metrics to meet the standards listed below.'}
            </p>
          </div>
        </div>

        <div className="text-center md:text-right bg-slate-950/50 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-800/80 min-w-[200px]">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Lifetime Rides completed</span>
          <span className="text-xl font-extrabold text-slate-100 font-mono">{stats.lifetimeDeliveries}</span>
          <span className="text-xs text-slate-500 block">Deliveries</span>
        </div>
      </div>

      {/* CORE RATINGS METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Rating */}
        <div id="metric-customer-rating" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Rating</p>
              <h4 className="text-3xl font-extrabold text-slate-100 font-mono">{stats.rating.toFixed(2)}</h4>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${stats.rating >= 4.7 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {stats.rating >= 4.7 ? 'Excellent' : 'Fair'}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${stats.rating >= 4.7 ? 'bg-emerald-500' : 'bg-yellow-500'}`}
              style={{ width: `${((stats.rating - 4) / 1) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Minimum for Alpha Driver: 4.70</span>
            <span className="text-slate-400">Deactivation floor: 4.20</span>
          </div>
        </div>

        {/* Acceptance Rate */}
        <div id="metric-acceptance-rate" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Acceptance Rate</p>
              <h4 className="text-3xl font-extrabold text-slate-100 font-mono">{stats.acceptanceRate}%</h4>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${stats.acceptanceRate >= 70 ? 'bg-orange-500/15 text-orange-500' : 'bg-slate-800 text-slate-400'}`}>
              {stats.acceptanceRate >= 70 ? 'High Dispatch Priority' : 'Standard Priority'}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${stats.acceptanceRate >= 70 ? 'bg-orange-500' : 'bg-slate-500'}`}
              style={{ width: `${stats.acceptanceRate}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Minimum for Alpha Driver: 70%</span>
            <span className="text-slate-400">Acceptance doesn't lead to deactivation</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div id="metric-completion-rate" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completion Rate</p>
              <h4 className="text-3xl font-extrabold text-slate-100 font-mono">{stats.completionRate}%</h4>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${stats.completionRate >= 95 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {stats.completionRate >= 95 ? 'Stellar' : 'Needs Work'}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${stats.completionRate >= 95 ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Minimum for Alpha Driver: 95%</span>
            <span className="text-rose-500 font-bold">Unassign risk limit: 90%</span>
          </div>
        </div>

        {/* On-Time Rate */}
        <div id="metric-ontime-rate" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">On-Time or Early Rate</p>
              <h4 className="text-3xl font-extrabold text-slate-100 font-mono">{stats.onTimeRate}%</h4>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
              On Schedule
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${stats.onTimeRate}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Target Rating: &gt;90%</span>
            <span className="text-slate-400">Assessed over last 100 trips</span>
          </div>
        </div>
      </div>

      {/* DRIVER STATS EXPLANATION GUIDE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          The Wolfie Playbook: Professional Guide Tips
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              1. Customer Rating (4.96)
            </h4>
            <p className="leading-relaxed">
              Customers rate driver deliveries out of 5 stars. Keep ratings above 4.70 to avoid general audit reviews.
            </p>
            <ul className="list-disc leading-relaxed pl-4 space-y-1 text-slate-500">
              <li>Use thermal insulated delivery bags to keep tacos and pizza perfectly piping hot.</li>
              <li>Read customer notes explicitly (e.g., leaving package behind the pot).</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              2. Acceptance Rules (94%)
            </h4>
            <p className="leading-relaxed">
              Acceptance is the % of matching offers you accept in-app. You are free to decline bids, but holding a percentage &gt;70% unlocks priority dispatches.
            </p>
            <ul className="list-disc leading-relaxed pl-4 space-y-1 text-slate-500">
              <li>Dinner rush (5pm-9pm) offers maximum promotional boosts.</li>
              <li>Declining small $2.00 runs is normal, but too many declines drops your priority queue ranking!</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              3. Completion Safeguards (99%)
            </h4>
            <p className="leading-relaxed">
              Once an offer is accepted, you must complete it. If you accept and then unassign the order because of a long restaurant wait, your completion rate decreases.
            </p>
            <ul className="list-disc leading-relaxed pl-4 space-y-1 text-slate-500">
              <li>Avoid dropping below 90% as this triggers automatic account reviews.</li>
              <li>If the restaurant is exceptionally late, use the live customer chat support rather than unassigning.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
