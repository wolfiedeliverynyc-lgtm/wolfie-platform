"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardStore } from "@/stores/dashboardStore";
import {
  Activity,
  ShoppingBag,
  Users,
  ShieldCheck,
  Compass,
  Layers,
  Store,
  UtensilsCrossed,
  CreditCard,
  BarChart3,
  Server,
  Bell,
  Cpu,
  Settings,
  LifeBuoy
} from "lucide-react";

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
        { label: "Overview",   href: "/",             Icon: Activity },
        { label: "Orders",     href: "/admin/orders", Icon: ShoppingBag, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
        { label: "Drivers",    href: "/drivers",      Icon: Users },
        { label: "KYC Review", href: "/kyc",          Icon: ShieldCheck },
        { label: "Live Map",   href: "/admin/map",    Icon: Compass },
        { label: "Zones",      href: "/zones",        Icon: Layers },
      ],
    },
    {
      label: "Commerce",
      items: [
        { label: "Merchants",    href: "/merchants",  Icon: Store },
        { label: "Menu Catalog", href: "/menu",       Icon: UtensilsCrossed },
        { label: "Finance",      href: "/finance",    Icon: CreditCard },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { label: "Analytics",   href: "/analytics",   Icon: BarChart3 },
        { label: "METRICSWOLF", href: "/metricswolf", Icon: Server },
        { label: "Alerts",      href: "/alerts",      Icon: Bell, badge: activeAlertsCount > 0 ? activeAlertsCount : undefined },
        { label: "AI Monitor",  href: "/ai-monitor",  Icon: Cpu }
      ],
    },
    {
      label: "System",
      items: [
        { label: "Settings",   href: "/settings",      Icon: Settings },
        { label: "Support",    href: "/admin/support", Icon: LifeBuoy, badge: openTicketsCount > 0 ? openTicketsCount : undefined },
      ],
    },
  ];

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark" style={{ background: "linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)", boxShadow: "0 0 12px rgba(0, 229, 255, 0.4)" }}>
          W
        </div>
        <span className="sidebar-logo-name" style={{ letterSpacing: "0.05em", fontWeight: 800 }}>WOLFIE</span>
        <span className="sidebar-logo-badge" style={{ background: "rgba(0, 229, 255, 0.15)", color: "var(--accent)", border: "1px solid rgba(0, 229, 255, 0.3)" }}>
          OPS
        </span>
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

              const { Icon } = item;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item${isActive ? " active" : ""}`}
                >
                  <Icon
                    className="sidebar-item-icon"
                    size={16}
                    strokeWidth={isActive ? 2.3 : 1.8}
                    style={{ color: isActive ? "var(--accent)" : "inherit" }}
                  />
                  <span>{item.label}</span>
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
          <div className="sidebar-avatar" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(56,189,248,0.4) 100%)", border: "1px solid rgba(0,229,255,0.3)" }}>
            AD
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Admin User</div>
            <div className="sidebar-user-role" style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Super Admin
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
