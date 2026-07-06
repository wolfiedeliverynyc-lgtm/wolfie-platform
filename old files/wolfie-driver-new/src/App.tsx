import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, ShieldAlert, Navigation, Star, Award, LogOut, ArrowUpRight, CheckCircle2, Volume2, VolumeX, Flame, BellRing, Settings, Menu, Bell, ArrowLeft, Heart, Clock, User, Check, ChevronRight, MapPin, Sliders, Home, ClipboardList, RotateCcw, HelpCircle, Phone, MessageSquare, Shield, Smile, Send, Headphones } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Order, OrderStatus, DriverStats, EarningSummary, LatLng } from './types';
import {
  generateRandomOrder,
  INITIAL_STATS,
  INITIAL_WEEKLY_EARNINGS,
  INITIAL_ORDER_HISTORY,
  RESTAURANTS
} from './data';
import MapSimulator from './components/MapSimulator';
import EarningsDash from './components/EarningsDash';
import ProfileDash from './components/ProfileDash';
import WalletDash from './components/WalletDash';
import SupportDash from './components/SupportDash';
import PerformanceDash from './components/PerformanceDash';
import OfferCard from './components/OfferCard';
import ActiveDeliveryWidget from './components/ActiveDeliveryWidget';
import SimulationControls from './components/SimulationControls';
import WolfSvg from './components/WolfSvg';
import AvailableOrdersList from './components/AvailableOrdersList';

// Removed mock orders, using backend dispatch via websockets

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
  // Core Tabs
  const [activeTab, setActiveTab] = useState<'HOME' | 'EARNINGS' | 'ORDERS' | 'PROFILE' | 'WALLET' | 'SUPPORT'>('HOME');

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

  // Core Simulation States
  const [online, setOnline] = useState<boolean>(() => {
    const saved = localStorage.getItem('dasher_online');
    return saved ? saved === 'true' : false;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('dasher_logged_in');
    return saved ? saved === 'true' : false;
  });

  const [isPendingApproval, setIsPendingApproval] = useState<boolean>(() => {
    const saved = localStorage.getItem('dasher_pending_approval');
    // Defaulting to false for existing sessions, but new sessions will have to register.
    return saved ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('dasher_logged_in', String(isLoggedIn));
    localStorage.setItem('dasher_pending_approval', String(isPendingApproval));
  }, [isLoggedIn, isPendingApproval]);

  const [simulationSpeed, setSimulationSpeed] = useState<number>(5); // 1x, 2x, 5x, 10x etc.
  
  const [driverCoords, setDriverCoords] = useState<LatLng>(() => {
    // Start at a random restaurant or coordinate initially
    const saved = localStorage.getItem('dasher_coords');
    return saved ? JSON.parse(saved) : { x: 300, y: 300 };
  });

  const [driverStats, setDriverStats] = useState<DriverStats>(() => {
    const saved = localStorage.getItem('dasher_stats');
    return saved ? JSON.parse(saved) : INITIAL_STATS;
  });

  const [earningsSummary, setEarningsSummary] = useState<EarningSummary>(() => {
    const saved = localStorage.getItem('dasher_earnings_v2');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      todayEarnings: 0,
      todayDeliveries: 0,
      todayTimeMinutes: 0,
      weeklyHistory: INITIAL_WEEKLY_EARNINGS,
      orderHistory: INITIAL_ORDER_HISTORY,
    };
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Offers matching state
  const [pendingOffer, setPendingOffer] = useState<Order | null>(null);
  const [availableOffers, setAvailableOffers] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dasher_available_offers');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [navigationDistanceLeft, setNavigationDistanceLeft] = useState<number>(1.2);

  // Success completed popup representation
  const [showPayoutCelebration, setShowPayoutCelebration] = useState<boolean>(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);

  // Socket.IO reference for backend communication
  const socketRef = useRef<Socket | null>(null);

  // Save states to local storage
  useEffect(() => {
    localStorage.setItem('dasher_online', String(online));
    localStorage.setItem('dasher_coords', JSON.stringify(driverCoords));
    localStorage.setItem('dasher_stats', JSON.stringify(driverStats));
    localStorage.setItem('dasher_earnings_v2', JSON.stringify(earningsSummary));
    localStorage.setItem('dasher_available_offers', JSON.stringify(availableOffers));
  }, [online, driverCoords, driverStats, earningsSummary, availableOffers]);

  // Periodic ticker to prune expired available offers in background
  useEffect(() => {
    if (!online || availableOffers.length === 0) return;

    const interval = setInterval(() => {
      setAvailableOffers((prevOffers) => {
        const filtered = prevOffers.filter((o) => o.offerExpiresAt > Date.now());
        if (filtered.length !== prevOffers.length) {
          localStorage.setItem('dasher_available_offers', JSON.stringify(filtered));
        }
        return filtered;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [online, availableOffers.length]);

  // WebSocket Connection Logic
  useEffect(() => {
    if (!online) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      const socket = io('http://localhost:5000', {
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
      });

      socket.on('connect', () => {
        console.log('[Wolfie Driver] Connected to telemetry backend');
      });

      socket.on('disconnect', () => {
        console.log('[Wolfie Driver] Disconnected from telemetry backend');
      });

      socket.on('new_order', (data: any) => {
        if (data) {
          setAvailableOffers((prev) => {
            const expiresAt = Date.now() + 45 * 1000;
            const newOffer: Order = {
              ...data,
              offerExpiresAt: expiresAt,
              status: 'PENDING_OFFER'
            };
            
            // Avoid duplicates
            if (prev.some(o => o.id === newOffer.id)) return prev;
            
            if (soundEnabled) playBeep('OFFER');
            return [...prev, newOffer];
          });
        }
      });

      socket.on('order_status_update', (data: any) => {
        if (data && data.order_id && data.status && activeOrder && activeOrder.id === data.order_id) {
           setActiveOrder(prev => prev ? { ...prev, status: data.status } : prev);
        }
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [online, soundEnabled, activeOrder]);

  // Periodic Location Telemetry Ping
  useEffect(() => {
    if (!online || !socketRef.current) return;

    const interval = setInterval(() => {
      socketRef.current?.emit('driver_location_update', {
        driver_id: 'drv_alpha_001', // Hardcoded for alpha demo
        lat: driverCoords.y,
        lng: driverCoords.x,
        state: activeOrder ? activeOrder.status : 'available',
        order_id: activeOrder?.id || null,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [online, driverCoords, activeOrder]);

  // Toggle online switcher
  const handleToggleOnline = (status: boolean) => {
    if (soundEnabled) playBeep('CLICK');
    setOnline(status);
    if (!status) {
      setPendingOffer(null);
      setAvailableOffers([]);
    }
  };

  // Decline order handler
  const handleDeclineOffer = (orderId: string) => {
    if (soundEnabled) playBeep('CLICK');
    setAvailableOffers((prev) => prev.filter((o) => o.id !== orderId));

    // Declining tumbles Acceptance Rate slightly (DoorDash penalizes lower AR!)
    setDriverStats((prev) => {
      const newAR = Math.max(15, prev.acceptanceRate - 2);
      return { ...prev, acceptanceRate: newAR };
    });
  };

  // Accept order handler
  const handleAcceptOffer = (order: Order) => {
    if (soundEnabled) playBeep('CLICK');
    const updatedOrder: Order = {
      ...order,
      status: 'NAV_TO_STORE',
    };
    setActiveOrder(updatedOrder);
    setPendingOffer(null);
    setAvailableOffers([]); // Clear other offers when starting a trip
    setNavigationDistanceLeft(order.distance);
    setActiveTab('ORDERS'); // Go to orders tab so they see live map tracking instantly!

    // Boost Acceptance Rate slightly when accepting offers
    setDriverStats((prev) => {
      const newAR = Math.min(100, prev.acceptanceRate + 1);
      return { ...prev, acceptanceRate: newAR };
    });
  };

  // State advances in the active delivery stage
  const handleAdvanceOrderStatus = (nextStatus: OrderStatus) => {
    if (soundEnabled) playBeep('CLICK');
    if (!activeOrder) return;

    const nextOrder = { ...activeOrder, status: nextStatus };
    
    // If arriving at restaurant, we reset the checklists
    if (nextStatus === 'ARRIVED_AT_STORE') {
      nextOrder.items = activeOrder.items.map((i) => ({ ...i, checked: false }));
    }

    setActiveOrder(nextOrder);
  };

  // Checklist items ticker callback
  const handleCheckChecklistItem = (itemId: string, checked: boolean) => {
    if (soundEnabled) playBeep('CLICK');
    if (!activeOrder) return;

    setActiveOrder((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map((i) => (i.id === itemId ? { ...i, checked } : i)),
      };
    });
  };

  // Completed deliveries final action handler
  const handleCompleteActiveDelivery = (proofPhotoUrl: string) => {
    if (!activeOrder) return;

    if (soundEnabled) playBeep('SUCCESS');

    // Build finalized order record
    const finalOrder: Order = {
      ...activeOrder,
      status: 'DELIVERED',
      proofPhoto: proofPhotoUrl,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Send completion status to backend
    try {
      fetch(`http://localhost:5000/api/v1/orders/${activeOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer drv_alpha_001`
        },
        body: JSON.stringify({
          status: 'delivered',
          lat: driverCoords.y,
          lng: driverCoords.x,
          proof_photo_url: proofPhotoUrl
        })
      });
    } catch(err) {
      console.error('Failed to patch order status', err);
    }

    // Calculate payouts
    const cashEarned = finalOrder.totalPay;
    const itemsDone = finalOrder.items.length;

    // Inject payment values into Stats & Wallet
    setEarningsSummary((prev) => {
      return {
        ...prev,
        todayEarnings: prev.todayEarnings + cashEarned,
        todayDeliveries: prev.todayDeliveries + 1,
        todayTimeMinutes: prev.todayTimeMinutes + finalOrder.estimatedTime,
        orderHistory: [finalOrder, ...prev.orderHistory],
      };
    });

    // Increment metrics counts
    setDriverStats((prev) => {
      // Small simulated increase in rating (90% chance of 5-star, 10% 4-star)
      const randomRating = Math.random() > 0.15 ? 5.0 : 4.0;
      const avgRating = parseFloat(
        ((prev.rating * prev.lifetimeDeliveries + randomRating) / (prev.lifetimeDeliveries + 1)).toFixed(2)
      );

      return {
        ...prev,
        rating: avgRating,
        completionRate: Math.min(100, prev.completionRate + 0.5),
        lifetimeDeliveries: prev.lifetimeDeliveries + 1,
      };
    });

    setLastCompletedOrder(finalOrder);
    setShowPayoutCelebration(true);
    setActiveOrder(null);
  };

  // Dynamic coordinates updates from GPS
  const handleDriverCoordsUpdate = (coords: LatLng, currentSegmentDistanceLeft: number) => {
    setDriverCoords(coords);
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
    setEarningsSummary((prev) => ({
      ...prev,
      todayEarnings: prev.todayEarnings + amount,
    }));
  };

  // Hard Reset application data
  const handleHardReset = () => {
    if (soundEnabled) playBeep('CLICK');
    localStorage.removeItem('dasher_online');
    localStorage.removeItem('dasher_coords');
    localStorage.removeItem('dasher_stats');
    localStorage.removeItem('dasher_earnings_v2');
    localStorage.removeItem('dasher_logged_in');
    localStorage.removeItem('dasher_pending_approval');
    
    setOnline(false);
    setIsLoggedIn(false);
    setIsPendingApproval(false);
    setDriverCoords({ x: 300, y: 300 });
    setDriverStats(INITIAL_STATS);
    setEarningsSummary({
      todayEarnings: 0,
      todayDeliveries: 0,
      todayTimeMinutes: 0,
      weeklyHistory: INITIAL_WEEKLY_EARNINGS,
      orderHistory: INITIAL_ORDER_HISTORY,
    });
    setPendingOffer(null);
    setActiveOrder(null);
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
    <div className="relative w-full h-44 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#11132c] to-[#040614] border border-slate-850">
      {/* Skyline back silhouette */}
      <svg className="absolute bottom-0 w-full h-24 text-slate-900/45 pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d="M0,80 L20,80 L20,40 L40,40 L40,60 L60,60 L60,30 L80,30 L80,70 L100,70 L100,20 L120,20 L120,80 L140,80 L140,50 L160,50 L160,70 L180,70 L180,10 L200,10 L200,80 L220,80 L220,40 L240,40 L240,60 L260,60 L260,30 L280,30 L280,70 L300,70 L300,20 L320,20 L320,80 L340,80 L340,50 L360,50 L360,75 L380,75 L380,15 L400,15 L400,100 L0,100 Z" fill="currentColor" />
      </svg>

      {/* Glowing road line */}
      <div className="absolute bottom-4 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>
      <div className="absolute bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>

      {/* Moving city lights/stars */}
      <div className="absolute top-12 left-1/4 w-1.5 h-1.5 rounded-full bg-yellow-400/50 blur-[1px] animate-pulse"></div>
      <div className="absolute top-16 right-1/3 w-1 h-1 rounded-full bg-orange-400/40 blur-[1px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Styled delivery rider riding scooter */}
      <div className="relative animate-float flex flex-col items-center">
        <svg className="w-40 h-28 text-orange-500" viewBox="0 0 200 150" fill="none">
          <circle cx="100" cy="75" r="45" fill="#ff5500" fillOpacity="0.08" className="animate-pulse" />

          {/* Wheels */}
          <circle cx="55" cy="110" r="16" fill="#111" stroke="#ff5500" strokeWidth="3" />
          <circle cx="55" cy="110" r="6" fill="#666" />
          <circle cx="145" cy="110" r="16" fill="#111" stroke="#ff5500" strokeWidth="3" />
          <circle cx="145" cy="110" r="6" fill="#666" />

          {/* Chassis */}
          <path d="M40,100 Q55,80 75,98 L115,102 L145,100 Q155,90 160,110 Z" fill="#ff5500" />
          <path d="M110,100 L140,50 Q145,40 135,40 L120,40" stroke="#ff5500" strokeWidth="5" strokeLinecap="round" />

          {/* Wolfie Insulated Box */}
          <rect x="65" y="66" width="40" height="34" rx="4" fill="#0c0e1e" stroke="#ff5500" strokeWidth="2" />
          <rect x="70" y="72" width="30" height="22" rx="2" fill="#ff5500" />
          <path d="M78,83 L83,88 L92,79" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Handle bar column */}
          <line x1="130" y1="75" x2="135" y2="45" stroke="#475569" strokeWidth="4" />
          <circle cx="135" cy="45" r="4" fill="#ff5500" />

          {/* Rider body & orange jacket */}
          <path d="M96,66 L118,52 L128,76 L110,85 Z" fill="#ff5500" stroke="#000" strokeWidth="2" />
          <path d="M98,64 C100,50 115,50 115,64" stroke="#000" strokeWidth="2" />
          <path d="M112,56 Q128,58 133,48" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />

          {/* Rider Helmet */}
          <circle cx="110" cy="38" r="15" fill="#0f172a" stroke="#ff5500" strokeWidth="2" />
          <path d="M112,30 Q126,34 122,46 Z" fill="#38bdf8" />
          <path d="M100,48 Q110,48 116,52" stroke="#ff5500" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050611] text-slate-100 font-sans antialiased flex flex-col items-center justify-center py-0 md:py-6 bg-[radial-gradient(ellipse_85%_85%_at_50%_-20%,rgba(255,85,0,0.12),rgba(255,255,255,0))] select-none">
      
      {/* MAIN CONTAINER PLATFORM SHELL */}
      <div className="w-full h-screen flex flex-col lg:flex-row items-center justify-center">
        
        {/* FULL SCREEN RESPONSIVE MOBILE APP CONTAINER */}
        <div className="w-full h-full bg-[#050611] relative overflow-hidden flex flex-col justify-between">
          
          {/* VIEWPANEL CORE SCREEN */}
          <div className="flex-1 overflow-y-auto relative p-4 custom-scrollbar pb-24 h-full bg-[#050611] flex flex-col justify-start space-y-5">
            
            {/* 1. TABS CONTENT INTERFACES RENDER SECTORS */}
            {activeTab === 'HOME' && (
              <>
                {/* OFFLINE HOME VIEW */}
                {!online ? (
                  <div id="offline-welcome-screen" className="flex flex-col flex-1 justify-between py-2 space-y-6">
                    {!isLoggedIn ? (
                      <div className="flex flex-col flex-1 items-center justify-center space-y-8 text-center animate-fade-in px-4">
                        <div className="w-24 h-24 rounded-3xl bg-slate-950 border border-slate-850 flex items-center justify-center shadow-lg shadow-orange-500/5">
                          <WolfSvg className="w-20 h-20 transform scale-110" />
                        </div>
                        <div>
                          <h1 className="text-3xl font-black tracking-tight text-white uppercase mb-2">Drive for Wolfie</h1>
                          <p className="text-sm text-slate-400">Be your own boss. Earn on your schedule.</p>
                        </div>
                        <button
                          onClick={() => {
                            if (soundEnabled) playBeep('CLICK');
                            setIsLoggedIn(true);
                            setIsPendingApproval(true);
                          }}
                          className="w-full py-4.5 bg-[#ff5500] hover:bg-[#ff6611] text-white rounded-3xl text-sm font-black tracking-wider shadow-xl shadow-orange-500/20 flex items-center justify-center transition-all cursor-pointer"
                        >
                          REGISTER TO DRIVE
                        </button>
                        <button
                          onClick={() => {
                            if (soundEnabled) playBeep('CLICK');
                            setIsLoggedIn(true);
                            setIsPendingApproval(false); // mock instant login for returning users
                          }}
                          className="w-full py-4.5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl text-sm font-black tracking-wider flex items-center justify-center transition-all cursor-pointer"
                        >
                          LOGIN TO EXISTING ACCOUNT
                        </button>
                      </div>
                    ) : isPendingApproval ? (
                      <div className="flex flex-col flex-1 items-center justify-center space-y-6 text-center animate-fade-in px-4">
                        <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
                          <Clock className="w-10 h-10" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-black tracking-tight text-white mb-3">Account Under Review</h1>
                          <p className="text-sm text-slate-400 leading-relaxed mb-6">
                            Thank you for registering to drive with Wolfie! We are currently reviewing your background check and vehicle details.
                            <br /><br />
                            This usually takes 1-2 business days.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (soundEnabled) playBeep('CLICK');
                            setIsLoggedIn(false);
                          }}
                          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          LOG OUT
                        </button>
                        
                        {/* Hidden button for demo purposes to skip approval */}
                        <button onClick={() => setIsPendingApproval(false)} className="text-[10px] text-slate-700 underline mt-8">
                          (Dev: Skip Approval)
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Top Header layout mimic */}
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => { if (soundEnabled) playBeep('CLICK'); }} 
                        className="w-10 h-10 rounded-2xl bg-slate-900/60 border border-slate-850 flex items-center justify-center text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                      >
                        <Menu className="w-5 h-5" />
                      </button>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-705 bg-slate-700 animate-pulse"></div>
                      <button 
                        onClick={() => { if (soundEnabled) playBeep('CLICK'); }} 
                        className="w-10 h-10 rounded-2xl bg-slate-900/60 border border-slate-850 flex items-center justify-center text-slate-300 hover:text-slate-100 transition-colors cursor-pointer relative"
                      >
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange-500"></span>
                      </button>
                    </div>

                    {/* Central Brand Mascot Header */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-24 h-24 rounded-3xl bg-slate-950 border border-slate-850 flex items-center justify-center shadow-lg shadow-orange-500/5 overflow-hidden animate-float">
                        <WolfSvg className="w-20 h-20 transform scale-110" />
                      </div>
                      
                      <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight text-white font-sans uppercase">WOLFIE</h1>
                        <p className="text-[10px] font-black tracking-widest text-[#ff5500] uppercase">Alpha Driver Dashboard</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-base font-bold text-slate-200">Deliver fast. Earn more.</p>
                        <p className="text-xs text-slate-500 font-semibold font-sans">Let's go!</p>
                      </div>
                    </div>

                    {/* Scooter Rider city skyline silhouette */}
                    <ScooterIllustration />

                    {/* Giant Online slider button widget */}
                    <button
                      id="btn-go-online-central"
                      onClick={() => handleToggleOnline(true)}
                      className="w-full py-4.5 bg-[#ff5500] hover:bg-[#ff6611] text-white rounded-3xl text-sm font-black tracking-wider shadow-xl shadow-orange-500/20 border border-orange-400/25 flex items-center justify-center gap-3 transition-all cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white block animate-ping"></span>
                      <span>GO ONLINE NOW</span>
                    </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* ONLINE HOME DASHBOARD VIEW SPECIFIED BY USER */
                  <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                    
                    {/* Upper Status strip bar */}
                    <div className="flex justify-between items-center py-1">
                      <button
                        onClick={() => handleToggleOnline(false)}
                        className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
                        title="Back to Offline page"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 py-1 px-3.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-[ping_1.5s_infinite]"></span>
                        <span className="text-[10px] font-extrabold text-[#f8fafc] tracking-wide">● You're Online</span>
                      </div>

                      <button 
                        onClick={() => { if (soundEnabled) playBeep('CLICK'); }} 
                        className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-305 text-slate-300 hover:text-slate-105 transition-colors cursor-pointer relative"
                      >
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-orange-600 text-[8px] font-black text-white flex items-center justify-center">3</span>
                      </button>
                    </div>

                    {/* TODAY'S EARNINGS BLOCK CONTAINER WITH GLOWING GREEN LINE SPARKLINE */}
                    <div 
                      onClick={() => {
                        if (soundEnabled) playBeep('CLICK');
                        setActiveTab('WALLET');
                      }}
                      className="bg-[#0b0c1e] border border-slate-850 hover:border-orange-550 hover:border-orange-500/30 p-5 rounded-[28px] relative overflow-hidden flex justify-between items-center group h-32 cursor-pointer transition-all hover:bg-[#0d0e26]"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>

                      <div className="space-y-1 z-10">
                        <span className="text-xs font-bold text-slate-400 tracking-wide flex items-center gap-0.5">
                          Today's Earnings
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 group-hover:text-orange-500 transition-all" />
                        </span>
                        <h2 className="text-3xl font-black tracking-tight text-white font-mono">${earningsSummary.todayEarnings.toFixed(2)}</h2>
                        <span className="text-[10px] text-slate-500 font-bold tracking-wide mt-1 block">
                          {earningsSummary.todayDeliveries} Orders Completed
                        </span>
                      </div>

                      <div className="z-10 bg-slate-950/20 p-2 rounded-2xl border border-slate-900/40">
                        {/* Wavy emerald glow statistics path representing earnings upward metrics */}
                        <svg className="w-28 h-12 text-emerald-500 overflow-visible" viewBox="0 0 100 40">
                          <defs>
                            <linearGradient id="glow-emerald" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
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
                            stroke="#22c55e"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <circle cx="100" cy="5" r="3.5" fill="#22c55e" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                          <circle cx="100" cy="5" r="3" fill="#ffffff" />
                        </svg>
                      </div>
                    </div>

                    {/* THREE-COLUMN STAT MATRIX DEPICTION */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Online Time Card */}
                      <div className="bg-[#0b0c1e] border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 group hover:border-slate-800 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">Online Time</p>
                          <h4 className="font-extrabold text-[13px] text-slate-100 mt-1 font-mono">{mockOnlineTime}</h4>
                        </div>
                      </div>

                      {/* Active Time Card */}
                      <div className="bg-[#0b0c1e] border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 group hover:border-slate-800 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                          <Sliders className="w-4 h-4 rotate-90" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">Active Time</p>
                          <h4 className="font-extrabold text-[13px] text-slate-100 mt-1 font-mono">{mockActiveTime}</h4>
                        </div>
                      </div>

                      {/* Acceptance Card */}
                      <div className="bg-[#0b0c1e] border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 group hover:border-slate-800 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                          <Heart className="w-4 h-4 fill-rose-500/20 text-rose-500" />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">Acceptance</p>
                          <h4 className="font-extrabold text-[13px] text-slate-100 mt-1 font-mono">{driverStats.acceptanceRate}%</h4>
                        </div>
                      </div>
                    </div>

                    {/* TODAY'S PROGRESS BAR GRAPH SECTOR */}
                    <div className="bg-[#0b0c1e] border border-slate-850 p-5 rounded-[28px] space-y-3">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Today's Progress</h3>
                          <p className="text-sm font-extrabold text-slate-200 mt-1.5 leading-none">
                            ${earningsSummary.todayEarnings.toFixed(2)} <span className="text-xs text-slate-500 font-medium">/ $200</span>
                          </p>
                        </div>
                        <span className="text-[14px] font-black text-slate-300 font-mono">
                          {Math.min(100, Math.round((earningsSummary.todayEarnings / 200) * 100))}%
                        </span>
                      </div>

                      {/* Dynamic Rounded Background gradient filler bar */}
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-[1px] border border-slate-900">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(100, (earningsSummary.todayEarnings / 200) * 100)}%` }}
                        ></div>
                      </div>

                      <p className="text-[10px] text-slate-400 font-sans tracking-wide">
                        {earningsSummary.todayEarnings >= 200
                          ? "Daily revenue goal achieved! Driving maximum profit!"
                          : `Complete $${(200 - earningsSummary.todayEarnings).toFixed(2)} more to reach your goal!`}
                      </p>
                    </div>

                    {/* RATINGS / PERFORMANCE SHORTCUT LIST */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Performance</h3>
                        <button
                          onClick={() => {
                            if (soundEnabled) playBeep('CLICK');
                            setActiveTab('PROFILE');
                          }}
                          className="text-xs font-bold text-[#ff5500] hover:underline uppercase tracking-wider"
                        >
                          View all
                        </button>
                      </div>

                      <div className="bg-[#0b0c1e] border border-slate-850 rounded-[28px] divide-y divide-slate-850/60 overflow-hidden">
                        
                        {/* Customer Rating */}
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-xs">⭐</span>
                            <span className="text-xs font-bold text-slate-300">Rating</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-100 font-mono flex items-center gap-1">
                            {driverStats.rating.toFixed(2)} <span className="text-yellow-500">★</span>
                          </span>
                        </div>

                        {/* Completion Rate */}
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs">🛡️</span>
                            <span className="text-xs font-bold text-slate-300">Completion Rate</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-100 font-mono">
                            {driverStats.completionRate}%
                          </span>
                        </div>

                        {/* On-Time Speed */}
                        <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-xs">⚡</span>
                            <span className="text-xs font-bold text-slate-300">On-time Delivery</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-100 font-mono">
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
              <EarningsDash summary={earningsSummary} onBack={() => setActiveTab('HOME')} />
            )}

            {/* 3. MAP SIMULATION & DISPATCH ORDERS VIEW SECTOR */}
            {activeTab === 'ORDERS' && (
              <div id="orders-panel" className="animate-[fadeIn_0.3s_ease-out] flex flex-col flex-1 h-full min-h-[480px]">
                {!online ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-[#0b0c1e] border border-slate-850 rounded-[32px] h-full flex-1 space-y-5">
                    <span className="text-4xl animate-bounce">🛵</span>
                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">Device is Offline</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs">To explore orders and drive on roads, switch your status tool to "Go Online" first.</p>
                    <button
                      onClick={() => handleToggleOnline(true)}
                      className="w-full py-3 bg-[#ff5500] hover:bg-[#ff6611] rounded-2xl text-xs font-extrabold text-white transition-all cursor-pointer shadow-lg shadow-orange-500/10"
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
                      <MapSimulator
                        activeOrder={activeOrder}
                        driverCoords={driverCoords}
                        simulationSpeed={simulationSpeed}
                        onDriverCoordsUpdate={handleDriverCoordsUpdate}
                        onAutoArrive={handleGpsAutoArrive}
                      />
                    }
                  />
                ) : availableOffers.length > 0 ? (
                  /* HIGH FIDELITY AVAILABLE ORDERS LIST FROM SCREENSHOT */
                  <AvailableOrdersList
                    offers={availableOffers}
                    onAccept={handleAcceptOffer}
                    onDecline={handleDeclineOffer}
                    onBack={() => setActiveTab('HOME')}
                  />
                ) : (
                  /* SONAR RADAR DISPATCH HUNTER VIEW */
                  <div className="flex flex-col flex-1 space-y-4 h-full">
                    {/* Background static tracking layout */}
                    <div className="h-32 rounded-3xl overflow-hidden border border-slate-850 opacity-45 select-none relative pb-1">
                      <MapSimulator
                        activeOrder={null}
                        driverCoords={driverCoords}
                        simulationSpeed={simulationSpeed}
                        onDriverCoordsUpdate={handleDriverCoordsUpdate}
                        onAutoArrive={handleGpsAutoArrive}
                      />
                    </div>

                    {/* Sonar Radar Card in search of match */}
                    <div id="searching-orders-card" className="bg-[#0b0c1e] border border-slate-850 rounded-[32px] p-6 text-center h-full flex-1 flex flex-col justify-center items-center space-y-5">
                      <div className="relative flex items-center justify-center w-20 h-20">
                        <span className="absolute inset-0 rounded-full bg-[#ff5500]/5 border border-[#ff5500]/10 animate-[ping_2.5s_infinite]"></span>
                        <span className="absolute inset-3 rounded-full bg-[#ff5500]/15 border border-[#ff5500]/25 animate-[ping_1.8s_infinite]"></span>
                        <div className="w-10 h-10 rounded-full bg-[#ff5500] flex items-center justify-center font-bold animate-pulse text-lg text-white">
                          📡
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Searching Offers...</h3>
                        <p className="text-[11px] text-slate-550 text-slate-500 leading-relaxed max-w-xs">
                          Priority Matching is Active due to Alpha Driver Status. Food dispatches will arrive shortly.
                        </p>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-900 py-2 px-4 rounded-2xl text-[10px] text-slate-500 flex items-center gap-1.5 justify-center max-w-[190px] mx-auto font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] inline-block animate-ping"></span>
                        <span className="text-[#ff5500]">High Demand Area</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

                         {/* 4. DRIVER PROFILE & SIMULATOR FACTORY UTILITIES VIEW */}
            {activeTab === 'PROFILE' && (
              <ProfileDash
                stats={driverStats}
                simulationSpeed={simulationSpeed}
                setSimulationSpeed={setSimulationSpeed}
                onBack={() => setActiveTab('HOME')}
                onMatchOrder={() => {
                  if (!online) {
                    setOnline(true);
                  }
                  const generated = generateRandomOrder();
                  generated.offerExpiresAt = Date.now() + 45 * 1000;
                  setAvailableOffers((prev) => [...prev, generated]);
                  if (soundEnabled) playBeep('OFFER');
                  setActiveTab('ORDERS'); // Navigate to orders tab directly!
                }}
                onInjectCash={handleInjectSandboxCash}
                onReset={handleHardReset}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                todayEarnings={earningsSummary.todayEarnings}
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
                todayEarnings={earningsSummary.todayEarnings}
                onBack={() => setActiveTab('HOME')}
                playBeep={playBeep}
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
          <div className="absolute bottom-0 inset-x-0 h-16 bg-[#080a1c] border-t border-slate-850/80 px-4 flex items-center justify-between z-45 pb-3">
            
            {/* 1. Home tab */}
            <button
              id="mobile-tab-home"
              onClick={() => {
                if (soundEnabled) playBeep('CLICK');
                setActiveTab('HOME');
              }}
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'HOME' ? 'text-orange-500 border-t-2 border-orange-500 pt-1.5 scale-105' : 'text-slate-500 hover:text-slate-350'}`}
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
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'EARNINGS' ? 'text-orange-500 border-t-2 border-orange-500 pt-1.5 scale-105' : 'text-slate-500 hover:text-slate-350'}`}
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
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'ORDERS' ? 'text-orange-500 border-t-2 border-orange-500 pt-1.5 scale-105' : 'text-slate-500 hover:text-slate-350'}`}
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
              className={`flex-1 flex flex-col items-center justify-center pt-2 transition-all cursor-pointer ${activeTab === 'PROFILE' ? 'text-orange-500 border-t-2 border-orange-500 pt-1.5 scale-105' : 'text-slate-500 hover:text-slate-350'}`}
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
              className="absolute bottom-20 right-5 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-[#f05523] text-white shadow-[0_4px_22px_rgba(240,85,35,0.45)] cursor-pointer hover:bg-[#d04417] active:scale-95 transition-all group animate-[bounce_3.5s_infinite_ease-in-out]"
              style={{ touchAction: 'manipulation' }}
              title="Open Live Chat Support"
            >
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-[#f05523]/40 animate-ping pointer-events-none"></div>

              {/* Icon symbol */}
              <Headphones className="w-5.5 h-5.5 stroke-[2.2px] relative z-10 text-white group-hover:rotate-12 transition-transform" />

              {/* Status active pulsing dot indicator */}
              <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#f05523]"></span>
              </span>

              {/* Help tooltip display on hover */}
              <span className="absolute right-14 bg-slate-950/95 text-[10px] font-extrabold text-[#f05523] uppercase tracking-wider px-2.5 py-1 rounded-lg border border-slate-900 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Help Online
              </span>
            </button>
          )}

        </div>

        {/* RIGHT DESKTOP COLUMN: SYSTEM CONTROL TOWER CENTER (Hidden on Mobile screens) */}
        <div className="w-full max-w-[380px] lg:flex flex-col hidden bg-[#0b0c20]/90 backdrop-blur border border-slate-850 p-6 rounded-[32px] space-y-5 shadow-xl h-fit border-orange-500/10">
          
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
            <div className="w-8.5 h-8.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center shadow-lg shadow-orange-500/5 overflow-hidden">
              <WolfSvg className="w-7 h-7 transform scale-110" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 font-sans tracking-wide uppercase">Simulation Control Tower</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Admin Developer Actions</p>
            </div>
          </div>

          {/* Wallet and Stats summary */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-xs font-semibold text-slate-400 space-y-2.5 font-mono">
            <div className="flex justify-between">
              <span>Driver Wallet:</span>
              <span className="text-emerald-400 font-bold">${earningsSummary.todayEarnings.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed Trips:</span>
              <span className="text-slate-200">{earningsSummary.todayDeliveries} total</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Status:</span>
              <span className={`font-bold uppercase text-[9px] ${activeOrder ? 'text-[#ff5500]' : 'text-emerald-500 animate-pulse'}`}>
                {activeOrder ? 'Delivering...' : 'Idle - Searching'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-850 pt-2.5">
              <span>Current Speed:</span>
              <span className="text-orange-400 font-bold">{simulationSpeed}X speed</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            
            {/* Fast spawn trigger */}
            <button
              onClick={() => {
                if (!online) {
                  setOnline(true);
                }
                const generated = generateRandomOrder();
                generated.offerExpiresAt = Date.now() + 45 * 1000;
                setAvailableOffers((prev) => [...prev, generated]);
                if (soundEnabled) playBeep('OFFER');
                setActiveTab('ORDERS'); // Make sure they are looking at the available orders list instantly!
              }}
              className="w-full py-3 bg-[#ff5500]/10 hover:bg-[#ff5500] hover:text-white border border-[#ff5500]/25 rounded-2xl text-xs font-black tracking-wider text-center transition-all cursor-pointer flex items-center justify-center gap-2 text-[#ff5500]"
            >
              <span>DISPATCH MOCK MATCH</span>
            </button>

            {/* Turn Sound On/Off */}
            <button
              onClick={() => {
                playBeep('CLICK');
                setSoundEnabled(!soundEnabled);
              }}
              className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#ff5500]" /> : <VolumeX className="w-4 h-4 text-slate-600" />}
              <span>{soundEnabled ? 'Console Sound: On' : 'Console Sound: Muted'}</span>
            </button>

            {/* Fast Inject Cheat Cash */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleInjectSandboxCash(50.00)}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-slate-850 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer"
              >
                +$50 Cash
              </button>
              <button
                onClick={() => handleInjectSandboxCash(200.00)}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 text-emerald-400 border border-slate-850 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer"
              >
                +$200 Cash
              </button>
            </div>

            {/* Force Complete Active Order if any */}
            {activeOrder && (
              <button
                onClick={() => handleCompleteActiveDelivery('https://images.unsplash.com/photo-1566275529824-cca6d00a216b?w=400')}
                className="w-full py-3 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/25 rounded-2xl text-xs font-black tracking-wider text-center transition-all cursor-pointer"
              >
                CHEAT: FINISH TRIP
              </button>
            )}

            {/* Reset Factory */}
            <button
              onClick={handleHardReset}
              className="w-full py-2.5 bg-slate-950 hover:bg-rose-550/10 text-slate-500 hover:text-rose-400 border border-slate-850 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hard reset state</span>
            </button>

          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850 text-[10px] text-slate-500 leading-relaxed font-sans text-center">
            You are operating the <strong>Wolfie Instant Rider Portal</strong>. All simulated transit coordinates correspond to nearby store points correctly.
          </div>

        </div>

      </div>

      {/* MATCHING PENDING OFFER OVERLAY CARD MODAL - SLIDES UP OVER CURRENT VIEW */}
      {pendingOffer && (
        <OfferCard
          order={pendingOffer}
          onAccept={handleAcceptOffer}
          onDecline={handleDeclineOffer}
        />
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

    </div>
  );
}
