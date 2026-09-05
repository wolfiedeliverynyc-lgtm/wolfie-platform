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

// Dynamic Leaflet mini-map
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full flex items-center justify-center bg-[#0d121d] rounded-lg border border-white/[0.07] text-slate-400 text-xs">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2" /> Loading Track Map...
    </div>
  )
});

type TabType = "all" | "active" | "unassigned" | "preparing" | "delivering" | "completed" | "cancelled";

export default function OrdersManagementPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("all");

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

  // Selected Order details
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Dynamic Zones
  const availableZones = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => { if (o.zone) set.add(o.zone); });
    merchants.forEach((m) => { if (m.zone) set.add(m.zone); });
    drivers.forEach((d) => { if (d.zone) set.add(d.zone); });
    return Array.from(set).sort();
  }, [orders, merchants, drivers]);

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

  // Derived Tab Counts
  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length,
      unassigned: orders.filter((o) => !o.driver_id && o.status !== "completed" && o.status !== "cancelled").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      delivering: orders.filter((o) => o.status === "delivering").length,
      completed: orders.filter((o) => o.status === "completed" || o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };
  }, [orders]);

  // Filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Tab filter
      if (activeTab === "active" && (o.status === "completed" || o.status === "cancelled")) return false;
      if (activeTab === "unassigned" && (o.driver_id || o.status === "completed" || o.status === "cancelled")) return false;
      if (activeTab === "preparing" && o.status !== "preparing") return false;
      if (activeTab === "delivering" && o.status !== "delivering") return false;
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
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
  const handleAssignSingle = async (driverId: string) => {
    if (!selectedOrderId) return;
    setIsSubmitting(true);
    const success = await assignDriver(selectedOrderId, driverId);
    setIsSubmitting(false);
    if (success) triggerToast(`Courier successfully assigned!`, "success");
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
              : "bg-slate-800 text-slate-100 border border-slate-700"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. Page Header with DoorDash / UberEats Ops Ribbon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black tracking-tight text-white">Live Orders Dispatch</h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            DoorDash &amp; Uber Eats standard dispatch hub. Monitor active kitchen prep, assign couriers, and track deliveries.
          </p>
        </div>

        {/* Quick KPI Counters */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219] border border-white/[0.08] flex items-center gap-2 shadow-sm">
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
            <span className="text-[11px] font-medium">Unassigned</span>
            <span className="text-sm font-bold">{tabCounts.unassigned}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219] border border-white/[0.08] flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">In Kitchen</span>
            <span className="text-sm font-bold text-amber-400">{tabCounts.preparing}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219] border border-white/[0.08] flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">In Transit</span>
            <span className="text-sm font-bold text-sky-400">{tabCounts.delivering}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0f1219] border border-white/[0.08] flex items-center gap-2 shadow-sm">
            <span className="text-[11px] text-slate-400 font-medium">Delivered</span>
            <span className="text-sm font-bold text-emerald-400">{tabCounts.completed}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Horizontal Status Tabs (DoorDash & Uber Eats Style) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/[0.06]">
        {[
          { id: "all", label: "All Orders", count: tabCounts.all },
          { id: "active", label: "Active Deliveries", count: tabCounts.active },
          { id: "unassigned", label: "Needs Courier", count: tabCounts.unassigned, urgent: tabCounts.unassigned > 0 },
          { id: "preparing", label: "In Kitchen", count: tabCounts.preparing },
          { id: "delivering", label: "Out for Delivery", count: tabCounts.delivering },
          { id: "completed", label: "Delivered", count: tabCounts.completed },
          { id: "cancelled", label: "Cancelled", count: tabCounts.cancelled },
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0f1219] border border-white/[0.08] shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Fast Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-[340px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Store, Courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-[#131722] border border-white/[0.08] text-white placeholder-slate-500 outline-none focus:border-rose-500 transition-colors"
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

          {/* Date Range Filter */}
          <DateRangeFilter value={dateRange} onChange={setDateRange} />

          {/* Zone Selector */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#131722] border border-white/[0.08] text-slate-200 outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="all">All Sectors &amp; Zones</option>
            {availableZones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          {/* Quick Filter Toggle Buttons */}
          <button
            type="button"
            onClick={() => setUnassignedOnly(!unassignedOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
              unassignedOnly
                ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                : "bg-[#141b2a] border-white/[0.07] text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bike size={13} />
            <span>Unassigned</span>
          </button>

          <button
            type="button"
            onClick={() => setPriorityOnly(!priorityOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
              priorityOnly
                ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                : "bg-[#141b2a] border-white/[0.07] text-slate-400 hover:text-slate-200"
            }`}
          >
            <Star size={13} className={priorityOnly ? "fill-amber-400" : ""} />
            <span>Priority</span>
          </button>

          <button
            type="button"
            onClick={() => setSlaRiskOnly(!slaRiskOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
              slaRiskOnly
                ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                : "bg-[#141b2a] border-white/[0.07] text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlertTriangle size={13} />
            <span>SLA at Risk</span>
          </button>

          {/* Reset Filters */}
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
          Showing <strong className="text-white">{sortedOrders.length}</strong> of {orders.length} orders
        </div>
      </div>

      {/* ── 4. High-Density Wide Orders Table ── */}
      <div className="w-full rounded-xl bg-[#0f1219] border border-white/[0.08] overflow-hidden shadow-lg">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0b0e15] border-b border-white/[0.08] text-slate-400 uppercase text-[11px] font-bold tracking-wider">
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
                    <span>Date &amp; Time</span>
                    <ArrowUpDown size={11} />
                  </div>
                </th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Restaurant / Store</th>
                <th className="py-3 px-4">Courier / Driver</th>
                <th className="py-3 px-4">Status</th>
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
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingBag size={32} className="text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">No orders match current filters</p>
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
                            <span title="High Priority Order">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                            </span>
                          )}
                        </div>
                        {order.zone && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            <span>{order.zone}</span>
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
                        <div className="font-semibold text-slate-200 truncate max-w-[150px]">
                          {order.customer_name || "Guest Customer"}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {order.delivery_address || order.zone || "Delivery Zone"}
                        </div>
                      </td>

                      {/* Merchant */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200 flex items-center gap-1 truncate max-w-[160px]">
                          <Store size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{order.merchant_name || "Wolfie Merchant"}</span>
                        </div>
                      </td>

                      {/* Driver / Courier */}
                      <td className="py-3.5 px-4">
                        {order.driver_name && order.driver_name !== "Unassigned" ? (
                          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                            <Bike size={13} className="text-sky-400 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{order.driver_name}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderId(order.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
                          >
                            <Bike size={11} />
                            <span>+ Assign</span>
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(order.status)}
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
                        ${Number(order.total || order.amount || 0).toFixed(2)}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ChevronRight size={12} />
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-2xl bg-[#0e1118] border border-slate-700 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="text-xs font-bold text-white bg-rose-600 px-2.5 py-1 rounded-full">
            {selectedOrderIds.length} Orders Selected
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkDriverId}
              onChange={(e) => setBulkDriverId(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-[#161c2c] border border-slate-700 text-slate-200"
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
                  {selectedOrder.priority && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Priority
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Placed {new Date(selectedOrder.created_at).toLocaleString()}
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
              {/* Status Stepper Tracker */}
              <div className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.07]">
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
                <div className="h-[180px] w-full rounded-xl overflow-hidden border border-white/[0.07]">
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
              <div className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.07]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Store size={13} className="text-slate-400" />
                    <span>Restaurant Information</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">Kitchen Open</span>
                </div>
                <div className="text-sm font-bold text-white">{selectedOrder.merchant_name || "Wolfie Restaurant Partner"}</div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin size={11} className="text-slate-500 flex-shrink-0" />
                  <span>{selectedOrder.merchant_address || selectedOrder.zone || "Algiers Centre Sector"}</span>
                </div>
              </div>

              {/* Customer Profile */}
              <div className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.07]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    <span>Customer &amp; Drop-off</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => triggerToast("Connecting to customer VoIP...", "info")}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Phone size={10} /> Call
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerToast("Customer chat thread opened", "info")}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <MessageSquare size={10} /> Chat
                    </button>
                  </div>
                </div>
                <div className="text-sm font-bold text-white">{selectedOrder.customer_name || "Customer Name"}</div>
                <div className="text-xs text-slate-300 mt-1 flex items-start gap-1">
                  <MapPin size={12} className="text-rose-400 mt-0.5 flex-shrink-0" />
                  <span>{selectedOrder.delivery_address || selectedOrder.zone || "Customer Delivery Address"}</span>
                </div>
              </div>

              {/* Courier / Driver Assignment */}
              <div className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.07]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Bike size={13} className="text-slate-400" />
                  <span>Assigned Courier</span>
                </div>

                {selectedOrder.driver_name && selectedOrder.driver_name !== "Unassigned" ? (
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
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                    >
                      <Phone size={11} /> Call Courier
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-rose-400 font-medium">
                      No courier assigned yet. Pick from online fleet:
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        id="drawer-driver-select"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0d121e] border border-slate-700 text-slate-200 text-xs outline-none"
                      >
                        <option value="">Select available driver...</option>
                        {drivers.filter((d) => d.status !== "offline").map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.zone}) - Rating: {d.rating}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("drawer-driver-select") as HTMLSelectElement;
                          if (el?.value) handleAssignSingle(el.value);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items & Receipt Breakdown */}
              <div className="p-3.5 rounded-xl bg-[#121622] border border-white/[0.07]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Order Items &amp; Pricing</span>
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
                          ${(Number(item.price) * item.quantity).toFixed(2)}
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
                        ${Number(selectedOrder.total || selectedOrder.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="pt-2 border-t border-white/[0.07] space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-200">
                      ${Number(selectedOrder.subtotal || ((selectedOrder.total || selectedOrder.amount) * 0.82) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-mono text-slate-200">
                      ${Number(selectedOrder.delivery_fee || 3.99).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax &amp; Platform Fee</span>
                    <span className="font-mono text-slate-200">
                      ${Number(selectedOrder.service_fee || 1.85).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-white/[0.07]">
                    <span>Grand Total</span>
                    <span className="font-mono text-rose-400">
                      ${Number(selectedOrder.total || selectedOrder.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
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
          <div className="w-full max-w-md p-5 rounded-2xl bg-[#0d1017] border border-slate-700 shadow-2xl space-y-4">
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
                className="w-full px-3 py-2 rounded-lg bg-[#161c2c] border border-slate-700 text-white text-sm outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Refund</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Missing items, late delivery, cold food..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#161c2c] border border-slate-700 text-white text-xs outline-none focus:border-rose-500 resize-none"
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
