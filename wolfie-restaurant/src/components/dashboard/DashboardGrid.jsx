import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowUpRight, BellRing, Zap, AlertTriangle } from 'lucide-react';
import Card from './Card';
import ExpandedView from './ExpandedView';
import { wolfieData } from './wolfieData';
import { useRestaurantStore } from '../../store/useRestaurantStore';

const STATUS_BADGE_STYLES = {
  new_order: { background: 'rgba(255, 225, 0, 0.15)', color: 'var(--accent-yellow)', label: 'New' },
  accepted: { background: 'rgba(255, 225, 0, 0.15)', color: 'var(--accent-yellow)', label: 'Accepted' },
  preparing: { background: 'rgba(239, 42, 57, 0.15)', color: 'var(--accent-red)', label: 'Preparing' },
  almost_ready: { background: 'rgba(255, 225, 0, 0.15)', color: 'var(--accent-yellow)', label: 'Almost Ready' },
  ready_for_pickup: { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Ready' },
  picked_up: { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', label: 'Picked Up' },
  completed: { background: 'var(--glass-bg)', color: 'var(--text-secondary)', label: 'Completed' },
  delayed: { background: 'rgba(239, 42, 57, 0.15)', color: 'var(--accent-red)', label: 'Delayed' },
  cancelled: { background: 'var(--glass-bg)', color: 'var(--text-secondary)', label: 'Cancelled' },
};

const renderPremiumChart = (type) => {
  if (type === 'red') {
    return (
      <svg viewBox="0 0 200 100" className="premium-svg-chart red-chart">
        <defs>
          <linearGradient id="glow-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-red)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-red)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d="M0,80 Q30,85 50,60 T100,25 T150,75 T200,45 L200,100 L0,100 Z" fill="url(#glow-red)" />
        <path d="M0,80 Q30,85 50,60 T100,25 T150,75 T200,45" fill="none" stroke="var(--accent-red)" strokeWidth="3" className="glowing-path" />
        <circle cx="100" cy="25" r="4" fill="var(--accent-red)" className="glowing-dot" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 100" className="premium-svg-chart yellow-chart">
      <defs>
        <linearGradient id="glow-yellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-yellow)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent-yellow)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d="M0,90 Q40,65 70,75 T140,30 T200,15 L200,100 L0,100 Z" fill="url(#glow-yellow)" />
      <path d="M0,90 Q40,65 70,75 T140,30 T200,15" fill="none" stroke="var(--accent-yellow)" strokeWidth="3" className="glowing-path" />
      <circle cx="140" cy="30" r="4" fill="var(--accent-yellow)" className="glowing-dot" />
    </svg>
  );
};

const DashboardGrid = () => {
  const [selectedId, setSelectedId] = useState(null);

  // Driver movement simulation interval
  useEffect(() => {
    const interval = setInterval(() => {
      const currentOrders = useRestaurantStore.getState().orders;
      const updatedOrders = currentOrders.map(order => {
        if (order.driver && order.driver.eta > 0) {
          // 50% chance to decrement ETA by 1 minute on each tick
          if (Math.random() < 0.5) {
            return {
              ...order,
              driver: {
                ...order.driver,
                eta: order.driver.eta - 1
              }
            };
          }
        }
        return order;
      });
      useRestaurantStore.setState({ orders: updatedOrders });
    }, 6000); // Check and tick down every 6 seconds

    return () => clearInterval(interval);
  }, []);
  
  // Zustand Store selectors
  const {
    restaurant,
    orders,
    menuItems,
    metrics,
    finance,
    settings,
    supportTickets,
    reviews,
    toggleItemAvailability,
    updateSettings,
    setSupportModalOpen,
    setActivePage,
    addActivity,
    updateOrderStatus
  } = useRestaurantStore();

  const avgRating = reviews && reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '4.8';

  const selectedData = wolfieData.find(item => item.id === selectedId);

  // Active orders counts
  const activeOrders = orders.filter(
    (o) => !['completed', 'cancelled', 'picked_up'].includes(o.status)
  );

  // Toggle restaurant status
  const toggleStoreStatus = (e) => {
    e.stopPropagation();
    const nextStatus = restaurant.status === 'open' ? 'closed' : 'open';
    useRestaurantStore.setState({
      restaurant: { ...restaurant, status: nextStatus },
      settings: { ...settings, pauseOrders: nextStatus === 'closed' }
    });
    
    addActivity({
      id: Date.now().toString(),
      type: 'status_change',
      message: `Store operational status changed to ${nextStatus.toUpperCase()}`,
      time: new Date().toISOString(),
      icon: '🏪'
    });
  };

  // Process payouts instantly
  const handlePayout = (e) => {
    e.stopPropagation();
    const balance = finance.balance.available_balance || 12450.00;
    if (balance <= 0) {
      alert("No available balance for withdrawal!");
      return;
    }
    
    alert(`Payout of $${balance.toLocaleString()} successfully initiated! Available balance reset to $0.`);
    
    useRestaurantStore.setState({
      finance: {
        ...finance,
        balance: {
          available_balance: 0,
          pending_balance: finance.balance.pending_balance,
          lifetime_earned: (finance.balance.lifetime_earned || 0) + balance
        }
      }
    });

    addActivity({
      id: Date.now().toString(),
      type: 'payout',
      message: `Payout of $${balance.toLocaleString()} successfully initiated`,
      time: new Date().toISOString(),
      icon: '💵'
    });
  };

  // Export report
  const handleExport = (e) => {
    e.stopPropagation();
    alert("Report exported! Sales summary CSV file has been sent to your registered email.");
  };

  const handleUpdateOrderStatus = (orderId, nextStatus, orderNumber) => {
    updateOrderStatus(orderId, nextStatus);
    addActivity({
      id: Date.now().toString(),
      type: 'order_update',
      message: `Order ${orderNumber} status updated to ${nextStatus.toUpperCase()}`,
      time: new Date().toISOString(),
      icon: '📦'
    });
  };

  // Get live card properties
  const getCardProps = (id) => {
    const balance = finance.balance.available_balance !== undefined ? finance.balance.available_balance : 12450.00;
    
    switch (id) {
      case 'overview':
        return {
          label: 'Revenue Today',
          value: `$${metrics.revenueToday.toLocaleString()}`,
          chart: 'yellow',
          buttonText: restaurant.status === 'open' ? 'Close Store' : 'Open Store',
          buttonAction: toggleStoreStatus
        };
      case 'orders':
        return {
          label: 'Active Orders',
          value: activeOrders.length.toString(),
          chart: 'red',
          buttonText: 'View Orders',
          buttonAction: (e) => { e.stopPropagation(); setActivePage('orders'); }
        };
      case 'menu':
        return {
          label: 'Active Menu Items',
          value: menuItems.length.toString(),
          chart: 'yellow',
          buttonText: 'View Menu',
          buttonAction: (e) => { e.stopPropagation(); setActivePage('menu'); }
        };
      case 'analytics':
        return {
          label: 'Average Prep Time',
          value: `${metrics.avgPrepTime || 11.3}m`,
          chart: 'red',
          buttonText: 'Export CSV',
          buttonAction: handleExport
        };
      case 'delivery':
        return {
          label: 'Inbound Drivers',
          value: (metrics.activeDriversInbound || 3).toString(),
          chart: 'yellow',
          buttonText: 'Track Drivers',
          buttonAction: (e) => { e.stopPropagation(); setActivePage('orders'); }
        };
      case 'wallet':
        return {
          label: 'Available Balance',
          value: `$${balance.toLocaleString()}`,
          chart: 'red',
          buttonText: 'Payout Now',
          buttonAction: handlePayout
        };
      case 'support':
        return {
          label: 'Open Tickets',
          value: supportTickets.length.toString(),
          chart: 'yellow',
          buttonText: 'Open Chat',
          buttonAction: (e) => { e.stopPropagation(); setSupportModalOpen(true); }
        };
      case 'reviews':
        return {
          label: 'Average Rating',
          value: `${avgRating}★`,
          chart: 'yellow',
          buttonText: 'Manage Reviews',
          buttonAction: (e) => { e.stopPropagation(); setActivePage('reviews'); }
        };
      case 'settings':
        return {
          label: 'Default Prep Time',
          value: `${settings.prepTimeDefault || 15}m`,
          chart: 'red',
          buttonText: 'Configure',
          buttonAction: (e) => { e.stopPropagation(); setActivePage('settings'); }
        };
      default:
        return {
          label: 'Performance KPI',
          value: '98%',
          chart: 'yellow',
          buttonText: 'Explore',
          buttonAction: () => setSelectedId(id)
        };
    }
  };

  return (
    <div className="dashboard-main">
      {/* Dashboard Top Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-4 border-b border-transparent gap-4 text-left">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2 font-poppins">System Terminal</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] font-poppins" style={{ fontSize: '13px' }}>
            Live telemetry & automated dispatch center
          </p>
        </div>
        
        <button
          onClick={() => {
            const nextMode = !settings.pauseOrders;
            useRestaurantStore.setState({
              settings: { ...settings, pauseOrders: nextMode }
            });
            addActivity({
              id: Date.now().toString(),
              type: 'status_change',
              message: `Busy mode operational state changed to ${nextMode ? 'ACTIVE' : 'OFFLINE'}`,
              time: new Date().toISOString(),
              icon: '🚨'
            });
          }}
          className={`px-8 py-3.5 rounded-full font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all border-none cursor-pointer font-poppins ${
            settings.pauseOrders
              ? 'bg-[var(--accent-red)] text-white shadow-[0_0_30px_rgba(239,42,57,0.5)] animate-pulse'
              : 'bg-transparent border border-[var(--accent-red)]/50 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
          }`}
          style={{
            fontSize: '13px',
            letterSpacing: '0.15em'
          }}
        >
          {settings.pauseOrders ? <AlertTriangle size={16} /> : <Zap size={16} />}
          {settings.pauseOrders ? 'SYSTEM OVERLOAD / PAUSED' : 'ENGAGE BUSY MODE'}
        </button>
      </div>

      <div className="dashboard-grid">
        {wolfieData.map((item) => {
          const props = getCardProps(item.id);
          const isOrdersCard = item.id === 'orders';
          
          return (
            <Card 
              key={item.id} 
              id={item.id} 
              title={item.title} 
              className={`premium-card ${item.className || 'accent-blue'} ${isOrdersCard ? 'md:col-span-2' : ''}`}
              onClick={(id) => {
                if (id === 'orders' || id === 'delivery') setActivePage('orders');
                else if (id === 'menu') setActivePage('menu');
                else if (id === 'analytics') setActivePage('analytics');
                else if (id === 'wallet') setActivePage('finance');
                else if (id === 'reviews') setActivePage('reviews');
                else if (id === 'settings') setActivePage('settings');
                else if (id === 'support') setSupportModalOpen(true);
                else setSelectedId(id);
              }}
            >
              <div className="premium-card-inner">
                {/* Header */}
                <div className="premium-header">
                  <span className="premium-title">{item.title}</span>
                  <div className="premium-badge">Live <BellRing size={12} className="animate-pulse text-[var(--accent-yellow)]"/></div>
                </div>
                
                {isOrdersCard ? (
                  /* Custom Layout for Big Live Orders Queue Card */
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-grow py-3">
                    {/* Left details */}
                    <div className="md:col-span-4 space-y-4">
                      <div>
                        <div className="premium-stat-label">Active Orders</div>
                        <div className="premium-stat-value">
                          {activeOrders.length}
                          <ArrowUpRight size={20} className="stat-arrow text-[var(--accent-red)]" />
                        </div>
                      </div>
                      <button 
                        className="premium-fast-btn bg-[var(--accent-yellow)] text-black font-bold text-[13px] px-4 py-2 rounded-xl"
                        onClick={(e) => { e.stopPropagation(); setActivePage('orders'); }}
                      >
                        View Full Queue
                      </button>
                    </div>

                    {/* Right Live Queue showing New & Delayed Orders first */}
                    <div className="md:col-span-8 flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-2">
                      <span className="text-[13px] uppercase tracking-wider text-[var(--text-secondary)] font-bold mb-1 block">Live Action Feed</span>
                      {activeOrders.length === 0 ? (
                        <div className="text-center py-8 text-[13px] text-[var(--text-secondary)]">No active orders right now.</div>
                      ) : (
                        [...activeOrders]
                          .sort((a, b) => {
                            // Prioritize status: new_order and delayed first
                            const aNewOrDel = a.status === 'new_order' || a.status === 'delayed' ? 0 : 1;
                            const bNewOrDel = b.status === 'new_order' || b.status === 'delayed' ? 0 : 1;
                            return aNewOrDel - bNewOrDel;
                          })
                          .slice(0, 3)
                          .map((order) => {
                            const badge = STATUS_BADGE_STYLES[order.status] || STATUS_BADGE_STYLES.new_order;
                            return (
                              <div key={order.id} className="flex items-center justify-between gap-3 bg-[var(--bg-card-hover)] p-3 rounded-2xl border-none">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[13px] font-bold text-[var(--text-primary)]">{order.orderNumber}</span>
                                  <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: badge.background, color: badge.color }}>
                                    {badge.label}
                                  </span>
                                  <span className="text-[13px] text-[var(--text-secondary)] truncate max-w-[60px] md:max-w-[100px]">{order.customerName}</span>
                                  {order.driver && (
                                    <span className="text-[12px] text-[var(--accent-yellow)] font-bold flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full font-poppins shrink-0">
                                      <span>🚗</span>
                                      <span>{order.driver.name}</span>
                                      <span className="opacity-40">•</span>
                                      <span>{order.driver.eta > 0 ? `${order.driver.eta}m` : 'Arrived'}</span>
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  {order.status === 'new_order' && (
                                    <div className="flex items-center gap-1">
                                      <button 
                                        className="bg-[var(--accent-yellow)] text-black font-bold text-[13px] px-2.5 py-1 rounded-lg border-none hover:scale-105 active:scale-95 transition-transform cursor-pointer font-poppins"
                                        onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, 'accepted', order.orderNumber); }}
                                      >
                                        Accept
                                      </button>
                                      <button 
                                        className="bg-[var(--accent-red)] text-white font-bold text-[13px] px-2.5 py-1 rounded-lg border-none hover:scale-105 active:scale-95 transition-transform cursor-pointer font-poppins"
                                        onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, 'cancelled', order.orderNumber); }}
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                  {order.status === 'accepted' && (
                                    <button 
                                      className="bg-[var(--accent-yellow)] text-black font-bold text-[13px] px-2.5 py-1 rounded-lg border-none hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, 'preparing', order.orderNumber); }}
                                    >
                                      Start
                                    </button>
                                  )}
                                  {order.status === 'preparing' && (
                                    <button 
                                      className="bg-[var(--accent-yellow)] text-black font-bold text-[13px] px-2.5 py-1 rounded-lg border-none hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, 'ready_for_pickup', order.orderNumber); }}
                                    >
                                      Ready
                                    </button>
                                  )}
                                  {order.status === 'ready_for_pickup' && (
                                    <button 
                                      className="bg-[var(--accent-yellow)] text-black font-bold text-[13px] px-2.5 py-1 rounded-lg border-none hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(order.id, 'picked_up', order.orderNumber); }}
                                    >
                                      Pickup
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard Stat & Chart View */
                  <>
                    <div className="premium-main">
                      <div className="premium-stat-label">{props.label}</div>
                      <div className="premium-stat-value">
                        {props.value}
                        <ArrowUpRight size={20} className="stat-arrow" />
                      </div>
                      <div className="premium-chart-container">
                        {renderPremiumChart(props.chart)}
                      </div>
                    </div>

                    {/* Footer with fast button */}
                    <div className="premium-footer">
                      <div className="premium-footer-left">
                        <button className="premium-fast-btn" onClick={props.buttonAction}>
                          {props.buttonText}
                        </button>
                      </div>
                      <span className="premium-explore">Specs +</span>
                    </div>
                  </>
                )}

                {/* Indicators */}
                <div className="premium-indicators">
                  <div className="indicator active"></div>
                  <div className="indicator"></div>
                  <div className="indicator"></div>
                  <div className="indicator"></div>
                  <div className="indicator"></div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedId && (
          <ExpandedView 
            selectedId={selectedId} 
            data={selectedData} 
            onClose={() => setSelectedId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardGrid;
