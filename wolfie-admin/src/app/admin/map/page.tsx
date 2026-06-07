"use client";
import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useDashboardStore } from "@/stores/dashboardStore";
import { Order, Driver, Merchant } from "@/types";

// Dynamically import MapComponent to prevent SSR errors with Leaflet
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
        borderRadius: "var(--radius-lg)",
        color: "var(--text-muted)",
        fontSize: "14px"
      }}
    >
      <span className="rt-dot live" style={{ marginRight: 8 }} /> Loading Live Tracking Interface...
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


export default function LiveMapPage() {
  const {
    orders,
    drivers,
    merchants,
    activityFeed,
    fetchDashboardData,
    assignDriver,
    cancelOrder,
    forceCompleteOrder,
    rerouteDriver,
    suspendDriver,
    setMerchantStatus,
    toggleOrderPriority,
    triggerEmergencyEscalation
  } = useDashboardStore();

  const [viewMode, setViewMode] = useState<'overview' | 'drivers' | 'orders' | 'hotspots'>('overview');
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>(undefined);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | undefined>(undefined);
  
  // Drag and drop states
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverDriverId, setDragOverDriverId] = useState<string | null>(null);

  // Merchant edit states
  const [prepDelaySlider, setPrepDelaySlider] = useState<number>(0);
  
  // Dispatch notification toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh coordinates and stats every 10 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Show selection state changes in detail panels
  useEffect(() => {
    if (selectedMerchantId) {
      const m = merchants.find(mer => mer.id === selectedMerchantId);
      if (m) {
        setPrepDelaySlider(m.prep_delay_minutes || 0);
      }
    }
  }, [selectedMerchantId, merchants]);

  const triggerToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.setData("text/plain", orderId);
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
  };

  const handleDrop = async (driverId: string) => {
    if (!draggedOrderId) return;
    const success = await assignDriver(draggedOrderId, driverId);
    if (success) {
      triggerToast(`Order assigned to driver successfully!`, 'success');
    } else {
      triggerToast(`Failed to assign order. Reverting…`, 'error');
    }
    setDragOverDriverId(null);
    setDraggedOrderId(null);
  };

  // Derive operations metrics
  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'), [orders]);
  const unassignedOrders = useMemo(() => activeOrders.filter(o => !o.driver_id || o.driver_name === 'Unassigned'), [activeOrders]);
  const onlineDrivers = useMemo(() => drivers.filter(d => d.status !== 'offline'), [drivers]);
  const idleDrivers = useMemo(() => onlineDrivers.filter(d => d.status === 'available'), [onlineDrivers]);

  // AI nearest driver recommendations for selected order
  const suggestedDrivers = useMemo(() => {
    if (!selectedOrderId) return [];
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return [];

    // Filter available drivers in the same zone first, then other available drivers
    const zoneMatch = idleDrivers.filter(d => d.zone === order.zone);
    const otherZones = idleDrivers.filter(d => d.zone !== order.zone);
    return [...zoneMatch, ...otherZones].slice(0, 3);
  }, [selectedOrderId, idleDrivers, orders]);

  // Local handler wrappers
  const handleForceComplete = async (orderId: string) => {
    const success = await forceCompleteOrder(orderId);
    if (success) {
      triggerToast(`Order force completed!`, 'success');
      setSelectedOrderId(undefined);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt("Enter cancellation reason:");
    if (reason === null) return; // cancelled prompt
    const success = await cancelOrder(orderId, reason || "Operations Override");
    if (success) {
      triggerToast(`Order cancelled.`, 'info');
      setSelectedOrderId(undefined);
    }
  };

  const handleEmergencyEscalate = async (orderId: string) => {
    const success = await triggerEmergencyEscalation(orderId);
    if (success) {
      triggerToast(`CRITICAL: SLA escalation triggered!`, 'error');
    }
  };

  const handleUpdatePrepDelay = (merchantId: string, value: number) => {
    useDashboardStore.setState((state) => ({
      merchants: state.merchants.map((m) =>
        m.id === merchantId ? { ...m, prep_delay_minutes: value } : m
      )
    }));
    triggerToast(`Prep delay updated to ${value} minutes`, 'success');
  };

  const handleToggleKitchenDelay = (merchantId: string, current: boolean) => {
    useDashboardStore.setState((state) => ({
      merchants: state.merchants.map((m) =>
        m.id === merchantId ? { ...m, kitchen_delay: !current } : m
      )
    }));
    triggerToast(`Kitchen delay status toggled`, 'info');
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      {/* Toast Alert overlay */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: toastMessage.type === 'success' ? 'var(--status-green)' : toastMessage.type === 'error' ? 'var(--status-red)' : 'var(--accent)',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          fontSize: '13px',
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          animation: "slideIn 0.2s ease"
        }}>
          <span>{toastMessage.type === 'success' ? '✓' : toastMessage.type === 'error' ? '⚠' : 'ℹ'}</span>
          {toastMessage.text}
        </div>
      )}

      {/* Grid container: 3 Columns layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "310px 1fr 340px",
        gap: "var(--gap-md)",
        flex: 1,
        minHeight: 0,
        paddingBottom: "16px"
      }}>
        
        {/* ========================================================= */}
        {/* LEFT PANEL: DISPATCH QUEUE & FLEET STATUS                 */}
        {/* ========================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-md)", minHeight: 0 }}>
          
          {/* Draggable Unassigned Queue */}
          <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="panel-header" style={{ padding: "10px 14px" }}>
              <div className="panel-title">
                <span className="panel-title-dot" style={{ backgroundColor: "var(--status-amber)" }} />
                Unassigned Queue ({unassignedOrders.length})
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>Drag orders</span>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {unassignedOrders.length === 0 ? (
                <div style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  border: "1.5px dashed var(--border)",
                  borderRadius: "var(--radius-md)"
                }}>
                  No unassigned orders. Dispatch clear!
                </div>
              ) : (
                unassignedOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setSelectedDriverId(undefined);
                        setSelectedMerchantId(undefined);
                      }}
                      style={{
                        padding: "10px",
                        background: isSelected ? "var(--accent-light)" : "var(--bg-base)",
                        border: isSelected ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        cursor: "grab",
                        position: "relative",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {order.priority && (
                        <span style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          fontSize: "9px",
                          fontWeight: 700,
                          background: "var(--status-red-bg)",
                          color: "var(--status-red)",
                          padding: "1px 4px",
                          borderRadius: "3px"
                        }}>
                          PRIORITY
                        </span>
                      )}
                      <div style={{ fontWeight: 700, fontSize: "12px" }}>#{order.id}</div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        From: <b>{order.merchant_name}</b>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                        To: <b>{order.customer_name}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "10.5px" }}>
                        <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{order.zone}</span>
                        <span style={{ fontWeight: 600, color: "var(--status-amber)" }}>Pending pickup</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* High Density Driver List (Drop target) */}
          <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="panel-header" style={{ padding: "10px 14px" }}>
              <div className="panel-title">
                <span className="panel-title-dot" style={{ backgroundColor: "var(--status-green)" }} />
                Active Fleet Status ({onlineDrivers.length})
              </div>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {onlineDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                const isDragOver = dragOverDriverId === driver.id;
                
                return (
                  <div
                    key={driver.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => draggedOrderId && setDragOverDriverId(driver.id)}
                    onDragLeave={() => setDragOverDriverId(null)}
                    onDrop={() => handleDrop(driver.id)}
                    onClick={() => {
                      setSelectedDriverId(driver.id);
                      setSelectedOrderId(undefined);
                      setSelectedMerchantId(undefined);
                    }}
                    style={{
                      padding: "8px 10px",
                      background: isSelected ? "var(--bg-hover)" : "var(--bg-surface)",
                      border: isDragOver ? "2px dashed var(--accent)" : "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px" }}>{driver.name}</div>
                      <span className={`badge ${driver.status === 'available' ? 'badge-green' : driver.status === 'delivering' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: "9.5px", padding: "1px 6px" }}>
                        {driver.status}
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                      <span>Zone: {driver.zone}</span>
                      <span>Rating: ★{driver.rating}</span>
                    </div>

                    {driver.current_order_id && (
                      <div style={{
                        marginTop: "6px",
                        padding: "3px 6px",
                        background: "var(--bg-sunken)",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        color: "var(--text-secondary)",
                        display: "flex",
                        justifyContent: "space-between"
                      }}>
                        <span>Active: <b>{driver.current_order_id}</b></span>
                        <span style={{ fontSize: "9.5px" }}>In progress</span>
                      </div>
                    )}

                    {isDragOver && (
                      <div style={{
                        marginTop: "8px",
                        textAlign: "center",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--accent)",
                        padding: "4px",
                        background: "var(--accent-light)",
                        borderRadius: "4px"
                      }}>
                        Drop to assign order
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* CENTER PANEL: MAP VIEW & OPERATIONAL SUMMARIES            */}
        {/* ========================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-md)", minHeight: 0 }}>
          
          {/* Quick Metrics Bar */}
          <div className="panel" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "12px 16px", gap: "12px" }}>
            <div style={{ borderRight: "1px solid var(--border)", paddingRight: "12px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Online Fleet</div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px" }}>{onlineDrivers.length} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/ {drivers.length}</span></div>
            </div>
            <div style={{ borderRight: "1px solid var(--border)", paddingRight: "12px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Unassigned Orders</div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px", color: unassignedOrders.length > 0 ? "var(--status-amber)" : "inherit" }}>{unassignedOrders.length}</div>
            </div>
            <div style={{ borderRight: "1px solid var(--border)", paddingRight: "12px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Active Routes</div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px", color: "var(--accent)" }}>{activeOrders.length}</div>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Idle Courier Rate</div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px", color: idleDrivers.length > 0 ? "var(--status-green)" : "inherit" }}>
                {onlineDrivers.length > 0 ? Math.round((idleDrivers.length / onlineDrivers.length) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="panel" style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            
            {/* View Mode Map Overlay Controllers */}
            <div style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 999,
              background: "#fff",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              gap: "4px"
            }}>
              {(['overview', 'drivers', 'orders', 'hotspots'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    setSelectedDriverId(undefined);
                    setSelectedOrderId(undefined);
                    setSelectedMerchantId(undefined);
                  }}
                  className={`btn ${viewMode === mode ? 'btn-primary' : 'btn-secondary'} btn-xs`}
                  style={{ textTransform: "capitalize" }}
                >
                  {mode}
                </button>
              ))}
            </div>

            <MapComponent
              orders={orders}
              drivers={drivers}
              selectedDriverId={selectedDriverId}
              selectedOrderId={selectedOrderId}
              selectedMerchantId={selectedMerchantId}
              viewMode={viewMode}
              onSelectDriver={setSelectedDriverId}
              onSelectOrder={setSelectedOrderId}
              onSelectMerchant={setSelectedMerchantId}
            />

          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: DETAILS & CONTROL DRAWER                    */}
        {/* ========================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-md)", minHeight: 0 }}>
          
          <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            
            {/* 1. Driver Context Panel */}
            {selectedDriverId && (() => {
              const driver = drivers.find(d => d.id === selectedDriverId);
              if (!driver) return null;
              
              const activeOrder = orders.find(o => o.id === driver.current_order_id || (driver.active_order_ids && driver.active_order_ids.includes(o.id)));
              
              return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--status-green)", textTransform: "uppercase" }}>Driver Console</span>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "2px 0 0" }}>{driver.name}</h3>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => setSelectedDriverId(undefined)}>✕</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div className="panel" style={{ padding: "8px 12px", background: "var(--bg-sunken)", border: "none" }}>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Rating</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>★ {driver.rating}</div>
                      </div>
                      <div className="panel" style={{ padding: "8px 12px", background: "var(--bg-sunken)", border: "none" }}>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Trips</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>{driver.completed_trips} trips</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>CURRENT STATUS</div>
                      <span className={`badge ${driver.status === 'available' ? 'badge-green' : driver.status === 'offline' ? 'badge-gray' : 'badge-blue'}`}>
                        {driver.status}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>CONTACT COURIER</div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => triggerToast(`Dialing phone ${driver.phone || 'N/A'}…`, 'info')}>
                          📞 Call
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => triggerToast(`Messaging client chat hook…`, 'info')}>
                          💬 Message
                        </button>
                      </div>
                    </div>

                    {/* Active Order information */}
                    {activeOrder ? (
                      <div className="panel" style={{ padding: "12px", borderColor: "var(--accent)" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: "6px" }}>Linked Delivery</div>
                        <div style={{ fontWeight: 700, fontSize: "12px" }}>Order #{activeOrder.id}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                          Merchant: <b>{activeOrder.merchant_name}</b><br/>
                          Destination: <b>{activeOrder.customer_name}</b>
                        </div>
                        
                        {/* Timeline */}
                        <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px" }}>ROUTE TIMELINE</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11.5px" }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span style={{ color: "var(--status-green)" }}>✓</span>
                              <span style={{ color: "var(--text-secondary)" }}>Merchant prep</span>
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span style={{ color: activeOrder.status === 'delivering' ? 'var(--status-green)' : 'var(--text-muted)' }}>
                                {activeOrder.status === 'delivering' ? '✓' : '○'}
                              </span>
                              <span style={{ color: activeOrder.status === 'delivering' ? 'var(--text-primary)' : 'var(--text-muted)' }}>In-transit to customer</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "12px", textAlign: "center", background: "var(--bg-sunken)", borderRadius: "var(--radius-md)", fontSize: "11.5px", color: "var(--text-muted)" }}>
                        Courier is currently idle. No active route polylines.
                      </div>
                    )}

                    {/* Dispatcher Overrides */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "8px" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px" }}>OPERATIONAL OVERRIDES</div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <label style={{ fontSize: "10.5px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Force Reroute Zone</label>
                          <select
                            value={driver.zone}
                            onChange={(e) => {
                              rerouteDriver(driver.id, e.target.value);
                              triggerToast(`Rerouted courier ${driver.name} to ${e.target.value}`, 'info');
                            }}
                            style={{
                              width: "100%",
                              padding: "6px",
                              fontSize: "12px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border)",
                              background: "#fff"
                            }}
                          >
                            {ZONES.map(z => (
                              <option key={z} value={z}>{z}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            suspendDriver(driver.id);
                            triggerToast(`Driver status toggle executed locally`, 'info');
                          }}
                          style={{
                            color: driver.status === 'offline' ? 'var(--status-green)' : 'var(--status-red)',
                            borderColor: driver.status === 'offline' ? 'var(--status-green)' : 'var(--status-red)',
                            justifyContent: "center",
                            marginTop: "4px"
                          }}
                        >
                          {driver.status === 'offline' ? "⚡ Activate Driver" : "🛑 Go Offline / Suspend"}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* 2. Merchant Context Panel */}
            {selectedMerchantId && (() => {
              const merchant = merchants.find(m => m.id === selectedMerchantId);
              if (!merchant) return null;

              const activeMerchantOrders = orders.filter(o => o.merchant_id === merchant.id && o.status !== 'completed' && o.status !== 'cancelled');

              return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--status-amber)", textTransform: "uppercase" }}>Merchant Console</span>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "2px 0 0" }}>{merchant.name}</h3>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => setSelectedMerchantId(undefined)}>✕</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>CATEGORY & RATING</div>
                      <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                        {merchant.category} · ★ {merchant.rating} · Zone: {merchant.zone}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "6px" }}>OPERATIONAL STATUS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {(['open', 'paused', 'busy', 'delayed'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => setMerchantStatus(merchant.id, status)}
                            className={`btn ${merchant.operational_status === status ? 'btn-primary' : 'btn-secondary'} btn-xs`}
                            style={{ textTransform: "capitalize" }}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Delay Slider */}
                    <div style={{ padding: "12px", background: "var(--bg-sunken)", borderRadius: "var(--radius-md)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600 }}>
                        <span style={{ color: "var(--text-secondary)" }}>Prep Delay Buffer</span>
                        <span style={{ color: "var(--status-amber)" }}>+{prepDelaySlider} mins</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="45"
                        step="5"
                        value={prepDelaySlider}
                        onChange={(e) => setPrepDelaySlider(parseInt(e.target.value))}
                        style={{ width: "100%", marginTop: "8px", accentColor: "var(--accent)" }}
                      />
                      <button
                        className="btn btn-primary btn-xs"
                        style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
                        onClick={() => handleUpdatePrepDelay(merchant.id, prepDelaySlider)}
                      >
                        Apply Prep Offset
                      </button>
                    </div>

                    {/* Kitchen Delay toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <span style={{ fontSize: "12px", fontWeight: 600 }}>Kitchen Backlog Delay</span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>Triggers automatic prep scaling</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={merchant.kitchen_delay || false}
                        onChange={() => handleToggleKitchenDelay(merchant.id, merchant.kitchen_delay || false)}
                        style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                      />
                    </div>

                    {/* Merchant Active Orders */}
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px" }}>ACTIVE IN-KITCHEN ORDERS ({activeMerchantOrders.length})</div>
                      {activeMerchantOrders.length === 0 ? (
                        <div style={{ padding: "12px", textAlign: "center", background: "var(--bg-sunken)", borderRadius: "var(--radius-md)", fontSize: "11px", color: "var(--text-muted)" }}>
                          No active kitchen tickets
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {activeMerchantOrders.map(o => (
                            <div
                              key={o.id}
                              onClick={() => setSelectedOrderId(o.id)}
                              style={{
                                padding: "6px 8px",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "11.5px",
                                display: "flex",
                                justifyContent: "space-between",
                                cursor: "pointer"
                              }}
                            >
                              <span><b>#{o.id}</b> · {o.customer_name}</span>
                              <span style={{ color: "var(--status-amber)", fontWeight: 600 }}>{o.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* 3. Order Context Panel */}
            {selectedOrderId && (() => {
              const order = orders.find(o => o.id === selectedOrderId);
              if (!order) return null;

              return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>Order Dispatch Console</span>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "2px 0 0" }}>#{order.id}</h3>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={() => setSelectedOrderId(undefined)}>✕</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div className="panel" style={{ padding: "8px 12px", background: "var(--bg-sunken)", border: "none" }}>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Amount</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>{order.amount} {order.currency}</div>
                      </div>
                      <div className="panel" style={{ padding: "8px 12px", background: "var(--bg-sunken)", border: "none" }}>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>ETA</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>{order.eta_minutes ? `${order.eta_minutes}m` : '--'}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>CUSTOMER & ROUTE</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                        From: <b>{order.merchant_name}</b><br/>
                        To: <b>{order.customer_name}</b><br/>
                        Sect: <b>{order.zone}</b>
                      </div>
                    </div>

                    {/* Priority Override toggle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <span style={{ fontSize: "12px", fontWeight: 600 }}>Priority Dispatch Override</span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>Flags delivery for active courier alerts</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={order.priority || false}
                        onChange={() => {
                          toggleOrderPriority(order.id);
                          triggerToast(`Order priority toggled`, 'info');
                        }}
                        style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
                      />
                    </div>

                    {/* AI Recommender for courier assignment */}
                    {!order.driver_id || order.driver_name === 'Unassigned' ? (
                      <div className="panel" style={{ padding: "12px", borderColor: "var(--status-green)" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--status-green)", textTransform: "uppercase", marginBottom: "8px" }}>💡 AI nearest Dispatch Recommender</div>
                        {suggestedDrivers.length === 0 ? (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>No idle drivers online in this sector.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {suggestedDrivers.map(d => (
                              <button
                                key={d.id}
                                className="btn btn-secondary btn-xs"
                                style={{ justifyContent: "space-between", width: "100%" }}
                                onClick={async () => {
                                  const success = await assignDriver(order.id, d.id);
                                  if (success) triggerToast(`Courier assigned successfully!`, 'success');
                                }}
                              >
                                <span>⚡ <b>{d.name}</b> ({d.zone})</span>
                                <span style={{ color: "var(--status-green)", fontWeight: 600 }}>Assign</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>COURIER LOGGED</div>
                        <div style={{ fontSize: "12px" }}>
                          Courier Name: <b>{order.driver_name}</b><br/>
                          Courier ID: <span className="mono">{order.driver_id}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions dropdown */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "8px" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "8px" }}>DISPATCH CONTROL OVERRIDES</div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, borderColor: "var(--status-green)", color: "var(--status-green)" }}
                            onClick={() => handleForceComplete(order.id)}
                          >
                            ✓ Force Complete
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, borderColor: "var(--status-red)", color: "var(--status-red)" }}
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            ✕ Cancel Order
                          </button>
                        </div>

                        <button
                          className="btn btn-primary btn-sm"
                          style={{ background: "var(--status-red)", borderColor: "var(--status-red)", justifyContent: "center" }}
                          onClick={() => handleEmergencyEscalate(order.id)}
                        >
                          ⚠️ Trigger Emergency SLA Escalation
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* 4. Default Panel / Help Screen */}
            {!selectedDriverId && !selectedOrderId && !selectedMerchantId && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "32px",
                textAlign: "center",
                color: "var(--text-muted)"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "16px" }}>🗺️</div>
                <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Operational Command Console</h4>
                <p style={{ fontSize: "12px", lineHeight: "1.4" }}>
                  Select any driver marker, merchant, or customer location from the live operations map, or select from the sidebars to execute direct overrides and dispatch actions.
                </p>
                <div style={{
                  marginTop: "20px",
                  padding: "10px 14px",
                  background: "var(--bg-sunken)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "11px",
                  textAlign: "left",
                  width: "100%"
                }}>
                  <div style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>Dispatcher Tip:</div>
                  Drag and drop unassigned orders directly onto online couriers in the fleet side-panel to manual-dispatch routes.
                </div>
              </div>
            )}

          </div>

          {/* Micro Activity Feed */}
          <div className="panel" style={{ height: "135px", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="panel-header" style={{ padding: "8px 12px" }}>
              <div className="panel-title" style={{ fontSize: "11.5px" }}>Live Dispatch logs</div>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "4px 8px" }}>
              {activityFeed.slice(0, 10).map((act) => (
                <div key={act.id} style={{ display: "flex", gap: "6px", fontSize: "11px", padding: "3px 0" }}>
                  <span style={{ color: act.color || "var(--accent)" }}>●</span>
                  <span style={{ color: "var(--text-secondary)" }}>{act.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
