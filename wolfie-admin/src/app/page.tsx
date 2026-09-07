"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useMarketStore } from "@/stores/marketStore";
import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@/types";
import AnalyticsCard from "@/shared/components/AnalyticsCard";
import StatusBadge from "@/shared/components/StatusBadge";
import DataTable from "@/shared/components/DataTable";
import BlurText from "@/components/react-bits/BlurText";
import DateRangeFilter, { DateRangeState, isOrderInDateRange } from "@/components/DateRangeFilter";

export default function DashboardPage() {
  const router = useRouter();
  const {
    orders,
    drivers,
    zoneStats,
    activityFeed,
    systemStatus,
    fetchDashboardData,
    clearActivityFeed,
    addActivity,
  } = useDashboardStore();

  const { currentMarketId, getMarketConfig, isRecordInMarket } = useMarketStore();
  const activeConfig = getMarketConfig();

  // Date Filter State
  const [dateRange, setDateRange] = useState<DateRangeState>({
    preset: "today",
    startDate: "",
    endDate: "",
  });

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Market filtered orders and drivers
  const marketOrders = useMemo(() => {
    return orders.filter((o) => isRecordInMarket(o));
  }, [orders, isRecordInMarket]);

  const marketDrivers = useMemo(() => {
    return drivers.filter((d) => isRecordInMarket(d));
  }, [drivers, isRecordInMarket]);

  // Filtered orders by date within active market
  const filteredOrders = useMemo(() => {
    return marketOrders.filter((o) => isOrderInDateRange(o.created_at, dateRange));
  }, [marketOrders, dateRange]);

  // Dynamic metrics derived from filtered orders
  const activeOrdersCount = useMemo(
    () => filteredOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length,
    [filteredOrders]
  );

  const deliveringOrdersCount = useMemo(
    () => filteredOrders.filter((o) => o.status === "delivering").length,
    [filteredOrders]
  );

  const availableDriversCount = useMemo(
    () => marketDrivers.filter((d) => d.status === "available").length,
    [marketDrivers]
  );

  const offlineDriversCount = useMemo(
    () => marketDrivers.filter((d) => d.status === "offline").length,
    [marketDrivers]
  );

  const unassignedCount = useMemo(
    () => filteredOrders.filter((o) => !o.driver_id && o.status !== "completed" && o.status !== "cancelled").length,
    [filteredOrders]
  );

  const revenueFormatted = useMemo(() => {
    const total = filteredOrders
      .filter((o) => o.status === "completed" || o.status === "delivered")
      .reduce((sum, o) => sum + ((o as any).total || o.amount || 0), 0);
    return `${activeConfig.currencySymbol}${Number(total).toFixed(2)}`;
  }, [filteredOrders, activeConfig.currencySymbol]);

  const avgDeliveryFormatted = useMemo(() => {
    const completedOrders = filteredOrders.filter(
      (o) =>
        (o.status === "completed" || o.status === "delivered") &&
        (o as any).delivered_at &&
        (o as any).created_at
    );
    if (completedOrders.length > 0) {
      const totalMinutes = completedOrders.reduce((sum, o) => {
        const diff =
          (new Date((o as any).delivered_at).getTime() - new Date((o as any).created_at).getTime()) / 60000;
        return sum + (diff > 0 ? diff : 0);
      }, 0);
      return `${Math.round(totalMinutes / completedOrders.length)} min`;
    }
    const ordersWithEta = filteredOrders.filter((o) => o.eta_minutes);
    if (ordersWithEta.length > 0) {
      const avgEta = Math.round(
        ordersWithEta.reduce((sum, o) => sum + (o.eta_minutes || 0), 0) / ordersWithEta.length
      );
      return `~${avgEta} min`;
    }
    return "—";
  }, [filteredOrders]);

  const cancelledRateFormatted = useMemo(() => {
    const completedCount = filteredOrders.filter(
      (o) => o.status === "completed" || o.status === "delivered"
    ).length;
    const cancelledCount = filteredOrders.filter((o) => o.status === "cancelled").length;
    const total = completedCount + cancelledCount;
    if (total === 0) return "0.0%";
    return `${((cancelledCount / total) * 100).toFixed(1)}%`;
  }, [filteredOrders]);

  // Market-specific zone stats
  const filteredZoneStats = useMemo(() => {
    const marketZonesLower = activeConfig.zones.map((z) => z.toLowerCase());
    const matched = zoneStats.filter((z) =>
      marketZonesLower.some((mz) => z.zone.toLowerCase().includes(mz) || mz.includes(z.zone.toLowerCase()))
    );
    if (matched.length > 0) return matched;
    // If no direct match in mock stats, show top 5 active market zones
    return activeConfig.zones.slice(0, 5).map((z, idx) => ({
      zone: z,
      orders: Math.max(1, 10 - idx * 2),
      pct: Math.max(10, 45 - idx * 8),
    }));
  }, [zoneStats, activeConfig]);

  // Columns definition for TanStack Table
  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: "Order ID",
        accessorKey: "id",
        cell: (info) => (
          <Link
            href="/admin/orders"
            className="mono font-bold text-white hover:text-rose-400 text-xs transition-colors"
          >
            #{info.getValue() as string}
          </Link>
        ),
      },
      {
        header: "Customer",
        accessorKey: "customer_name",
        cell: (info) => (
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {info.getValue() as string}
          </span>
        ),
      },
      {
        header: "Zone",
        accessorKey: "zone",
        cell: (info) => (
          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
            {(info.getValue() as string) || "Central"}
          </span>
        ),
      },
      {
        header: "Driver / Dispatch",
        accessorKey: "driver_name",
        cell: (info) => {
          const val = (info.getValue() as string) || "Unassigned";
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  color: val === "Unassigned" ? "var(--status-red)" : "var(--text-secondary)",
                  fontWeight: val === "Unassigned" ? 600 : 400,
                  fontSize: 12,
                }}
              >
                {val}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: val === "Unassigned" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                  color: val === "Unassigned" ? "var(--status-red)" : "var(--status-green)",
                  border: `1px solid ${val === "Unassigned" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                }}
              >
                {val === "Unassigned" ? "UNMATCHED" : "AUTO"}
              </span>
            </div>
          );
        },
      },
      {
        header: "Total",
        accessorKey: "amount",
        cell: (info) => {
          const row = info.row.original as any;
          const amount = row.total ?? row.amount ?? 0;
          return (
            <span className="mono font-bold text-white">
              {activeConfig.currencySymbol}{Number(amount).toFixed(2)}
            </span>
          );
        },
      },
      {
        header: "Time / Date",
        accessorKey: "created_at",
        cell: (info) => {
          const val = info.getValue() as string;
          if (!val) return <span style={{ color: "var(--text-muted)" }}>—</span>;
          const date = new Date(val);
          return (
            <div style={{ display: "flex", flexDirection: "column", fontSize: 11 }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                {date.toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            </div>
          );
        },
      },
      {
        header: "ETA",
        accessorKey: "eta_minutes",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span style={{ color: "var(--text-muted)" }}>
              {val !== undefined && val !== null ? `${val} min` : "—"}
            </span>
          );
        },
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: (info) => <StatusBadge status={info.getValue() as string} />,
      },
      {
        id: "actions",
        header: "",
        cell: () => (
          <button
            type="button"
            className="btn btn-ghost btn-xs font-mono text-xs text-rose-400 hover:text-rose-300"
            onClick={() => router.push("/admin/orders")}
            title="Inspect in Live Orders"
          >
            Inspect &rarr;
          </button>
        ),
      },
    ],
    [router, activeConfig]
  );

  return (
    <>
      {/* ── Page Header (Operations Hub) ── */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.07] pb-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <BlurText
              text="DELIVERY OPERATIONS HUB"
              delay={60}
              animateBy="words"
              direction="top"
              className="text-xl font-black tracking-tight text-white"
            />
            {/* Market Badge */}
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: activeConfig.badgeBg,
                border: `1px solid ${activeConfig.badgeBorder}`,
                color: activeConfig.badgeText,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {activeConfig.badgeLabel}
            </span>
          </div>
          <div className="page-subtitle text-xs text-slate-400 mt-1">
            Real-time automated telemetry &bull; {activeConfig.timezoneCode} &bull; Currency: {activeConfig.currency} ({activeConfig.currencySymbol})
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Filter */}
          <DateRangeFilter value={dateRange} onChange={setDateRange} />

          <button
            type="button"
            className="btn btn-secondary btn-sm font-semibold"
            onClick={() => {
              addActivity({
                text: `Exported operational orders report CSV (${activeConfig.name})`,
                color: "var(--accent)",
              });
              alert(`Export initiated for ${activeConfig.name} (${dateRange.preset}).`);
            }}
          >
            Export CSV
          </button>

          <Link href="/admin/orders" className="btn btn-primary btn-sm font-semibold">
            Manage Orders
          </Link>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="kpi-grid">
        <AnalyticsCard
          title="Gross Order Revenue"
          value={revenueFormatted}
          subText={`Revenue for ${dateRange.preset}`}
        />
        <AnalyticsCard
          title="Active Deliveries"
          value={activeOrdersCount}
          subText={`${deliveringOrdersCount} couriers en route`}
        />
        <AnalyticsCard
          title="Courier Fleet"
          value={availableDriversCount}
          subText={`${offlineDriversCount} offline couriers`}
        />
        <AnalyticsCard
          title="Avg. Fulfillment"
          value={avgDeliveryFormatted}
          subText="Target < 35 min"
        />
        <AnalyticsCard
          title="Cancellation Rate"
          value={cancelledRateFormatted}
          subText="Of resolved orders"
        />
        <AnalyticsCard
          title="Needs Courier"
          value={unassignedCount}
          subText={unassignedCount > 0 ? "Dispatch action required" : "Optimal automated flow"}
        />
      </div>

      {/* ── Main Operational Grid ── */}
      <div className="ops-grid">
        {/* ── Live Orders Table ── */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-dot" />
              Live Order Stream &bull; {activeConfig.name}
            </div>
            <div className="panel-actions">
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                {filteredOrders.length} orders
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs text-rose-400 font-semibold"
                onClick={() => router.push("/admin/orders")}
              >
                View Dispatch Board &rarr;
              </button>
            </div>
          </div>
          <div className="panel-body">
            <DataTable columns={columns} data={filteredOrders} />
          </div>
        </div>

        {/* ── Right Column: Fleet & Demand ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
          {/* Driver Fleet Status */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Courier Fleet &bull; {activeConfig.name}</div>
              <div className="panel-actions">
                <span style={{ fontSize: 11, color: "var(--status-green)", fontWeight: 600 }}>
                  ● {marketDrivers.filter((d) => d.status !== "offline").length} online
                </span>
              </div>
            </div>
            <div className="panel-body">
              {marketDrivers.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  No active couriers found in {activeConfig.name}.
                </div>
              ) : (
                marketDrivers.slice(0, 6).map((d) => (
                  <div
                    key={d.id}
                    className="stat-row"
                    style={{ alignItems: "flex-start", padding: "10px 14px" }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "var(--bg-sunken)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {d.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 12.5,
                          color: "var(--text-primary)",
                          marginBottom: 2,
                        }}
                      >
                        {d.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{d.zone ? `${d.zone} · ` : ""}{d.completed_trips} trips</span>
                        <span style={{ color: "var(--status-amber)", fontWeight: 600 }}>
                          ★ {d.rating}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Zone Activity */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Sector Demand &bull; {activeConfig.name}</div>
              <Link href="/zones" className="btn btn-ghost btn-xs font-semibold">
                All Zones &rarr;
              </Link>
            </div>
            <div className="panel-body">
              {filteredZoneStats.map((z) => (
                <div key={z.zone} className="stat-row">
                  <div className="stat-row-label">{z.zone}</div>
                  <div className="stat-row-bar">
                    <div className="stat-row-bar-fill" style={{ width: `${z.pct}%` }} />
                  </div>
                  <div className="stat-row-value">{z.orders}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Strip: Activity & Systems ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-lg)" }}>
        {/* Activity Feed */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-dot" />
              Live Operational Log
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              id="btn-clear-feed"
              onClick={clearActivityFeed}
            >
              Clear
            </button>
          </div>
          <div className="panel-body">
            {activityFeed.slice(0, 5).map((a) => (
              <div key={a.id} className="feed-item">
                <span className="feed-dot" style={{ background: a.color }} />
                <div className="feed-content">
                  <div className="feed-title">{a.text}</div>
                  <div className="feed-meta">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Platform Automation Infrastructure</div>
            <span className="badge badge-green">Healthy</span>
          </div>
          <div className="panel-body">
            {systemStatus.map((s) => (
              <div key={s.label} className="stat-row">
                <div className="stat-row-label">{s.label}</div>
                <span className={`badge ${s.up ? "badge-green" : "badge-amber"}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
