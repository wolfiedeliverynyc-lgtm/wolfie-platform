import React from 'react';
import { Bell, Zap, AlertTriangle } from 'lucide-react';
import SearchComponent from './SearchComponent';
import { useRestaurantStore } from '../../store/useRestaurantStore';

const TopBar = () => {
  const { settings, updateSettings } = useRestaurantStore();
  const isBusyMode = settings?.pauseOrders || false;

  const handleBusyModeToggle = () => {
    updateSettings({ pauseOrders: !isBusyMode });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="page-title" style={{ fontFamily: "'Poppins', sans-serif", fontSize: "1.4rem", fontWeight: "700" }}>Wolfie OS</h2>
      </div>
      
      <div className="topbar-right">
        <button
          onClick={handleBusyModeToggle}
          className={`px-5 py-2 rounded-full text-[13px] font-black uppercase tracking-[0.1em] flex items-center gap-2 transition-all border-none cursor-pointer font-poppins shrink-0 ${
            isBusyMode 
              ? 'bg-[var(--accent-red)] text-white shadow-[0_0_15px_rgba(239,42,57,0.4)] animate-pulse'
              : 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)]/80'
          }`}
          style={{
            fontSize: '13px',
            padding: '8px 16px',
            letterSpacing: '0.1em'
          }}
        >
          {isBusyMode ? <AlertTriangle size={14} /> : <Zap size={14} />}
          {isBusyMode ? 'BUSY ACTIVE' : 'ENGAGE BUSY'}
        </button>

        <SearchComponent />
        
        <button className="upgrade-btn">Upgrade</button>
        
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
