import React from 'react';
import { Shield, Award, Users, AlertTriangle, Route, Clock, ThumbsUp, HelpCircle } from 'lucide-react';
import { useDriverStore } from '../store/useDriverStore';

export default function PerformanceDash() {
  const { performance } = useDriverStore();
  
  const rating = performance.customerRating;
  const acceptanceRate = performance.acceptanceRate;
  const completionRate = performance.completionRate;
  const lifetimeDeliveries = performance.totalDeliveries;
  const onTimeRate = lifetimeDeliveries > 0 ? Math.round((performance.onTimeDeliveries / lifetimeDeliveries) * 100) : 100;

  // Check Alpha Driver qualifiers:
  // Rating >= 4.7, Acceptance Rate >= 70%, Completion Rate >= 95%, Lifetime deliveries >= 100
  const isTopDasher = rating >= 4.70 && acceptanceRate >= 70 && completionRate >= 95 && lifetimeDeliveries >= 100;

  return (
    <div id="ratings-panel" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Performance & Ratings</h2>
        <p className="text-sm text-text-secondary">Review your eligibility status for VIP catering, top-tier orders, and deactivation safeguards.</p>
      </div>

      <div className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row gap-5 items-center justify-between ${isTopDasher ? 'bg-gradient-to-r from-orange-950/40 via-orange-900/10 to-transparent border-primary/30' : 'bg-bg-card border-slate-800'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary text-black/5 rounded-full blur-3xl"></div>
        
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isTopDasher ? 'bg-primary text-black text-text-primary animate-pulse' : 'bg-slate-800 text-text-secondary'}`}>
            <Award className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h3 className="text-lg font-bold text-text-primary">Alpha Driver Tier</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTopDasher ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-slate-800 text-text-secondary'}`}>
                {isTopDasher ? 'ACTIVE' : 'INELIGIBLE'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 max-w-lg leading-relaxed">
              {isTopDasher
                ? 'Excellent work! You are currently an Alpha Driver. Enjoy premium order matching priority, catering dispatches, and the ability to schedule/dash at any time!'
                : 'Alpha Driver rewards give you priority on high-paying matching orders. Boost your metrics to meet the standards listed below.'}
            </p>
          </div>
        </div>

        <div className="text-center md:text-right bg-bg-app/50 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-800/80 min-w-[200px]">
          <span className="text-[10px] uppercase font-bold text-text-secondary block mb-1">Lifetime Rides completed</span>
          <span className="text-xl font-extrabold text-text-primary font-mono">{lifetimeDeliveries}</span>
          <span className="text-xs text-text-secondary block">Deliveries</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Rating */}
        <div id="metric-customer-rating" className="bg-bg-card border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Customer Rating</p>
              <h4 className="text-3xl font-extrabold text-text-primary font-mono">{rating.toFixed(2)}</h4>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${rating >= 4.7 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {rating >= 4.7 ? 'Excellent' : 'Fair'}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${rating >= 4.7 ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${((rating - 4) / 1) * 100}%` }}></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-text-secondary">
            <span>Minimum for Alpha Driver: 4.70</span>
            <span className="text-text-secondary">Deactivation floor: 4.20</span>
          </div>
        </div>

        {/* Acceptance Rate */}
        <div id="metric-acceptance-rate" className="bg-bg-card border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Acceptance Rate</p>
              <h4 className="text-3xl font-extrabold text-text-primary font-mono">{acceptanceRate}%</h4>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${acceptanceRate >= 70 ? 'bg-primary text-black/15 text-primary' : 'bg-slate-800 text-text-secondary'}`}>
              {acceptanceRate >= 70 ? 'High Dispatch Priority' : 'Standard Priority'}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${acceptanceRate >= 70 ? 'bg-primary text-black' : 'bg-slate-500'}`} style={{ width: `${acceptanceRate}%` }}></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-text-secondary">
            <span>Minimum for Alpha Driver: 70%</span>
            <span className="text-text-secondary">Acceptance doesn't lead to deactivation</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div id="metric-completion-rate" className="bg-bg-card border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Completion Rate</p>
              <h4 className="text-3xl font-extrabold text-text-primary font-mono">{completionRate}%</h4>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${completionRate >= 95 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              {completionRate >= 95 ? 'Stellar' : 'Needs Work'}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${completionRate >= 95 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${completionRate}%` }}></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-text-secondary">
            <span>Minimum for Alpha Driver: 95%</span>
            <span className="text-rose-500 font-bold">Unassign risk limit: 90%</span>
          </div>
        </div>

        {/* On-Time Rate */}
        <div id="metric-ontime-rate" className="bg-bg-card border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">On-Time or Early Rate</p>
              <h4 className="text-3xl font-extrabold text-text-primary font-mono">{onTimeRate}%</h4>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
              On Schedule
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${onTimeRate}%` }}></div>
          </div>
          
          <div className="flex justify-between text-[11px] text-text-secondary">
            <span>Target Rating: &gt;90%</span>
            <span className="text-text-secondary">Assessed over last 100 trips</span>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          The Wolfie Playbook: Professional Guide Tips
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-text-secondary">
          <div className="space-y-2">
            <h4 className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              1. Customer Rating ({rating.toFixed(2)})
            </h4>
            <p className="leading-relaxed">
              Customers rate driver deliveries out of 5 stars. Keep ratings above 4.70 to avoid general audit reviews.
            </p>
            <ul className="list-disc leading-relaxed pl-4 space-y-1 text-text-secondary">
              <li>Use thermal insulated delivery bags to keep tacos and pizza perfectly piping hot.</li>
              <li>Read customer notes explicitly (e.g., leaving package behind the pot).</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary text-black"></span>
              2. Acceptance Rules ({acceptanceRate}%)
            </h4>
            <p className="leading-relaxed">
              Acceptance is the % of matching offers you accept in-app. You are free to decline bids, but holding a percentage &gt;70% unlocks priority dispatches.
            </p>
            <ul className="list-disc leading-relaxed pl-4 space-y-1 text-text-secondary">
              <li>Dinner rush (5pm-9pm) offers maximum promotional boosts.</li>
              <li>Declining small $2.00 runs is normal, but too many declines drops your priority queue ranking!</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              3. Completion Safeguards ({completionRate}%)
            </h4>
            <p className="leading-relaxed">
              Once an offer is accepted, you must complete it. If you accept and then unassign the order because of a long restaurant wait, your completion rate decreases.
            </p>
            <ul className="list-disc leading-relaxed pl-4 space-y-1 text-text-secondary">
              <li>Avoid dropping below 90% as this triggers automatic account reviews.</li>
              <li>If the restaurant is exceptionally late, use the live customer chat support rather than unassigning.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
