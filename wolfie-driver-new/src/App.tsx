import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, ShieldAlert, Navigation, Star, Award, LogOut, ArrowUpRight, CheckCircle2, Volume2, VolumeX, Flame, BellRing, Settings, Menu, Bell, ArrowLeft, Heart, Clock, User, Check, ChevronRight, MapPin, Sliders, Home, ClipboardList, RotateCcw, HelpCircle, Phone, MessageSquare, Shield, Smile, Send, Headphones, Sun, Moon } from 'lucide-react';
import { Order, OrderStatus, DriverStats, EarningSummary, LatLng } from './types';
import WolfieMap from './components/WolfieMap';
import { useDriverStore } from './store/useDriverStore';
import { useSocket } from './hooks/useSocket';
import { useGPS } from './hooks/useGPS';
import { useAudio } from './hooks/useAudio';
import EarningsDash from './components/EarningsDash';
import ProfileDash from './components/ProfileDash';
import WalletDash from './components/WalletDash';
import SupportDash from './components/SupportDash';
import PerformanceDash from './components/PerformanceDash';
import OfferCard from './components/OfferCard';
import ActiveDeliveryWidget from './components/ActiveDeliveryWidget';
import WolfSvg from './components/WolfSvg';
import NotificationsPanel from './components/NotificationsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import GPSRequiredOverlay from './components/GPSRequiredOverlay';
import { API_BASE } from './lib/api';

// Pre-configured custom high-fidelity orders corresponding to screenshot template
// REMOVED: Mock order generators have been replaced by real backend REST API fetches and websocket events.

// Sound synthethizer helper to ring chimes for orders and deliveries
function playBeep(type: 'OFFER' | 'SUCCESS' | 'CLICK') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'OFFER') {
      // High double chirp
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      
      setTimeout(() => {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      }, 150);
      
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 350);
    } else if (type === 'SUCCESS') {
      // Arpeggio chord sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      
      setTimeout(() => {
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      }, 100);
      setTimeout(() => {
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
      }, 200);
      setTimeout(() => {
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
      }, 300);
      
      setTimeout(() => {
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      }, 350);
      
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 700);
    } else {
      // Light click sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 100);
    }
  } catch (err) {
    // Audio Context blocked or unsupported, ignore silently
  }
}

export default function App() {
  // Hooks
  useSocket();
  const store = useDriverStore();
  const theme = store.theme;
  
  const { startTracking } = useGPS({
    onLocation: async (lat, lng, heading) => {
      if (store.token) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          await fetch(`${API_BASE}/drivers/location`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${store.token}`
            },
            body: JSON.stringify({ 
              lat, 
              lng, 
              heading, 
              order_id: store.activeOrders?.[0]?.id || null 
            })
          });
        } catch (e) {
          // Silent catch for frequent GPS updates
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }
  });
  const { playDispatch, playSuccess, playPickup, playWarning } = useAudio();

  const activeTab = store.activeTab as any;
  const setActiveTab = store.setActiveTab;
  const online = store.isOnline;
  const setOnline = store.setOnline;
  const pendingOfferStore = store.pendingOffer;
  
  // Backwards compatibility mappings for UI
  const driverStats = {
    rating: store.performance.customerRating,
    acceptanceRate: store.performance.acceptanceRate,
    completionRate: store.performance.completionRate,
    onTimeRate: store.performance.totalDeliveries > 0 ? Math.round((store.performance.onTimeDeliveries / store.performance.totalDeliveries) * 100) : 100,
    lifetimeDeliveries: store.performance.totalDeliveries
  };
  
  const earningsSummary = {
    todayEarnings: store.completedTrips.reduce((acc, trip) => acc + trip.payout, 0) || 0,
    todayDeliveries: store.completedTrips.length,
    todayTimeMinutes: store.performance.activeHoursToday * 60,
    weeklyHistory: [],
    orderHistory: []
  };

  const soundEnabled = store.soundEnabled;
  const setSoundEnabled = store.setSoundEnabled;
  
  const pendingOffer: Order | null = pendingOfferStore ? {
    id: pendingOfferStore.order.id,
    storeName: pendingOfferStore.order.restaurantName,
    storeAddress: pendingOfferStore.order.restaurantAddress,
    storeCoords: { x: pendingOfferStore.order.restaurantCoords[1], y: pendingOfferStore.order.restaurantCoords[0] },
    customerName: pendingOfferStore.order.customerName,
    customerAddress: pendingOfferStore.order.customerAddress,
    customerCoords: { x: pendingOfferStore.order.customerCoords[1], y: pendingOfferStore.order.customerCoords[0] },
    distance: pendingOfferStore.order.distanceKm,
    estimatedTime: pendingOfferStore.order.estimatedMinutes,
    basePay: pendingOfferStore.order.payout,
    tipPay: pendingOfferStore.order.tip,
    promoPay: pendingOfferStore.order.promoPay || 0,
    totalPay: pendingOfferStore.order.payout + pendingOfferStore.order.tip + (pendingOfferStore.order.promoPay || 0),
    items: pendingOfferStore.order.items,
    instructions: pendingOfferStore.order.customerInstructions,
    status: pendingOfferStore.order.status as OrderStatus,
    offerExpiresAt: pendingOfferStore.expiresAt,
    createdAt: pendingOfferStore.order.acceptedAt || '',
    orderNumber: pendingOfferStore.order.orderNumber,
  } : null;

  const setPendingOffer = (offer: any) => store.setPendingOffer(offer ? { order: offer, expiresAt: Date.now() + 30000 } : null);
  
  const activeOrder: Order | null = store.activeOrders[0] ? {
    id: store.activeOrders[0].id,
    storeName: store.activeOrders[0].restaurantName,
    storeAddress: store.activeOrders[0].restaurantAddress,
    storeCoords: { x: store.activeOrders[0].restaurantCoords[1], y: store.activeOrders[0].restaurantCoords[0] },
    customerName: store.activeOrders[0].customerName,
    customerAddress: store.activeOrders[0].customerAddress,
    customerCoords: { x: store.activeOrders[0].customerCoords[1], y: store.activeOrders[0].customerCoords[0] },
    distance: store.activeOrders[0].distanceKm,
    estimatedTime: store.activeOrders[0].estimatedMinutes,
    basePay: store.activeOrders[0].payout,
    tipPay: store.activeOrders[0].tip,
    promoPay: store.activeOrders[0].promoPay || 0,
    totalPay: store.activeOrders[0].payout + store.activeOrders[0].tip + (store.activeOrders[0].promoPay || 0),
    items: store.activeOrders[0].items,
    instructions: store.activeOrders[0].customerInstructions,
    status: store.activeOrders[0].status as OrderStatus,
    offerExpiresAt: store.activeOrders[0].offerExpiresAt || Date.now(),
    createdAt: store.activeOrders[0].acceptedAt || '',
    orderNumber: store.activeOrders[0].orderNumber,
    proofPhoto: store.activeOrders[0].proofPhoto,
  } : null;

  // Phone current time ticker state
  const [phoneTime, setPhoneTime] = useState<string>('04:32 PM');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      let hours = d.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutes = d.getMinutes().toString().padStart(2, '0');
      setPhoneTime(`${hours}:${minutes} ${ampm}`);
    };
    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, []);

  const [simulationSpeed, setSimulationSpeed] = useState<number>(5); // 1x, 2x, 5x, 10x etc.
  const [driverCoords, setDriverCoords] = useState<LatLng>({ x: store.currentLocation[1], y: store.currentLocation[0] });

  const [navigationDistanceLeft, setNavigationDistanceLeft] = useState<number>(1.2);

  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Success completed popup representation
  const [showPayoutCelebration, setShowPayoutCelebration] = useState<boolean>(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);



  // Toggle Online/Offline state via Backend API
  const handleToggleOnline = async (status: boolean) => {
    if (soundEnabled) playBeep('CLICK');
    
    // In a real app we'd wait for API response before updating UI, but we'll optimistic update for snappy feel
    setOnline(status);
    if (!status) {
      store.setPendingOffer(null);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      if (store.token) {
        await fetch(`${API_BASE}/drivers/status`, {
          method: 'PATCH',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.token}`
          },
          body: JSON.stringify({ status: status ? 'online' : 'offline' })
        });
      }
    } catch (err) {
      console.error("Failed to sync online status with backend", err);
      // Revert if failed
      setOnline(!status);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Decline order handler
  const handleDeclineOffer = async (orderId: string) => {
    if (soundEnabled) playBeep('CLICK');

    // Make backend call to decline
    const declineController = new AbortController();
    const declineTimeoutId = setTimeout(() => declineController.abort(), 15000);
    try {
      if (store.token) {
        await fetch(`${API_BASE}/orders/${orderId}/status`, {
          method: 'PATCH',
          signal: declineController.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.token}`
          },
          body: JSON.stringify({ status: 'pending' })
        });
      }
    } catch (e) {
      console.error("Failed to decline order on backend", e);
    } finally {
      clearTimeout(declineTimeoutId);
    }
    store.updatePerformance({
      acceptanceRate: Math.max(15, store.performance.acceptanceRate - 2)
    });
  };

  // Accept order handler
  const handleAcceptOffer = async (order: Order) => {
    if (soundEnabled) playBeep('CLICK');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      if (store.token) {
        await fetch(`${API_BASE}/orders/${order.id}/status`, {
          method: 'PATCH',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.token}`
          },
          body: JSON.stringify({ status: 'accepted' })
        });
      }
    } catch (e) {
      console.error("Failed to accept order on backend", e);
    } finally {
      clearTimeout(timeoutId);
    }
    
    const newActive: any = {
      id: order.id,
      orderNumber: order.orderNumber,
      restaurantName: order.storeName,
      restaurantAddress: order.storeAddress,
      restaurantCoords: [order.storeCoords.y, order.storeCoords.x],
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      customerCoords: [order.customerCoords.y, order.customerCoords.x],
      customerInstructions: order.instructions,
      payout: order.basePay,
      tip: order.tipPay,
      promoPay: order.promoPay,
      distanceKm: order.distance,
      estimatedMinutes: order.estimatedTime,
      items: order.items,
      status: 'NAV_TO_STORE',
      etaMinutes: order.estimatedTime,
      acceptedAt: new Date().toISOString(),
    };
    store.addActiveOrder(newActive);
    store.setLifecycleState('accepted');
    store.setPendingOffer(null);
    setNavigationDistanceLeft(order.distance);
    setActiveTab('ORDERS'); // Go to orders tab so they see live map tracking instantly!

    store.updatePerformance({
      acceptanceRate: Math.min(100, store.performance.acceptanceRate + 1)
    });
  };

  // State advances in the active delivery stage
  const handleAdvanceOrderStatus = async (nextStatus: OrderStatus) => {
    if (soundEnabled) playBeep('CLICK');
    if (!activeOrder) return;

    if (nextStatus === 'NAV_TO_CUSTOMER') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        if (store.token) {
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.token}`
          };
          const loc = store.currentLocation || [0,0];
          
          // Send picked_up
          await fetch(`${API_BASE}/orders/${activeOrder.id}/status`, {
            method: 'PATCH',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ status: 'picked_up', lat: loc[0], lng: loc[1] })
          });
          
          // Send on_the_way
          await fetch(`${API_BASE}/orders/${activeOrder.id}/status`, {
            method: 'PATCH',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ status: 'on_the_way', lat: loc[0], lng: loc[1] })
          });
        }
      } catch (e) {
        console.error("Failed to advance order status on backend", e);
        return; // Don't advance locally if backend fails
      } finally {
        clearTimeout(timeoutId);
      }
    }

    store.updateOrderStatus(activeOrder.id, nextStatus);
    
    if (nextStatus === 'ARRIVED_AT_STORE') {
      store.setLifecycleState('at_restaurant');
    } else if (nextStatus === 'NAV_TO_CUSTOMER') {
      store.setLifecycleState('picked_up');
    } else if (nextStatus === 'DELIVERED') {
      store.setLifecycleState('delivered');
    }
  };

  // Checklist items ticker callback
  const handleCheckChecklistItem = (itemId: string, checked: boolean) => {
    if (soundEnabled) playBeep('CLICK');
    if (!activeOrder) return;
    
    // Quick local clone hack to update store deep array
    const updatedOrder = JSON.parse(JSON.stringify(store.activeOrders[0]));
    updatedOrder.items = updatedOrder.items.map((i: any) => i.id === itemId ? { ...i, checked } : i);
    store.addActiveOrder(updatedOrder); // using addActiveOrder overwrites by id
  };

  // Completed deliveries final action handler
  const handleCompleteActiveDelivery = async (proofPhotoUrl: string) => {
    if (!activeOrder) return;

    if (soundEnabled) playBeep('SUCCESS');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      if (store.token) {
        const loc = store.currentLocation || [0,0];
        await fetch(`${API_BASE}/orders/${activeOrder.id}/status`, {
          method: 'PATCH',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${store.token}`
          },
          body: JSON.stringify({ 
            status: 'delivered', 
            lat: loc[0], 
            lng: loc[1],
            proof_type: 'photo',
            proof_photo_url: proofPhotoUrl
          })
        });
      }
    } catch (e) {
      console.error("Failed to complete delivery on backend", e);
      return; // Don't complete locally if backend fails
    } finally {
      clearTimeout(timeoutId);
    }

    // Build finalized order record
    const finalOrder: Order = {
      ...activeOrder,
      status: 'DELIVERED',
      proofPhoto: proofPhotoUrl,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    store.updateOrderStatus(activeOrder.id, 'DELIVERED');
    store.addEarnings(finalOrder.totalPay, finalOrder.tipPay);
    store.addCompletedTrip({
      id: finalOrder.id,
      date: new Date().toISOString(),
      restaurantName: finalOrder.storeName,
      payout: finalOrder.totalPay,
      tip: finalOrder.tipPay,
      distanceKm: finalOrder.distance,
      durationMin: finalOrder.estimatedTime
    });

    const randomRating = Math.random() > 0.15 ? 5.0 : 4.0;
    const avgRating = parseFloat(
      ((store.performance.customerRating * store.performance.totalDeliveries + randomRating) / (store.performance.totalDeliveries + 1)).toFixed(2)
    );

    store.updatePerformance({
      customerRating: avgRating,
      completionRate: Math.min(100, store.performance.completionRate + 0.5),
      totalDeliveries: store.performance.totalDeliveries + 1,
    });

    store.removeActiveOrder(activeOrder.id);
    store.setLifecycleState('online');

    setLastCompletedOrder(finalOrder);
    setShowPayoutCelebration(true);
  };

  // Dynamic coordinates updates from GPS
  const handleDriverCoordsUpdate = (coords: LatLng, currentSegmentDistanceLeft: number) => {
    store.setCurrentLocation([coords.y, coords.x]);
    setNavigationDistanceLeft(parseFloat(currentSegmentDistanceLeft.toFixed(2)));
  };

  // GPS auto arrive trigger when scooter hits targets on roads
  const handleGpsAutoArrive = () => {
    if (!activeOrder) return;
    
    if (activeOrder.status === 'NAV_TO_STORE') {
      handleAdvanceOrderStatus('ARRIVED_AT_STORE');
    } else if (activeOrder.status === 'NAV_TO_CUSTOMER') {
      handleAdvanceOrderStatus('ARRIVED_AT_CUSTOMER');
    }
  };

  // Inject cash mockup helper for sandbox
  const handleInjectSandboxCash = (amount: number) => {
    if (soundEnabled) playBeep('SUCCESS');
    store.addEarnings(amount, 0);
  };

  // Hard Reset application data
  const handleHardResetState = () => {
    if (soundEnabled) playBeep('CLICK');
    store.resetStore();
    setShowPayoutCelebration(false);
  };

  // Dynamic metrics based on current deliveries
  const mockOnlineTime = (() => {
    const baseMinutes = 272; // 4h 32m
    const additional = earningsSummary.todayDeliveries * 24;
    const total = baseMinutes + additional;
    return `${Math.floor(total / 60)}h ${total % 60}m`;
  })();

  const mockActiveTime = (() => {
    const baseMinutes = 192; // 3h 12m
    const additional = earningsSummary.todayDeliveries * 18;
    const total = baseMinutes + additional;
    return `${Math.floor(total / 60)}h ${total % 60}m`;
  })();

  const ScooterIllustration = () => (
    <div className="relative w-full h-44 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-bg-card to-bg-app border border-slate-850">
      {/* Skyline back silhouette */}
      <svg className="absolute bottom-0 w-full h-24 text-text-secondary/15 pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d="M0,80 L20,80 L20,40 L40,40 L40,60 L60,60 L60,30 L80,30 L80,70 L100,70 L100,20 L120,20 L120,80 L140,80 L140,50 L160,50 L160,70 L180,70 L180,10 L200,10 L200,80 L220,80 L220,40 L240,40 L240,60 L260,60 L260,30 L280,30 L280,70 L300,70 L300,20 L320,20 L320,80 L340,80 L340,50 L360,50 L360,75 L380,75 L380,15 L400,15 L400,100 L0,100 Z" fill="currentColor" />
      </svg>

      {/* Glowing road line */}
      <div className="absolute bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      <div className="absolute bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

      {/* Moving city lights/stars */}
      <div className="absolute top-12 left-1/4 w-1.5 h-1.5 rounded-full bg-primary/50 blur-[1px] animate-pulse"></div>
      <div className="absolute top-16 right-1/3 w-1 h-1 rounded-full bg-accent/45 blur-[1px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Styled delivery rider riding scooter */}
      <div className="relative animate-float flex flex-col items-center">
        <svg className="w-40 h-28 text-primary" viewBox="0 0 200 150" fill="none">
          <circle cx="100" cy="75" r="45" fill="var(--primary)" fillOpacity="0.08" className="animate-pulse" />

          {/* Wheels */}
          <circle cx="55" cy="110" r="16" fill="#111" stroke="var(--primary)" strokeWidth="3" />
          <circle cx="55" cy="110" r="6" fill="#666" />
          <circle cx="145" cy="110" r="16" fill="#111" stroke="var(--primary)" strokeWidth="3" />
          <circle cx="145" cy="110" r="6" fill="#666" />

          {/* Chassis */}
          <path d="M40,100 Q55,80 75,98 L115,102 L145,100 Q155,90 160,110 Z" fill="var(--primary)" />
          <path d="M110,100 L140,50 Q145,40 135,40 L120,40" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />

          {/* Wolfie Insulated Box */}
          <rect x="65" y="66" width="40" height="34" rx="4" fill="var(--bg-app)" stroke="var(--primary)" strokeWidth="2" />
          <rect x="70" y="72" width="30" height="22" rx="2" fill="var(--accent)" />
          <path d="M78,83 L83,88 L92,79" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Handle bar column */}
          <line x1="130" y1="75" x2="135" y2="45" stroke="#475569" strokeWidth="4" />
          <circle cx="135" cy="45" r="4" fill="var(--primary)" />

          {/* Rider body & orange jacket */}
          <path d="M96,66 L118,52 L128,76 L110,85 Z" fill="var(--primary)" stroke="#000" strokeWidth="2" />
          <path d="M98,64 C100,50 115,50 115,64" stroke="#000" strokeWidth="2" />
          <path d="M112,56 Q128,58 133,48" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />

          {/* Rider Helmet */}
          <circle cx="110" cy="38" r="15" fill="#0f172a" stroke="var(--primary)" strokeWidth="2" />
          <path d="M112,30 Q126,34 122,46 Z" fill="#38bdf8" />
          <path d="M100,48 Q110,48 116,52" stroke="var(--primary)" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );

  return (
    <ErrorBoundary context="DriverDashboard">
      <div className={`w-full h-full relative overflow-hidden flex flex-col justify-between bg-bg-app text-text-primary font-sans antialiased select-none transition-all duration-300 ${theme === 'light' ? 'light-theme' : ''}`}>

      {/* VIEWPANEL CORE SCREEN */}
      <div className="flex-1 overflow-y-auto relative p-4 custom-scrollbar pb-24 bg-bg-app flex flex-col justify-start space-y-5">
            
            {/* 1. TABS CONTENT INTERFACES RENDER SECTORS */}
            {activeTab === 'HOME' && (
              <>
                {/* OFFLINE HOME VIEW */}
                {!online ? (
                  <div id="offline-welcome-screen" className="flex flex-col flex-1 justify-between py-2 space-y-6">
                    {/* Top Header layout mimic */}
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => { if (soundEnabled) playBeep('CLICK'); }} 
                        className="w-10 h-10 rounded-2xl bg-bg-card border border-slate-850 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <Menu className="w-5 h-5" />
                      </button>

                      {/* GPS status indicator */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black tracking-wide ${
                        store.gpsStatus === 'active' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${store.gpsStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                        <span>{store.gpsStatus === 'active' ? 'GPS ACTIVE' : 'GPS OFF'}</span>
                      </div>
                      
                      {/* Theme Toggle Button */}
                      <button
                        onClick={() => {
                          if (soundEnabled) playBeep('CLICK');
                          store.setTheme(theme === 'dark' ? 'light' : 'dark');
                        }}
                        className="w-10 h-10 rounded-2xl bg-bg-card border border-slate-850 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        title="Toggle Light/Dark Theme"
                      >
                        {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                      </button>

                      <button 
                        onClick={() => { 
                          if (soundEnabled) playBeep('CLICK');
                          setShowNotifications(true);
                        }} 
                        className="w-10 h-10 rounded-2xl bg-bg-card border border-slate-850 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer relative"
                      >
                        <Bell className="w-4 h-4" />
                        {store.intelligenceAlerts.length > 0 && (
                          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary"></span>
                        )}
                      </button>
                    </div>

                    {/* Central Brand Mascot Header */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-24 h-24 rounded-3xl bg-bg-card border border-slate-850 flex items-center justify-center shadow-lg shadow-primary/5 overflow-hidden animate-float">
                        <WolfSvg className="w-20 h-20 transform scale-110" />
                      </div>
                      
                      <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary font-serif uppercase">WOLFIE</h1>
                        <p className="text-[10px] font-black tracking-widest text-primary uppercase">Alpha Courier Dashboard</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-base font-bold text-text-primary">Deliver fast. Earn more.</p>
                        <p className="text-xs text-text-secondary font-semibold font-sans">Let's go!</p>
                      </div>
                    </div>

                    {/* Scooter Rider city skyline silhouette */}
                    <ScooterIllustration />

                    {/* Giant Online slider button widget */}
                    <button
                      id="btn-go-online-central"
                      onClick={() => handleToggleOnline(true)}
                      disabled={store.gpsStatus !== 'active'}
                      className={`w-full py-4.5 rounded-3xl text-sm font-black tracking-wider shadow-xl border-none flex items-center justify-center gap-3 transition-all cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] ${
                        store.gpsStatus === 'active' 
                          ? 'bg-primary hover:bg-primary-hover text-black' 
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      }`}
                    >
                      {store.gpsStatus === 'active' ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-black block animate-ping"></span>
                          <span>GO ONLINE NOW</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                          <span>GPS REQUIRED TO GO ONLINE</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* ONLINE HOME DASHBOARD VIEW SPECIFIED BY USER */
                  <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                    
                    {/* Upper Status strip bar */}
                    <div className="flex justify-between items-center py-1">
                      <button
                        onClick={() => handleToggleOnline(false)}
                        className="w-9 h-9 rounded-xl bg-bg-card border border-slate-850 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                        title="Back to Offline page"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 py-1 px-3.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-[ping_1.5s_infinite]"></span>
                        <span className="text-[10px] font-extrabold text-text-primary tracking-wide">● You're Online</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Theme Toggle Button */}
                        <button
                          onClick={() => {
                            if (soundEnabled) playBeep('CLICK');
                            store.setTheme(theme === 'dark' ? 'light' : 'dark');
                          }}
                          className="w-9 h-9 rounded-xl bg-bg-card border border-slate-850 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                          title="Toggle Light/Dark Theme"
                        >
                          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>

                        <button 
                          onClick={() => { 
                            if (soundEnabled) playBeep('CLICK');
                            setShowNotifications(true);
                          }} 
                          className="w-9 h-9 rounded-xl bg-bg-card border border-slate-850 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer relative"
                        >
                          <Bell className="w-4 h-4" />
                          {store.intelligenceAlerts.length > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-[8px] font-black text-black flex items-center justify-center">
                              {store.intelligenceAlerts.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* TODAY'S EARNINGS BLOCK CONTAINER WITH GLOWING GREEN LINE SPARKLINE */}
                    <div 
                      onClick={() => {
                        if (soundEnabled) playBeep('CLICK');
                        setActiveTab('WALLET');
                      }}
                      className="bg-bg-card border border-slate-850 hover:border-primary/30 p-5 rounded-[28px] relative overflow-hidden flex justify-between items-center group h-32 cursor-pointer transition-all hover:bg-bg-card-hover"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                      <div className="space-y-1 z-10">
                        <span className="text-xs font-bold text-text-secondary tracking-wide flex items-center gap-0.5">
                          Today's Earnings
                          <ChevronRight className="w-3.5 h-3.5 text-text-secondary group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                        </span>
                        <h2 className="text-3xl font-black tracking-tight text-text-primary font-mono">${earningsSummary.todayEarnings.toFixed(2)}</h2>
                        <span className="text-[10px] text-text-secondary font-bold tracking-wide mt-1 block">
                          {earningsSummary.todayDeliveries} Orders Completed
                        </span>
                      </div>

                      <div className="z-10 bg-bg-card-hover/20 p-2 rounded-2xl border border-slate-900/40">
                        {/* Wavy emerald glow statistics path representing earnings upward metrics */}
                        <svg className="w-28 h-12 text-primary overflow-visible" viewBox="0 0 100 40">
                          <defs>
                            <linearGradient id="glow-emerald" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0,32 Q 20,28 40,15 T 80,18 T 100,5 L 100,40 L 0,40 Z"
                            fill="url(#glow-emerald)"
                            stroke="none"
                          />
                          <path
                            d="M 0,32 Q 20,28 40,15 T 80,18 T 100,5"
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <circle cx="100" cy="5" r="3.5" fill="var(--primary)" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                          <circle cx="100" cy="5" r="3" fill="#ffffff" />
                        </svg>
                      </div>
                    </div>

                    {/* THREE-COLUMN STAT MATRIX DEPICTION */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Online Time Card */}
                      <div className="bg-bg-card border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 group hover:border-slate-800 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider leading-none">Online Time</p>
                          <h4 className="font-extrabold text-[13px] text-text-primary mt-1 font-mono">{store.performance?.activeHoursToday || 0}h</h4>
                        </div>
                      </div>

                      {/* Active Time Card */}
                      <div className="bg-bg-card border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 group hover:border-slate-800 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Sliders className="w-4 h-4 rotate-90" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider leading-none">Active Time</p>
                          <h4 className="font-extrabold text-[13px] text-text-primary mt-1 font-mono">{store.performance?.totalActiveHours || 0}h</h4>
                        </div>
                      </div>

                      {/* Acceptance Card */}
                      <div className="bg-bg-card border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 group hover:border-slate-800 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                          <Heart className="w-4 h-4 fill-accent/20 text-accent" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider leading-none">Acceptance</p>
                          <h4 className="font-extrabold text-[13px] text-text-primary mt-1 font-mono">{driverStats.acceptanceRate}%</h4>
                        </div>
                      </div>
                    </div>

                    {/* TODAY'S PROGRESS BAR GRAPH SECTOR */}
                    <div className="bg-bg-card border border-slate-850 p-5 rounded-[28px] space-y-3">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest leading-none">Today's Progress</h3>
                          <p className="text-sm font-extrabold text-text-primary mt-1.5 leading-none">
                            ${earningsSummary.todayEarnings.toFixed(2)} <span className="text-xs text-text-secondary font-medium">/ $200</span>
                          </p>
                        </div>
                        <span className="text-[14px] font-black text-text-primary font-mono">
                          {Math.min(100, Math.round((earningsSummary.todayEarnings / 200) * 100))}%
                        </span>
                      </div>

                      {/* Dynamic Rounded Background gradient filler bar */}
                      <div className="w-full h-3 bg-bg-app rounded-full overflow-hidden p-[1px] border border-bg-card-hover/40">
                        <div
                          className="h-full bg-gradient-to-r from-accent via-primary to-emerald-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, (earningsSummary.todayEarnings / 200) * 100)}%` }}
                        ></div>
                      </div>

                      <p className="text-[10px] text-text-secondary font-sans tracking-wide">
                        {earningsSummary.todayEarnings >= 200
                          ? "Daily revenue goal achieved! Driving maximum profit!"
                          : `Complete $${(200 - earningsSummary.todayEarnings).toFixed(2)} more to reach your goal!`}
                      </p>
                    </div>

                    {/* RATINGS / PERFORMANCE SHORTCUT LIST */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-text-secondary uppercase tracking-wider">Performance</h3>
                        <button
                          onClick={() => {
                            if (soundEnabled) playBeep('CLICK');
                            setActiveTab('PROFILE');
                          }}
                          className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                        >
                          View all
                        </button>
                      </div>

                      <div className="bg-bg-card border border-slate-850 rounded-[28px] divide-y divide-slate-850/60 overflow-hidden">
                        
                        {/* Customer Rating */}
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-bg-card-hover/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs">⭐</span>
                            <span className="text-xs font-bold text-text-primary">Rating</span>
                          </div>
                          <span className="text-xs font-extrabold text-text-primary font-mono flex items-center gap-1">
                            {driverStats.rating.toFixed(2)} <span className="text-primary">★</span>
                          </span>
                        </div>

                        {/* Completion Rate */}
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-bg-card-hover/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs">🛡️</span>
                            <span className="text-xs font-bold text-text-primary">Completion Rate</span>
                          </div>
                          <span className="text-xs font-extrabold text-text-primary font-mono">
                            {driverStats.completionRate}%
                          </span>
                        </div>

                        {/* On-Time Speed */}
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-bg-card-hover/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs">⚡</span>
                            <span className="text-xs font-bold text-text-primary">On-time Delivery</span>
                          </div>
                          <span className="text-xs font-extrabold text-text-primary font-mono">
                            {driverStats.onTimeRate}%
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>
                )}
              </>
            )}

            {/* 2. EARNINGS HUB VIEW SECTOR */}
            {activeTab === 'EARNINGS' && (
              <EarningsDash onBack={() => setActiveTab('HOME')} />
            )}

            {/* 3. MAP SIMULATION & DISPATCH ORDERS VIEW SECTOR */}
            {activeTab === 'ORDERS' && (
              <div id="orders-panel" className="animate-[fadeIn_0.3s_ease-out] flex flex-col flex-1 h-full min-h-[480px]">
                {!online ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-bg-card border border-slate-850 rounded-[32px] h-full flex-1 space-y-5">
                    <span className="text-4xl animate-bounce">🛵</span>
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Device is Offline</h3>
                    <p className="text-xs text-text-secondary leading-relaxed max-w-xs">To explore orders and drive on roads, switch your status tool to "Go Online" first.</p>
                    <button
                      onClick={() => handleToggleOnline(true)}
                      className="w-full py-3 bg-primary hover:bg-primary-hover rounded-2xl text-xs font-extrabold text-black transition-all cursor-pointer shadow-lg border-none"
                    >
                      Go Online Now
                    </button>
                  </div>
                ) : activeOrder ? (
                  /* DEPLOYED MAP SIMULATOR & STEP BY STEP CHECKLISTS */
                  <ActiveDeliveryWidget
                    order={activeOrder}
                    navigationDistanceLeft={navigationDistanceLeft}
                    onAdvanceStatus={handleAdvanceOrderStatus}
                    onCheckItem={handleCheckChecklistItem}
                    onCompleteDelivery={handleCompleteActiveDelivery}
                    mapNode={
                      <WolfieMap
                        pickupCoords={[activeOrder.storeCoords.y, activeOrder.storeCoords.x]}
                        dropoffCoords={[activeOrder.customerCoords.y, activeOrder.customerCoords.x]}
                        isNavigating={activeOrder.status === 'NAV_TO_STORE' || activeOrder.status === 'NAV_TO_CUSTOMER'}
                        showETA={true}
                        showHotspots={false}
                        onAutoArrive={handleGpsAutoArrive}
                      />
                    }
                  />
                ) : (
                  /* EMPTY STATE WHEN ONLINE BUT NO OFFERS */
                  <div className="flex flex-col flex-1 space-y-4 h-full">
                    {/* Background static tracking layout */}
                    <div className="flex-1 min-h-[50vh] rounded-3xl overflow-hidden border border-slate-850 select-none relative pb-1">
                      <WolfieMap
                        showHotspots={true}
                        showETA={false}
                        compact={false}
                      />
                    </div>

                    {/* Sonar Radar Card in search of match */}
                    <div id="searching-orders-card" className="bg-bg-card border border-slate-850 rounded-[28px] p-4.5 text-center flex flex-col justify-center items-center space-y-3 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                          <span className="absolute inset-0 rounded-full bg-primary/20 border border-primary/30 animate-ping"></span>
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-black">
                            📡
                          </div>
                        </div>
                        <div className="text-left">
                          <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">Searching Offers...</h3>
                          <p className="text-[10px] text-text-secondary leading-tight">
                            Priority Matching is Active • NY Fleet dispatches
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-bg-card-hover border border-slate-900/60 py-1.5 px-3 rounded-xl text-[9px] text-text-secondary flex items-center gap-1.5 justify-center max-w-[170px] mx-auto font-semibold">
                        <span className="w-1 h-1 rounded-full bg-primary inline-block animate-ping"></span>
                        <span className="text-primary uppercase tracking-wider text-[8px]">High Demand Area</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

                         {/* 4. DRIVER PROFILE & SIMULATOR FACTORY UTILITIES VIEW */}
            {activeTab === 'PROFILE' && (
              <ProfileDash
                simulationSpeed={simulationSpeed}
                setSimulationSpeed={setSimulationSpeed}
                onBack={() => setActiveTab('HOME')}
                onNavigateToWallet={() => {
                  if (soundEnabled) playBeep('CLICK');
                  setActiveTab('WALLET');
                }}
                onNavigateToSupport={() => {
                  if (soundEnabled) playBeep('CLICK');
                  setActiveTab('SUPPORT');
                }}
              />
            )}

            {/* 5. WALLET & PAYOUT VIEW */}
            {activeTab === 'WALLET' && (
              <WalletDash
                onBack={() => setActiveTab('HOME')}
              />
            )}

            {/* 6. SUPPORT & HELP VIEW */}
            {activeTab === 'SUPPORT' && (
              <SupportDash
                onBack={() => setActiveTab('PROFILE')}
                playBeep={playBeep}
              />
            )}

          </div>

          {/* PERSISTENT MOBILE BOTTOM NAVIGATION BAR */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-bg-card border-t border-slate-850/85 px-4 flex items-center justify-between z-45 pb-3">
            
            {/* 1. Home tab */}
            <button
              id="mobile-tab-home"
              onClick={() => {
                if (soundEnabled) playBeep('CLICK');
                setActiveTab('HOME');
              }}
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'HOME' ? 'text-primary border-t-2 border-primary pt-1.5 scale-105' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-black mt-1 font-sans">Home</span>
            </button>

            {/* 2. Earnings tab */}
            <button
              id="mobile-tab-earnings"
              onClick={() => {
                if (soundEnabled) playBeep('CLICK');
                setActiveTab('EARNINGS');
              }}
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'EARNINGS' ? 'text-primary border-t-2 border-primary pt-1.5 scale-105' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px] font-black mt-1 font-sans">Earnings</span>
            </button>

            {/* 3. Orders tab */}
            <button
              id="mobile-tab-orders"
              onClick={() => {
                if (soundEnabled) playBeep('CLICK');
                setActiveTab('ORDERS');
              }}
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'ORDERS' ? 'text-primary border-t-2 border-primary pt-1.5 scale-105' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Navigation className="w-5 h-5 rotate-45" />
              <span className="text-[10px] font-black mt-1 font-sans">Orders</span>
            </button>

            {/* 4. Profile tab */}
            <button
              id="mobile-tab-profile"
              onClick={() => {
                if (soundEnabled) playBeep('CLICK');
                setActiveTab('PROFILE');
              }}
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'PROFILE' ? 'text-primary border-t-2 border-primary pt-1.5 scale-105' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-black mt-1 font-sans">Profile</span>
            </button>

          </div>

          {/* PERSISTENT FLOATING LIVE SUPPORT ANCHOR CORNER */}
          {activeTab !== 'SUPPORT' && (
            <button
              onClick={() => {
                if (soundEnabled) playBeep('CLICK');
                setActiveTab('SUPPORT');
              }}
              className="absolute bottom-20 right-5 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white shadow-[0_4px_22px_rgba(239,42,57,0.3)] cursor-pointer hover:brightness-110 active:scale-95 transition-all group animate-[bounce_3.5s_infinite_ease-in-out] border-none"
              style={{ touchAction: 'manipulation' }}
              title="Open Live Chat Support"
            >
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-accent/40 animate-ping pointer-events-none"></div>

              {/* Icon symbol */}
              <Headphones className="w-5.5 h-5.5 stroke-[2.2px] relative z-10 text-white group-hover:rotate-12 transition-transform" />

              {/* Status active pulsing dot indicator */}
              <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-accent"></span>
              </span>

              {/* Help tooltip display on hover */}
              <span className="absolute right-14 bg-bg-card text-[10px] font-extrabold text-accent uppercase tracking-wider px-2.5 py-1 rounded-lg border border-slate-900 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Help Online
              </span>
            </button>
          )}



      {/* MATCHING PENDING OFFER OVERLAY CARD MODAL - SLIDES UP OVER CURRENT VIEW */}
      {pendingOffer && (
        <OfferCard
          order={pendingOffer}
          onAccept={handleAcceptOffer}
          onDecline={() => handleDeclineOffer(pendingOffer.id)}
        />
      )}

      {/* NOTIFICATIONS PANEL OVERLAY */}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* PAYOUT SUCCESS/CELEBRATION OVERLAY MODAL */}
      {showPayoutCelebration && lastCompletedOrder && (
        <div id="payout-celebration-popup" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0b0c1e] border border-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
            
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-3xl mx-auto animate-bounceCircle">
              🎉
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Delivery Complete!
              </span>
              <h3 className="text-lg font-black font-sans tracking-tight text-slate-100">
                You Made ${lastCompletedOrder.totalPay.toFixed(2)}!
              </h3>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                Excellent drop-off work at <strong>{lastCompletedOrder.customerAddress.split(',')[0]}</strong>. Customer tip and base sums have been deposited into your wallet balance.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-[11px] font-semibold text-slate-350 space-y-1.5 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Pay:</span>
                <span className="text-slate-300">${lastCompletedOrder.basePay.toFixed(2)}</span>
              </div>
              {lastCompletedOrder.tipPay > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Tip:</span>
                  <span className="text-emerald-500">${lastCompletedOrder.tipPay.toFixed(2)}</span>
                </div>
              )}
              {lastCompletedOrder.promoPay > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Promo Boost:</span>
                  <span className="text-orange-400">${lastCompletedOrder.promoPay.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-850 pt-2 font-bold text-xs text-slate-200">
                <span>Total Gained:</span>
                <span className="text-emerald-400">${lastCompletedOrder.totalPay.toFixed(2)}</span>
              </div>
            </div>

            <button
              id="close-celebration"
              onClick={() => {
                if (soundEnabled) playBeep('CLICK');
                setShowPayoutCelebration(false);
                setLastCompletedOrder(null);
              }}
              className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-slate-200 rounded-2xl text-xs font-bold border border-slate-800 transition-all cursor-pointer"
            >
              Continue Dashing
            </button>
          </div>
        </div>
      )}

      {store.gpsStatus !== 'active' && (
        <GPSRequiredOverlay onRetry={startTracking} />
      )}

      </div>
    </ErrorBoundary>
  );
}
