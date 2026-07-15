import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurantStore, mapBackendOrderToClient } from '../store/useRestaurantStore';
import { useRestaurantSocket } from '../hooks/useRestaurantSocket';
import { Monitor, AlertTriangle, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function getElapsedTime(acceptedAt) {
  if (!acceptedAt) return 0;
  const diff = Date.now() - new Date(acceptedAt).getTime();
  return Math.max(0, Math.floor(diff / 1000));
}

function formatElapsedTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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

const STATION_MAPPING = {
  Burgers: 'Grill', Pizza: 'Grill', Tacos: 'Grill',
  Bowls: 'Packing', Sushi: 'Packing', Salads: 'Packing', Sides: 'Packing',
  Drinks: 'Drinks',
};

export default function KitchenDisplay() {
  const { orders, updateOrderStatus } = useRestaurantStore();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?.id || 'r-001';

  const { emitOrderAccept, emitOrderReady, emitOrderDelay } = useRestaurantSocket(restaurantId);

  const handleUpdateStatus = (orderId, status) => {
    if (status === 'accepted') emitOrderAccept(orderId);
    else if (status === 'ready_for_pickup') emitOrderReady(orderId);
    else if (status === 'delayed') emitOrderDelay(orderId, 10);
    updateOrderStatus(orderId, status);
  }

  const [stationFilter, setStationFilter] = useState('All');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const kdsTickets = useMemo(() => {
    let activeTickets = orders.filter((o) => ['accepted', 'preparing', 'almost_ready'].includes(o.status));
    if (stationFilter !== 'All') {
      activeTickets = activeTickets.map((order) => {
        const store = useRestaurantStore.getState();
        const filteredItems = order.items.filter((item) => {
          const menuItem = store.menuItems.find((mi) => mi.id === item.menuItemId);
          const station = menuItem ? STATION_MAPPING[menuItem.category] : 'Packing';
          return station === stationFilter;
        });
        return { ...order, items: filteredItems };
      }).filter((order) => order.items.length > 0);
    }
    return activeTickets.sort((a, b) => {
      const pMap = { urgent: 0, priority: 1, normal: 2 };
      const pa = pMap[a.priority] ?? 2;
      const pb = pMap[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(a.acceptedAt || a.placedAt) - new Date(b.acceptedAt || b.placedAt);
    });
  }, [orders, stationFilter]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none bg-transparent text-[var(--text-primary)] font-sans relative">
      
      {/* Floating Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="px-8 pt-8 pb-4 flex justify-between items-center relative z-10"
      >
        <div className="flex items-center gap-4 bg-[var(--bg-card)] p-2 rounded-full border-none">
          {['All', 'Grill', 'Drinks', 'Packing'].map((st) => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`px-6 py-2 rounded-full text-[13px] uppercase tracking-[0.2em] font-bold transition-all duration-300 border-none cursor-pointer ${
                stationFilter === st 
                  ? 'bg-[var(--accent-yellow)] text-black font-extrabold shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:text-white bg-transparent'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-[14px] tracking-[0.25em] text-[var(--accent-yellow)] flex items-center gap-3 font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-yellow)] animate-pulse" />
            SYS.ONLINE
          </div>
          <div className="text-2xl font-light tracking-tighter text-white">
            {new Date(now).toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </motion.div>

      {/* Futuristic Ticket Board */}
      <div className="flex-1 overflow-x-auto p-8 flex gap-8 items-start relative z-10 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {kdsTickets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-30"
            >
              <Monitor size={100} strokeWidth={0.5} className="mb-8" />
              <h2 className="text-3xl font-thin tracking-[0.5em] uppercase">Queue Empty</h2>
            </motion.div>
          ) : (
            kdsTickets.map((order) => {
              const elapsedSecs = getElapsedTime(order.acceptedAt);
              const isUrgent = order.priority === 'urgent';
              const mins = elapsedSecs / 60;
              
              let activeColor = 'var(--accent-yellow)';
              let statusText = 'AWAITING PREP';
              
              if (isUrgent || mins > 15) {
                activeColor = 'var(--accent-red)';
                statusText = 'CRITICAL DELAY';
              } else if (order.status === 'preparing') {
                activeColor = 'var(--accent-yellow)';
                statusText = 'IN PROGRESS';
              } else if (order.status === 'almost_ready') {
                activeColor = '#22c55e';
                statusText = 'FINALIZING';
              }

              return (
                <motion.div
                   layout
                   initial={{ opacity: 0, scale: 0.9, x: 50 }}
                   animate={{ opacity: 1, scale: 1, x: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: 50 }}
                   transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                   key={order.id}
                   className="w-[380px] bg-[var(--bg-card)] flex flex-col h-[calc(100%-2rem)] shrink-0 relative rounded-2xl overflow-hidden border-none"
                >
                  {/* Status Indicator Bar */}
                  <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: activeColor }} />

                  {/* Header */}
                  <div className="p-6 pb-4 border-b border-transparent pl-8">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[13px] uppercase tracking-[0.2em] font-bold" style={{ color: activeColor }}>{statusText}</p>
                        <h3 className="text-5xl font-light tracking-tighter text-white mt-1">#{order.orderNumber}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">Timer</p>
                        <span className="text-3xl font-light tracking-widest" style={{ color: activeColor }}>
                          {formatElapsedTime(elapsedSecs)}
                        </span>
                      </div>
                    </div>
                    {isUrgent && (
                      <div className="mt-2 text-[var(--accent-red)] text-[13px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 bg-[rgba(239,42,57,0.1)] py-1.5 px-3 w-fit rounded-md border-none">
                        <AlertTriangle size={12} /> Urgent Priority
                      </div>
                    )}
                  </div>

                  {/* Items List (Customer Cart Style Layout) */}
                  <div className="flex-1 overflow-y-auto p-6 pl-8 space-y-3 no-scrollbar">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-[var(--glass-bg)] p-3 rounded-2xl">
                        {/* Left: circular Figma food illustration */}
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-card-hover)] flex items-center justify-center p-1.5 shrink-0">
                          <img src={getFoodImage(item.name)} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        {/* Center: Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                          {item.modifiers?.length > 0 && (
                            <p className="text-[13px] text-[var(--accent-yellow)] truncate">
                              {item.modifiers.map(m => m.name).join(', ')}
                            </p>
                          )}
                          {item.specialInstructions && (
                            <div className="mt-1 text-[var(--accent-red)] text-[13px] uppercase tracking-wider leading-relaxed">
                              "{item.specialInstructions}"
                            </div>
                          )}
                        </div>
                        {/* Right: Quantity */}
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-[var(--accent-yellow)]">{item.quantity}×</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Action */}
                  <div className="p-6 pl-8 border-t border-transparent bg-[var(--bg-card)]">
                    <div className="flex items-center justify-between text-[13px] uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-4">
                      <span>Auth: {order.customerName}</span>
                      <span>ID: {order.id.slice(0,8)}</span>
                    </div>

                    {order.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        className="w-full py-4 text-[13px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border-none rounded-xl cursor-pointer
                          bg-[var(--accent-yellow)] text-black hover:bg-yellow-400 font-bold"
                      >
                        <Fingerprint size={16} /> Init Prep
                      </button>
                    )}
                    {(order.status === 'preparing' || order.status === 'almost_ready') && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}
                        className="w-full py-4 text-[13px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all border-none rounded-xl cursor-pointer
                          bg-[var(--accent-yellow)] text-black hover:bg-yellow-400 font-bold"
                      >
                        <Fingerprint size={16} /> Mark Ready
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
