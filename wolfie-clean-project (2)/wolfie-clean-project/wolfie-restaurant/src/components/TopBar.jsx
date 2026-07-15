import React from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { Bell, Monitor, Power, Play, Pause } from 'lucide-react';

const PAGE_TITLES = {
  dashboard: 'Operations Dashboard',
  orders: 'Live Orders Queue',
  kds: 'Kitchen Display System (KDS)',
  menu: 'Menu & Items Management',
  analytics: 'Business intelligence & Stats',
  settings: 'Store Profile & Settings',
};

export default function TopBar() {
  const { activePage, metrics, restaurant, updateSettings, kdsMode, toggleKds } = useRestaurantStore();

  const handleStatusToggle = () => {
    const isCurrentlyOpen = restaurant.status === 'open';
    const store = useRestaurantStore.getState();
    // Update store state for restaurant status
    useRestaurantStore.setState({
      restaurant: {
        ...restaurant,
        status: isCurrentlyOpen ? 'paused' : 'open'
      }
    });
  };

  return (
    <header 
      className="fixed top-0 right-0 left-60 h-16 px-8 flex items-center justify-between z-10"
      style={{ 
        backgroundColor: 'var(--card)', 
        borderBottom: '1px solid var(--border)' 
      }}
    >
      {/* Page Title */}
      <div>
        <h2 className="text-md font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          {PAGE_TITLES[activePage] || 'Wolfie Merchant'}
        </h2>
      </div>

      {/* Metrics Row */}
      {activePage !== 'kds' && (
        <div className="hidden lg:flex items-center gap-6 text-xs">
          <div className="flex flex-col">
            <span style={{ color: 'var(--text-secondary)' }}>Orders Today</span>
            <span className="mono font-bold text-sm" style={{ color: 'var(--text)' }}>
              {metrics.ordersToday}
            </span>
          </div>
          <div className="h-6 w-[1px]" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex flex-col">
            <span style={{ color: 'var(--text-secondary)' }}>Revenue Today</span>
            <span className="mono font-bold text-sm" style={{ color: 'var(--text)' }}>
              ${metrics.revenueToday.toFixed(2)}
            </span>
          </div>
          <div className="h-6 w-[1px]" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex flex-col">
            <span style={{ color: 'var(--text-secondary)' }}>Avg Prep Time</span>
            <span className="mono font-bold text-sm" style={{ color: 'var(--text)' }}>
              {metrics.avgPrepTime}m
            </span>
          </div>
          <div className="h-6 w-[1px]" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex flex-col">
            <span style={{ color: 'var(--text-secondary)' }}>SLA Performance</span>
            <span className="mono font-bold text-sm text-green-600">
              {metrics.slaPerfPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* KDS Toggle */}
        <button
          onClick={toggleKds}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border cursor-pointer transition-colors"
          style={{
            borderColor: kdsMode ? 'var(--primary)' : 'var(--border)',
            backgroundColor: kdsMode ? 'var(--surface)' : 'transparent',
            color: kdsMode ? 'var(--primary)' : 'var(--text-secondary)',
          }}
        >
          <Monitor size={14} />
          <span>KDS Mode</span>
        </button>

        {/* Notifications */}
        <button 
          className="p-2 rounded-2xl border text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
          style={{ borderColor: 'var(--border)' }}
        >
          <Bell size={16} />
        </button>

        {/* Status Toggle */}
        <button
          onClick={handleStatusToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold text-white transition-colors cursor-pointer"
          style={{
            backgroundColor: restaurant.status === 'open' ? 'var(--success)' : 'var(--warning)',
          }}
        >
          {restaurant.status === 'open' ? <Pause size={14} /> : <Play size={14} />}
          <span>{restaurant.status === 'open' ? 'Pause Orders' : 'Go Open'}</span>
        </button>
      </div>
    </header>
  );
}
