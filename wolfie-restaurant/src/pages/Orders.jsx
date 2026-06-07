import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { useRestaurantSocket } from '../hooks/useRestaurantSocket';
import { PrintButton } from '../components/PrintEngine';
import {
  Clock,
  User,
  MapPin,
  Phone,
  AlertTriangle,
  Check,
  X,
  ChefHat,
  Truck,
  Timer,
  Package,
  Search,
  Filter,
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
  if (seconds === null || seconds === undefined) return 'rgba(232,220,200,0.5)';
  const mins = seconds / 60;
  if (mins > 10) return '#22c55e';
  if (mins >= 5) return '#eab308';
  return '#ef4444';
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
  new_order: { background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', label: 'New' },
  accepted: { background: 'rgba(255,97,41,0.1)', color: '#FF6129', border: '1px solid rgba(255,97,41,0.2)', label: 'Accepted' },
  preparing: { background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', label: 'Preparing' },
  almost_ready: { background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)', label: 'Almost Ready' },
  ready_for_pickup: { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', label: 'Ready' },
  picked_up: { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', label: 'Picked Up' },
  completed: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', label: 'Completed' },
  delayed: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', label: 'Delayed' },
  cancelled: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.05)', label: 'Cancelled' },
};

// ─── Order Card ─────────────────────────────────────────

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

  let borderColor = 'rgba(255,255,255,0.05)';
  let glowStyle = 'none';
  if (order.status === 'delayed') {
    borderColor = 'rgba(239,68,68,0.4)';
    glowStyle = '0 0 20px rgba(239,68,68,0.1)';
  } else if (order.priority === 'urgent') {
    borderColor = 'rgba(239,68,68,0.6)';
    glowStyle = '0 0 20px rgba(239,68,68,0.15)';
  } else if (order.priority === 'priority') {
    borderColor = 'rgba(234,179,8,0.4)';
    glowStyle = '0 0 20px rgba(234,179,8,0.1)';
  }

  return (
    <div
      className="rounded-[2.5rem] flex flex-col overflow-hidden relative group transition-all duration-300"
      style={{
        background: '#0d0b09',
        border: `1px solid ${borderColor}`,
        boxShadow: glowStyle,
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-sans text-xl font-light text-white tracking-tighter">
            {order.orderNumber}
          </span>
          <span
            className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold"
            style={{ background: badge.background, color: badge.color, border: badge.border }}
          >
            {badge.label}
          </span>
          {isPriority && (
            <span
              className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              style={{
                background: order.priority === 'urgent' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                color: order.priority === 'urgent' ? '#ef4444' : '#eab308',
                border: `1px solid ${order.priority === 'urgent' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`,
              }}
            >
              <AlertTriangle size={10} />
              {order.priority === 'urgent' ? 'Urgent' : 'Priority'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] uppercase tracking-widest text-[rgba(232,220,200,0.4)]">
          <Clock size={12} />
          {elapsed}
        </div>
      </div>

      {/* ── Customer ── */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <User size={14} className="text-[rgba(232,220,200,0.4)]" />
        <span className="text-[13px] uppercase tracking-widest font-bold text-[#FF6129]">
          {order.customerName}
        </span>
      </div>

      {/* ── Items ── */}
      <div className="px-5 py-2 flex-1">
        <ul className="space-y-4">
          {order.items?.map((item, idx) => (
            <li key={idx} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-white tracking-wide">
                  <span className="font-sans font-bold text-[#FF6129] mr-2">{item.quantity}×</span>
                  {item.name}
                </span>
                <span className="font-sans text-xs shrink-0 pt-0.5 text-[rgba(232,220,200,0.5)]">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
              {item.modifiers?.length > 0 && (
                <div className="ml-6 mt-1.5 flex flex-wrap gap-1.5">
                  {item.modifiers.map((mod, mi) => (
                    <span
                      key={mi}
                      className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#1a1612] text-[rgba(232,220,200,0.6)] border border-white/5"
                    >
                      + {mod.name}
                      {mod.price > 0 && ` $${mod.price.toFixed(2)}`}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Special instructions ── */}
      {order.items?.some((i) => i.specialInstructions) && (
        <div className="px-5 pb-3">
          {order.items
            .filter((i) => i.specialInstructions)
            .map((item, idx) => (
               <div
                 key={idx}
                 className="text-[10px] uppercase tracking-widest px-3 py-2 rounded-2xl flex items-start gap-2 bg-[#FF6129]/10 border border-[#FF6129]/20 text-[#FF6129]"
               >
                 <AlertTriangle size={12} className="shrink-0" />
                 <span className="leading-relaxed">
                   <strong className="text-white">{item.name}:</strong> {item.specialInstructions}
                 </span>
               </div>
            ))}
        </div>
      )}

      {/* ── Notes ── */}
      {order.notes && (
        <div className="px-5 pb-3">
          <div className="text-[10px] uppercase tracking-widest px-3 py-2 rounded-2xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8] flex gap-2">
            <span>📝</span>
            <span className="leading-relaxed">{order.notes}</span>
          </div>
        </div>
      )}

      {/* ── Allergens ── */}
      {allergens.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {allergens.map((a) => (
            <span
              key={a}
              className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      {/* ── Footer: subtotal, driver, SLA ── */}
      <div
        className="px-5 py-4 space-y-3 bg-[rgba(255,255,255,0.02)]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[rgba(232,220,200,0.5)]">
            Subtotal
          </span>
          <span className="font-sans text-lg font-light text-white">
            ${order.subtotal?.toFixed(2)}
          </span>
        </div>

        {order.driver && (
          <div className="flex items-center justify-between text-[11px] uppercase tracking-widest px-3 py-2 rounded-[2.5rem] bg-[#110f0c] border border-white/5">
            <span className="flex items-center gap-2 text-[rgba(232,220,200,0.7)]">
              <Truck size={14} className="text-[#38bdf8]" />
              {order.driver.name}
            </span>
            <span className="font-sans text-[10px] font-bold px-2 py-1 rounded border bg-[#38bdf8]/10 border-[#38bdf8]/20 text-[#38bdf8]">
              ETA {order.driver.eta}m
            </span>
          </div>
        )}

        {!['completed', 'cancelled', 'picked_up'].includes(order.status) && (
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[rgba(232,220,200,0.5)]">
              <Timer size={12} />
              SLA Time
            </span>
            <span className="font-sans text-base font-bold shadow-sm" style={{ color: slaClr }}>
              {formatSla(slaSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      {!['completed', 'cancelled', 'picked_up'].includes(order.status) && (
        <div className="px-5 py-4 flex flex-wrap gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {order.status === 'new_order' && (
            <>
              <button
                onClick={() => updateOrderStatus(order.id, 'accepted')}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                  bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/30 hover:bg-[#22c55e] hover:text-[#052e16] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                <Check size={14} /> Accept
              </button>
              <button
                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                  bg-[#ef4444]/10 text-[#f87171] border border-[#ef4444]/30 hover:bg-[#ef4444] hover:text-[#450a0a] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                <X size={14} /> Reject
              </button>
            </>
          )}
          {order.status === 'accepted' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'preparing')}
              className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                bg-[#0284c7]/10 text-[#38bdf8] border border-[#0284c7]/30 hover:bg-[#0284c7] hover:text-[#fff] hover:shadow-[0_0_20px_rgba(2,132,199,0.4)]"
            >
              <ChefHat size={14} /> Start Prep
            </button>
          )}
          {order.status === 'preparing' && (
            <>
              <button
                onClick={() => updateOrderStatus(order.id, 'almost_ready')}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                  bg-[#eab308]/10 text-[#fde047] border border-[#eab308]/30 hover:bg-[#eab308] hover:text-[#422006] hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]"
              >
                <Package size={14} /> Almost Ready
              </button>
              <button
                onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                  bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/30 hover:bg-[#22c55e] hover:text-[#052e16] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                <Check size={14} /> Mark Ready
              </button>
            </>
          )}
          {order.status === 'almost_ready' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
              className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/30 hover:bg-[#22c55e] hover:text-[#052e16] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
            >
              <Check size={14} /> Mark Ready
            </button>
          )}
          {order.status === 'ready_for_pickup' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'picked_up')}
              className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                bg-[#22c55e]/10 text-[#4ade80] border border-[#22c55e]/30 hover:bg-[#22c55e] hover:text-[#052e16] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
            >
              <Truck size={14} /> Picked Up
            </button>
          )}
          {order.status === 'delayed' && (
            <>
              <button
                onClick={() => updateOrderStatus(order.id, 'preparing')}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                  bg-[#0284c7]/10 text-[#38bdf8] border border-[#0284c7]/30 hover:bg-[#0284c7] hover:text-[#fff] hover:shadow-[0_0_20px_rgba(2,132,199,0.4)]"
              >
                <ChefHat size={14} /> Resume Prep
              </button>
              <button
                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-bold py-3 px-4 rounded-[2.5rem] transition-all
                  bg-[#ef4444]/10 text-[#f87171] border border-[#ef4444]/30 hover:bg-[#ef4444] hover:text-[#450a0a] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                <X size={14} /> Cancel
              </button>
            </>
          )}
        </div>
      )}
      <div className="px-5 pb-4 pt-1 flex justify-center border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity">
        <PrintButton order={order} />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function Orders() {
  const orders = useRestaurantStore((s) => s.orders);
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?.id || 'r-001';
  const updateOrderStatus = useRestaurantStore((s) => s.updateOrderStatus);

  const { emitOrderAccept, emitOrderReady, emitOrderDelay } = useRestaurantSocket(restaurantId, {
    onNewOrder: (data) => {
      useRestaurantStore.setState(s => ({
        orders: [data, ...s.orders]
      }));
    },
    onOrderUpdate: (data) => {
      useRestaurantStore.setState(s => ({
        orders: s.orders.map(o => o.id === data.id ? { ...o, ...data } : o)
      }));
    }
  });

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
    <div className="w-full h-full text-[#e8dcc8] p-4 lg:p-8">
      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="text-4xl font-light tracking-tighter text-white mb-2">Orders</h1>
        <p className="text-xs uppercase tracking-widest text-[rgba(232,220,200,0.5)]">
          Live kitchen order management — <span className="text-[#FF6129] font-bold">{orders.length}</span> total orders
        </p>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-3 flex-1 max-w-lg px-4 py-3 rounded-[2.5rem] bg-[#110f0c] border border-white/5 focus-within:border-[#FF6129]/50 focus-within:shadow-[0_0_20px_rgba(255,97,41,0.1)] transition-all">
          <Search size={18} className="text-[rgba(232,220,200,0.5)]" />
          <input
            type="text"
            placeholder="Search orders, customers, items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm placeholder-[rgba(232,220,200,0.3)] text-white"
          />
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex items-center gap-6 mb-8 overflow-x-auto pb-4 scrollbar-hide border-b border-white/5">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative text-[11px] uppercase tracking-[0.2em] font-bold whitespace-nowrap transition-colors flex items-center gap-2 pb-4"
              style={{
                color: isActive ? '#FF6129' : 'rgba(232,220,200,0.4)',
              }}
            >
              {tab.label}
              {showCounts.includes(tab.key) && count > 0 && (
                <span
                  className="font-sans text-[9px] font-black px-2 py-0.5 rounded-full leading-none"
                  style={{
                    background: isActive ? 'rgba(255,97,41,0.2)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#FF6129' : 'rgba(232,220,200,0.5)',
                    border: `1px solid ${isActive ? 'rgba(255,97,41,0.4)' : 'rgba(255,255,255,0.1)'}`
                  }}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#FF6129] shadow-[0_0_10px_#FF6129]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Orders grid ── */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-[2.5rem] bg-[#0d0b09] border border-white/5 shadow-inner">
          <Package size={64} strokeWidth={1} className="text-[rgba(232,220,200,0.2)] mb-6" />
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[rgba(232,220,200,0.6)]">
            No orders match this filter
          </p>
          <p className="text-[10px] uppercase tracking-widest mt-2 text-[rgba(232,220,200,0.3)]">
            {searchQuery ? 'Try a different search term' : 'Awaiting new inbound orders'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} now={now} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
