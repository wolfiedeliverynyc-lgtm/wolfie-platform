"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useMarketStore } from "@/stores/marketStore";

type ExceptionCategory = "ALL" | "SLA_RISK" | "DRIVER_UNAVAILABLE" | "REASSIGNMENT_FAILED" | "KITCHEN_DELAY";

interface ExceptionItem {
  id: string;
  orderId: string;
  category: ExceptionCategory;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  detail: string;
  impactMinutes: number;
  restaurantName?: string;
  zone?: string;
  customerName?: string;
  createdAt: string;
}

export default function ExceptionsCenterPage() {
  const router = useRouter();
  const { orders, drivers, assignDriver, addAlert, addActivity, fetchDashboardData } = useDashboardStore();
  const currentMarketId = useMarketStore((state) => state.currentMarketId);
  const getMarketConfig = useMarketStore((state) => state.getMarketConfig);
  const isRecordInMarket = useMarketStore((state) => state.isRecordInMarket);
  const currentMarket = getMarketConfig();

  const [selectedCategory, setSelectedCategory] = useState<ExceptionCategory>("ALL");
  const [selectedException, setSelectedException] = useState<ExceptionItem | null>(null);
  const [reassignDriverId, setReassignDriverId] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Filter orders by active market
  const marketOrders = useMemo(() => {
    return orders.filter((o) => isRecordInMarket(o));
  }, [orders, isRecordInMarket]);

  const marketDrivers = useMemo(() => {
    return drivers.filter((d) => isRecordInMarket(d));
  }, [drivers, isRecordInMarket]);

  // Dynamically derive exceptions from market orders and fleet state
  const exceptions: ExceptionItem[] = useMemo(() => {
    const list: ExceptionItem[] = [];

    marketOrders.forEach((o) => {
      const isCompletedOrCancelled = o.status === "completed" || o.status === "cancelled" || o.status === "delivered";
      if (isCompletedOrCancelled) return;

      const orderTime = o.created_at ? new Date(o.created_at).getTime() : Date.now();
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - orderTime) / 60000));

      // 1. Unassigned / Driver matching failed
      if (!o.driver_id) {
        list.push({
          id: `exc-driver-${o.id}`,
          orderId: o.id,
          category: "DRIVER_UNAVAILABLE",
          severity: elapsedMinutes > 15 ? "CRITICAL" : "HIGH",
          title: "Automatic Matching Failed",
          detail: `Order unassigned for ${elapsedMinutes}m. All matching algorithms timed out or no couriers in zone.`,
          impactMinutes: Math.max(5, 35 - elapsedMinutes),
          restaurantName: (o as any).merchant_name || (o as any).restaurant_name || "Merchant Kitchen",
          zone: o.zone || "Central Sector",
          customerName: o.customer_name || "Customer",
          createdAt: o.created_at || new Date().toISOString(),
        });
      }

      // 2. SLA Breach or High Delay Risk
      if (elapsedMinutes > 30 && o.status !== "delivering") {
        list.push({
          id: `exc-sla-${o.id}`,
          orderId: o.id,
          category: "SLA_RISK",
          severity: elapsedMinutes > 40 ? "CRITICAL" : "HIGH",
          title: "SLA Delivery Window Breach Imminent",
          detail: `Order age is ${elapsedMinutes}m against 35m target. Kitchen prep or dispatch bottleneck.`,
          impactMinutes: Math.max(2, 45 - elapsedMinutes),
          restaurantName: (o as any).merchant_name || (o as any).restaurant_name || "Merchant Kitchen",
          zone: o.zone || "Central Sector",
          customerName: o.customer_name || "Customer",
          createdAt: o.created_at || new Date().toISOString(),
        });
      }
    });

    return list;
  }, [marketOrders]);

  const filteredExceptions = useMemo(() => {
    if (selectedCategory === "ALL") return exceptions;
    return exceptions.filter((e) => e.category === selectedCategory);
  }, [exceptions, selectedCategory]);

  const availableDrivers = useMemo(() => {
    return marketDrivers.filter((d) => d.status === "available");
  }, [marketDrivers]);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedException || !reassignDriverId) return;

    setIsSubmitting(true);
    try {
      const success = await assignDriver(selectedException.orderId, reassignDriverId);
      if (success) {
        addActivity({
          text: `[MANUAL OVERRIDE] Reassigned Order #${selectedException.orderId} to Driver #${reassignDriverId}. Reason: ${overrideReason || "Dispatcher intervention via Exceptions Center"}`,
          color: "var(--status-amber)",
        });
        setSelectedException(null);
        setReassignDriverId("");
        setOverrideReason("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = (item: ExceptionItem) => {
    addAlert({
      type: "sla_violation",
      severity: "high",
      message: `[ESCALATION] Order #${item.orderId} flagged for emergency supervisor review in ${currentMarket.name}.`,
    });
    addActivity({
      text: `Escalated incident for Order #${item.orderId} to senior operations supervisor`,
      color: "var(--status-red)",
    });
    alert(`Incident escalated for Order #${item.orderId}. Priority alert registered.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              Exceptions Center
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
            Active dispatch interventions and SLA failure mitigation. Normal orders are excluded.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Total Exceptions:</span>
          <span className="font-mono font-bold text-white px-2 py-1 rounded bg-slate-800 border border-slate-700">
            {exceptions.length}
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "ALL", label: "All Active Exceptions" },
          { key: "DRIVER_UNAVAILABLE", label: "No Courier Found" },
          { key: "SLA_RISK", label: "SLA Breach Risk" },
          { key: "REASSIGNMENT_FAILED", label: "Reassignment Failed" },
          { key: "KITCHEN_DELAY", label: "Kitchen Delays" },
        ].map((tab) => {
          const isSelected = selectedCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key as ExceptionCategory)}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border ${
                isSelected
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                  : "bg-slate-900/60 text-slate-400 border-white/[0.06] hover:bg-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Exception Work Queue */}
      {filteredExceptions.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-900/40 border border-white/[0.06] text-center space-y-3">
          <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
            All Dispatch Operations Stable
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Zero dispatch exceptions detected in {currentMarket.name}. All automated matching routines and SLA timeframes are proceeding within baseline targets.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push("/admin/orders")}
              className="px-4 py-2 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer border border-slate-600"
            >
              View Live Dispatch Stream
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExceptions.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-[#12151f] border border-rose-500/30 shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white">
                    #{item.orderId}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {item.severity} &middot; Intervention Required
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {item.zone}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-white">{item.title}</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.detail}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.04]">
                <div>
                  Restaurant: <span className="text-white font-medium">{item.restaurantName}</span>
                </div>
                <div>
                  Target Breach: <span className="font-mono text-amber-400 font-bold">&lt; {item.impactMinutes} min</span>
                </div>
              </div>

              {/* Action Buttons: Clean text buttons, no icons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/orders`)}
                  className="flex-1 py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors text-center border border-slate-700 cursor-pointer"
                >
                  Review Order
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedException(item)}
                  className="flex-1 py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-500 transition-colors text-center cursor-pointer shadow-md"
                >
                  Manual Reassign
                </button>
                <button
                  type="button"
                  onClick={() => handleEscalate(item)}
                  className="py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors border border-amber-500/30 cursor-pointer"
                >
                  Escalate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Override Assignment Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#11141e] border border-white/[0.1] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Manual Dispatch Override
                </h3>
                <p className="text-xs text-slate-400">
                  Assign courier to Order #{selectedException.orderId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedException(null)}
                className="text-slate-400 hover:text-white text-xs font-bold uppercase"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleReassign} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Select Courier ({availableDrivers.length} Available in {currentMarket.name})
                </label>
                <select
                  value={reassignDriverId}
                  onChange={(e) => setReassignDriverId(e.target.value)}
                  required
                  className="w-full bg-[#161a26] border border-white/[0.1] rounded px-3 py-2 text-white outline-none focus:border-rose-500"
                >
                  <option value="">-- Choose Courier --</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} &middot; {d.zone || "General Zone"} &middot; ★ {d.rating}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Reason for Manual Override (Audit Required)
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Automated matching timeout, phone call request"
                  required
                  className="w-full bg-[#161a26] border border-white/[0.1] rounded px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                Manual assignment bypasses the automatic pricing and matching algorithm. This event will be logged in the system audit trail.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedException(null)}
                  className="px-3 py-1.5 rounded text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !reassignDriverId}
                  className="px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Assigning..." : "Confirm Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
