import React from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import {
  ShoppingBag,
  DollarSign,
  Clock,
  Target,
  Truck,
  XCircle,
  Users,
  TrendingUp,
  AlertTriangle,
  X,
  Monitor,
  Pause,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function Dashboard() {
  const {
    metrics,
    orders,
    aiAlerts,
    dismissAiAlert,
    activity,
    restaurant,
    setActivePage,
    toggleKds
  } = useRestaurantStore();

  const handleStatusToggle = () => {
    const isCurrentlyOpen = restaurant.status === 'open';
    useRestaurantStore.setState({
      restaurant: {
        ...restaurant,
        status: isCurrentlyOpen ? 'paused' : 'open'
      }
    });
  };

  // Count orders per category
  const counts = {
    new: orders.filter((o) => o.status === 'new_order').length,
    preparing: orders.filter((o) => ['accepted', 'preparing', 'almost_ready'].includes(o.status)).length,
    ready: orders.filter((o) => o.status === 'ready_for_pickup').length,
    delayed: orders.filter((o) => o.status === 'delayed').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  const metricCards = [
    {
      label: 'Orders Today',
      value: metrics.ordersToday,
      trend: '+12%',
      isPositive: true,
      icon: ShoppingBag,
      color: '#E8F5E9',
      iconColor: '#2E7D32',
    },
    {
      label: 'Revenue Today',
      value: `$${metrics.revenueToday.toFixed(2)}`,
      trend: '+8%',
      isPositive: true,
      icon: DollarSign,
      color: '#FFF3E0',
      iconColor: '#EF6C00',
    },
    {
      label: 'Avg Prep Time',
      value: `${metrics.avgPrepTime}m`,
      trend: '-1.2m',
      isPositive: true,
      icon: Clock,
      color: '#E3F2FD',
      iconColor: '#1565C0',
    },
    {
      label: 'SLA Performance',
      value: `${metrics.slaPerfPercent}%`,
      trend: '+1.5%',
      isPositive: true,
      icon: Target,
      color: '#EDE7F6',
      iconColor: '#6A1B9A',
    },
    {
      label: 'Drivers Inbound',
      value: metrics.activeDriversInbound,
      trend: 'Active',
      isPositive: true,
      icon: Truck,
      color: '#F3E5F5',
      iconColor: '#8E24AA',
    },
    {
      label: 'Cancellation Rate',
      value: `${metrics.cancellationRate}%`,
      trend: 'Low',
      isPositive: true,
      icon: XCircle,
      color: '#FFEBEE',
      iconColor: '#C62828',
    },
    {
      label: 'Queue Length',
      value: metrics.currentQueueLength,
      trend: 'Optimal',
      isPositive: true,
      icon: Users,
      color: '#E0F2F1',
      iconColor: '#00695C',
    },
    {
      label: 'Avg Order Value',
      value: `$${metrics.avgOrderValue.toFixed(2)}`,
      trend: '+4%',
      isPositive: true,
      icon: TrendingUp,
      color: '#FFFDE7',
      iconColor: '#F57F17',
    },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* LEFT COLUMN: Main Operations Dashboard */}
      <div className="xl:col-span-2 space-y-8">
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className="p-4 rounded-[2.5rem] border flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: c.color, color: c.iconColor }}
                  >
                    <Icon size={16} />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: 'var(--text-secondary)' }}>
                    {c.trend}
                  </span>
                </div>
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {c.label}
                  </h4>
                  <p className="mono text-xl font-black mt-1" style={{ color: 'var(--text)' }}>
                    {c.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Status Breakdown */}
        <div 
          className="p-6 rounded-[2.5rem] border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
            Live Order Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { key: 'new', label: 'New', count: counts.new, color: '#FEF3C7', textColor: '#D97706' },
              { key: 'preparing', label: 'Preparing', count: counts.preparing, color: '#DBEAFE', textColor: '#2563EB' },
              { key: 'ready', label: 'Ready for Pickup', count: counts.ready, color: '#D1FAE5', textColor: '#059669' },
              { key: 'delayed', label: 'Delayed', count: counts.delayed, color: '#FEE2E2', textColor: '#DC2626' },
              { key: 'completed', label: 'Completed Today', count: counts.completed, color: '#F1F5F9', textColor: '#475569' },
            ].map((p) => (
              <div
                key={p.key}
                onClick={() => setActivePage('orders')}
                className="p-3 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer transition-all hover:scale-102"
                style={{ backgroundColor: p.color }}
              >
                <span className="mono text-2xl font-black" style={{ color: p.textColor }}>
                  {p.count}
                </span>
                <span className="text-[11px] font-semibold mt-1" style={{ color: p.textColor }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Operations Alerts */}
        {aiAlerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
              <span role="img" aria-label="robot">🤖</span> AI Operations Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiAlerts.map((alert) => {
                const colors = {
                  danger: { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', tag: 'High Risk' },
                  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', tag: 'Attention' },
                  info: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', tag: 'Insight' },
                }[alert.severity] || { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151', tag: 'Info' };

                return (
                  <div
                    key={alert.id}
                    className="p-4 rounded-[2.5rem] border relative flex flex-col justify-between"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-white bg-opacity-60">
                          {colors.tag}
                        </span>
                        <button
                          onClick={() => dismissAiAlert(alert.id)}
                          className="text-current opacity-60 hover:opacity-100 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold">{alert.title}</h4>
                      <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Sidebar Operations Panel */}
      <div className="space-y-6">
        
        {/* Quick Actions */}
        <div 
          className="p-6 rounded-[2.5rem] border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
            Merchant Controls
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => setActivePage('orders')}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold border transition-colors hover:bg-neutral-50 cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span className="flex items-center gap-2">
                <ClipboardList size={14} /> View Live Orders Queue
              </span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={toggleKds}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold border transition-colors hover:bg-neutral-50 cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span className="flex items-center gap-2">
                <Monitor size={14} /> Open Kitchen Display (KDS)
              </span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={handleStatusToggle}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-white transition-colors cursor-pointer"
              style={{
                backgroundColor: restaurant.status === 'open' ? 'var(--warning)' : 'var(--success)',
              }}
            >
              <span className="flex items-center gap-2">
                <Pause size={14} /> 
                {restaurant.status === 'open' ? 'Temporarily Pause Kitchen' : 'Open Restaurant'}
              </span>
            </button>
          </div>
        </div>

        {/* Live Activity Timeline */}
        <div 
          className="p-6 rounded-[2.5rem] border flex flex-col h-[400px]"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
            Activity Feed
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activity.map((act) => (
              <div key={act.id} className="flex gap-3 items-start">
                <div className="text-lg bg-neutral-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  {act.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-normal" style={{ color: 'var(--text)' }}>
                    {act.message}
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {timeAgo(act.time)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
