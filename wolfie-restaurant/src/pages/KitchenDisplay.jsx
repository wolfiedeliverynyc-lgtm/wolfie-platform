import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
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

const STATION_MAPPING = {
  Burgers: 'Grill', Pizza: 'Grill', Tacos: 'Grill',
  Bowls: 'Packing', Sushi: 'Packing', Salads: 'Packing', Sides: 'Packing',
  Drinks: 'Drinks',
};

export default function KitchenDisplay() {
  const { orders, updateOrderStatus } = useRestaurantStore();
  const restaurant = useRestaurantStore((s) => s.restaurant);
  const restaurantId = restaurant?.id || 'r-001';

  const { emitOrderAccept, emitOrderReady, emitOrderDelay } = useRestaurantSocket(restaurantId, {
    onNewOrder: (data) => {
      useRestaurantStore.setState(s => ({ orders: [data, ...s.orders] }));
    },
    onOrderUpdate: (data) => {
      useRestaurantStore.setState(s => ({ orders: s.orders.map(o => o.id === data.id ? { ...o, ...data } : o) }));
    }
  });

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
    <div className="h-full w-full flex flex-col overflow-hidden select-none bg-[#050505] text-[#e8dcc8] font-sans relative">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Floating Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        className="px-8 pt-8 pb-4 flex justify-between items-center relative z-10"
      >
        <div className="flex items-center gap-4 bg-[#0a0a0a] p-2 rounded-full border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          {['All', 'Grill', 'Drinks', 'Packing'].map((st) => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`px-6 py-2 rounded-full text-[9px] uppercase tracking-[0.3em] font-bold transition-all duration-300 ${
                stationFilter === st 
                  ? 'bg-[#FF6129] text-[#050505] shadow-[0_0_15px_rgba(255,97,41,0.4)]' 
                  : 'text-[rgba(232,220,200,0.4)] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-[12px] tracking-[0.4em] text-[#38bdf8] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse shadow-[0_0_10px_#38bdf8]" />
            SYS.ONLINE
          </div>
          <div className="text-2xl font-light tracking-tighter text-white">
            {new Date(now).toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </motion.div>

      {/* Futuristic Ticket Board */}
      <div className="flex-1 overflow-x-auto p-8 flex gap-8 items-start relative z-10">
        <AnimatePresence mode="popLayout">
          {kdsTickets.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center h-full text-[rgba(232,220,200,0.1)]"
            >
              <Monitor size={100} strokeWidth={0.5} className="mb-8" />
              <h2 className="text-3xl font-thin tracking-[0.5em] uppercase">Queue Empty</h2>
            </motion.div>
          ) : (
            kdsTickets.map((order) => {
              const elapsedSecs = getElapsedTime(order.acceptedAt);
              const isUrgent = order.priority === 'urgent';
              const mins = elapsedSecs / 60;
              
              let glowColor = 'rgba(255,97,41,0.1)';
              let activeColor = '#FF6129';
              let statusText = 'AWAITING PREP';
              
              if (isUrgent || mins > 15) {
                glowColor = 'rgba(239,68,68,0.15)';
                activeColor = '#ef4444';
                statusText = 'CRITICAL DELAY';
              } else if (order.status === 'preparing') {
                glowColor = 'rgba(56,189,248,0.15)';
                activeColor = '#38bdf8';
                statusText = 'IN PROGRESS';
              } else if (order.status === 'almost_ready') {
                glowColor = 'rgba(34,197,94,0.15)';
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
                  className="w-[380px] bg-[#0a0a0a] flex flex-col h-[calc(100%-2rem)] shrink-0 relative"
                >
                  {/* Glowing Status Edge */}
                  <div className="absolute top-0 left-0 bottom-0 w-1 shadow-lg" style={{ backgroundColor: activeColor, boxShadow: `0 0 20px ${activeColor}` }} />

                  {/* Header */}
                  <div className="p-6 pb-4 border-b border-white/5 pl-8">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: activeColor }}>{statusText}</p>
                        <h3 className="text-5xl font-light tracking-tighter text-white mt-1">#{order.orderNumber}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-[rgba(232,220,200,0.4)] mb-2">Timer</p>
                        <span className="text-3xl font-light tracking-widest" style={{ color: activeColor }}>
                          {formatElapsedTime(elapsedSecs)}
                        </span>
                      </div>
                    </div>
                    {isUrgent && (
                      <div className="mt-2 text-[#ef4444] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 bg-[#ef4444]/10 py-1.5 px-3 w-fit border border-[#ef4444]/20 rounded-md">
                        <AlertTriangle size={12} /> Urgent Priority
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="flex-1 overflow-y-auto p-6 pl-8 space-y-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="group">
                        <div className="text-lg font-light tracking-wide text-white flex items-start">
                          <span className="text-[rgba(232,220,200,0.3)] mr-4 font-thin">{item.quantity}×</span>
                          <span>{item.name}</span>
                        </div>
                        
                        {item.modifiers?.length > 0 && (
                          <div className="mt-2 ml-9 space-y-1">
                            {item.modifiers.map((mod, mi) => (
                              <p key={mi} className="text-[11px] uppercase tracking-widest text-[#38bdf8]">
                                <span className="opacity-50 mr-2">↳</span>{mod.name}
                              </p>
                            ))}
                          </div>
                        )}

                        {item.specialInstructions && (
                          <div className="mt-3 ml-9 text-[#ef4444] text-[11px] uppercase tracking-widest leading-relaxed border-l border-[#ef4444]/30 pl-3">
                            "{item.specialInstructions}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer Action */}
                  <div className="p-6 pl-8 border-t border-white/5 bg-[#080808]">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[rgba(232,220,200,0.3)] mb-4">
                      <span>Auth: {order.customerName}</span>
                      <span>ID: {order.id.slice(0,8)}</span>
                    </div>

                    {order.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                        className="w-full py-4 text-[11px] font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-3 transition-all
                          bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8] hover:text-[#050505] hover:shadow-[0_0_20px_rgba(56,189,248,0.4)]"
                      >
                        <Fingerprint size={16} /> Init Prep
                      </button>
                    )}
                    {(order.status === 'preparing' || order.status === 'almost_ready') && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}
                        className="w-full py-4 text-[11px] font-bold uppercase tracking-[0.4em] flex items-center justify-center gap-3 transition-all
                          bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e] hover:text-[#050505] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
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
