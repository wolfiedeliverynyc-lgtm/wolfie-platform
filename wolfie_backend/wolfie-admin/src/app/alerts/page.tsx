"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function OperationalAlertsPage() {
  const { alerts, acknowledgeAlert, fetchDashboardData, addActivity } = useDashboardStore();
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged'>('open');

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'open') return !a.acknowledged;
      if (filter === 'acknowledged') return a.acknowledged;
      return true;
    });
  }, [alerts, filter]);

  const handleAcknowledge = (id: string, message: string) => {
    acknowledgeAlert(id);
    addActivity({
      text: `Acknowledged Alert: ${message.substring(0, 40)}...`,
      color: "var(--status-green)"
    });
  };

  const activeAlertsCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Incident Alerts Console</div>
          <div className="page-subtitle">Acknowledge system errors, critical driver shortages, and model drift alerts</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* Alerts Counters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gap-md)" }}>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Open Warnings</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: activeAlertsCount > 0 ? "var(--status-red)" : "var(--text-primary)" }}>
              {activeAlertsCount}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Immediate review recommended</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Critical severity</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--status-red)" }}>
              {alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Affecting Algiers logistics SLAs</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Total Alerts Logged</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              {alerts.length}
            </div>
            <div style={{ fontSize: 11, color: "var(--status-green)", marginTop: 6, fontWeight: 600 }}>● Connected to real-time events</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="panel" style={{ padding: "12px 16px", display: "flex", gap: 6 }}>
          {(['open', 'acknowledged', 'all'] as const).map((type) => (
            <button
              key={type}
              className={`btn ${filter === type ? "btn-primary" : "btn-secondary"} btn-xs`}
              onClick={() => setFilter(type)}
              style={{ textTransform: "capitalize" }}
            >
              {type === 'open' ? 'Open Alerts Only' : type === 'acknowledged' ? 'Acknowledged Log' : 'All Alerts'}
            </button>
          ))}
        </div>

        {/* Alerts Log List */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Operational Warning Ledger</div>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{filteredAlerts.length} incidents</span>
          </div>
          <table className="ops-table">
            <thead>
              <tr>
                <th>Alert Type</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Created At</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No alerts in this category found.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const sevColor = alert.severity === 'critical' ? 'badge-red' 
                                 : alert.severity === 'high' ? 'badge-red' 
                                 : alert.severity === 'medium' ? 'badge-amber' 
                                 : 'badge-gray';
                  
                  return (
                    <tr key={alert.id} style={{ opacity: alert.acknowledged ? 0.6 : 1 }}>
                      <td className="mono" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {alert.type.toUpperCase().replace(/_/g, " ")}
                      </td>
                      <td style={{ fontWeight: 500 }}>{alert.message}</td>
                      <td>
                        <span className={`badge ${sevColor}`}>{alert.severity}</span>
                      </td>
                      <td className="mono" style={{ fontSize: "11.5px" }}>{new Date(alert.created_at).toLocaleTimeString()}</td>
                      <td>
                        <span className={`badge ${alert.acknowledged ? 'badge-green' : 'badge-amber'}`}>
                          {alert.acknowledged ? 'Acknowledged' : 'Open'}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!alert.acknowledged ? (
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleAcknowledge(alert.id, alert.message)}
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
}
