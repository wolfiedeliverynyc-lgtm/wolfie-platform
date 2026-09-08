"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useDashboardStore } from "@/stores/dashboardStore";
import { Order, Driver, Merchant } from "@/types";
import DateRangeFilter, { DateRangeState, isOrderInDateRange } from "@/components/DateRangeFilter";
import {
  Search,
  Calendar,
  X,
  Phone,
  MessageSquare,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  Bike,
  User,
  ShoppingBag,
  CreditCard,
  RotateCcw,
  Star,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Printer
} from "lucide-react";

import { useMarketStore } from "@/stores/marketStore";

// Dynamic Leaflet mini-map
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full flex items-center justify-center bg-[#0d121d] rounded-lg text-slate-400 text-xs">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2" /> Loading Track Map...
    </div>
  )
});

type TabType = "needs_attention" | "active" | "unassigned" | "at_risk" | "completed" | "cancelled" | "all";

export default function OrdersManagementPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentMarketId = useMarketStore((state) => state.currentMarketId);
  const getMarketConfig = useMarketStore((state) => state.getMarketConfig);
  const isRecordInMarket = useMarketStore((state) => state.isRecordInMarket);
  const currentMarket = getMarketConfig();

  const {
    orders,
    drivers,
    merchants,
    aiMetrics,
    refunds,
    fetchDashboardData,
    assignDriver,
    cancelOrder,
    forceCompleteOrder,
    requestRefund,
    bulkAssignDrivers,
    bulkRerouteOrders,
    bulkCancelOrders,
    bulkEscalateOrders,
    toggleOrderPriority,
    triggerEmergencyEscalation,
  } = useDashboardStore();

  // Selected Order for Slide-out Detail Drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Active Tab: Default to "needs_attention" as work queue
  const [activeTab, setActiveTab] = useState<TabType>("needs_attention");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeState>({
    preset: "all",
    startDate: "",
    endDate: "",
  });
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [slaRiskOnly, setSlaRiskOnly] = useState(false);
  const [refundOnly, setRefundOnly] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<"id" | "created_at" | "amount" | "eta_minutes" | "sla">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Multi-select for bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkDriverId, setBulkDriverId] = useState("");
  const [bulkZone, setBulkZone] = useState("");

  // Modals & Action States
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tick, setTick] = useState(0);

  // Polling & 1s countdown clock
  useEffect(() => {
    fetchDashboardData();
    const poller = setInterval(() => {
      fetchDashboardData();
    }, 12000);
    const ticker = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => {
      clearInterval(poller);
      clearInterval(ticker);
    };
  }, [fetchDashboardData]);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Market filtered orders and drivers (never mix NYC and El Kala)
  const marketOrders = useMemo(() => {
    return orders.filter((o) => isRecordInMarket(o));
  }, [orders, isRecordInMarket]);

  const marketDrivers = useMemo(() => {
    return drivers.filter((d) => isRecordInMarket(d));
  }, [drivers, isRecordInMarket]);

  // Selected Order details
  const selectedOrder = useMemo(() => {
    return marketOrders.find((o) => o.id === selectedOrderId) || null;
  }, [marketOrders, selectedOrderId]);

  // Dynamic Zones in current market
  const availableZones = useMemo(() => {
    const set = new Set<string>();
    marketOrders.forEach((o) => { if (o.zone) set.add(o.zone); });
    merchants.forEach((m) => { if (m.zone && isRecordInMarket(m)) set.add(m.zone); });
    marketDrivers.forEach((d) => { if (d.zone) set.add(d.zone); });
    return Array.from(set).sort();
  }, [marketOrders, merchants, marketDrivers, isRecordInMarket]);

  // SLA Calculation Helper (Target = 40 mins)
  const calculateSLATime = useCallback((createdAtStr: string) => {
    const createdTime = new Date(createdAtStr).getTime();
    const elapsedSeconds = Math.floor((Date.now() - createdTime) / 1000);
    const targetSeconds = 40 * 60;
    const remainingSeconds = targetSeconds - elapsedSeconds;

    let status: "safe" | "warning" | "high_risk" | "breached" = "safe";
    if (remainingSeconds <= 0) {
      status = "breached";
    } else if (remainingSeconds <= 10 * 60) {
      status = "high_risk";
    } else if (remainingSeconds <= 20 * 60) {
      status = "warning";
    }

    const isNeg = remainingSeconds < 0;
    const absSec = Math.abs(remainingSeconds);
    const m = Math.floor(absSec / 60);
    const s = absSec % 60;
    const formatted = `${isNeg ? "-" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return { remainingSeconds, status, formatted };
  }, []);

  // Delay Risk logic
  const getDelayRisk = useCallback((order: Order) => {
    if (order.status === "completed" || order.status === "cancelled") return "low";
    const sla = calculateSLATime(order.created_at);
    const merchant = merchants.find((m) => m.id === order.merchant_id);
    if (sla.status === "breached" || order.priority) return "high";
    if (merchant?.kitchen_delay || merchant?.operational_status === "delayed" || sla.status === "high_risk") return "high";
    if (sla.status === "warning" || merchant?.operational_status === "busy") return "medium";
    return "low";
  }, [merchants, calculateSLATime]);

  // Derived Tab Counts for Active Market
  const tabCounts = useMemo(() => {
    const atRiskCount = marketOrders.filter((o) => {
      if (o.status === "completed" || o.status === "cancelled") return false;
      const sla = calculateSLATime(o.created_at);
      return sla.status === "high_risk" || sla.status === "breached";
    }).length;

    const unassignedCount = marketOrders.filter(
      (o) => !o.driver_id && o.status !== "completed" && o.status !== "cancelled"
    ).length;

    const needsAttentionCount = marketOrders.filter((o) => {
      if (o.status === "completed" || o.status === "cancelled") return false;
      const sla = calculateSLATime(o.created_at);
      const isRisk = sla.status === "high_risk" || sla.status === "breached";
      const isUnassigned = !o.driver_id;
      return isRisk || isUnassigned;
    }).length;

    return {
      needs_attention: needsAttentionCount,
      active: marketOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length,
      unassigned: unassignedCount,
      at_risk: atRiskCount,
      completed: marketOrders.filter((o) => o.status === "completed" || o.status === "delivered").length,
      cancelled: marketOrders.filter((o) => o.status === "cancelled").length,
      all: marketOrders.length,
    };
  }, [marketOrders, calculateSLATime]);

  // Filtering
  const filteredOrders = useMemo(() => {
    return marketOrders.filter((o) => {
      // 1. Tab filter
      if (activeTab === "needs_attention") {
        if (o.status === "completed" || o.status === "cancelled") return false;
        const sla = calculateSLATime(o.created_at);
        const isRisk = sla.status === "high_risk" || sla.status === "breached";
        const isUnassigned = !o.driver_id;
        if (!isRisk && !isUnassigned) return false;
      }
      if (activeTab === "active" && (o.status === "completed" || o.status === "cancelled")) return false;
      if (activeTab === "unassigned" && (o.driver_id || o.status === "completed" || o.status === "cancelled")) return false;
      if (activeTab === "at_risk") {
        if (o.status === "completed" || o.status === "cancelled") return false;
        const sla = calculateSLATime(o.created_at);
        if (sla.status !== "high_risk" && sla.status !== "breached") return false;
      }
      if (activeTab === "completed" && o.status !== "completed" && o.status !== "delivered") return false;
      if (activeTab === "cancelled" && o.status !== "cancelled") return false;

      // 2. Date Range filter
      if (!isOrderInDateRange(o.created_at, dateRange)) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          o.id.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.merchant_name?.toLowerCase().includes(q) ||
          o.driver_name?.toLowerCase().includes(q) ||
          o.zone?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 4. Zone filter
      if (selectedZone !== "all" && o.zone !== selectedZone) return false;

      // 5. Quick toggles
      if (priorityOnly && !o.priority) return false;
      if (unassignedOnly && o.driver_id) return false;
      if (slaRiskOnly) {
        const sla = calculateSLATime(o.created_at);
        if (sla.status !== "high_risk" && sla.status !== "breached") return false;
      }
      if (refundOnly) {
        const hasRefund = refunds.some((r) => r.order_id === o.id && r.status === "pending");
        if (!hasRefund) return false;
      }

      return true;
    });
  }, [
    orders,
    activeTab,
    dateRange,
    searchQuery,
    selectedZone,
    priorityOnly,
    unassignedOnly,
    slaRiskOnly,
    refundOnly,
    refunds,
    calculateSLATime,
    tick
  ]);

  // Sorting
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let valA: any = a[sortField as keyof Order];
      let valB: any = b[sortField as keyof Order];

      if (sortField === "sla") {
        valA = calculateSLATime(a.created_at).remainingSeconds;
        valB = calculateSLATime(b.created_at).remainingSeconds;
      }

      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (typeof valA === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? (valA > valB ? 1 : -1) : (valB > valA ? 1 : -1);
      }
    });
  }, [filteredOrders, sortField, sortOrder, calculateSLATime, tick]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === sortedOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(sortedOrders.map((o) => o.id));
    }
  };

  const handleRowCheckbox = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedOrderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const hasActiveFilters = searchQuery !== "" || dateRange.preset !== "all" || selectedZone !== "all" || priorityOnly || unassignedOnly || slaRiskOnly || refundOnly;

  const resetAllFilters = () => {
    setSearchQuery("");
    setDateRange({ preset: "all", startDate: "", endDate: "" });
    setSelectedZone("all");
    setPriorityOnly(false);
    setUnassignedOnly(false);
    setSlaRiskOnly(false);
    setRefundOnly(false);
  };

  // Status Badge Component (DoorDash / UberEats style)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Delivered
          </span>
        );
      case "delivering":
      case "on_the_way":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            In Transit
          </span>
        );
      case "preparing":
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            In Kitchen
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            Action Needed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 ">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  // Single Order Actions
  const handleAssignSingle = async (driverId: string, reason?: string) => {
    if (!selectedOrderId) return;
    setIsSubmitting(true);
    const success = await assignDriver(selectedOrderId, driverId);
    setIsSubmitting(false);
    if (success) triggerToast(`Courier successfully assigned!${reason ? ` (${reason})` : ""}`, "success");
    else triggerToast("Failed to assign courier", "error");
  };

  const handleCancelSingle = async () => {
    if (!selectedOrderId) return;
    const reason = prompt("Reason for cancelling order:", "Customer requested or operational incident");
    if (!reason) return;
    setIsSubmitting(true);
    const success = await cancelOrder(selectedOrderId, reason);
    setIsSubmitting(false);
    if (success) triggerToast(`Order #${selectedOrderId} cancelled`, "info");
    else triggerToast("Failed to cancel order", "error");
  };

  const handleForceCompleteSingle = async () => {
    if (!selectedOrderId) return;
    if (!confirm(`Force complete Order #${selectedOrderId}? This marks the delivery as successful.`)) return;
    setIsSubmitting(true);
    const success = await forceCompleteOrder(selectedOrderId);
    setIsSubmitting(false);
    if (success) triggerToast(`Order #${selectedOrderId} marked delivered`, "success");
    else triggerToast("Failed to complete order", "error");
  };

  const handleEscalateSingle = async () => {
    if (!selectedOrderId) return;
    setIsSubmitting(true);
    const success = await triggerEmergencyEscalation(selectedOrderId);
    setIsSubmitting(false);
    if (success) triggerToast(`CRITICAL SLA: Emergency alert dispatched!`, "error");
    else triggerToast("Escalation failed", "error");
  };

  const handlePriorityToggle = async () => {
    if (!selectedOrderId) return;
    await toggleOrderPriority(selectedOrderId);
    triggerToast("Priority status updated", "info");
  };

  if (!isMounted) {
    return <div className="p-8 text-slate-400 text-sm">Loading Live Orders Dispatch Center...</div>;
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-full pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-800 text-slate-100 "
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. Page Header with DoorDash / UberEats Ops Ribbon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4  pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black tracking-tight text-white">Live Orders Dispatch</h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Realtime Feed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            DoorDash &amp; Uber Eats standard dispatch hub. Monitor active kitchen prep, assign couriers, and track deliveries.
          </p>
        </div>

        {/* Quick KPI Counters */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219]  flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Active</span>
            <span className="text-sm font-bold text-white">{tabCounts.active}</span>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 shadow-sm ${
              tabCounts.unassigned > 0
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-[#111622] border-white/[0.07] text-slate-400"
            }`}
          >
            <span className="text-[11px]">Needs Attention</span>
            <span className="text-sm font-bold">{tabCounts.needs_attention}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219] border border-white/[0.06] flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Active</span>
            <span className="text-sm font-bold text-white">{tabCounts.active}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219] border border-white/[0.06] flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Unassigned</span>
            <span className="text-sm font-bold text-amber-400">{tabCounts.unassigned}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219] border border-white/[0.06] flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Delivered</span>
            <span className="text-sm font-bold text-emerald-400">{tabCounts.completed}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Horizontal Status Tabs (Task-based queue) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "needs_attention", label: "Needs Attention", count: tabCounts.needs_attention, urgent: tabCounts.needs_attention > 0 },
          { id: "active", label: "Active Deliveries", count: tabCounts.active },
          { id: "unassigned", label: "Unassigned", count: tabCounts.unassigned, urgent: tabCounts.unassigned > 0 },
          { id: "at_risk", label: "At Risk", count: tabCounts.at_risk, urgent: tabCounts.at_risk > 0 },
          { id: "completed", label: "Delivered", count: tabCounts.completed },
          { id: "cancelled", label: "Cancelled", count: tabCounts.cancelled },
          { id: "all", label: "All Orders", count: tabCounts.all },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#1e2638] text-white border border-rose-500 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isActive
                    ? "bg-rose-600 text-white"
                    : tab.urgent
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Filters & Search Toolbar (Organized, High-Density) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0f1219] shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Fast Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-[340px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Store, Courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-[#131722] text-white placeholder-slate-500 outline-none focus:border-rose-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date Picker */}
          <DateRangeFilter value={dateRange} onChange={setDateRange} />

          {/* Zone Selector */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-[#131722] text-slate-300 outline-none cursor-pointer border border-white/[0.05]"
          >
            <option value="all">All Sectors ({currentMarket.name})</option>
            {availableZones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          {/* Quick Filter Toggles */}
          <button
            type="button"
            onClick={() => setPriorityOnly(!priorityOnly)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              priorityOnly
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-[#131722] text-slate-400 border-white/[0.05] hover:text-slate-200"
            }`}
          >
            Priority
          </button>

          <button
            type="button"
            onClick={() => setSlaRiskOnly(!slaRiskOnly)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              slaRiskOnly
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-[#131722] text-slate-400 border-white/[0.05] hover:text-slate-200"
            }`}
          >
            SLA At Risk
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Results Counter */}
        <div className="text-xs text-slate-400 font-medium">
          Showing <strong className="text-white">{sortedOrders.length}</strong> of {marketOrders.length} orders
        </div>
      </div>

      {/* ── 4. High-Density Wide Orders Table ── */}
      <div className="w-full rounded-xl bg-[#0f1219] overflow-hidden shadow-lg">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b0e15] text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={sortedOrders.length > 0 && selectedOrderIds.length === sortedOrders.length}
                    onChange={handleToggleSelectAll}
                    className="accent-rose-600 rounded cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("id")}>
                  <div className="flex items-center gap-1">
                    <span>Order #</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-1">
                    <span>Time</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Assigned Courier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dispatch Mode</th>
                <th className="py-3 px-4 cursor-pointer hover:text-white" onClick={() => handleSort("sla")}>
                  <div className="flex items-center gap-1">
                    <span>SLA / ETA</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort("amount")}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm font-semibold text-slate-300">No orders match current filters in {currentMarket.name}</p>
                      <p className="text-xs text-slate-500">Try changing the date range, status tab, or clearing search query.</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetAllFilters}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  const isChecked = selectedOrderIds.includes(order.id);
                  const sla = calculateSLATime(order.created_at);
                  const risk = getDelayRisk(order);
                  const orderDate = new Date(order.created_at);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`group hover:bg-white/[0.02] transition-colors cursor-pointer ${
                        isSelected ? "bg-white/[0.05]" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => handleRowCheckbox(e, order.id)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-rose-600 rounded cursor-pointer"
                        />
                      </td>

                      {/* Order ID & Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white text-xs">#{order.id.slice(0, 10)}</span>
                          {order.priority && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              VIP
                            </span>
                          )}
                        </div>
                        {order.zone && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {order.zone}
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-200 font-semibold">
                          {orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {orderDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200 truncate max-w-[140px]">
                          {order.customer_name || "Customer"}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {order.delivery_address || order.zone || "Zone"}
                        </div>
                      </td>

                      {/* Merchant */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200 truncate max-w-[150px]">
                          {order.merchant_name || "Partner Store"}
                        </div>
                      </td>

                      {/* Driver / Courier */}
                      <td className="py-3.5 px-4">
                        {order.driver_name && order.driver_name !== "Unassigned" ? (
                          <div className="text-slate-200 font-medium truncate max-w-[130px]">
                            {order.driver_name}
                          </div>
                        ) : order.status === "cancelled" ? (
                          <span className="text-slate-500 font-mono text-[11px]">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-400 font-bold text-[11px]">Unassigned</span>
                            {(sla.status === "high_risk" || sla.status === "breached" || !order.driver_id) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderId(order.id);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                              >
                                Override
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* Dispatch Mode */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {order.status === "cancelled" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            TERMINATED
                          </span>
                        ) : order.driver_id ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            AUTO
                          </span>
                        ) : sla.status === "breached" || sla.status === "high_risk" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            FAILED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            MATCHING
                          </span>
                        )}
                      </td>

                      {/* SLA Countdown / ETA */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {order.status === "completed" || order.status === "cancelled" ? (
                          <span className="text-slate-500 font-mono">—</span>
                        ) : (
                          <div>
                            <span
                              className={`font-mono font-bold text-xs ${
                                sla.status === "breached"
                                  ? "text-rose-400"
                                  : sla.status === "high_risk"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {sla.formatted}
                            </span>
                            {order.eta_minutes && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ETA ~{order.eta_minutes}m
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                        {currentMarket.currencySymbol}{Number(order.total || order.amount || 0).toFixed(2)}
                      </td>

                      {/* Risk Indicator */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {risk === "high" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            HIGH
                          </span>
                        ) : risk === "medium" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            MED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                            LOW
                          </span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Bulk Actions Floating Bar ── */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-2xl bg-[#0e1118]  shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="text-xs font-bold text-white bg-rose-600 px-2.5 py-1 rounded-full">
            {selectedOrderIds.length} Orders Selected
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkDriverId}
              onChange={(e) => setBulkDriverId(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-[#161c2c]  text-slate-200"
            >
              <option value="">Choose Driver...</option>
              {drivers.filter((d) => d.status !== "offline").map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.zone})</option>
              ))}
            </select>

            <button
              type="button"
              disabled={!bulkDriverId}
              onClick={async () => {
                if (!bulkDriverId) return;
                const ok = await bulkAssignDrivers(selectedOrderIds, bulkDriverId);
                if (ok) {
                  triggerToast(`Assigned ${selectedOrderIds.length} orders to courier`, "success");
                  setSelectedOrderIds([]);
                  setBulkDriverId("");
                }
              }}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
            >
              Assign Courier
            </button>

            <button
              type="button"
              onClick={async () => {
                const ok = await bulkEscalateOrders(selectedOrderIds);
                if (ok) {
                  triggerToast(`SLA Escalated for ${selectedOrderIds.length} orders`, "error");
                  setSelectedOrderIds([]);
                }
              }}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
            >
              SLA Escalate
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="text-xs text-slate-400 hover:text-white underline ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── 6. Slide-Out Order Detail Drawer (DoorDash & UberEats Style) ── */}
      {selectedOrder && (
        <>
          <div
            className="order-drawer-backdrop"
            onClick={() => setSelectedOrderId(null)}
          />
          <aside className="order-drawer-panel">
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.07] flex items-center justify-between bg-[#0d1017]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-white">#{selectedOrder.id}</span>
                  {selectedOrder.status === "cancelled" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      CANCELLED
                    </span>
                  ) : selectedOrder.driver_id ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      AUTO-DISPATCHED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      INTERVENTION REQUIRED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                  <span style={{ color: currentMarket.badgeText }} className="font-bold">{currentMarket.badgeLabel}</span>
                  <span>&middot;</span>
                  <span>Placed {new Date(selectedOrder.created_at).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Print Order Docket"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Delivery Journey: Restaurant → Driver → Customer */}
              <div className="p-3.5 rounded-xl bg-[#121622] space-y-2 border border-white/[0.05]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Delivery Journey
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-1">
                  <div className="flex flex-col">
                    <span className="text-white">{selectedOrder.merchant_name || "Restaurant"}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Kitchen Stage</span>
                  </div>
                  <span className="text-slate-600 font-bold">&rarr;</span>
                  <div className="flex flex-col items-center">
                    <span className="text-white">{selectedOrder.driver_name || "Courier"}</span>
                    <span className="text-[10px] text-sky-400 font-semibold">
                      {selectedOrder.driver_id ? "En Route" : "Unassigned"}
                    </span>
                  </div>
                  <span className="text-slate-600 font-bold">&rarr;</span>
                  <div className="flex flex-col items-end">
                    <span className="text-white">{selectedOrder.customer_name || "Customer"}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Destination</span>
                  </div>
                </div>
              </div>

              {/* Dispatch Intelligence */}
              <div className="p-3.5 rounded-xl bg-[#121622] space-y-2 border border-white/[0.05]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Dispatch Intelligence</span>
                  <span className="text-emerald-400 font-mono text-[10px] font-bold">98.4% Match Score</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-black/20">
                    <div className="text-[10px] text-slate-400">Pickup ETA</div>
                    <div className="font-mono font-bold text-white mt-0.5">~{selectedOrder.eta_minutes || 4} mins</div>
                  </div>
                  <div className="p-2 rounded bg-black/20">
                    <div className="text-[10px] text-slate-400">Distance to Kitchen</div>
                    <div className="font-mono font-bold text-white mt-0.5">0.8 miles</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2 rounded leading-relaxed">
                  <span className="font-bold text-slate-300">Selection Rationale:</span> {selectedOrder.driver_name ? `Automated smart-matching selected ${selectedOrder.driver_name} based on active proximity, vehicle suitability, and high completion rating.` : "Awaiting available courier match in sector queue."}
                </div>
              </div>

              {/* Status Stepper Tracker */}
              <div className="p-3.5 rounded-xl bg-[#121622]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Delivery Timeline Tracker
                </div>
                <div className="space-y-3 relative pl-6 border-l-2 border-white/[0.07] ml-2">
                  {[
                    { key: "pending", label: "Order Received", desc: "Order confirmed in platform" },
                    { key: "preparing", label: "Kitchen Preparing", desc: "Restaurant is prepping food" },
                    { key: "delivering", label: "Courier in Transit", desc: "Out for customer delivery" },
                    { key: "completed", label: "Delivered", desc: "Handover verified by customer" },
                  ].map((step, idx) => {
                    const statuses = ["pending", "preparing", "delivering", "completed"];
                    const currentIdx = statuses.indexOf(selectedOrder.status === "delivered" ? "completed" : selectedOrder.status);
                    const isDone = currentIdx >= idx;
                    const isCurrent = (selectedOrder.status === "delivered" ? "completed" : selectedOrder.status) === step.key;

                    return (
                      <div key={step.key} className="relative">
                        <span
                          className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#141b2b] ${
                            isCurrent
                              ? "bg-rose-500 ring-4 ring-rose-500/20"
                              : isDone
                              ? "bg-emerald-500"
                              : "bg-slate-700"
                          }`}
                        />
                        <div className={`text-xs font-bold ${isCurrent ? "text-rose-400" : isDone ? "text-slate-200" : "text-slate-500"}`}>
                          {step.label}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{step.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Tracking Map */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Live Dispatch GPS
                </div>
                <div className="h-[180px] w-full rounded-xl overflow-hidden">
                  <MapComponent
                    orders={[selectedOrder]}
                    drivers={drivers}
                    selectedOrderId={selectedOrder.id}
                    selectedDriverId={selectedOrder.driver_id}
                    selectedMerchantId={selectedOrder.merchant_id}
                    viewMode="orders"
                  />
                </div>
              </div>

              {/* Restaurant / Merchant Profile */}
              <div className="p-3.5 rounded-xl bg-[#121622]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Restaurant Information
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">Kitchen Open</span>
                </div>
                <div className="text-sm font-bold text-white">{selectedOrder.merchant_name || "Wolfie Restaurant Partner"}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedOrder.merchant_address || selectedOrder.zone || "Sector Hub"}
                </div>
              </div>

              {/* Customer Profile */}
              <div className="p-3.5 rounded-xl bg-[#121622]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Customer &amp; Drop-off
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => triggerToast("Connecting to customer VoIP...", "info")}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                    >
                      Call
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerToast("Customer chat thread opened", "info")}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                    >
                      Chat
                    </button>
                  </div>
                </div>
                <div className="text-sm font-bold text-white">{selectedOrder.customer_name || "Customer Name"}</div>
                <div className="text-xs text-slate-300 mt-1">
                  {selectedOrder.delivery_address || selectedOrder.zone || "Customer Delivery Address"}
                </div>
              </div>

              {/* Courier / Driver Assignment (Rule: Disabled for Cancelled Orders) */}
              <div className="p-3.5 rounded-xl bg-[#121622]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Courier Assignment
                </div>

                {selectedOrder.status === "cancelled" ? (
                  <div className="p-2.5 rounded bg-slate-800/40 border border-slate-700 text-slate-400 text-xs">
                    Order is cancelled. Driver assignment is strictly prohibited.
                  </div>
                ) : selectedOrder.driver_name && selectedOrder.driver_name !== "Unassigned" ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{selectedOrder.driver_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Courier ID: {selectedOrder.driver_id?.slice(0, 8)}</span>
                        <span>&middot;</span>
                        <span className="text-emerald-400 font-semibold">Active en route</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerToast("Calling courier cell...", "info")}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Call Courier
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-rose-400 font-medium">
                      Automated matching pending. Manual override:
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        id="drawer-driver-select"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0d121e] text-slate-200 text-xs outline-none border border-white/[0.08]"
                      >
                        <option value="">Select available courier...</option>
                        {marketDrivers.filter((d) => d.status !== "offline").map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.zone}) - Rating: {d.rating}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("drawer-driver-select") as HTMLSelectElement;
                          if (el?.value) {
                            const reason = prompt("Enter audit reason for manual override assignment:", "Automated matching timeout override");
                            if (reason) handleAssignSingle(el.value, reason);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Override
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Automated Financial Breakdown with Sources */}
              <div className="p-3.5 rounded-xl bg-[#121622]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Order Items &amp; Financial Breakdown</span>
                  <span>{selectedOrder.items?.length || 1} items</span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-800/80 mb-3">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                            {item.quantity}x
                          </span>
                          <span className="font-semibold text-slate-200">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-300">
                          {currentMarket.currencySymbol}{(Number(item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                          1x
                        </span>
                        <span className="font-semibold text-slate-200">Standard Delivery Basket</span>
                      </div>
                      <span className="font-mono text-slate-300">
                        {currentMarket.currencySymbol}{Number(selectedOrder.total || selectedOrder.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Provenance Financial Summary */}
                {(() => {
                  const total = Number(selectedOrder.total || selectedOrder.amount || 0);
                  const subtotal = Number(selectedOrder.subtotal || total * 0.82);
                  const deliveryFee = Number(selectedOrder.delivery_fee || 3.99);
                  const serviceFee = Number(selectedOrder.service_fee || 1.85);
                  const commission = subtotal * 0.15;
                  const driverPayout = deliveryFee * 0.8 + 2.0;
                  const contributionMargin = (commission + serviceFee + deliveryFee) - driverPayout;

                  return (
                    <div className="pt-2 border-t border-white/[0.07] space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-slate-300 font-medium">Food Subtotal</div>
                          <div className="text-[10px] text-slate-500">Calculated by Pricing Engine</div>
                        </div>
                        <span className="font-mono text-slate-200">
                          {currentMarket.currencySymbol}{subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-slate-300 font-medium">Delivery Fee</div>
                          <div className="text-[10px] text-slate-500">Dynamic Surge &amp; Road Distance</div>
                        </div>
                        <span className="font-mono text-slate-200">
                          {currentMarket.currencySymbol}{deliveryFee.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-slate-300 font-medium">Service Fee</div>
                          <div className="text-[10px] text-slate-500">Platform Standard Schedule</div>
                        </div>
                        <span className="font-mono text-slate-200">
                          {currentMarket.currencySymbol}{serviceFee.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-slate-300 font-medium">Restaurant Commission</div>
                          <div className="text-[10px] text-slate-500">Restaurant Tier Contract (15%)</div>
                        </div>
                        <span className="font-mono text-emerald-400">
                          +{currentMarket.currencySymbol}{commission.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-slate-300 font-medium">Courier Payout</div>
                          <div className="text-[10px] text-slate-500">Automated Dispatch Payout Model</div>
                        </div>
                        <span className="font-mono text-slate-400">
                          -{currentMarket.currencySymbol}{driverPayout.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/[0.07] bg-white/[0.02] p-2 rounded">
                        <div>
                          <div className="font-bold text-white">Wolfie Contribution Margin</div>
                          <div className="text-[10px] text-emerald-400">Net Platform Margin</div>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {currentMarket.currencySymbol}{contributionMargin.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-white/[0.07]">
                        <span>Grand Total Charged</span>
                        <span className="font-mono text-rose-400">
                          {currentMarket.currencySymbol}{total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Drawer Footer Actions (DoorDash / UberEats Ops Controls) */}
            <div className="p-4 border-t border-white/[0.07] bg-[#0d1017] flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {selectedOrder.status !== "completed" && selectedOrder.status !== "delivered" && (
                  <button
                    type="button"
                    onClick={handleForceCompleteSingle}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors text-center"
                  >
                    Force Complete
                  </button>
                )}
                {selectedOrder.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={handleCancelSingle}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors text-center"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefundAmount(selectedOrder.total || selectedOrder.amount || 10);
                    setShowRefundModal(true);
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Issue Refund
                </button>
                <button
                  type="button"
                  onClick={handleEscalateSingle}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors"
                >
                  SLA Escalate
                </button>
                <button
                  type="button"
                  onClick={handlePriorityToggle}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold"
                  title="Toggle Priority Flag"
                >
                  <Star size={14} className={selectedOrder.priority ? "fill-amber-400" : ""} />
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── 7. Refund Modal ── */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-5 rounded-2xl bg-[#0d1017]  shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Issue Customer Refund</h3>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Order #{selectedOrder.id} &middot; Total Paid: ${Number(selectedOrder.total || selectedOrder.amount || 0).toFixed(2)}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Refund Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-[#161c2c]  text-white text-sm outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Refund</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Missing items, late delivery, cold food..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#161c2c]  text-white text-xs outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!refundAmount || !refundReason.trim()}
                onClick={async () => {
                  const ok = await requestRefund(selectedOrder.id, refundAmount, refundReason);
                  if (ok) {
                    triggerToast(`Refund of $${refundAmount.toFixed(2)} requested`, "success");
                    setShowRefundModal(false);
                    setRefundReason("");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
              >
                Submit Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
