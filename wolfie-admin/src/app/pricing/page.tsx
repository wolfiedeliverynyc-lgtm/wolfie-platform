"use client";

import React, { useState } from "react";
import { useMarketStore } from "@/stores/marketStore";

interface PricingPlan {
  id: string;
  name: string;
  commissionRate: number;
  commissionType: "fixed" | "tiered";
  baseDeliveryFee: number;
  serviceFeePercent: number;
  surgeMultiplier: number;
  targetMarket: "NYC" | "EL_KALA" | "BOTH";
  activeMerchantsCount: number;
  description: string;
}

export default function PricingAndContractsPage() {
  const currentMarketId = useMarketStore((state) => state.currentMarketId);
  const getMarketConfig = useMarketStore((state) => state.getMarketConfig);
  const currentMarket = getMarketConfig();

  const [plans, setPlans] = useState<PricingPlan[]>([
    {
      id: "plan-standard",
      name: "Standard Merchant Contract",
      commissionRate: 15.0,
      commissionType: "fixed",
      baseDeliveryFee: currentMarketId === "NYC" ? 3.99 : 250,
      serviceFeePercent: 8.5,
      surgeMultiplier: 1.0,
      targetMarket: "BOTH",
      activeMerchantsCount: 14,
      description: "Baseline contract for local independent kitchens with standard dispatch queue priority.",
    },
    {
      id: "plan-enterprise",
      name: "Enterprise Partner Tier",
      commissionRate: 12.0,
      commissionType: "tiered",
      baseDeliveryFee: currentMarketId === "NYC" ? 2.99 : 180,
      serviceFeePercent: 6.0,
      surgeMultiplier: 1.0,
      targetMarket: "BOTH",
      activeMerchantsCount: 6,
      description: "High volume restaurant chains with dedicated pickup bays and priority courier assignment.",
    },
    {
      id: "plan-growth",
      name: "Wolfie Growth Accelerator",
      commissionRate: 18.0,
      commissionType: "tiered",
      baseDeliveryFee: currentMarketId === "NYC" ? 1.99 : 150,
      serviceFeePercent: 10.0,
      surgeMultiplier: 1.15,
      targetMarket: "BOTH",
      activeMerchantsCount: 8,
      description: "Subsidized consumer delivery fee sponsored by platform for new kitchen customer acquisition.",
    },
  ]);

  const [surgeActive, setSurgeActive] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.25);
  const [overrideAuditLogs] = useState([
    {
      id: "audit-1",
      timestamp: "Today, 11:24 AM",
      user: "Lead Dispatcher",
      orderId: "WLF-10482",
      type: "Delivery Fee Waiver",
      before: "$4.99",
      after: "$0.00",
      reason: "Customer order delayed due to kitchen backlog over 25m",
    },
    {
      id: "audit-2",
      timestamp: "Yesterday, 04:15 PM",
      user: "Operations Admin",
      orderId: "WLF-10419",
      type: "Commission Override",
      before: "15%",
      after: "10%",
      reason: "Promotional merchant onboarding agreement override",
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              Pricing Engine &amp; Restaurant Contracts
            </h1>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: currentMarket.badgeBg,
                borderColor: currentMarket.badgeBorder,
                color: currentMarket.badgeText,
                borderWidth: "1px",
              }}
            >
              {currentMarket.badgeLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated pricing calculation, commission tier schedules, and operational margin controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <div className="text-slate-400 text-[10px] uppercase font-bold">Base Currency</div>
            <div className="font-mono font-bold text-white">{currentMarket.currency} ({currentMarket.currencySymbol})</div>
          </div>
        </div>
      </div>

      {/* Dynamic Surge Engine Banner */}
      <div className="p-4 rounded-xl bg-[#111622] border border-white/[0.08] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Dynamic Surge &amp; Weather Engine
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automated pricing multiplier dynamically applied when active demand exceeds courier capacity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold ${surgeActive ? "text-amber-400" : "text-slate-400"}`}>
              {surgeActive ? `SURGE ACTIVE (${surgeMultiplier}x)` : "NORMAL RATE (1.0x)"}
            </span>
            <button
              type="button"
              onClick={() => setSurgeActive(!surgeActive)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                surgeActive
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {surgeActive ? "Disable Surge" : "Activate Surge Override"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-black/20">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Traffic Duration Factor</div>
            <div className="font-mono text-sm font-bold text-white mt-1">+1.15x ETA multiplier</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Auto-computed from route telemetry</div>
          </div>
          <div className="p-3 rounded bg-black/20">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Inclement Weather Factor</div>
            <div className="font-mono text-sm font-bold text-white mt-1">+20% courier payout</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Rain / Snow baseline incentive</div>
          </div>
          <div className="p-3 rounded bg-black/20">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Platform Retained Margin</div>
            <div className="font-mono text-sm font-bold text-emerald-400 mt-1">21.8% Target</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Commission + Fees minus Payout</div>
          </div>
        </div>
      </div>

      {/* Active Contract Tiers */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Restaurant Pricing Plans &amp; Commission Tiers
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-4 rounded-xl bg-[#12151f] border border-white/[0.08] space-y-4 shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {plan.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {plan.activeMerchantsCount} Stores
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="space-y-2 border-t border-white/[0.06] pt-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Commission Rate</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {plan.commissionRate}% ({plan.commissionType})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Base Delivery Fee</span>
                  <span className="font-mono font-bold text-white">
                    {currentMarket.currencySymbol}{plan.baseDeliveryFee}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Platform Service Fee</span>
                  <span className="font-mono font-bold text-white">
                    {plan.serviceFeePercent}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => alert(`Configuring parameters for ${plan.name}`)}
                  className="w-full py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer text-center"
                >
                  Configure Tier Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Overrides Audit Log */}
      <div className="p-4 rounded-xl bg-[#0f1219] border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Audit Trail — Manual Pricing Overrides
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Strict audit log of all pricing, commission, or fee adjustments made by authorized staff.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {overrideAuditLogs.length} Events Logged
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {overrideAuditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{log.orderId}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                    {log.type}
                  </span>
                  <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">{log.user}:</span> {log.reason}
                </div>
              </div>
              <div className="font-mono text-xs text-right">
                <span className="text-slate-500 line-through mr-2">{log.before}</span>
                <span className="text-emerald-400 font-bold">{log.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
