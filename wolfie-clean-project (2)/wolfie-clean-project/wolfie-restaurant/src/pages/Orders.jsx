import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRestaurantStore, mapBackendOrderToClient } from '../store/useRestaurantStore';
import { useRestaurantSocket } from '../hooks/useRestaurantSocket';
import { PrintButton } from '../components/PrintEngine';
import {
  Clock,
  User,
  AlertTriangle,
  Check,
  X,
  ChefHat,
  Truck,
  Timer,
  Package,
  Search,
  Zap,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function slaRemaining(deadlineIso) {
  if (!deadlineIso) return null;
  const diff = new Date(deadlineIso).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

function formatSla(seconds) {
  if (seconds === null || seconds === undefined) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function slaColor(seconds) {
  if (seconds === null || seconds === undefined) return 'var(--text-secondary)';
  const mins = seconds / 60;
  if (mins > 10) return '#22c55e';
  if (mins >= 5) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

function getFoodImage(name) {
  const n = name.toLowerCase();
  if (n.includes('alpha') || n.includes('wolf')) return '/assets/hamburger_1.png';
  if (n.includes('ramen') || n.includes('bowl')) return '/assets/hamburger_4.png';
  if (n.includes('pizza') || n.includes('margherita')) return '/assets/hamburger_3.png';
  if (n.includes('fries') || n.includes('loaded')) return '/assets/hamburger_2.png';
  if (n.includes('combo') || n.includes('meal')) return '/assets/hamburger_details.png';
  if (n.includes('coke') || n.includes('cola') || n.includes('drink') || n.includes('lemonade')) return '/assets/hamburger_2.png';
  return '/assets/hamburger_1.png';
}

// ─── Status config ──────────────────────────────────────

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new_order', label: 'New' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function matchesTab(tab, status) {
  if (tab === 'all') return true;
  if (tab === 'new_order') return status === 'new_order';
  if (tab === 'preparing')
    return ['accepted', 'preparing', 'almost_ready'].includes(status);
  if (tab === 'ready')
    return ['ready_for_pickup', 'picked_up'].includes(status);
  if (tab === 'delayed') return status === 'delayed';
  if (tab === 'completed') return status === 'completed';
  if (tab === 'cancelled') return status === 'cancelled';
  return false;
}

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

// ─── Horizontal Order Card ─────────────────────────────────────────

function OrderCard({ order, now, onUpdateStatus }) {
  const updateOrderStatus = onUpdateStatus;

  const elapsed = timeAgo(order.placedAt);
  const slaSeconds = slaRemaining(order.slaDeadline);
  const slaClr = slaColor(slaSeconds);
  const badge = STATUS_BADGE_STYLES[order.status] || STATUS_BADGE_STYLES.new_order;

  const allergens = useMemo(() => {
    const set = new Set();
    order.items?.forEach((item) =>
      item.allergens?.forEach((a) => set.add(a))
    );
    return [...set];
  }, [order.items]);

  const isPriority = order.priority === 'urgent' || order.priority === 'priority';

  return (
    <div
      className="dashboard-card relative group transition-all duration-300"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: 'none',
        boxShadow: 'var(--shadow-card)',
        padding: '1.5rem 2rem',
        borderRadius: '24px'
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Section 1: Order Identity & Customer (Col Span 3) */}
        <div className="lg:col-span-3 space-y-2 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-poppins">
              {order.orderNumber}
            </span>
            <span
              className="text-[13px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold font-poppins"
              style={{ background: badge.background, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <User size={14} className="text-[var(--text-secondary)] shrink-0" />
            <span className="text-[13px] uppercase tracking-widest font-black text-[var(--accent-yellow)] truncate font-poppins">
              {order.customerName}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {isPriority && (
              <span
                className="text-[12px] uppercase tracking-wider px-2 py-0.5 rounded font-bold flex items-center gap-1 font-poppins"
                style={{
                  background: order.priority === 'urgent' ? 'rgba(239, 42, 57, 0.15)' : 'rgba(255, 225, 0, 0.15)',
                  color: order.priority === 'urgent' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                }}
              >
                <AlertTriangle size={10} className="shrink-0" />
                {order.priority === 'urgent' ? 'Urgent' : 'Priority'}
              </span>
            )}
            <span className="text-[12px] uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-card-hover)] px-2 py-0.5 rounded font-poppins flex items-center gap-1">
              <Clock size={12} />
              {elapsed}
            </span>
          </div>
        </div>

        {/* Section 2: Items (Col Span 4) */}
        <div className="lg:col-span-4 space-y-2 max-h-[160px] overflow-y-auto pr-2">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-[var(--glass-bg)] p-2 rounded-xl">
              {/* circular Figma food thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-card-hover)] flex items-center justify-center p-1 shrink-0">
                <img src={getFoodImage(item.name)} alt={item.name} className="w-full h-full object-contain" />
              </div>
              
              {/* Center: Details */}
              <div className="flex-1 min-w-0 font-poppins">
                <h4 className="text-[14px] font-bold text-[var(--text-primary)] truncate">{item.name}</h4>
                {item.modifiers?.length > 0 && (
                  <p className="text-[12px] text-[var(--text-secondary)] truncate">
                    {item.modifiers.map(m => m.name).join(', ')}
                  </p>
                )}
              </div>
              
              {/* Right: Quantity */}
              <div className="text-right shrink-0 font-poppins">
                <span className="text-[14px] font-bold text-[var(--accent-yellow)] block">{item.quantity}×</span>
              </div>
            </div>
          ))}
        </div>

        {/* Section 3: Notes, Instructions & SLA (Col Span 3) */}
        <div className="lg:col-span-3 space-y-2">
          {order.notes && (
            <div className="text-[13px] uppercase tracking-wider px-2.5 py-1.5 rounded-xl bg-[rgba(255,225,0,0.08)] text-[var(--accent-yellow)] flex items-start gap-1.5 font-poppins">
              <span>📝</span>
              <span className="leading-tight line-clamp-2">{order.notes}</span>
            </div>
          )}
          {order.items?.some((i) => i.specialInstructions) && (
            <div className="text-[13px] uppercase tracking-wider px-2.5 py-1.5 rounded-xl bg-[rgba(239,42,57,0.08)] text-[var(--accent-red)] flex items-start gap-1.5 font-poppins">
              <AlertTriangle size={14} className="shrink-0" />
              <span className="leading-tight line-clamp-2">
                {order.items.find(i => i.specialInstructions).specialInstructions}
              </span>
            </div>
          )}
          {allergens.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allergens.map((a) => (
                <span
                  key={a}
                  className="text-[12px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(239,42,57,0.08)] text-[var(--accent-red)] font-poppins"
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Subtotal & SLA Time */}
          <div className="flex items-center justify-between text-[14px] font-poppins pt-1">
            <span className="text-[13px] uppercase tracking-wider text-[var(--text-secondary)]">Subtotal:</span>
            <span className="font-extrabold text-[var(--text-primary)]">${order.subtotal?.toFixed(2)}</span>
          </div>

          {!['completed', 'cancelled', 'picked_up'].includes(order.status) && (
            <div className="flex items-center justify-between text-[14px] font-poppins">
              <span className="text-[13px] uppercase tracking-wider text-[var(--text-secondary)]">SLA Deadline:</span>
              <span className="font-extrabold text-sm" style={{ color: slaClr }}>
                {formatSla(slaSeconds)}
              </span>
            </div>
          )}
          
          {order.driver && (
            <div className="flex items-center justify-between text-[13px] uppercase tracking-wider px-2.5 py-1.5 rounded-xl bg-[var(--bg-card-hover)] font-poppins">
              <span className="text-[var(--text-secondary)] font-bold flex items-center gap-1">
                <img src="/assets/driver_avatar.png" alt={order.driver.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                {order.driver.name}
              </span>
              <span className="text-[var(--accent-yellow)] font-bold">ETA {order.driver.eta}m</span>
            </div>
          )}
        </div>

        {/* Section 4: Action Buttons & Print (Col Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-2 justify-center h-full">
          {!['completed', 'cancelled', 'picked_up'].includes(order.status) && (
            <div className="flex flex-col gap-1.5 w-full">
              {order.status === 'new_order' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'accepted')}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-2.5 px-3 rounded-lg transition-all
                      bg-[var(--accent-yellow)] text-black border-none hover:bg-yellow-400 cursor-pointer font-poppins"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-2.5 px-3 rounded-lg transition-all
                      bg-[var(--accent-red)] text-white border-none hover:bg-red-600 cursor-pointer font-poppins"
                  >
                    <X size={14} /> Decline
                  </button>
                </>
              )}
              {order.status === 'accepted' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-3 px-3 rounded-lg transition-all
                    bg-[var(--accent-yellow)] text-black border-none hover:bg-yellow-400 cursor-pointer font-poppins"
                >
                  <ChefHat size={14} /> Start Prep
                </button>
              )}
              {order.status === 'preparing' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'almost_ready')}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-2.5 px-3 rounded-lg transition-all
                      bg-[var(--accent-red)] text-white border-none hover:bg-red-600 cursor-pointer font-poppins"
                  >
                    <Package size={14} /> Almost Ready
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-2.5 px-3 rounded-lg transition-all
                      bg-[var(--accent-yellow)] text-black border-none hover:bg-yellow-400 cursor-pointer font-poppins"
                  >
                    <Check size={14} /> Mark Ready
                  </button>
                </>
              )}
              {order.status === 'almost_ready' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                  className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-3 px-3 rounded-lg transition-all
                    bg-[var(--accent-yellow)] text-black border-none hover:bg-yellow-400 cursor-pointer font-poppins"
                >
                  <Check size={14} /> Mark Ready
                </button>
              )}
              {order.status === 'ready_for_pickup' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'picked_up')}
                  className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-3 px-3 rounded-lg transition-all
                    bg-[var(--accent-yellow)] text-black border-none hover:bg-yellow-400 cursor-pointer font-poppins"
                >
                  <Truck size={14} /> Picked Up
                </button>
              )}
              {order.status === 'delayed' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-2.5 px-3 rounded-lg transition-all
                      bg-[var(--accent-yellow)] text-black border-none hover:bg-yellow-400 cursor-pointer font-poppins"
                  >
                    <ChefHat size={14} /> Resume Prep
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    className="w-full flex items-center justify-center gap-1.5 text-[13px] uppercase tracking-wider font-extrabold py-2.5 px-3 rounded-lg transition-all
                      bg-[var(--accent-red)] text-white border-none hover:bg-red-600 cursor-pointer font-poppins"
                  >
                    <X size={14} /> Cancel
                  </button>
                </>
              )}
            </div>
          )}
          <div className="pt-1 flex justify-center border-t border-transparent opacity-80 hover:opacity-100 transition-opacity">
            <PrintButton order={order} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function Orders() {
  const orders = useRestaurantStore((s) => s.orders);
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const settings = useRestaurantStore((s) => s.settings);
  const restaurantId = restaurant?.id || 'r-001';
  const updateOrderStatus = useRestaurantStore((s) => s.updateOrderStatus);

  const { emitOrderAccept, emitOrderReady, emitOrderDelay } = useRestaurantSocket(restaurantId);

  const handleUpdateStatus = useCallback((orderId, status) => {
    if (status === 'accepted') emitOrderAccept(orderId);
    else if (status === 'ready_for_pickup') emitOrderReady(orderId);
    else if (status === 'delayed') emitOrderDelay(orderId, 10);
    updateOrderStatus(orderId, status);
  }, [emitOrderAccept, emitOrderReady, emitOrderDelay, updateOrderStatus]);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const c = {};
    STATUS_TABS.forEach((t) => {
      c[t.key] = orders.filter((o) => matchesTab(t.key, o.status)).length;
    });
    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders.filter((o) => matchesTab(activeTab, o.status));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.items?.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      const pMap = { urgent: 0, priority: 1, normal: 2 };
      const pa = pMap[a.priority] ?? 2;
      const pb = pMap[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.placedAt) - new Date(a.placedAt);
    });
    return list;
  }, [orders, activeTab, searchQuery]);

  const showCounts = ['new_order', 'preparing', 'ready', 'delayed'];

  return (
    <div className="w-full h-full p-4 lg:p-8">
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 text-left">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2 font-poppins">Orders</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] font-poppins" style={{ fontSize: '13px' }}>
            Live kitchen order management — <span className="text-[var(--accent-yellow)] font-bold">{orders.length}</span> total orders
          </p>
        </div>
        
        <button
          onClick={() => {
            const nextMode = !settings.pauseOrders;
            useRestaurantStore.setState({
              settings: { ...settings, pauseOrders: nextMode }
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

      {/* ── Search bar ── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-3 flex-1 max-w-lg px-4 py-3 rounded-2xl bg-[var(--bg-card-hover)] border-none">
          <Search size={18} className="text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search orders, customers, items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm placeholder-[var(--text-secondary)] text-[var(--text-primary)] font-poppins"
          />
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex items-center gap-6 mb-8 overflow-x-auto pb-4 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative text-[13px] uppercase tracking-[0.15em] font-bold whitespace-nowrap transition-colors flex items-center gap-2 pb-4 bg-transparent border-none font-poppins cursor-pointer"
              style={{
                color: isActive ? 'var(--accent-yellow)' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
              {showCounts.includes(tab.key) && count > 0 && (
                <span
                  className="text-[11px] font-black px-2 py-0.5 rounded-full leading-none font-poppins"
                  style={{
                    background: isActive ? 'rgba(255,225,0,0.2)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? 'var(--accent-yellow)' : 'var(--text-secondary)'
                  }}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[var(--accent-yellow)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Vertical list stack (Order then order below it) ── */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-3xl bg-[var(--bg-card)]">
          <Package size={64} strokeWidth={1} className="text-[var(--text-secondary)] opacity-30 mb-6" />
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)] font-poppins">
            No orders match this filter
          </p>
          <p className="text-[13px] uppercase tracking-widest mt-2 text-[var(--text-secondary)] opacity-60 font-poppins">
            {searchQuery ? 'Try a different search term' : 'Awaiting new inbound orders'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} now={now} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
