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
  LifeBuoy,
  X,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { orders, alerts, tickets } = useDashboardStore();

  // Dynamic counts for sidebar badges
  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const unassignedCount = orders.filter(o => !o.driver_id && o.status !== 'completed' && o.status !== 'cancelled').length;
  const activeAlertsCount = alerts.filter(a => !a.acknowledged).length;
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  const NAV_SECTIONS = [
    {
      label: "Operations & Dispatch",
      items: [
        { label: "Operations Hub", href: "/",             Icon: Activity },
        { 
          label: "Live Orders",     
          href: "/admin/orders", 
          Icon: ShoppingBag, 
          badge: unassignedCount > 0 ? `${unassignedCount} new` : (activeOrdersCount > 0 ? activeOrdersCount : undefined),
          badgeType: unassignedCount > 0 ? "urgent" : "normal"
        },
        { label: "Dispatch Map",   href: "/admin/map",    Icon: Compass },
        { label: "Driver Fleet",   href: "/drivers",      Icon: Users },
        { label: "KYC Compliance", href: "/kyc",          Icon: ShieldCheck },
        { label: "Delivery Zones", href: "/zones",        Icon: Layers },
      ],
    },
    {
      label: "Merchant Partner",
      items: [
        { label: "Restaurants",    href: "/merchants",  Icon: Store },
        { label: "Menu Catalog",   href: "/menu",       Icon: UtensilsCrossed },
        { label: "Financials",     href: "/finance",    Icon: CreditCard },
      ],
    },
    {
      label: "Intelligence & AI",
      items: [
        { label: "Analytics & CSAT", href: "/analytics",   Icon: BarChart3 },
        { label: "WAP Diagnostics",  href: "/metricswolf", Icon: Server },
        { label: "Live Alerts",      href: "/alerts",      Icon: Bell, badge: activeAlertsCount > 0 ? activeAlertsCount : undefined, badgeType: "urgent" },
        { label: "AI Monitor",       href: "/ai-monitor",  Icon: Cpu }
      ],
    },
    {
      label: "System Administration",
      items: [
        { label: "Support Tickets", href: "/admin/support", Icon: LifeBuoy, badge: openTicketsCount > 0 ? openTicketsCount : undefined },
        { label: "Platform Settings", href: "/settings",    Icon: Settings },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Main Navigation">
      {/* Sidebar Header */}
      <div className="sidebar-logo">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-7 h-7 rounded-md flex items-center justify-center font-black text-white text-xs shadow-md"
            style={{ background: "linear-gradient(135deg, #ff3008 0%, #ff5e3a 100%)" }}
          >
            W
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-wide text-white">WOLFIE</span>
              <span 
                className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase text-emerald-400 border border-emerald-500/30 bg-emerald-500/10"
              >
                OPS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium -mt-0.5">Delivery Command</div>
          </div>
        </div>

        {/* Close Button */}
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
            title="Close navigation (Esc)"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
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
                  onClick={onClose}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                >
                  <Icon
                    className="sidebar-item-icon"
                    size={16}
                    strokeWidth={isActive ? 2.2 : 1.7}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className={`sidebar-item-badge ${(item as any).badgeType === "urgent" ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"}`}>
                      {item.badge}
                    </span>
                  ) : (
                    isActive && <ChevronRight size={13} className="text-slate-500 opacity-60 ml-auto" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer User Info */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div 
            className="sidebar-avatar" 
            style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            AD
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Central Dispatcher</div>
            <div className="sidebar-user-role text-emerald-400 flex items-center gap-1 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online &middot; Full Access
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
