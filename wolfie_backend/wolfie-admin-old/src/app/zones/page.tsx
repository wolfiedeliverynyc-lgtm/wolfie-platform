"use client";
import React, { useMemo, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function ZonesDemandPage() {
  const { orders, drivers, fetchDashboardData } = useDashboardStore();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Aggregate statistics per zone dynamically
  const zonesSummary = useMemo(() => {
    const list = [
      { name: "Algiers Centre", coords: [36.7525, 3.0588] },
      { name: "El Biar",        coords: [36.7692, 3.0333] },
      { name: "Bab Ezzouar",    coords: [36.7262, 3.1825] },
      { name: "Hussein Dey",    coords: [36.7447, 3.0931] },
      { name: "Kouba",          coords: [36.7275, 3.0861] },
      { name: "Ain Taya",       coords: [36.7936, 3.2422] }
    ];

    return list.map((zone) => {
      const zoneOrders = orders.filter(o => o.zone === zone.name);
      const activeCount = zoneOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
      
      const zoneDrivers = drivers.filter(d => d.zone === zone.name);
      const onlineDrivers = zoneDrivers.filter(d => d.status !== 'offline').length;
      const availableDrivers = zoneDrivers.filter(d => d.status === 'available').length;
      
      // Calculate demand-to-supply ratio
      const ratio = onlineDrivers === 0 ? activeCount : parseFloat((activeCount / onlineDrivers).toFixed(1));
      
      // Determine operational alert state
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (activeCount > 0 && onlineDrivers === 0) {
        status = 'critical';
      } else if (ratio > 2.0) {
        status = 'critical';
      } else if (ratio > 1.2 || (activeCount > 3 && availableDrivers === 0)) {
        status = 'warning';
      }

      return {
        name: zone.name,
        activeOrders: activeCount,
        completedOrders: zoneOrders.filter(o => o.status === 'completed').length,
        totalDrivers: zoneDrivers.length,
        onlineDrivers,
        availableDrivers,
        ratio,
        status
      };
    });
  }, [orders, drivers]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Zone Demand & Operational Density</div>
          <div className="page-subtitle">Analyze real-time orders vs driver supply ratio across sectors</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* Zones Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--gap-lg)" }}>
          {zonesSummary.map((zone) => {
            const statusColor = zone.status === 'critical' ? 'var(--status-red)' 
                              : zone.status === 'warning' ? 'var(--status-amber)' 
                              : 'var(--status-green)';
            
            return (
              <div key={zone.name} className="panel" style={{ borderTop: `4px solid ${statusColor}` }}>
                <div className="panel-header" style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{zone.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize", fontWeight: 600 }}>
                      SLA Status: {zone.status}
                    </span>
                  </div>
                  <span 
                    className="feed-dot" 
                    style={{ background: statusColor, width: 8, height: 8 }} 
                  />
                </div>
                
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Active Orders Queue</span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{zone.activeOrders}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Drivers Online (Idle)</span>
                    <span style={{ fontWeight: 600 }}>{zone.onlineDrivers} ({zone.availableDrivers})</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Supply/Demand Ratio</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: zone.ratio > 1.5 ? "var(--status-red)" : "var(--text-primary)" 
                    }}>
                      {zone.ratio}x
                    </span>
                  </div>

                  <div style={{ 
                    marginTop: "8px", 
                    height: "4px", 
                    background: "var(--bg-sunken)", 
                    borderRadius: "2px", 
                    overflow: "hidden" 
                  }}>
                    <div 
                      style={{ 
                        height: "100%", 
                        background: statusColor, 
                        width: `${Math.min(100, (zone.activeOrders / (zone.onlineDrivers || 1)) * 50)}%` 
                      }} 
                    />
                  </div>

                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", textAlign: "right" }}>
                    {zone.completedOrders} orders completed today
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Detail List */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Operations Demand Summary</div>
          </div>
          <table className="ops-table">
            <thead>
              <tr>
                <th>Zone Name</th>
                <th>Active Orders</th>
                <th>Drivers (Idle)</th>
                <th>Ratio</th>
                <th>SLA Threat Level</th>
                <th style={{ textAlign: "right" }}>Sectors Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {zonesSummary.map((zone) => (
                <tr key={zone.name}>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{zone.name}</td>
                  <td className="mono">{zone.activeOrders}</td>
                  <td>{zone.onlineDrivers} online ({zone.availableDrivers} available)</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{zone.ratio}x</td>
                  <td>
                    <span className={`badge ${zone.status === 'healthy' ? 'badge-green' : zone.status === 'warning' ? 'badge-amber' : 'badge-red'}`}>
                      {zone.status === 'healthy' ? 'Normal' : zone.status === 'warning' ? 'Elevated SLA risk' : 'Critical Shortage'}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontSize: "12px", color: "var(--text-secondary)" }}>
                    {zone.status === 'critical' ? '🔴 Dispatch relief drivers to zone immediately' 
                     : zone.status === 'warning' ? '🟡 Monitor incoming order rates' 
                     : '🟢 Adequate driver coverage'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
}
