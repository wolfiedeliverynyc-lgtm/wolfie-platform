"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import StatusBadge from "@/shared/components/StatusBadge";
import { Order, Driver, Merchant } from "@/types";
import dynamic from "next/dynamic";

// Dynamically import MapComponent to prevent SSR Leaflet errors
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: "var(--bg-sunken)",
        borderRadius: "var(--radius-md)",
        color: "var(--text-muted)",
        fontSize: "12px"
      }}
    >
      <span className="rt-dot live" style={{ marginRight: 6 }} /> Loading Mini-Map...
    </div>
  )
});

const ZONES = [
  "Algiers Centre",
  "El Biar",
  "Bab Ezzouar",
  "Hussein Dey",
  "Kouba",
  "Ain Taya"
];

export default function DispatchEnginePage() {
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
    rerouteDriver,
    suspendDriver,
    setMerchantStatus,
    toggleOrderPriority,
    triggerEmergencyEscalation,
    retrainWapModel
  } = useDashboardStore();

  // Selected entities for right detail drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<string[]>(["pending", "preparing", "delivering"]);
  const [filterSlas, setFilterSlas] = useState<string[]>([]);
  const [filterDelayRisks, setFilterDelayRisks] = useState<string[]>([]);
  const [filterZone, setFilterZone] = useState<string>("all");
  const [filterPriorityOnly, setFilterPriorityOnly] = useState(false);
  const [filterUnassignedOnly, setFilterUnassignedOnly] = useState(false);
  const [filterRefundRequestedOnly, setFilterRefundRequestedOnly] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<'id' | 'created_at' | 'sla' | 'eta_minutes' | 'amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Multi-Selection State for Bulk Actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Local interaction states
  const [bulkDriverSelect, setBulkDriverSelect] = useState("");
  const [bulkZoneSelect, setBulkZoneSelect] = useState("");
  const [bulkCancelReason, setBulkCancelReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Ticking State: triggers re-render every 1s to update countdowns
  const [tick, setTick] = useState(0);

  // Initial Load & Polling
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000); // Poll dashboard data every 10s

    const clock = setInterval(() => {
      setTick(t => t + 1);
    }, 1000); // Ticker updates countdowns every 1s

    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [fetchDashboardData]);

  // Toast Helper
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Selected Order Object
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // SLA Calculation Helper
  // Delivery SLA target = 40 minutes (2400 seconds) from created_at
  const calculateSLATime = (createdAtStr: string) => {
    const createdTime = new Date(createdAtStr).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - createdTime) / 1000);
    const targetSeconds = 40 * 60; 
    const remainingSeconds = targetSeconds - elapsedSeconds;
    
    let status: 'safe' | 'warning' | 'high_risk' | 'breached' = 'safe';
    if (remainingSeconds <= 0) {
      status = 'breached';
    } else if (remainingSeconds <= 10 * 60) {
      status = 'high_risk';
    } else if (remainingSeconds <= 20 * 60) {
      status = 'warning';
    }

    const isNegative = remainingSeconds < 0;
    const absSec = Math.abs(remainingSeconds);
    const m = Math.floor(absSec / 60);
    const s = absSec % 60;
    const formatted = `${isNegative ? '-' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return {
      remainingSeconds,
      status,
      formatted
    };
  };

  // Delay Risk Calculation logic
  const getDelayRisk = (order: Order) => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return 'low';
    }
    const sla = calculateSLATime(order.created_at);
    const merchant = merchants.find(m => m.id === order.merchant_id);
    
    if (sla.status === 'breached' || order.priority) {
      return 'high';
    }
    if (merchant?.kitchen_delay || merchant?.operational_status === 'delayed' || sla.status === 'high_risk') {
      return 'high';
    }
    if (sla.status === 'warning' || merchant?.operational_status === 'busy') {
      return 'medium';
    }
    return 'low';
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Text Search
      const matchesSearch = searchQuery === "" ? true : 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.zone.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Status check
      if (filterStatuses.length > 0 && !filterStatuses.includes(o.status)) {
        return false;
      }

      // 3. SLA check
      const sla = calculateSLATime(o.created_at);
      if (filterSlas.length > 0 && !filterSlas.includes(sla.status)) {
        return false;
      }

      // 4. Delay Risk check
      const delayRisk = getDelayRisk(o);
      if (filterDelayRisks.length > 0 && !filterDelayRisks.includes(delayRisk)) {
        return false;
      }

      // 5. Zone check
      if (filterZone !== "all" && o.zone !== filterZone) {
        return false;
      }

      // 6. Priority Only
      if (filterPriorityOnly && !o.priority) {
        return false;
      }

      // 7. Unassigned Only
      if (filterUnassignedOnly && o.driver_id) {
        return false;
      }

      // 8. Refund Requested Only
      const hasRefund = refunds.some(r => r.order_id === o.id && r.status === "pending");
      if (filterRefundRequestedOnly && !hasRefund) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, filterStatuses, filterSlas, filterDelayRisks, filterZone, filterPriorityOnly, filterUnassignedOnly, filterRefundRequestedOnly, refunds, merchants, tick]);

  // Sorted Orders
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let valA: any = a[sortField as keyof Order];
      let valB: any = b[sortField as keyof Order];

      if (sortField === 'sla') {
        const slaA = calculateSLATime(a.created_at).remainingSeconds;
        const slaB = calculateSLATime(b.created_at).remainingSeconds;
        valA = slaA;
        valB = slaB;
      }

      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' 
          ? (valA > valB ? 1 : -1) 
          : (valB > valA ? 1 : -1);
      }
    });
  }, [filteredOrders, sortField, sortOrder, tick]);

  // Derived Operational Metrics (Active Queue totals)
  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'), [orders]);
  const delayedOrdersCount = useMemo(() => activeOrders.filter(o => getDelayRisk(o) === 'high').length, [activeOrders, merchants, tick]);
  const unassignedOrdersCount = useMemo(() => activeOrders.filter(o => !o.driver_id).length, [activeOrders]);
  const breachedOrdersCount = useMemo(() => activeOrders.filter(o => calculateSLATime(o.created_at).status === 'breached').length, [activeOrders, tick]);

  // List of online and available drivers
  const onlineDrivers = useMemo(() => drivers.filter(d => d.status !== 'offline'), [drivers]);
  const availableDrivers = useMemo(() => drivers.filter(d => d.status === 'available'), [drivers]);

  // Sort available drivers for selected order (boost same zone)
  const recommendedDrivers = useMemo(() => {
    if (!selectedOrder) return [];
    return [...availableDrivers].sort((a, b) => {
      const aSameZone = a.zone === selectedOrder.zone ? 1 : 0;
      const bSameZone = b.zone === selectedOrder.zone ? 1 : 0;
      return bSameZone - aSameZone;
    });
  }, [availableDrivers, selectedOrder]);

  // Sorting Header Click Handler
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Status Filter Multi-Select Handler
  const handleStatusFilterToggle = (status: string) => {
    setFilterStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // SLA Filter Toggle
  const handleSlaFilterToggle = (sla: string) => {
    setFilterSlas(prev => 
      prev.includes(sla) ? prev.filter(s => s !== sla) : [...prev, sla]
    );
  };

  // Delay Risk Filter Toggle
  const handleDelayRiskFilterToggle = (risk: string) => {
    setFilterDelayRisks(prev => 
      prev.includes(risk) ? prev.filter(r => r !== risk) : [...prev, risk]
    );
  };

  // Bulk Selection Header Toggle
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleRowCheckboxToggle = (orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Bulk Action Execution
  const executeBulkAssign = async () => {
    if (!bulkDriverSelect) return;
    const success = await bulkAssignDrivers(selectedOrderIds, bulkDriverSelect);
    if (success) {
      triggerToast(`Bulk assigned driver to ${selectedOrderIds.length} orders`, 'success');
      setSelectedOrderIds([]);
      setBulkDriverSelect("");
    } else {
      triggerToast("Bulk assignment failed", "error");
    }
  };

  const executeBulkReroute = async () => {
    if (!bulkZoneSelect) return;
    const success = await bulkRerouteOrders(selectedOrderIds, bulkZoneSelect);
    if (success) {
      triggerToast(`Bulk rerouted ${selectedOrderIds.length} orders to ${bulkZoneSelect}`, 'info');
      setSelectedOrderIds([]);
      setBulkZoneSelect("");
    } else {
      triggerToast("Bulk rerouting failed", "error");
    }
  };

  const executeBulkCancel = async () => {
    const reason = bulkCancelReason || "Bulk operational incident cancellation";
    const success = await bulkCancelOrders(selectedOrderIds, reason);
    if (success) {
      triggerToast(`Bulk cancelled ${selectedOrderIds.length} orders`, 'info');
      setSelectedOrderIds([]);
      setBulkCancelReason("");
    } else {
      triggerToast("Bulk cancellation failed", "error");
    }
  };

  const executeBulkEscalate = async () => {
    const success = await bulkEscalateOrders(selectedOrderIds);
    if (success) {
      triggerToast(`Escalated alerts for ${selectedOrderIds.length} orders`, 'success');
      setSelectedOrderIds([]);
    } else {
      triggerToast("Bulk escalation failed", "error");
    }
  };

  // Single Order Action Handlers
  const handleAssignSingle = async (driverId: string) => {
    if (!selectedOrderId) return;
    const success = await assignDriver(selectedOrderId, driverId);
    if (success) {
      triggerToast(`Assigned courier to order #${selectedOrderId}`, 'success');
    } else {
      triggerToast("Driver assignment failed", "error");
    }
  };

  const handleCancelSingle = async () => {
    if (!selectedOrderId) return;
    const reason = prompt("Enter cancellation reason:", "Operational cancel override");
    if (reason) {
      const success = await cancelOrder(selectedOrderId, reason);
      if (success) {
        triggerToast(`Cancelled order #${selectedOrderId}`, 'info');
      } else {
        triggerToast("Failed to cancel order", "error");
      }
    }
  };

  const handleForceCompleteSingle = async () => {
    if (!selectedOrderId) return;
    if (confirm("Are you sure you want to force complete this order?")) {
      const success = await forceCompleteOrder(selectedOrderId);
      if (success) {
        triggerToast(`Completed order #${selectedOrderId}`, 'success');
      } else {
        triggerToast("Failed to complete order", "error");
      }
    }
  };

  const handleRefundRequestSingle = async () => {
    if (!selectedOrderId || !refundAmount || !refundReason) return;
    const success = await requestRefund(selectedOrderId, refundAmount, refundReason);
    if (success) {
      triggerToast(`Refund requested for order #${selectedOrderId}`, 'success');
      setShowRefundModal(false);
      setRefundReason("");
      setRefundAmount(0);
    } else {
      triggerToast("Failed to initiate refund", "error");
    }
  };

  const handleEscalateSingle = async () => {
    if (!selectedOrderId) return;
    const success = await triggerEmergencyEscalation(selectedOrderId);
    if (success) {
      triggerToast(`CRITICAL: Order #${selectedOrderId} SLA escalated!`, 'error');
    } else {
      triggerToast("Escalation request failed", "error");
    }
  };

  const handlePriorityToggle = async () => {
    if (!selectedOrderId) return;
    const success = await toggleOrderPriority(selectedOrderId);
    if (success) {
      triggerToast(`Toggled priority status`, 'info');
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      {/* Toast Alert overlay */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: toast.type === 'success' ? 'var(--status-green)' : toast.type === 'error' ? 'var(--status-red)' : 'var(--accent)',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '13px',
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠' : 'ℹ'}</span>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: "16px", flexShrink: 0 }}>
        <div>
          <div className="page-title">Logistics Control Command Center</div>
          <div className="page-subtitle">Real-time driver dispatch, predictive SLA timers, and bulk operational controls</div>
        </div>
      </div>

      {/* Main 3-Pane Layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 360px",
        gap: "var(--gap-md)",
        flex: 1,
        minHeight: 0,
        paddingBottom: "16px"
      }}>
        
        {/* ========================================== */}
        {/* LEFT PANEL: OPERATIONAL FILTERS            */}
        {/* ========================================== */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", padding: "16px", gap: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
            Operational Filters
          </div>

          {/* Search */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>SEARCH PIPELINE</label>
            <input 
              type="text" 
              placeholder="Search ID, customer, merchant..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                fontSize: "12px",
                background: "var(--bg-base)",
                color: "var(--text-primary)"
              }}
            />
          </div>

          {/* Status Checkboxes */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>ORDER STATUS</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {["pending", "preparing", "delivering", "completed", "cancelled"].map(status => (
                <label key={status} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", textTransform: "capitalize", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={filterStatuses.includes(status)} 
                    onChange={() => handleStatusFilterToggle(status)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SLA Threat Level Checkboxes */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>SLA RISK LEVEL</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { key: "breached", label: "Breached (Overdue)", color: "var(--status-red)" },
                { key: "high_risk", label: "High Risk (<10m)", color: "var(--status-amber)" },
                { key: "warning", label: "Warning (<20m)", color: "#eab308" },
                { key: "safe", label: "Safe", color: "var(--status-green)" }
              ].map(sla => (
                <label key={sla.key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={filterSlas.includes(sla.key)} 
                    onChange={() => handleSlaFilterToggle(sla.key)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: sla.color }} />
                    {sla.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Delay Risk Checkboxes */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>DELAY RISK</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {["high", "medium", "low"].map(risk => (
                <label key={risk} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", textTransform: "capitalize", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={filterDelayRisks.includes(risk)} 
                    onChange={() => handleDelayRiskFilterToggle(risk)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>{risk}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Zone Selector */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>DISPATCH ZONE</label>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg-base)",
                color: "var(--text-primary)"
              }}
            >
              <option value="all">All Sectors</option>
              {ZONES.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Quick Filter Toggles */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={filterPriorityOnly} 
                onChange={(e) => setFilterPriorityOnly(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              <span>⭐ Priority Overrides Only</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={filterUnassignedOnly} 
                onChange={(e) => setFilterUnassignedOnly(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              <span>🚨 Unassigned Queue Only</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={filterRefundRequestedOnly} 
                onChange={(e) => setFilterRefundRequestedOnly(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              <span>💸 Refund Requested Only</span>
            </label>
          </div>
        </div>

        {/* ========================================== */}
        {/* CENTER PANEL: COMMAND GRID                 */}
        {/* ========================================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-md)", minHeight: 0 }}>
          
          {/* Real-time Metrics Ribbon */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gap-md)", flexShrink: 0 }}>
            <div className="panel" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Active Delivery Queue</div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>
                {activeOrders.length} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)" }}>orders</span>
              </div>
            </div>
            <div className="panel" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Unassigned Dispatch</div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", color: unassignedOrdersCount > 0 ? "var(--status-red)" : "var(--text-primary)" }}>
                {unassignedOrdersCount} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)" }}>unassigned</span>
              </div>
            </div>
            <div className="panel" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>High Delay Risk</div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", color: delayedOrdersCount > 0 ? "var(--status-amber)" : "var(--text-primary)" }}>
                {delayedOrdersCount} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)" }}>flagged</span>
              </div>
            </div>
            <div className="panel" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>SLA Breached</div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px", color: breachedOrdersCount > 0 ? "var(--status-red)" : "var(--text-primary)" }}>
                {breachedOrdersCount} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-muted)" }}>overdue</span>
              </div>
            </div>
          </div>

          {/* High Density Table Container */}
          <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", position: "relative" }}>
            
            {/* Table Header Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Displaying {sortedOrders.length} of {orders.length} platform orders
              </div>
              {selectedOrderIds.length > 0 && (
                <div style={{ fontSize: "11px", background: "var(--accent-light)", color: "var(--accent)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                  {selectedOrderIds.length} Selected
                </div>
              )}
            </div>

            {/* Table Scroll wrapper */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
              <table className="ops-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={sortedOrders.length > 0 && selectedOrderIds.length === sortedOrders.length}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort('id')}>
                      Order ID {sortField === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th>Customer</th>
                    <th>Merchant</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort('eta_minutes')}>
                      ETA {sortField === 'eta_minutes' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th>WAP Pred.</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort('sla')}>
                      SLA Countdown {sortField === 'sla' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th>Zone</th>
                    <th>Priority</th>
                    <th>Risk</th>
                    <th style={{ cursor: "pointer", textAlign: "right" }} onClick={() => handleSort('amount')}>
                      Price {sortField === 'amount' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th style={{ cursor: "pointer", textAlign: "right" }} onClick={() => handleSort('created_at')}>
                      Created {sortField === 'created_at' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "12px" }}>
                        No orders match the selected filters. Clear search or check filters.
                      </td>
                    </tr>
                  ) : (
                    sortedOrders.map((order) => {
                      const isSelected = selectedOrderId === order.id;
                      const isChecked = selectedOrderIds.includes(order.id);
                      const sla = calculateSLATime(order.created_at);
                      const risk = getDelayRisk(order);
                      const hasRefund = refunds.some(r => r.order_id === order.id && r.status === "pending");

                      // WAP dynamic comparison: compare ETA with a base predictions (simulated prep delay + 10m delivery travel)
                      const merchant = merchants.find(m => m.id === order.merchant_id);
                      const predictedPrep = merchant ? (merchant.prep_delay_minutes || 0) : 10;
                      const wapPredictedMinutes = predictedPrep + 12; // simulated WAP total delivery prediction
                      const etaWarning = order.status !== 'completed' && order.eta_minutes && order.eta_minutes > wapPredictedMinutes;

                      // Styles for SLA status
                      let slaBadgeColor = "var(--status-green)";
                      let slaBgColor = "rgba(34, 197, 94, 0.1)";
                      if (sla.status === 'breached') {
                        slaBadgeColor = "var(--status-red)";
                        slaBgColor = "rgba(239, 68, 68, 0.15)";
                      } else if (sla.status === 'high_risk') {
                        slaBadgeColor = "var(--status-amber)";
                        slaBgColor = "rgba(245, 158, 11, 0.15)";
                      } else if (sla.status === 'warning') {
                        slaBadgeColor = "#eab308";
                        slaBgColor = "rgba(234, 179, 8, 0.15)";
                      }

                      // Payment Status format
                      const paymentText = hasRefund ? "Refund Pending" : "Paid";

                      return (
                        <tr 
                          key={order.id}
                          style={{
                            cursor: "pointer",
                            background: isSelected ? "var(--bg-hover)" : (isChecked ? "var(--bg-sunken)" : "transparent"),
                            fontSize: "11.5px"
                          }}
                          onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                        >
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleRowCheckboxToggle(order.id)}
                            />
                          </td>
                          <td className="mono" style={{ fontWeight: 700 }}>#{order.id}</td>
                          <td style={{ fontWeight: 500 }}>{order.customer_name}</td>
                          <td>{order.merchant_name}</td>
                          <td>
                            {order.driver_id ? (
                              <span style={{ color: "var(--text-secondary)" }}>{order.driver_name}</span>
                            ) : (
                              <span style={{ color: "var(--status-red)", fontWeight: 700 }}>🚨 Unassigned</span>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="mono" style={{ color: etaWarning ? "var(--status-red)" : "inherit", fontWeight: etaWarning ? 700 : 400 }}>
                            {order.status === 'completed' ? '—' : (order.eta_minutes ? `${order.eta_minutes} min` : 'estimating')}
                            {etaWarning && <span title="ETA drifts past WAP prediction!" style={{ marginLeft: 4 }}>⚠️</span>}
                          </td>
                          <td className="mono" style={{ color: "var(--text-muted)" }}>
                            {order.status === 'completed' ? '—' : `${wapPredictedMinutes} min`}
                          </td>
                          <td className="mono">
                            {order.status === 'completed' || order.status === 'cancelled' ? (
                              <span style={{ color: "var(--text-muted)" }}>—</span>
                            ) : (
                              <span style={{ 
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                color: slaBadgeColor,
                                background: slaBgColor,
                                fontWeight: 700
                              }}>
                                {sla.formatted}
                              </span>
                            )}
                          </td>
                          <td>{order.zone}</td>
                          <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="btn btn-ghost btn-xs" 
                              style={{ padding: 0, fontSize: "14px" }}
                              onClick={() => {
                                toggleOrderPriority(order.id);
                                triggerToast(`Toggled order priority`, 'info');
                              }}
                            >
                              {order.priority ? "⭐" : "☆"}
                            </button>
                          </td>
                          <td>
                            <span style={{
                              display: "inline-block",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontSize: "9px",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              background: risk === 'high' ? "var(--status-red-bg)" : risk === 'medium' ? "rgba(245, 158, 11, 0.1)" : "rgba(34, 197, 94, 0.1)",
                              color: risk === 'high' ? "var(--status-red)" : risk === 'medium' ? "var(--status-amber)" : "var(--status-green)"
                            }}>
                              {risk}
                            </span>
                          </td>
                          <td className="mono" style={{ textAlign: "right", fontWeight: 500 }}>
                            {order.amount} {order.currency}
                            <div style={{ fontSize: "9px", color: hasRefund ? "var(--status-red)" : "var(--status-green)", fontWeight: 600 }}>
                              {paymentText}
                            </div>
                          </td>
                          <td className="mono" style={{ textAlign: "right", color: "var(--text-muted)" }}>
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Slide-Up Bulk Control Drawer */}
            {selectedOrderIds.length > 0 && (
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "var(--bg-surface)",
                borderTop: "2px solid var(--accent)",
                boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
                padding: "12px 18px",
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                alignItems: "center",
                gap: "24px",
                zIndex: 100
              }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>Bulk Actions</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Selected: <b>{selectedOrderIds.length} orders</b></div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "flex-end" }}>
                  {/* Bulk Assign */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <select
                      value={bulkDriverSelect}
                      onChange={(e) => setBulkDriverSelect(e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border)", width: "130px", background: "var(--bg-base)" }}
                    >
                      <option value="">Select Driver</option>
                      {availableDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <button className="btn btn-primary btn-xs" disabled={!bulkDriverSelect} onClick={executeBulkAssign}>
                      Assign
                    </button>
                  </div>

                  {/* Bulk Reroute */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <select
                      value={bulkZoneSelect}
                      onChange={(e) => setBulkZoneSelect(e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border)", width: "120px", background: "var(--bg-base)" }}
                    >
                      <option value="">Select Zone</option>
                      {ZONES.map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                    <button className="btn btn-secondary btn-xs" disabled={!bulkZoneSelect} onClick={executeBulkReroute}>
                      Reroute
                    </button>
                  </div>

                  {/* Bulk Cancel */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input 
                      type="text" 
                      placeholder="Reason for cancel..." 
                      value={bulkCancelReason}
                      onChange={(e) => setBulkCancelReason(e.target.value)}
                      style={{ padding: "6px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border)", width: "140px", background: "var(--bg-base)" }}
                    />
                    <button className="btn btn-ghost btn-xs" style={{ color: "var(--status-red)" }} onClick={executeBulkCancel}>
                      Cancel
                    </button>
                  </div>

                  {/* Bulk Escalate */}
                  <button className="btn btn-secondary btn-xs" onClick={executeBulkEscalate} style={{ borderColor: "var(--status-red)", color: "var(--status-red)" }}>
                    🚨 SLA Escalate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT PANEL: CONTEXT DETAILS DRAWER       */}
        {/* ========================================== */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
          {selectedOrder ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px", gap: "16px" }}>
              
              {/* Drawer Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>Order Dispatch Details</span>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "2px 0 0" }} className="mono">#{selectedOrder.id}</h3>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setSelectedOrderId(null)}>✕</button>
              </div>

              {/* Dynamic Mini-Map tracking Restaurant -> Driver -> Customer */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Live Track mini-map</span>
                <div style={{ height: "200px", width: "100%", position: "relative", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
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

              {/* Status Stepper Timeline */}
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Status Timeline</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: "2px solid var(--border)", marginLeft: "8px", paddingLeft: "16px", position: "relative" }}>
                  {[
                    { key: "pending", label: "Order Created", desc: "Awaiting driver assignment" },
                    { key: "preparing", label: "Kitchen Preparing", desc: "Restaurant preparing food" },
                    { key: "delivering", label: "Courier Transit", desc: "Out for customer delivery" },
                    { key: "completed", label: "Delivered", desc: "Handover confirmed" }
                  ].map((step, idx) => {
                    const statuses = ["pending", "preparing", "delivering", "completed"];
                    const currentIdx = statuses.indexOf(selectedOrder.status);
                    const isDone = currentIdx >= idx;
                    const isCurrent = selectedOrder.status === step.key;

                    return (
                      <div key={step.key} style={{ position: "relative", fontSize: "12px" }}>
                        {/* Node bullet */}
                        <div style={{
                          position: "absolute",
                          left: "-23px",
                          top: "2px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: isCurrent ? "var(--accent)" : (isDone ? "var(--status-green)" : "var(--border)"),
                          border: "2px solid var(--bg-surface)",
                          boxShadow: isCurrent ? "0 0 8px var(--accent)" : "none"
                        }} />
                        <div style={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {step.label}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {step.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Profile */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Customer Profile</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{selectedOrder.customer_name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>ID: {selectedOrder.customer_id} · Algiers</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => triggerToast("Dialing customer...", "info")}>📞 Call</button>
                    <button className="btn btn-secondary btn-xs" onClick={() => triggerToast("Customer chat opened", "info")}>💬 Msg</button>
                  </div>
                </div>
              </div>

              {/* Merchant Status & Buffer Offsets */}
              {(() => {
                const merchant = merchants.find(m => m.id === selectedOrder.merchant_id);
                if (!merchant) return null;
                return (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Merchant Controller</span>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>{selectedOrder.merchant_name}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>★ {merchant.rating} · Category: {merchant.category}</div>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {(['open', 'paused', 'busy', 'delayed'] as const).map(st => (
                          <button
                            key={st}
                            className={`btn ${merchant.operational_status === st ? "btn-primary" : "btn-secondary"} btn-xs`}
                            style={{ textTransform: "capitalize", padding: "1px 4px", fontSize: "10px" }}
                            onClick={() => setMerchantStatus(merchant.id, st)}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-sunken)", padding: "10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>Kitchen Backlog Delay</div>
                        <div style={{ fontSize: "9.5px", color: "var(--text-muted)" }}>Scales customer-facing ETAs</div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={merchant.kitchen_delay || false} 
                        onChange={() => {
                          const state = useDashboardStore.getState();
                          state.updateDriver // force state trigger update
                          useDashboardStore.setState({
                            merchants: state.merchants.map(m => m.id === merchant.id ? { ...m, kitchen_delay: !m.kitchen_delay } : m)
                          });
                          triggerToast("Kitchen delay state toggled", "info");
                        }}
                        style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Driver Details / Assign Panel */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Driver Dispatch Control</span>
                {selectedOrder.driver_id ? (
                  (() => {
                    const driver = drivers.find(d => d.id === selectedOrder.driver_id);
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>{selectedOrder.driver_name}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              Zone: {driver?.zone} · Rating: ★{driver?.rating || '5.0'}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button className="btn btn-secondary btn-xs" onClick={() => triggerToast(`Dialing driver ${driver?.phone}...`, "info")}>📞 Call</button>
                            <button className="btn btn-secondary btn-xs" onClick={() => triggerToast("Driver chat opened", "info")}>💬 Msg</button>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                          <button 
                            className="btn btn-secondary btn-xs" 
                            style={{ flex: 1, borderColor: "var(--status-red)", color: "var(--status-red)", justifyContent: "center" }}
                            onClick={() => {
                              suspendDriver(selectedOrder.driver_id!);
                              triggerToast("Driver suspension status toggled", "info");
                            }}
                          >
                            ⚠️ Suspend Driver
                          </button>
                          <button 
                            className="btn btn-ghost btn-xs" 
                            style={{ flex: 1, justifyContent: "center", border: "1px solid var(--border)" }}
                            onClick={() => {
                              // Clear driver to allow reassigning
                              useDashboardStore.setState({
                                orders: orders.map(o => o.id === selectedOrder.id ? { ...o, driver_id: undefined, driver_name: "Unassigned", status: "pending" } : o)
                              });
                              triggerToast("Courier unassigned. Order back to pending queue.", "info");
                            }}
                          >
                            🔄 Reassign Order
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "11.5px", color: "var(--status-red)", fontWeight: 700 }}>
                      🚨 Alert: This order requires a dispatch courier immediately.
                    </div>
                    {recommendedDrivers.length === 0 ? (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px", background: "var(--bg-sunken)", borderRadius: "4px", textAlign: "center" }}>
                        No available couriers online right now. Reroute drivers.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary)" }}>AI Recommended Drivers ({recommendedDrivers.length})</div>
                        {recommendedDrivers.slice(0, 3).map(d => {
                          const sameZone = d.zone === selectedOrder.zone;
                          return (
                            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-sunken)", padding: "6px 8px", borderRadius: "4px", fontSize: "11.5px", border: sameZone ? "1px solid var(--status-green)" : "1px solid transparent" }}>
                              <span><b>{d.name}</b> ({d.zone})</span>
                              <button className="btn btn-primary btn-xs" style={{ padding: "2px 6px" }} onClick={() => handleAssignSingle(d.id)}>
                                Assign
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Predictive Analytics */}
              {(() => {
                const metrics = aiMetrics.find(m => m.restaurant_id === selectedOrder.merchant_id) || aiMetrics[0];
                if (!metrics) return null;
                return (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>WAP AI Analytics ({metrics.model_version})</span>
                      <button 
                        className="btn btn-ghost btn-xs" 
                        style={{ fontSize: "9.5px", padding: "1px 4px", border: "1px solid var(--border)" }}
                        onClick={async () => {
                          const success = await retrainWapModel();
                          if (success) triggerToast("WAP retrain request queued", "success");
                        }}
                      >
                        ⚡ Retrain Model
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                      <div style={{ background: "var(--bg-sunken)", padding: "6px 8px", borderRadius: "4px" }}>
                        <span style={{ color: "var(--text-muted)" }}>MAE Margin:</span> <b>{metrics.mae}m</b>
                      </div>
                      <div style={{ background: "var(--bg-sunken)", padding: "6px 8px", borderRadius: "4px" }}>
                        <span style={{ color: "var(--text-muted)" }}>Accuracy score:</span> <b>{Math.round(metrics.r2_score * 100)}%</b>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Overrides */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Dispatcher Actions & Incident Control</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button className="btn btn-secondary btn-sm" style={{ justifyContent: "center", color: "var(--status-red)", borderColor: "var(--status-red)" }} onClick={handleCancelSingle}>
                    🛑 Cancel Order
                  </button>
                  <button className="btn btn-secondary btn-sm" style={{ justifyContent: "center", color: "var(--status-green)", borderColor: "var(--status-green)" }} onClick={handleForceCompleteSingle}>
                    ✓ Force Complete
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button className="btn btn-secondary btn-sm" style={{ justifyContent: "center" }} onClick={() => setShowRefundModal(true)}>
                    💸 Issue Refund
                  </button>
                  <button className="btn btn-secondary btn-sm" style={{ justifyContent: "center", color: "var(--status-red)", borderColor: "var(--status-red)" }} onClick={handleEscalateSingle}>
                    🚨 Escalate SLA
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px", color: "var(--text-muted)", textAlign: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: "16px" }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>No Order Selected</div>
              <div style={{ fontSize: "11.5px", marginTop: "4px" }}>Click on an order row in the grid to load full logistics details, dispatch recommended drivers, adjust buffers, and track on the live mini-map.</div>
            </div>
          )}
        </div>

      </div>

      {/* Refund Modal Overlay */}
      {showRefundModal && selectedOrder && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div className="panel" style={{ width: "400px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700 }}>Issue Refund for #{selectedOrder.id}</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowRefundModal(false)}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>REFUND AMOUNT (Max: {selectedOrder.amount} {selectedOrder.currency})</label>
              <input 
                type="number" 
                min="0" 
                max={selectedOrder.amount}
                placeholder="Enter amount..."
                value={refundAmount || ""}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
                style={{ width: "100%", padding: "8px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-base)" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "11.5px", fontWeight: 600, display: "block", marginBottom: "4px" }}>REASON FOR REFUND</label>
              <textarea 
                placeholder="Customer late complaint, missing items, food quality issues..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                style={{ width: "100%", padding: "8px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--border)", height: "80px", background: "var(--bg-base)", resize: "none" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRefundModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary btn-sm" 
                disabled={!refundAmount || !refundReason}
                onClick={handleRefundRequestSingle}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
