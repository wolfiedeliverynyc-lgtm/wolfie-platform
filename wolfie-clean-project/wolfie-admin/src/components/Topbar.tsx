"use client";
import React, { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRealtime } from "@/hooks/useRealtime";
import { useDashboardStore } from "@/stores/dashboardStore";

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
  title?: string;
  isLive?: boolean;
}

export default function Topbar({
  breadcrumbs,
  title,
  isLive: isLiveProp,
}: TopbarProps) {
  const { status } = useRealtime();
  const isLive = isLiveProp ?? (status === "connected");
  const pathname = usePathname();

  // Dashboard Store state hooks
  const systemStatus = useDashboardStore((state) => state.systemStatus);
  const orders = useDashboardStore((state) => state.orders);
  const drivers = useDashboardStore((state) => state.drivers);
  const alerts = useDashboardStore((state) => state.alerts);

  const computedBreadcrumbs = useMemo(() => {
    if (breadcrumbs && breadcrumbs.length > 0) return breadcrumbs;
    if (pathname === "/") return [{ label: "Overview" }];
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part) => {
      const label = part
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return { label, href: `/${part}` };
    });
  }, [pathname, breadcrumbs]);

  // Client-only timezone clock
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const nyTime = useMemo(() => {
    if (!time) return "--:--:--";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(time);
  }, [time]);

  const dzTime = useMemo(() => {
    if (!time) return "--:--:--";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Algiers",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(time);
  }, [time]);

  // Compute System Uptime & Operational Indicators
  const { isSystemHealthy, offlineCount } = useMemo(() => {
    const degradedServices = systemStatus.filter(s => !s.up);
    return {
      isSystemHealthy: degradedServices.length === 0,
      offlineCount: degradedServices.length
    };
  }, [systemStatus]);

  const { isPeakLoad, loadRatio } = useMemo(() => {
    const activeCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const activeDrivers = drivers.filter(d => d.status !== 'offline').length;
    const ratio = activeDrivers > 0 ? activeCount / activeDrivers : 0;
    const hasUnresolvedOverloadAlert = alerts.some(a => !a.acknowledged && (a.type === 'dispatch_overload' || a.type === 'driver_shortage'));
    return {
      isPeakLoad: ratio >= 1.5 || hasUnresolvedOverloadAlert,
      loadRatio: parseFloat(ratio.toFixed(1))
    };
  }, [orders, drivers, alerts]);

  const handleSearchClick = () => {
    // Dispatch custom keyboard event to trigger command palette open
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <header className="topbar">
      {/* Breadcrumb */}
      <nav className="topbar-breadcrumb">
        <span className="topbar-breadcrumb-item">Wolfie</span>
        {computedBreadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <span className="topbar-breadcrumb-sep">/</span>
            {i === computedBreadcrumbs.length - 1 ? (
              <span className="topbar-breadcrumb-current">{crumb.label}</span>
            ) : (
              <span className="topbar-breadcrumb-item">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
        {!computedBreadcrumbs.length && title && (
          <>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-breadcrumb-current">{title}</span>
          </>
        )}
      </nav>

      {/* Search */}
      <div className="topbar-search">
        <svg
          className="topbar-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="topbar-search-input"
          placeholder="Search orders, drivers, zones… (⌘K)"
          id="topbar-search"
          onClick={handleSearchClick}
          readOnly
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Timezone & Ops Operations Bar */}
      <div className="topbar-ops-bar">
        <div className="ops-clock-item">
          <span className="ops-clock-label">NYC (EST)</span>
          <span className="ops-clock-val">{nyTime}</span>
        </div>
        <div className="ops-clock-item">
          <span className="ops-clock-label">ALG (CET)</span>
          <span className="ops-clock-val">{dzTime}</span>
        </div>

        <div className="topbar-ops-divider" />

        {/* Load ratio */}
        <div className="ops-metric-item">
          <span className="ops-clock-label">Load Ratio</span>
          <span className={`ops-metric-val ${isPeakLoad ? 'peak' : ''}`}>{loadRatio}x</span>
        </div>

        {/* Peak indicator */}
        {isPeakLoad && (
          <div className="ops-health-badge warning animate-pulse">
            <span className="panel-title-dot" style={{ backgroundColor: "var(--status-amber)", animationDuration: "1.5s" }} />
            PEAK LOAD
          </div>
        )}

        {/* System Uptime Health */}
        <div className={`ops-health-badge ${isSystemHealthy ? 'healthy' : 'critical'}`}>
          <span className="rt-dot live" style={{ backgroundColor: isSystemHealthy ? "var(--status-green)" : "var(--status-red)" }} />
          {isSystemHealthy ? "99.9% Uptime" : `${offlineCount} INCIDENT`}
        </div>
      </div>

      {/* Right actions */}
      <div className="topbar-actions">
        {/* Realtime pill */}
        <div className="rt-pill">
          <span className={`rt-dot ${isLive ? "live" : "offline"}`} />
          {isLive ? "Live" : status === "connecting" ? "Connecting" : "Offline"}
        </div>


        <div className="topbar-divider" />

        {/* Alerts */}
        <button className="topbar-btn" id="topbar-alerts" title="Alerts">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="topbar-btn-dot" />
        </button>

        {/* Settings */}
        <button className="topbar-btn" id="topbar-settings" title="Settings">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        <div className="topbar-divider" />

        {/* Avatar */}
        <div
          className="sidebar-avatar"
          style={{ width: 30, height: 30, fontSize: 11, cursor: "pointer" }}
          title="Admin User"
        >
          AD
        </div>
      </div>
    </header>
  );
}
