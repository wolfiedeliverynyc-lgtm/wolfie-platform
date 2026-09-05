"use client";
import React, { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/useRealtime";
import { useDashboardStore } from "@/stores/dashboardStore";
import { Search, Bell, Settings, Radio } from "lucide-react";

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
  const router = useRouter();
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
        <Search className="topbar-search-icon" size={14} />
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
        <button
          className="topbar-btn"
          id="topbar-alerts"
          title="Alerts"
          onClick={() => router.push('/alerts')}
        >
          <Bell size={16} />
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <span className="topbar-btn-dot" />
          )}
        </button>

        {/* Settings */}
        <button
          className="topbar-btn"
          id="topbar-settings"
          title="Settings"
          onClick={() => router.push('/settings')}
        >
          <Settings size={16} />
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
