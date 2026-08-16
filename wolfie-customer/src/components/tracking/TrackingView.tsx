'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSocket } from '@/providers/SocketProvider';

// Dynamically import TrackingMap with SSR disabled to prevent server-side hydration mismatches
const TrackingMap = dynamic(() => import('./TrackingMap'), { ssr: false });

interface TrackingViewProps {
  deliveryAddress: string;
  orderedItems: any[];
  onBackToHome: () => void;
  onOpenChat: () => void;
  orderId?: string;
  restaurantLogo?: string;
  restaurantName?: string;
  initialStatus?: string;
  driverName?: string;
  driverRating?: number;
  driverAvatar?: string;
}

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';

const geocodeAddress = async (address: string): Promise<number[] | null> => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
    );
    const data = await response.json();
    if (data && data.features && data.features.length > 0) {
      return data.features[0].center; // [longitude, latitude]
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
  }
  return null;
};

const getMapboxRoute = async (origin: number[], destination: number[]): Promise<number[][] | null> => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
    );
    const data = await response.json();
    if (data && data.routes && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates; // Array of [lng, lat]
    }
  } catch (error) {
    console.error("Directions failed:", error);
  }
  return null;
};

export default function TrackingView({
  deliveryAddress,
  orderedItems,
  onBackToHome,
  onOpenChat,
  orderId,
  restaurantLogo = '/assets/restaurant_logo_wendys.png',
  restaurantName = "Wendy's Burgers",
  initialStatus,
  driverName = "Assigned Driver",
  driverRating = 4.9,
  driverAvatar = "/assets/driver_avatar.png",
}: TrackingViewProps) {
  const { socket } = useSocket();

  const [trackingStatus, setTrackingStatus] = useState<'received' | 'preparing' | 'ontheway' | 'arrived'>('received');
  const [showTrackingDetails, setShowTrackingDetails] = useState(false);
  const [driverProgress, setDriverProgress] = useState(0);

  const [restaurantCoords, setRestaurantCoords] = useState<number[] | null>(null);
  const [clientCoords, setClientCoords] = useState<number[] | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][] | null>(null);
  const [driverCoords, setDriverCoords] = useState<number[] | null>(null);

  // Live real-time intelligence state
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(null);
  const [weatherData, setWeatherData] = useState<{ label: string; icon: string; code?: string; temp_c?: number } | null>(null);
  const [trafficData, setTrafficData] = useState<{ label: string; icon: string; density?: string } | null>(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);

  const getInterpolatedCoordinates = (points: number[][], progress: number): number[] => {
    if (points.length === 0) return [0, 0];
    if (points.length === 1 || progress <= 0) return points[0];
    if (progress >= 1) return points[points.length - 1];
    
    const numSegments = points.length - 1;
    const segmentProgress = progress * numSegments;
    const segmentIndex = Math.floor(segmentProgress);
    const segmentRemainder = segmentProgress - segmentIndex;
    
    const start = points[segmentIndex];
    const end = points[segmentIndex + 1];
    
    return [
      start[0] + (end[0] - start[0]) * segmentRemainder,
      start[1] + (end[1] - start[1]) * segmentRemainder
    ];
  };

  // Map initialStatus to corresponding UI progress and status
  useEffect(() => {
    if (initialStatus) {
      let mappedStatus: 'received' | 'preparing' | 'ontheway' | 'arrived' = 'received';
      let progress = 0;
      
      if (['assigned', 'accepted', 'preparing'].includes(initialStatus)) {
        mappedStatus = 'preparing';
        progress = 25;
      } else if (['ready', 'picked_up', 'on_the_way'].includes(initialStatus)) {
        mappedStatus = 'ontheway';
        progress = 65;
      } else if (['delivered', 'Completed', 'arrived'].includes(initialStatus)) {
        mappedStatus = 'arrived';
        progress = 100;
      }
      
      setTrackingStatus(mappedStatus);
      setDriverProgress(progress);
    }
  }, [initialStatus]);

  // Fetch initial order addresses, coordinates, and real-time weather/traffic telemetry
  useEffect(() => {
    const fetchTrackingInfo = async () => {
      if (!orderId) return;
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? 'https://wolfie-backend-pt9u.onrender.com/api/v1' : 'http://localhost:5000/api/v1')).replace(/\/+$/, '');
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('wolfie_auth_token='))
          ?.split('=')[1];
          
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${apiBase}/tracking/${orderId}`, { headers });
        if (response.ok) {
          const data = await response.json();
          const pickupAddr = data.pickup_address;
          const deliveryAddr = data.delivery_address;

          if (data.proof_photo_url) {
            setProofPhotoUrl(data.proof_photo_url);
          }
          if (data.eta_minutes) {
            setLiveEtaMinutes(Number(data.eta_minutes));
          }
          if (data.weather) {
            setWeatherData(data.weather);
          }
          if (data.traffic) {
            setTrafficData(data.traffic);
          }

          if (pickupAddr) {
            const coords = await geocodeAddress(pickupAddr);
            if (coords) {
              setRestaurantCoords(coords);
              setDriverCoords(coords);
            }
          }
          if (deliveryAddr) {
            const coords = await geocodeAddress(deliveryAddr);
            if (coords) {
              setClientCoords(coords);
            }
          }
          if (data.driver_location && data.driver_location.lat && data.driver_location.lng) {
            setDriverCoords([data.driver_location.lng, data.driver_location.lat]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tracking details:", err);
      }
    };
    fetchTrackingInfo();
  }, [orderId]);

  // Fetch dynamic route line when coordinates are resolved
  useEffect(() => {
    const fetchRoute = async () => {
      if (restaurantCoords && clientCoords) {
        const route = await getMapboxRoute(restaurantCoords, clientCoords);
        if (route) {
          setRouteCoordinates(route);
        }
      }
    };
    fetchRoute();
  }, [restaurantCoords, clientCoords]);

  // Connect to Socket and listen for real-time tracking updates
  useEffect(() => {
    if (socket && orderId) {
      socket.emit('join_order', { order_id: orderId });

      socket.on('driver_location', (data: any) => {
        if (data.lat && data.lng) {
          setDriverCoords([data.lng, data.lat]);
        }
        if (data.restaurant_lat && data.restaurant_lng) {
          setRestaurantCoords([data.restaurant_lng, data.restaurant_lat]);
        }
        if (data.client_lat && data.client_lng) {
          setClientCoords([data.client_lng, data.client_lat]);
        }
        if (data.route) {
          setRouteCoordinates(data.route);
        }
      });

      socket.on('order_status_update', (data: any) => {
        if (data.status) {
          let mappedStatus: 'received' | 'preparing' | 'ontheway' | 'arrived' = 'received';
          let progress = 0;
          if (['assigned', 'accepted', 'preparing'].includes(data.status)) {
            mappedStatus = 'preparing';
            progress = 25;
          } else if (['ready', 'picked_up', 'on_the_way'].includes(data.status)) {
            mappedStatus = 'ontheway';
            progress = 65;
          } else if (data.status === 'delivered') {
            mappedStatus = 'arrived';
            progress = 100;
            if (data.proof_photo_url) {
              setProofPhotoUrl(data.proof_photo_url);
            }
          }
          setTrackingStatus(mappedStatus);
          setDriverProgress(progress);
        }
      });

      return () => {
        socket.emit('leave_order', { order_id: orderId });
        socket.off('driver_location');
        socket.off('order_status_update');
      };
    }
  }, [socket, orderId]);

  // All updates come from Socket.IO - mock interpolation loop removed

  // Show "No Active Orders" view if there is no order
  if (!orderId || !orderedItems || orderedItems.length === 0) {
    return (
      <div className="max-w-[600px] mx-auto text-center py-20 px-6 animate-fadeIn">
        <span className="text-[64px] block mb-4">🛵</span>
        <h3 className="font-poppins font-bold text-[24px] text-[#3C2F2F]">No Active Orders</h3>
        <p className="font-roboto text-[15px] text-[#A6A6A6] mt-2 mb-8 leading-relaxed">
          You don't have any active orders currently in progress. Go back to the homepage to discover premium meals!
        </p>
        <button
          onClick={onBackToHome}
          className="px-8 py-3.5 bg-[#EF2A39] hover:bg-[#D61B29] text-white font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer shadow-md active:scale-98"
        >
          Return to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left pb-16 flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-140px)]">
      {/* Left Side: Progress Dashboard & Details */}
      <div className="lg:w-1/2 shrink-0 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header info */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBackToHome}
                className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-xs active:scale-95 transition-all focus:outline-none cursor-pointer hover:bg-gray-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3C2F2F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <div className="text-left">
                <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F]">Precision Radar Tracking</h3>
                <span className="font-roboto text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block mt-0.5">Order ID: #{orderId}</span>
              </div>
            </div>

            {/* Time estimates */}
            <div className="flex gap-4 border-t border-gray-50 pt-4 items-center justify-between">
              <div className="text-left">
                <span className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Estimated Delivery</span>
                <span className="text-[24px] font-poppins font-black text-[#3C2F2F] mt-1 block">
                  {trackingStatus === 'arrived' 
                    ? 'Delivered' 
                    : liveEtaMinutes !== null 
                      ? `${Math.max(1, Math.round(liveEtaMinutes))} mins` 
                      : trackingStatus === 'ontheway' 
                        ? '7 mins' 
                        : '15 mins'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Target Window</span>
                <span className="text-[14px] font-roboto font-bold text-[#EF2A39] mt-1.5 block">
                  {trackingStatus === 'arrived' ? 'Completed' : 'Live Precision Radar'}
                </span>
              </div>
            </div>

            {/* Delivery Address (Locked) */}
            <div className="border-t border-gray-50 pt-4 flex items-start gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[#EF2A39] shrink-0 mt-0.5 animate-fadeIn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Deliver To</span>
                <span className="text-[13.5px] font-roboto font-bold text-[#3C2F2F] mt-1 block truncate">
                  {deliveryAddress}
                </span>
                <span className="text-[10.5px] font-roboto text-gray-400 block mt-0.5">
                  🔒 Address locked after checkout
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Status Bar */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-5">
            <span className="font-roboto font-semibold text-[14px] text-[#A6A6A6] uppercase tracking-wider block border-b border-gray-50 pb-2.5">Route Stepper Status</span>
            
            <div className="flex justify-between items-center relative">
              {/* Connector line behind status steps */}
              <div className="absolute left-[8%] right-[8%] top-[18px] h-1 bg-gray-100 -z-10" />
              <div 
                className="absolute left-[8%] top-[18px] h-1 bg-[#EF2A39] -z-10 transition-all duration-300"
                style={{ 
                  width: trackingStatus === 'received' ? '0%' :
                         trackingStatus === 'preparing' ? '33%' :
                         trackingStatus === 'ontheway' ? '66%' : '84%' 
                }}
              />

              {[
                { id: 'received', label: 'Placed', icon: '📝' },
                { id: 'preparing', label: 'Cooking', icon: '🍳' },
                { id: 'ontheway', label: 'On Way', icon: '🛵' },
                { id: 'arrived', label: 'Arrived', icon: '🏠' }
              ].map((step) => {
                const isActive = trackingStatus === step.id;
                const isCompleted = 
                  (trackingStatus === 'preparing' && step.id === 'received') ||
                  (trackingStatus === 'ontheway' && ['received', 'preparing'].includes(step.id)) ||
                  (trackingStatus === 'arrived');
                
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[16px] transition-all border-2 bg-white ${
                      isActive ? 'border-[#FFE100] scale-110 shadow-sm' :
                      isCompleted ? 'border-[#EF2A39] bg-[#EF2A39]/5 text-white' : 'border-gray-200'
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-[11px] font-roboto font-bold mt-2 ${
                      isActive ? 'text-[#EF2A39]' : 'text-[#6A6A6A]'
                    }`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expandable Order Details Drawer */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm">
            <button 
              onClick={() => setShowTrackingDetails(!showTrackingDetails)}
              className="w-full flex items-center justify-between font-poppins font-bold text-[15.5px] text-[#3C2F2F] focus:outline-none cursor-pointer"
            >
              <span>Items Ordered Details</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                className={`transform transition-transform ${showTrackingDetails ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showTrackingDetails && (
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-3 animate-fadeIn">
                {orderedItems.length === 0 ? (
                  <div className="text-[13px] text-[#A6A6A6] text-center font-roboto">No items in active tracking order.</div>
                ) : (
                  orderedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center font-roboto text-[13.5px]">
                      <div className="text-left">
                        <span className="font-bold text-[#3C2F2F]">{item.quantity}x {item.foodItem.name}</span>
                        <span className="text-[#A6A6A6] text-[11px] block mt-0.5">Size: {item.size} • Spicy: {item.spicy}%</span>
                      </div>
                      <span className="font-bold text-[#EF2A39]">${(item.pricePerUnit * item.quantity).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Proof of Delivery Card (Shown when order is delivered) */}
          {(trackingStatus === 'arrived' || proofPhotoUrl) && (
            <div className="bg-white border border-gray-100 rounded-[28px] p-5 shadow-sm space-y-3 animate-fadeIn text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 font-poppins font-bold text-[14px]">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">✓</div>
                  <span>Proof of Delivery</span>
                </div>
                <span className="text-[10px] font-roboto font-bold text-[#A6A6A6] bg-gray-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Photo Verified</span>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-black/5 h-[160px]">
                <img 
                  src={proofPhotoUrl || '/assets/delivery_proof.png'} 
                  alt="Delivery Proof" 
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/delivery_proof.png'; }}
                  className="w-full h-full object-cover" 
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/65 backdrop-blur-xs p-2 text-white text-[11px] font-roboto font-medium flex items-center gap-2">
                  <span>📷</span>
                  <span>Photo taken by driver upon drop-off</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Driver Card Info */}
        <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              <img src={driverAvatar} alt={driverName} className="w-full h-full object-cover" />
            </div>
            
            <div className="text-left flex-1 min-w-0">
              <h4 className="font-poppins font-bold text-[15.5px] text-[#3C2F2F] truncate">{driverName}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-roboto text-[12px] font-bold text-yellow-500">★ {driverRating} Rating</span>
                <span className="text-gray-300">•</span>
                <span className="font-roboto text-[12px] text-[#A6A6A6]">Wolfie Courier</span>
              </div>
            </div>

            {/* Chat Actions */}
            <div className="flex gap-2">
              <button 
                onClick={onOpenChat}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 border border-gray-150 rounded-full flex items-center justify-center text-[#3C2F2F] shadow-xs active:scale-90 transition-all cursor-pointer focus:outline-none"
                title={`Chat with ${driverName}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              
              <button 
                onClick={() => alert(`Calling driver ${driverName} at +1 (555) 019-3829...`)}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 border border-gray-150 rounded-full flex items-center justify-center text-[#3C2F2F] shadow-xs active:scale-90 transition-all cursor-pointer focus:outline-none"
                title={`Call ${driverName}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Traffic & Weather live info telemetry */}
          <div className="flex gap-4 border-t border-gray-50 pt-4 text-[12.5px] font-roboto font-bold text-[#6A6A6A]">
            <span>Traffic: <span className="text-[#3C2F2F]">{trafficData?.label || 'Moderate'} {trafficData?.icon || '🚗'}</span></span>
            <span>•</span>
            <span>Weather: <span className="text-blue-500">{weatherData?.label || 'Clear'} {weatherData?.icon || '☀️'}</span></span>
          </div>
        </div>
      </div>

      {/* Right Side: Mapbox Live Radar */}
      <div className="flex-1 bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm min-h-[50vh] relative">
        {!restaurantCoords || !clientCoords || !routeCoordinates || !driverCoords ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#EF2A39] rounded-full animate-spin" />
            <span className="mt-3 font-roboto text-[14.5px] text-gray-500 font-medium">Resolving Precision Radar Coordinates...</span>
          </div>
        ) : (
          <TrackingMap 
            driverCoords={driverCoords}
            restaurantCoords={restaurantCoords}
            clientCoords={clientCoords}
            routeCoordinates={routeCoordinates}
          />
        )}
      </div>
    </div>
  );
}
