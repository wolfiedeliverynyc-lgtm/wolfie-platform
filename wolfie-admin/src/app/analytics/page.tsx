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
      const slaRate = totalFulfill > 0 ? Math.round((b.completed / totalFulfill) * 100) : (b.orders > 0 ? 100 : 0);
      return {
        hour: b.hour,
        orders: b.orders,
        slaRate
      };
    });
  }, [orders]);

  // Dynamically compute zone distribution and idle driver counts
  const zoneDistributionData = useMemo(() => {
    const dataMap: Record<string, { active: number; idle: number }> = {};
    drivers.forEach(d => {
      const z = d.zone || "General";
      if (!dataMap[z]) {
        dataMap[z] = { active: 0, idle: 0 };
      }
      if (d.status === "preparing" || d.status === "delivering") {
        dataMap[z].active += 1;
      } else if (d.status === "available") {
        dataMap[z].idle += 1;
      }
    });

    if (Object.keys(dataMap).length === 0) {
      dataMap["General"] = { active: 0, idle: 0 };
    }

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
    if (total === 0) return 100;
    return Math.round((completedCount / total) * 100);
  }, [orders]);

  const fulfillmentEfficiency = useMemo(() => {
    if (orders.length === 0) return "100%";
    const completed = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const totalResolved = completed + cancelled;
    if (totalResolved === 0) return "100%";
    return `${((completed / totalResolved) * 100).toFixed(1)}%`;
  }, [orders]);

  // Dynamically calculate transition performance metrics (Observation 4)
  const metrics = useMemo(() => {
    let matchTotal = 0, matchCount = 0;
    let prepTotal = 0, prepCount = 0;
    let transitTotal = 0, transitCount = 0;

    orders.forEach(o => {
      const oAny = o as any;
      if (!oAny.created_at) return;
      const created = new Date(oAny.created_at).getTime();

      if (oAny.driver_accepted_at) {
        const matchTime = new Date(oAny.driver_accepted_at).getTime() - created;
        if (matchTime > 0) {
          matchTotal += matchTime;
          matchCount++;
        }
      }

      if (oAny.picked_up_at && oAny.restaurant_accepted_at) {
        const prepTime = new Date(oAny.picked_up_at).getTime() - new Date(oAny.restaurant_accepted_at).getTime();
        if (prepTime > 0) {
          prepTotal += prepTime;
          prepCount++;
        }
      }

      if (oAny.delivered_at && oAny.picked_up_at) {
        const transitTime = new Date(oAny.delivered_at).getTime() - new Date(oAny.picked_up_at).getTime();
        if (transitTime > 0) {
          transitTotal += transitTime;
          transitCount++;
        }
      }
    });

    const avgMatch = matchCount > 0 ? (matchTotal / matchCount / 60000).toFixed(1) : "—";
    const avgPrep = prepCount > 0 ? (prepTotal / prepCount / 60000).toFixed(1) : "—";
    const avgTransit = transitCount > 0 ? (transitTotal / transitCount / 60000).toFixed(1) : "—";

    return { avgMatch, avgPrep, avgTransit };
  }, [orders]);

  // Dynamically compute peak demand hour from actual orders
  const peakHour = useMemo(() => {
    if (orders.length === 0) return "—";
    let maxOrders = 0;
    let peak = "—";
    hourlyOrderData.forEach(b => {
      if (b.orders > maxOrders) {
        maxOrders = b.orders;
        const hNum = parseInt(b.hour.split(":")[0]);
        peak = `${b.hour} - ${String(hNum + 2).padStart(2, '0')}:00`;
      }
    });
    return peak;
  }, [hourlyOrderData, orders]);

  // Dynamically compute sector performance statistics from real orders
  const sectorStats = useMemo(() => {
    const zoneMap: Record<string, { total: number; completed: number; transitTotal: number; transitCount: number }> = {};
    orders.forEach(o => {
      const zone = o.zone || "General";
      if (!zoneMap[zone]) {
        zoneMap[zone] = { total: 0, completed: 0, transitTotal: 0, transitCount: 0 };
      }
      zoneMap[zone].total++;
      if (o.status === "completed" || o.status === "delivered") {
        zoneMap[zone].completed++;
      }
      const oAny = o as any;
      if (oAny.delivered_at && oAny.picked_up_at) {
        const transit = (new Date(oAny.delivered_at).getTime() - new Date(oAny.picked_up_at).getTime()) / 60000;
        if (transit > 0) {
          zoneMap[zone].transitTotal += transit;
          zoneMap[zone].transitCount++;
        }
      }
    });

    const entries = Object.entries(zoneMap);
    if (entries.length === 0) {
      return { bestSector: "—", farthestSector: "—" };
    }

    let best = "—";
    let highestRate = -1;
    entries.forEach(([zone, data]) => {
      if (data.total > 0) {
        const rate = Math.round((data.completed / data.total) * 100);
        if (rate > highestRate) {
          highestRate = rate;
          best = `${zone} (${rate}%)`;
        }
      }
    });

    let farthest = "—";
    let longestTransit = -1;
    entries.forEach(([zone, data]) => {
      if (data.transitCount > 0) {
        const avg = (data.transitTotal / data.transitCount);
        if (avg > longestTransit) {
          longestTransit = avg;
          farthest = `${zone} (${avg.toFixed(1)} min avg)`;
        }
      }
    });

    return { bestSector: best, farthestSector: farthest };
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
          <div className="page-title">Operations Intelligence &amp; Performance</div>
          <div className="page-subtitle">Real-time charts, historical fulfillment statistics, and SLA tracking dashboards</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* Analytics KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gap-md)" }}>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Average Dispatch Time</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{metrics.avgMatch !== "—" ? `${metrics.avgMatch} min` : "—"}</div>
            <div style={{ fontSize: 11, color: "var(--status-green)", marginTop: 6, fontWeight: 600 }}>● Live dispatch telemetry</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>SLA Fulfillment Rate</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--accent)" }}>{slaTargetRate}%</div>
            <div style={{ fontSize: 11, color: "var(--status-amber)", marginTop: 6, fontWeight: 600 }}>Target: 95% minimum</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Fulfillment Efficiency</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{fulfillmentEfficiency}</div>
            <div style={{ fontSize: 11, color: "var(--status-green)", marginTop: 6, fontWeight: 600 }}>Based on completed vs cancelled</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Gross Order Volumes</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{orders.length} orders</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Tracked across all active zones</div>
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
                <span style={{ fontWeight: 600 }}>{metrics.avgPrep} min</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Average Driver Transit Time</span>
                <span style={{ fontWeight: 600 }}>{metrics.avgTransit} min</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Peak Demand Load Hour</span>
                <span style={{ fontWeight: 600 }}>{peakHour}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Best Performing Sector</span>
                <span style={{ fontWeight: 600, color: "var(--status-green)" }}>{sectorStats.bestSector}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Farthest Delivery Sector</span>
                <span style={{ fontWeight: 600 }}>{sectorStats.farthestSector}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
