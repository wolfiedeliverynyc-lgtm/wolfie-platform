import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, BarChart3, Settings, LogOut, Users, FileText, CreditCard } from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-title">
            WOLFIE<span className="brand-dot">.</span>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            RESTAURANT PORTAL
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            Overview
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={18} />
            Orders
          </NavLink>
          <NavLink to="/menu" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <UtensilsCrossed size={18} />
            Menu Management
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} />
            Analytics
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            Customers
          </NavLink>
          <NavLink to="/payouts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <CreditCard size={18} />
            Payouts
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            Settings
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 1rem' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'none', border: 'none', color: 'var(--text-secondary)', 
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
              width: '100%', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem',
              fontWeight: 500, borderRadius: '8px'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
