"use client";
import React, { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/useRealtime";
import { useDashboardStore } from "@/stores/dashboardStore";
import {
  Search,
  Bell,
  Settings,
  Menu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Zap,
  Activity,
  ChevronDown,
  X
} from "lucide-react";

interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
  title?: string;
  isLive?: boolean;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Topbar({
  breadcrumbs,
  title,
  isLive: isLiveProp,
  onToggleSidebar,
  isSidebarOpen,
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
  const fetchSystemStatus = useDashboardStore((state) => state.fetchSystemStatus);

  // Popover state
  const [showHealthPopover, setShowHealthPopover] = useState(false);
  const [showRealtimePopover, setShowRealtimePopover] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const computedBreadcrumbs = useMemo(() => {
    if (breadcrumbs && breadcrumbs.length > 0) return breadcrumbs;
    if (pathname === "/") return [{ label: "Operations Hub" }];
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
    const degradedServices = systemStatus.filter((s) => !s.up);
    return {
      isSystemHealthy: degradedServices.length === 0,
      offlineCount: degradedServices.length,
    };
  }, [systemStatus]);

  const { isPeakLoad, loadRatio } = useMemo(() => {
    const activeCount = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length;
    const activeDrivers = drivers.filter((d) => d.status !== "offline").length;
    const ratio = activeDrivers > 0 ? activeCount / activeDrivers : 0;
    const hasUnresolvedOverloadAlert = alerts.some(
      (a) => !a.acknowledged && (a.type === "dispatch_overload" || a.type === "driver_shortage")
    );
    return {
      isPeakLoad: ratio >= 1.5 || hasUnresolvedOverloadAlert,
      loadRatio: parseFloat(ratio.toFixed(1)),
    };
  }, [orders, drivers, alerts]);

  const handleSearchClick = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  const handleRecheckHealth = async () => {
    setIsRechecking(true);
    try {
      await fetchSystemStatus();
    } finally {
      setTimeout(() => setIsRechecking(false), 600);
    }
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <header className="topbar">
      {/* Left side: Menu Toggle Button + Breadcrumbs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white border-0 transition-all shadow-sm text-xs font-semibold cursor-pointer"
          title="Toggle Navigation Menu (Press [)"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={16} className="text-white" />
          <span className="font-semibold text-slate-100">Menu</span>
        </button>

        {/* Breadcrumb */}
        <nav className="topbar-breadcrumb">
          <span className="topbar-breadcrumb-item">Wolfie Ops</span>
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
      </div>

      {/* Center: Search */}
      <div className="topbar-search">
        <Search className="topbar-search-icon" size={14} />
        <input
          type="text"
          className="topbar-search-input"
          placeholder="Search orders, drivers, stores… (⌘K)"
          id="topbar-search"
          onClick={handleSearchClick}
          readOnly
          style={{ cursor: "pointer" }}
        />
      </div>

      {/* Ops Clocks & Live Indicators */}
      <div className="topbar-ops-bar hidden md:flex items-center">
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
          <span className="ops-clock-label">Load</span>
          <span className={`ops-metric-val ${isPeakLoad ? "peak" : ""}`}>{loadRatio}x</span>
        </div>

        {/* Interactive System Uptime Health Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHealthPopover(!showHealthPopover);
              setShowRealtimePopover(false);
            }}
            className={`ops-health-badge cursor-pointer border-0 flex items-center gap-1.5 transition-all ${
              isSystemHealthy ? "healthy" : "critical"
            }`}
            title="Click to view full health breakdown & service alerts"
          >
            <span
              className="rt-dot live"
              style={{ backgroundColor: isSystemHealthy ? "var(--status-green)" : "var(--status-red)" }}
            />
            <span>{isSystemHealthy ? "99.9% Live" : `${offlineCount} Alert`}</span>
            <ChevronDown size={11} className="opacity-70" />
          </button>

          {/* Health Diagnostics Dropdown Popover */}
          {showHealthPopover && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowHealthPopover(false)}
              />
              <div className="absolute right-0 mt-2 w-80 p-3.5 rounded-xl bg-[#11141e] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.06]">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Server size={13} className="text-slate-400" />
                      Infrastructure Diagnostics
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isSystemHealthy
                        ? "All platform services operational"
                        : `${offlineCount} service(s) offline or unreachable`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRecheckHealth}
                    disabled={isRechecking}
                    className="p-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors"
                    title="Re-ping services now"
                  >
                    <RefreshCw size={12} className={isRechecking ? "animate-spin text-sky-400" : ""} />
                  </button>
                </div>

                {/* Services List Breakdown */}
                <div className="space-y-1.5 mb-3">
                  {systemStatus.map((service) => (
                    <div
                      key={service.label}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2">
                        {service.up ? (
                          <CheckCircle2 size={13} className="text-emerald-400" />
                        ) : (
                          <XCircle size={13} className="text-rose-400" />
                        )}
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{service.label}</div>
                          <div className="text-[10px] text-slate-500">
                            {service.up ? "Connected & responding" : "Unreachable or timeout"}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          service.up
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {service.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Active Operational Alerts (if any) */}
                {unacknowledgedAlerts.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06] mb-2">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <AlertTriangle size={11} />
                      <span>Active Dispatch Incidents ({unacknowledgedAlerts.length})</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {unacknowledgedAlerts.map((alt) => (
                        <div key={alt.id} className="text-[11px] text-slate-300 p-1.5 rounded bg-amber-500/05">
                          <div className="font-semibold text-amber-300 capitalize">{alt.type ? alt.type.replace(/_/g, ' ') : 'Incident'}</div>
                          <div className="text-[10px] text-slate-400">{alt.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Guidance */}
                {!isSystemHealthy && (
                  <div className="p-2 rounded-lg bg-rose-500/05 text-[10px] text-slate-400 leading-relaxed">
                    <span className="font-bold text-rose-400">Why are services offline?</span>
                    <br />
                    The Python/Flask backend (`http://localhost:5000`) is not responding, or the Render cloud server is waking up from idle sleep. Ensure `python app.py` is running or wait ~30 seconds for cloud instance cold start.
                  </div>
                )}

                <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHealthPopover(false);
                      router.push("/alerts");
                    }}
                    className="text-sky-400 hover:underline font-medium"
                  >
                    View Alert Center &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHealthPopover(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="topbar-actions flex items-center gap-2">
        {/* Interactive Realtime Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowRealtimePopover(!showRealtimePopover);
              setShowHealthPopover(false);
            }}
            className="rt-pill cursor-pointer border-0 flex items-center gap-1.5 transition-all"
            title="Click to view WebSocket connection telemetry"
          >
            <span className={`rt-dot ${isLive ? "live" : "offline"}`} />
            <span>{isLive ? "Live Sync" : status === "connecting" ? "Connecting" : "Offline"}</span>
            <ChevronDown size={10} className="opacity-70 ml-0.5" />
          </button>

          {/* Realtime Gateway Popover */}
          {showRealtimePopover && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowRealtimePopover(false)}
              />
              <div className="absolute right-0 mt-2 w-72 p-3.5 rounded-xl bg-[#11141e] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity size={13} className="text-sky-400" />
                    WebSocket Gateway
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowRealtimePopover(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Gateway Status</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        isLive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : status === "connecting"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isLive ? "Connected" : status === "connecting" ? "Attempting Handshake" : "Disconnected"}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-white/[0.02] text-[10px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Transport Protocol</span>
                      <span className="font-mono text-slate-300">WebSocket / Polling</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Telemetry Streams</span>
                      <span className="text-slate-300">Driver GPS &middot; Orders</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-normal">
                    {isLive
                      ? "Streaming live telemetry with sub-second latency from fleet couriers."
                      : "Attempting to reconnect with exponential backoff every 2 seconds."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="topbar-divider" />

        {/* Alerts Bell Button */}
        <button
          className="topbar-btn cursor-pointer"
          id="topbar-alerts"
          title={`Alerts (${alerts.filter((a) => !a.acknowledged).length} active)`}
          onClick={() => router.push("/alerts")}
        >
          <Bell size={16} />
          {alerts.filter((a) => !a.acknowledged).length > 0 && <span className="topbar-btn-dot" />}
        </button>

        {/* Settings Button */}
        <button
          className="topbar-btn cursor-pointer"
          id="topbar-settings"
          title="Platform Settings"
          onClick={() => router.push("/settings")}
        >
          <Settings size={16} />
        </button>

        <div className="topbar-divider" />

        {/* Avatar */}
        <div
          className="sidebar-avatar"
          style={{ width: 30, height: 30, fontSize: 11, cursor: "pointer" }}
          title="Central Operations Dispatcher"
        >
          AD
        </div>
      </div>
    </header>
  );
}
