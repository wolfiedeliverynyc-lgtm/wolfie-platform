"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend
} from "recharts";

export default function AnalyticsIntelligencePage() {
  const { orders, drivers, fetchDashboardData } = useDashboardStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    fetchDashboardData();
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  // Dynamically compute hourly order distribution and traffic spikes
  const hourlyOrderData = useMemo(() => {
    const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
    const buckets = hours.map(h => ({ hour: h, orders: 0, completed: 0, cancelled: 0 }));

    orders.forEach(o => {
      if (!o.created_at) return;
      const date = new Date(o.created_at);
      const h = date.getUTCHours();
      
      let bucketIdx = 0;
      if (h >= 22) bucketIdx = 7;
      else if (h >= 20) bucketIdx = 6;
      else if (h >= 18) bucketIdx = 5;
      else if (h >= 16) bucketIdx = 4;
      else if (h >= 14) bucketIdx = 3;
      else if (h >= 12) bucketIdx = 2;
      else if (h >= 10) bucketIdx = 1;
      else bucketIdx = 0;

      buckets[bucketIdx].orders += 1;
      if (o.status === "completed" || o.status === "delivered") {
        buckets[bucketIdx].completed += 1;
      } else if (o.status === "cancelled") {
        buckets[bucketIdx].cancelled += 1;
      }
    });

    return buckets.map(b => {
      const totalFulfill = b.completed + b.cancelled;
      const slaRate = totalFulfill > 0 ? Math.round((b.completed / totalFulfill) * 100) : 95;
      return {
        hour: b.hour,
        orders: b.orders,
        slaRate
      };
    });
  }, [orders]);

  // Dynamically compute zone distribution and idle driver counts
  const zoneDistributionData = useMemo(() => {
    const zones = ["Algiers Centre", "El Biar", "Bab Ezzouar", "Hussein Dey", "Kouba", "Ain Taya"];
    const dataMap: Record<string, { active: number; idle: number }> = {};
    zones.forEach(z => {
      dataMap[z] = { active: 0, idle: 0 };
    });

    drivers.forEach(d => {
      const z = d.zone || "Algiers Centre";
      if (!dataMap[z]) {
        dataMap[z] = { active: 0, idle: 0 };
      }
      if (d.status === "preparing" || d.status === "delivering") {
        dataMap[z].active += 1;
      } else if (d.status === "available") {
        dataMap[z].idle += 1;
      }
    });

    return Object.entries(dataMap).map(([name, counts]) => ({
      name,
      active: counts.active,
      idle: counts.idle
    }));
  }, [drivers]);

  // SLA Performance Calculation
  const slaTargetRate = useMemo(() => {
    const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
    const completedCount = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    const total = completedCount + cancelledCount;
    if (total === 0) return 92;
    return Math.round((completedCount / total) * 100);
  }, [orders]);

  if (!mounted) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 120px)" }}>
        Loading intelligence charts...
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Operations Intelligence & Performance</div>
          <div className="page-subtitle">Real-time charts, historical fulfillment statistics, and SLA tracking dashboards</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* Analytics KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gap-md)" }}>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Average Dispatch Time</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>2.4 min</div>
            <div style={{ fontSize: 11, color: "var(--status-green)", marginTop: 6, fontWeight: 600 }}>● Within target (3m limit)</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>SLA Fulfillment Rate</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--accent)" }}>{slaTargetRate}%</div>
            <div style={{ fontSize: 11, color: "var(--status-amber)", marginTop: 6, fontWeight: 600 }}>Target: 95% minimum</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Fulfillment Efficiency</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>98.2%</div>
            <div style={{ fontSize: 11, color: "var(--status-green)", marginTop: 6, fontWeight: 600 }}>+1.4% improvement</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Gross Order Volumes</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{orders.length} orders</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Tracked across Algiers</div>
          </div>
        </div>

        {/* First Chart Row: Area and Line */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-lg)" }}>
          
          {/* Order Volumes hourly area chart */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16, color: "var(--text-primary)" }}>
              Hourly Order Frequency & Traffic Spikes
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyOrderData}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                  <Area type="monotone" dataKey="orders" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLA Compliance Line Chart */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16, color: "var(--text-primary)" }}>
              Fulfillment SLA Compliance Trend (%)
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyOrderData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis domain={[70, 100]} stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                  <Line type="monotone" dataKey="slaRate" stroke="var(--status-amber)" strokeWidth={2.5} name="SLA Rate" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Second Chart Row: Bar and Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-lg)" }}>
          
          {/* Driver state distribution chart */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16, color: "var(--text-primary)" }}>
              Fleet Distribution & Idle Densities per Sector
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
                  <Legend fontSize={11} />
                  <Bar dataKey="active" fill="var(--accent)" name="Active Deliveries" stackId="a" />
                  <Bar dataKey="idle" fill="var(--status-green)" name="Idle Available" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical operational statistics */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16, color: "var(--text-primary)" }}>
              Fulfillment Performance Breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Average Food Preparation Time</span>
                <span style={{ fontWeight: 600 }}>14.8 min</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Average Driver Transit Time</span>
                <span style={{ fontWeight: 600 }}>18.2 min</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Peak Demand Load Hour</span>
                <span style={{ fontWeight: 600 }}>20:00 - 21:00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Best Performing Sector</span>
                <span style={{ fontWeight: 600, color: "var(--status-green)" }}>Algiers Centre (98.4%)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Farthest Delivery Sector</span>
                <span style={{ fontWeight: 600 }}>Ain Taya (24.5 min avg)</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
