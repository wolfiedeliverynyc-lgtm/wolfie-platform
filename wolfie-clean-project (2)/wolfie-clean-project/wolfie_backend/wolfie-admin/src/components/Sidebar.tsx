"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboardStore";

const icons = {
  dashboard:  "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  orders:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  drivers:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  map:        "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  zones:      "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z",
  merchants:  "M3 9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM8 3h8",
  finance:    "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  analytics:  "M18 20V10M12 20V4M6 20v-6",
  alerts:     "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0",
  settings:   "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  support:    "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  ai:         "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 6V12L16 14"
};

export default function Sidebar() {
  const pathname = usePathname();
  const { orders, alerts, tickets } = useDashboardStore();

  // Derive dynamic counts for sidebar badges
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const activeAlertsCount = alerts.filter(a => !a.acknowledged).length;
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  const NAV_SECTIONS = [
    {
      label: "Operations",
      items: [
        { label: "Overview",   href: "/",          icon: "dashboard" },
        { label: "Orders",     href: "/admin/orders",     icon: "orders",    badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
        { label: "Drivers",    href: "/drivers",    icon: "drivers" },
        { label: "Live Map",   href: "/admin/map",        icon: "map" },
        { label: "Zones",      href: "/zones",      icon: "zones" },
      ],
    },
    {
      label: "Commerce",
      items: [
        { label: "Merchants",  href: "/merchants",  icon: "merchants" },
        { label: "Finance",    href: "/finance",    icon: "finance" },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { label: "Analytics",  href: "/analytics",  icon: "analytics" },
        { label: "Alerts",     href: "/alerts",     icon: "alerts",    badge: activeAlertsCount > 0 ? activeAlertsCount : undefined },
        { label: "AI Monitor", href: "/ai-monitor", icon: "ai" }
      ],
    },
    {
      label: "System",
      items: [
        { label: "Settings",   href: "/settings",   icon: "settings" },
        { label: "Support",    href: "/admin/support",    icon: "support",   badge: openTicketsCount > 0 ? openTicketsCount : undefined },
      ],
    },
  ];

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">W</div>
        <span className="sidebar-logo-name">Wolfie</span>
        <span className="sidebar-logo-badge">Ops</span>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>

            {section.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item${isActive ? " active" : ""}`}
                >
                  <svg
                    className="sidebar-item-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={icons[item.icon as keyof typeof icons]} />
                  </svg>
                  {item.label}
                  {item.badge ? (
                    <span className="sidebar-item-badge">{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">AD</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Admin User</div>
            <div className="sidebar-user-role">Super Admin</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
