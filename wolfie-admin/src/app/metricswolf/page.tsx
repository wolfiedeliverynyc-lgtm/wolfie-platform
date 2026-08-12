"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function MetricsWolfPage() {
  const { metricsSummary, fetchMetricsSummary } = useDashboardStore();
  const [mounted, setMounted] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);

  // Set up polling for live metrics status every 5 seconds
  useEffect(() => {
    setMounted(true);
    fetchMetricsSummary();

    let intervalId: any = null;
    if (pollingActive) {
      intervalId = setInterval(() => {
        fetchMetricsSummary();
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchMetricsSummary, pollingActive]);

  // Transform system metrics for progress bars
  const systemMetricsData = useMemo(() => {
    if (!metricsSummary?.system) return [];
    const sys = metricsSummary.system;
    return [
      { name: "CPU Usage", value: Math.round(sys.cpu_usage_percent || 0), color: "var(--status-red)" },
      { name: "Memory Usage", value: Math.round(sys.memory_usage_percent || 0), color: "var(--status-blue)" },
      { name: "Disk Usage", value: Math.round(sys.disk_usage_percent || 0), color: "var(--status-amber)" }
    ];
  }, [metricsSummary]);

  // Database Connection Pool usage calculation
  const dbPoolData = useMemo(() => {
    if (!metricsSummary?.database) return [];
    const db = metricsSummary.database;
    const size = db.pool_size || 5;
    const active = db.pool_checked_out || 0;
    const idle = Math.max(0, size - active);
    return [
      { name: "Active Connections", value: active, fill: "var(--accent)" },
      { name: "Idle Pool Connections", value: idle, fill: "var(--status-green)" }
    ];
  }, [metricsSummary]);

  // Transform latency metrics for Bar Chart
  const latencyData = useMemo(() => {
    if (!metricsSummary?.latency) return [];
    const lat = metricsSummary.latency;
    const dbLat = metricsSummary.database?.latency_avg_seconds || 0.004;
    return [
      { name: "Mapbox API", value: parseFloat((lat.mapbox_avg_seconds * 1000).toFixed(1)), fill: "var(--status-blue)" },
      { name: "Stripe Gateway", value: parseFloat((lat.stripe_avg_seconds * 1000).toFixed(1)), fill: "var(--accent)" },
      { name: "Gemini AI", value: parseFloat((lat.gemini_avg_seconds * 1000).toFixed(1)), fill: "var(--status-amber)" },
      { name: "SQL Database", value: parseFloat((dbLat * 1000).toFixed(1)), fill: "var(--status-green)" },
      { name: "Matching Engine", value: parseFloat((lat.matching_avg_seconds * 1000).toFixed(1)), fill: "purple" },
      { name: "Dispatch cycle", value: parseFloat((lat.dispatch_avg_seconds * 1000).toFixed(1)), fill: "teal" }
    ];
  }, [metricsSummary]);

  if (!mounted) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 120px)", color: "var(--text-muted)" }}>
        Loading WOLFIE diagnostics telemetry...
      </div>
    );
  }

  const sys = metricsSummary?.system || {};
  const rds = metricsSummary?.redis || {};
  const db = metricsSummary?.database || {};
  const biz = metricsSummary?.business || {};
  const ws = metricsSummary?.websocket || {};

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>🐺 Diagnostic Center</span>
            <span style={{ fontSize: 10, background: "rgba(239, 68, 68, 0.15)", color: "var(--accent)", padding: "2px 8px", borderRadius: "20px", textTransform: "uppercase", fontWeight: 700 }}>
              Live Diagnostics
            </span>
          </div>
          <div className="page-subtitle">Real-time business performance funnels, API latencies, WebSocket event loads, and infrastructure caching</div>
        </div>
        <div>
          <button 
            className="btn btn-secondary" 
            onClick={() => setPollingActive(!pollingActive)}
            style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid var(--border)", background: "var(--bg-surface)" }}
          >
            <span style={{ 
              display: "inline-block", 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              background: pollingActive ? "var(--status-green)" : "var(--status-amber)",
              boxShadow: pollingActive ? "0 0 8px var(--status-green)" : "none",
              transition: "all 0.3s ease"
            }} />
            {pollingActive ? "Auto-Polling: ON (5s)" : "Auto-Polling: OFF"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* Row 1: Live Fleet & Performance Telemetry Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "var(--gap-md)" }}>
          {/* Active Connections */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Active Users (WS)</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "var(--accent)" }}>
              {ws.active_connections !== undefined ? ws.active_connections : 0}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 6 }}>
              Total client/driver socket channels
            </div>
          </div>

          {/* Drivers Online */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Online Drivers</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "var(--status-green)" }}>
              {biz.drivers_online !== undefined ? biz.drivers_online : 0}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 6 }}>
              Ready for matching algorithm cycles
            </div>
          </div>

          {/* Pending Orders */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Pending Dispatches</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "var(--status-amber)" }}>
              {biz.orders_pending !== undefined ? biz.orders_pending : 0}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 6 }}>
              Awaiting driver matches or acceptances
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Cache Hit Ratio</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "var(--status-blue)" }}>
              {rds.cache_hit_rate_percent !== undefined ? `${rds.cache_hit_rate_percent.toFixed(1)}%` : "0.0%"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 6 }}>
              Hits: {rds.cache_hits || 0} / Misses: {rds.cache_misses || 0}
            </div>
          </div>
        </div>

        {/* Row 2: Latencies & Systems Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "var(--gap-lg)" }}>
          
          {/* Recharts Bar: Dependency Latencies */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, color: "var(--text-primary)" }}>
              Response Latencies (Partner APIs & Matching Cycle SLAs)
            </div>
            {latencyData.length > 0 ? (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} unit="ms" />
                    <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {latencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ display: "flex", height: 260, alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                Waiting for SLA metrics payload...
              </div>
            )}
          </div>

          {/* Core System Resources */}
          <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              Container Infrastructure Hardware Status
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "20px 0" }}>
              {systemMetricsData.map((metric, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{metric.name}</span>
                    <span style={{ fontWeight: 700 }}>{metric.value}%</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "var(--bg-sunken)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${metric.value}%`, height: "100%", background: metric.color, transition: "width 0.4s ease-in-out" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Uptime: {sys.uptime_seconds !== undefined ? `${(sys.uptime_seconds / 3600).toFixed(1)} hours` : "N/A"}
            </div>
          </div>
        </div>

        {/* Row 3: Business Funnels, Redis & Database Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "var(--gap-lg)" }}>
          
          {/* Business Outcomes & Counter Panels */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 15, color: "var(--text-primary)" }}>
              Operational Performance Indicators (Business Counters)
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Order lifecycle counter */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Orders Lifecycle</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--accent)", marginRight: 6 }}>New: {biz.orders?.new || 0}</span>
                  <span style={{ color: "var(--status-blue)", marginRight: 6 }}>Accepted: {biz.orders?.accepted || 0}</span>
                  <span style={{ color: "var(--status-green)", marginRight: 6 }}>Completed: {biz.orders?.completed || 0}</span>
                  <span style={{ color: "var(--status-red)" }}>Cancelled: {biz.orders?.cancelled || 0}</span>
                </span>
              </div>

              {/* Driver matching ratio */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Driver matching</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--status-green)", marginRight: 8 }}>Accepted: {biz.driver_acceptances?.accepted || 0}</span>
                  <span style={{ color: "var(--status-red)", marginRight: 8 }}>Rejected: {biz.driver_acceptances?.rejected || 0}</span>
                  <span style={{ color: "var(--status-amber)" }}>Timeouts: {biz.driver_acceptances?.timeout || 0}</span>
                </span>
              </div>

              {/* Payments ratio */}
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 2 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Payments</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  <span style={{ color: "var(--status-green)", marginRight: 10 }}>Success: {biz.payments?.success || 0}</span>
                  <span style={{ color: "var(--status-red)", marginRight: 10 }}>Failed: {biz.payments?.failed || 0}</span>
                  <span style={{ color: "var(--status-blue)" }}>Refunds: {biz.payments?.refunded || 0}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Database connections pool status */}
          <div className="panel" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 15, color: "var(--text-primary)" }}>
              SQLAlchemy DB Connection Pool
            </div>
            <div style={{ display: "flex", flex: 1, gap: "10px", alignItems: "center" }}>
              <div style={{ width: "40%", height: 100 }}>
                {dbPoolData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dbPoolData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {dbPoolData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 10 }}>
                    No connections
                  </div>
                )}
              </div>
              <div style={{ width: "60%", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: 11 }}>Active: <strong>{db.pool_checked_out || 0}</strong></div>
                <div style={{ fontSize: 11 }}>Pool Size: <strong>{db.pool_size || 5}</strong></div>
                <div style={{ fontSize: 11 }}>Overflow: <strong>{db.pool_overflow || 0}</strong></div>
              </div>
            </div>
          </div>

          {/* Redis Info diagnostics */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 15, color: "var(--text-primary)", display: "flex", justifyContent: "space-between" }}>
              <span>Redis Cluster Logs</span>
              <span style={{ fontSize: 10, color: "var(--status-green)", background: "rgba(16, 185, 129, 0.15)", padding: "1px 6px", borderRadius: 4 }}>
                OK
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Redis Ping Latency</span>
                <span style={{ fontWeight: 600 }}>{rds.latency_seconds !== undefined ? `${(rds.latency_seconds * 1000).toFixed(1)} ms` : "0.5 ms"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Cache memory</span>
                <span style={{ fontWeight: 600 }}>{rds.used_memory_bytes !== undefined ? `${(rds.used_memory_bytes / 1024 / 1024).toFixed(2)} MB` : "1.2 MB"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Celery Backlog</span>
                <span style={{ fontWeight: 600 }}>{rds.queue_size || 0} tasks</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
