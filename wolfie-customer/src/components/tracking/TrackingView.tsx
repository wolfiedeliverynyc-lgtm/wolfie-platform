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

export default function TrackingView({
  deliveryAddress,
  orderedItems,
  onBackToHome,
  onOpenChat,
  orderId,
  restaurantLogo = '/assets/logo_wendys.png',
  restaurantName = "Wendy's Burgers",
  initialStatus,
  driverName = "Kenji Sato",
  driverRating = 4.9,
  driverAvatar = "/assets/driver_avatar.png",
}: TrackingViewProps) {
  const { socket } = useSocket();

  const [trackingStatus, setTrackingStatus] = useState<'received' | 'preparing' | 'ontheway' | 'arrived'>('received');
  const [showTrackingDetails, setShowTrackingDetails] = useState(false);
  const [driverProgress, setDriverProgress] = useState(0);

  const restaurantCoords = [8.4410, 36.8990];
  const clientCoords = [8.4433, 36.8956];
  const routeCoordinates = [
    [8.4410, 36.8990],
    [8.4415, 36.8980],
    [8.4420, 36.8970],
    [8.4428, 36.8962],
    [8.4433, 36.8956]
  ];

  const [driverCoords, setDriverCoords] = useState<number[]>([8.4410, 36.8990]);

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

  // Connect to Socket and listen for real-time tracking seeding if online
  useEffect(() => {
    if (socket && orderId) {
      socket.emit('join_order', { order_id: orderId });

      socket.on('driver_location', (data: any) => {
        if (data.lat && data.lng) {
          setDriverCoords([data.lng, data.lat]);
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

  // Interpolation simulation loop (runs ONLY if it's the fallback mock order)
  useEffect(() => {
    if (orderId && orderId !== 'WOLF_983210') {
      return;
    }

    let startTime = Date.now();
    const duration = 24000; // 24 seconds loop
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % duration) / duration; // 0 to 1
      
      let status: 'received' | 'preparing' | 'ontheway' | 'arrived' = 'received';
      let currentDriverCoords = [...restaurantCoords];
      
      if (progress < 0.15) {
        status = 'received';
      } else if (progress < 0.4) {
        status = 'preparing';
      } else if (progress < 0.9) {
        status = 'ontheway';
        const driveProgress = (progress - 0.4) / 0.5; // scale from 0 to 1
        currentDriverCoords = getInterpolatedCoordinates(routeCoordinates, driveProgress);
      } else {
        status = 'arrived';
        currentDriverCoords = [...clientCoords];
        setTrackingStatus('arrived');
        setDriverProgress(100);
        setDriverCoords(currentDriverCoords);
        clearInterval(interval);
        return;
      }
      
      setTrackingStatus(status);
      setDriverProgress(progress * 100);
      setDriverCoords(currentDriverCoords);
    }, 100);
    
    return () => clearInterval(interval);
  }, [orderId]);

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
                  {trackingStatus === 'arrived' ? 'Delivered' : 'Calculating...'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-[#A6A6A6] uppercase tracking-wider block">Late Target</span>
                <span className="text-[14px] font-roboto font-bold text-[#EF2A39] mt-1.5 block">ETA</span>
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

          {/* Traffic info */}
          <div className="flex gap-4 border-t border-gray-50 pt-4 text-[12.5px] font-roboto font-bold text-[#6A6A6A]">
            <span>Traffic density: <span className="text-[#3C2F2F]">— 🚗</span></span>
            <span>•</span>
            <span>Weather: <span className="text-blue-500">— ☀️</span></span>
          </div>
        </div>
      </div>

      {/* Right Side: Mapbox Live Radar */}
      <div className="flex-1 bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm min-h-[50vh] relative">
        <TrackingMap 
          driverCoords={driverCoords}
          restaurantCoords={restaurantCoords}
          clientCoords={clientCoords}
          routeCoordinates={routeCoordinates}
        />
      </div>
    </div>
  );
}
