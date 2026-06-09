// src/app/page.tsx
"use client";
import React, { useEffect, useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@/types";
import AnalyticsCard from "@/shared/components/AnalyticsCard";
import StatusBadge from "@/shared/components/StatusBadge";
import DataTable from "@/shared/components/DataTable";

export default function DashboardPage() {
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

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derive dynamic metrics from the live store
  const activeOrdersCount = useMemo(() => 
    orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
    [orders]
  );

  const deliveringOrdersCount = useMemo(() => 
    orders.filter(o => o.status === 'delivering').length,
    [orders]
  );

  const availableDriversCount = useMemo(() => 
    drivers.filter(d => d.status === 'available').length,
    [drivers]
  );

  const offlineDriversCount = useMemo(() => 
    drivers.filter(d => d.status === 'offline').length,
    [drivers]
  );

  const revenueTodayFormatted = useMemo(() => {
    const total = orders
      .filter(o => o.status === 'completed' || o.status === 'delivered')
      .reduce((sum, o) => sum + ((o as any).total || o.amount || 0), 0);
    
    if (total >= 1000) {
      return `${(total / 1000).toFixed(0)}K DA`;
    }
    return `${total} DA`;
  }, [orders]);

  const cancelledRateFormatted = useMemo(() => {
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
    const total = completedCount + cancelledCount;
    if (total === 0) return "0.0%";
    return `${((cancelledCount / total) * 100).toFixed(1)}%`;
  }, [orders]);

  // Columns definition for TanStack Table
  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: "Order ID",
        accessorKey: "id",
        cell: (info) => (
          <span className="mono" style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>
            #{info.getValue() as string}
          </span>
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
      },
      {
        header: "Driver",
        accessorKey: "driver_name",
        cell: (info) => {
          const val = (info.getValue() as string) || "Unassigned";
          return (
            <span style={{ color: val === "Unassigned" ? "var(--status-red)" : "var(--text-secondary)", fontWeight: val === "Unassigned" ? 500 : 400 }}>
              {val}
            </span>
          );
        },
      },
      {
        header: "Amount",
        accessorKey: "amount",
        cell: (info) => {
          const row = info.row.original as any;
          const amount = row.total ?? row.amount ?? 0;
          const currency = row.currency || "DA";
          return (
            <span className="mono" style={{ fontWeight: 600 }}>
              {amount.toLocaleString()} {currency}
            </span>
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
        cell: (info) => (
          <button
            className="btn btn-ghost btn-xs"
            id={`btn-order-${info.row.original.id}`}
            onClick={() => {
              addActivity({
                text: `Admin inspected details for order #${info.row.original.id}`,
                color: "var(--text-secondary)",
              });
            }}
          >
            ···
          </button>
        ),
      },
    ],
    [addActivity]
  );

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Operations Overview</div>
          <div className="page-subtitle">
            Thursday, 21 May 2026 &nbsp;·&nbsp; Algiers Region &nbsp;·&nbsp; All zones active
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" id="btn-export">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export
          </button>
          <button
            className="btn btn-primary btn-sm"
            id="btn-new-order"
            onClick={() => {
              addActivity({
                text: "Manual override: triggered new order dialog stub",
                color: "var(--accent)",
              });
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Order
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="kpi-grid">
        <AnalyticsCard title="Active Orders" value={activeOrdersCount} trend="up" trendPercentage="+3 vs yesterday" />
        <AnalyticsCard title="On-Delivery" value={deliveringOrdersCount} trend="up" trendPercentage="+2 vs avg" />
        <AnalyticsCard title="Available Drivers" value={availableDriversCount} subText={`${offlineDriversCount} offline`} />
        <AnalyticsCard title="Avg. Delivery" value="22 min" trend="up" trendPercentage="−4 min today" />
        <AnalyticsCard title="Revenue Today" value={revenueTodayFormatted} trend="up" trendPercentage="+18% vs yesterday" />
        <AnalyticsCard title="Cancelled Rate" value={cancelledRateFormatted} trend="down" trendPercentage="+0.4% today" />
      </div>

      {/* ── Main Operational Grid ── */}
      <div className="ops-grid">

        {/* ── Live Orders Table ── */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-dot" />
              Live Orders
            </div>
            <div className="panel-actions">
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                {orders.length} orders
              </span>
              <button className="btn btn-ghost btn-xs" id="btn-view-all-orders">View all</button>
            </div>
          </div>
          <div className="panel-body">
            <DataTable columns={columns} data={orders} />
          </div>
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>

          {/* Driver Status */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Driver Fleet</div>
              <div className="panel-actions">
                <span style={{ fontSize: 11, color: "var(--status-green)" }}>
                  ● {drivers.filter(d => d.status !== 'offline').length} active
                </span>
              </div>
            </div>
            <div className="panel-body">
              {drivers.map((d) => (
                <div key={d.id} className="stat-row" style={{ alignItems: "flex-start", padding: "10px 14px" }}>
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: "50%", background: "var(--bg-sunken)",
                      border: "1px solid var(--border)", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
                      flexShrink: 0, marginTop: 2,
                    }}
                  >
                    {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text-primary)", marginBottom: 2 }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {d.zone} · {d.completed_trips} trips · ★ {d.rating}
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Zone Activity */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Zone Demand</div>
              <button className="btn btn-ghost btn-xs" id="btn-zone-detail">Details</button>
            </div>
            <div className="panel-body">
              {zoneStats.map((z) => (
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

      {/* ── Bottom Strip: Activity + System Status ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-lg)" }}>

        {/* Activity Feed */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-dot" />
              Activity Feed
            </div>
            <button className="btn btn-ghost btn-xs" id="btn-clear-feed" onClick={clearActivityFeed}>
              Clear
            </button>
          </div>
          <div className="panel-body">
            {activityFeed.map((a) => (
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

        {/* System Status */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">System Status</div>
            <span className="badge badge-green">All Systems Go</span>
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
