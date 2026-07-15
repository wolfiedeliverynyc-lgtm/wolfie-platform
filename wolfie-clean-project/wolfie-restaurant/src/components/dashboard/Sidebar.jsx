import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Monitor, BarChart3, Settings, Sun, Moon, Hexagon, HelpCircle, Wallet, LogOut, Star } from 'lucide-react';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const { activePage, setActivePage, restaurant, orders, setSupportModalOpen } = useRestaurantStore();
  const [theme, setTheme] = useState(localStorage.getItem('restaurant_theme') || 'dark');

  // Initialize theme class on mount
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = (e) => {
    e.stopPropagation();
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('restaurant_theme', nextTheme);
  };

  // Count active pending orders for sidebar badge
  const activeOrdersCount = orders.filter(
    (o) => !['completed', 'cancelled', 'picked_up'].includes(o.status)
  ).length;

  const handleLogout = (e) => {
    e.stopPropagation();
    localStorage.removeItem('restaurant_token');
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: activeOrdersCount },
    { id: 'kds', label: 'Kitchen Display', icon: Monitor },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-logo">
        <Hexagon size={28} className="logo-icon" />
        <span className="logo-text">WOLFIE<span className="logo-dot">.</span></span>
      </div>

      {/* Profile Info */}
      <div className="sidebar-profile">
        <div className="profile-img-container" style={{ backgroundColor: 'var(--bg-card-hover)', borderRadius: '50%', overflow: 'hidden' }}>
          <img src={restaurant.logo || '/assets/avatar.png'} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
        </div>
        <h4>{restaurant.name || 'Wolfie Burgers'}</h4>
        <button 
          className="edit-btn" 
          onClick={(e) => {
            e.stopPropagation();
            const nextStatus = restaurant.status === 'open' ? 'closed' : 'open';
            useRestaurantStore.setState({
              restaurant: { ...restaurant, status: nextStatus },
              settings: { ...useRestaurantStore.getState().settings, pauseOrders: nextStatus === 'closed' }
            });
          }}
          style={{
            backgroundColor: restaurant.status === 'open' ? '#FFE100' : '#EF2A39',
            color: restaurant.status === 'open' ? '#000000' : '#ffffff',
            border: 'none',
            fontWeight: '900',
            padding: '6px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            marginTop: '6px',
            transition: 'all 0.3s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full" 
            style={{ 
              backgroundColor: restaurant.status === 'open' ? '#00cc00' : '#ffffff',
              display: 'inline-block'
            }} 
          />
          {restaurant.status === 'open' ? 'Open' : 'Closed'}
        </button>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Support mapping both dashboard and overview
          const isActive = activePage === item.id || (item.id === 'dashboard' && activePage === 'overview');
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-item-left">
                <Icon size={20} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span 
                  className="mono text-[12px] font-bold px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: 'var(--accent-orange)',
                    color: '#fff'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer controls */}
      <div className="sidebar-footer">
        <div className="theme-toggle" onClick={toggleTheme}>
          <span className={`theme-label ${theme === 'light' ? 'active' : ''}`}>Light</span>
          <div className="toggle-switch">
            <div className="toggle-knob" style={{ left: theme === 'light' ? '3px' : '25px' }}>
              {theme === 'light' ? <Sun size={10} className="knob-icon" /> : <Moon size={10} className="knob-icon" />}
            </div>
          </div>
          <span className={`theme-label ${theme === 'dark' ? 'active' : ''}`}>Dark</span>
        </div>

        <button 
          onClick={handleLogout}
          className="nav-item"
          style={{ padding: '0.5rem 1rem', border: '1px dashed var(--border-color)', borderRadius: '12px' }}
        >
          <div className="nav-item-left">
            <LogOut size={16} />
            <span style={{ fontSize: '0.85rem' }}>Log Out</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
