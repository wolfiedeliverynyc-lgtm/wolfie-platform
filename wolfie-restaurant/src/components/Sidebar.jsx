import React from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import {
  LayoutDashboard,
  ClipboardList,
  Monitor,
  UtensilsCrossed,
  BarChart3,
  Settings,
  Circle,
  HelpCircle,
  Wallet
} from 'lucide-react';

export default function Sidebar() {
  const { activePage, setActivePage, restaurant, orders, setSupportModalOpen } = useRestaurantStore();

  // Active orders count for the badge (excluding completed, cancelled, picked_up)
  const activeOrdersCount = orders.filter(
    (o) => !['completed', 'cancelled', 'picked_up'].includes(o.status)
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ClipboardList, badge: activeOrdersCount },
    { id: 'kds', label: 'Kitchen Display', icon: Monitor },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      className="fixed inset-y-0 left-0 w-60 border-r flex flex-col z-20"
      style={{ 
        backgroundColor: 'var(--card)', 
        borderColor: 'var(--border)' 
      }}
    >
      {/* Brand Header */}
      <div 
        className="h-16 px-6 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="wolf">🐺</span>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--text)' }}>
            Wolfie <span style={{ color: 'var(--primary)' }}>Merchant</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle 
            size={8} 
            fill={restaurant.status === 'open' ? 'var(--success)' : 'var(--warning)'} 
            color="transparent" 
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {restaurant.status === 'open' ? 'Open' : 'Paused'}
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm font-medium transition-all cursor-pointer group"
              style={{
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                borderRadius: isActive ? '0 8px 8px 0' : '8px',
                paddingLeft: isActive ? '9px' : '12px'
              }}
            >
              <div className="flex items-center gap-3">
                <Icon 
                  size={18} 
                  style={{ 
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)'
                  }} 
                  className="transition-colors group-hover:text-[#FF6129]"
                />
                <span className="transition-colors group-hover:text-[#e8dcc8]">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span 
                  className="mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: isActive ? 'var(--primary)' : 'var(--border)',
                    color: isActive ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div 
        className="p-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-[#0d0b09] bg-[#FF6129]"
          >
            {restaurant.name ? restaurant.name.charAt(0) : 'W'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
              {restaurant.name}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {restaurant.zone}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          <span>Session: 2h 45m</span>
          <button 
            onClick={() => setSupportModalOpen(true)}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 text-[10px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <HelpCircle size={10} /> Support
          </button>
        </div>
      </div>
    </aside>
  );
}
