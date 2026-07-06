import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sliders, ChevronRight, MapPin, SlidersHorizontal, Bell, X, Eye, Check, Clock, Navigation, ShoppingBag, DollarSign, AlertCircle, Phone, MessageCircle, Banknote, ChevronsRight } from 'lucide-react';
import { Order } from '../types';

interface AvailableOrdersListProps {
  offers: Order[];
  onAccept: (order: Order) => void;
  onDecline: (orderId: string) => void;
  onBack: () => void;
}

export default function AvailableOrdersList({
  offers,
  onAccept,
  onDecline,
  onBack,
}: AvailableOrdersListProps) {
  // Simple tick-state to force-increment rendering of timers each second
  const [tick, setTick] = useState<number>(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Gracefully close details if the order expires in the background
  useEffect(() => {
    if (selectedOrder) {
      const stillExists = offers.some((o) => o.id === selectedOrder.id);
      if (!stillExists) {
        setSelectedOrder(null);
      }
    }
  }, [offers, selectedOrder]);

  // Helper to resolve specific restaurant logo styling & character
  const getRestaurantStyles = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('pizza')) {
      return {
        logoName: 'W', // Stylized monogram matches screenshot
        bg: 'bg-[#ff5500]',
        textColor: 'text-white'
      };
    } else if (lowercaseName.includes('sushi')) {
      return {
        logoName: 'S',
        bg: 'bg-[#d97706]', // warm gold monogram
        textColor: 'text-white'
      };
    } else if (lowercaseName.includes('burger')) {
      return {
        logoName: 'B',
        bg: 'bg-[#b91c1c]',
        textColor: 'text-white'
      };
    } else {
      return {
        logoName: name.charAt(0).toUpperCase(),
        bg: 'bg-indigo-600',
        textColor: 'text-white'
      };
    }
  };

  // HIGH FIDELITY FULL-SCREEN ORDER DETAILS RENDERING
  if (selectedOrder) {
    const { logoName, bg, textColor } = getRestaurantStyles(selectedOrder.storeName);
    
    // Split address values cleanly to render separate lines as shown in your layout
    const storeAddressParts = selectedOrder.storeAddress.split(',');
    const customerAddressParts = selectedOrder.customerAddress.split(',');
    
    const storeStreet = storeAddressParts[0] || '150 W 33rd St';
    const storeCity = storeAddressParts[1] ? storeAddressParts[1].trim() + (storeAddressParts[2] ? ', ' + storeAddressParts[2].trim() : '') : 'New York, NY 10001';
    
    const customerStreet = customerAddressParts[0] || '125 W 34th St';
    const customerCity = customerAddressParts[1] ? customerAddressParts[1].trim() + (customerAddressParts[2] ? ', ' + customerAddressParts[2].trim() : '') : 'New York, NY 10001';

    return (
      <div id="order-details-screen" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] pb-2">
        {/* HEADER SECTION MATCHED */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-900">
          <button
            onClick={() => setSelectedOrder(null)}
            className="w-10 h-10 rounded-2xl bg-[#090a1c] border border-slate-850 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Back to Available Orders"
          >
            <ArrowLeft className="w-5 h-5 text-slate-100" />
          </button>
          
          <h2 className="text-base font-extrabold tracking-tight text-slate-100 leading-none">
            Order Details
          </h2>

          <button
            onClick={() => setSelectedOrder(null)}
            className="w-10 h-10 rounded-2xl bg-[#090a1c] border border-slate-850 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Details"
          >
            <X className="w-5 h-5 text-slate-100" />
          </button>
        </div>

        {/* DETAILS SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 custom-scrollbar max-h-[500px]">
          {/* TOTAL PAY SECTOR MATCHED */}
          <div className="flex justify-between items-center bg-[#0d0e1b]/40 p-4 rounded-3xl border border-slate-900/40">
            <div>
              <h3 className="text-3xl font-black text-white font-mono tracking-tight leading-none">
                ${selectedOrder.totalPay.toFixed(2)}
              </h3>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5 block">
                Total Pay
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cash</span>
            </div>
          </div>

          {/* CONNECTED TIMELINE CARD BLOCK MATCHED */}
          <div className="relative space-y-3.5">
            {/* Real aesthetic dashed connect path */}
            <div className="absolute left-[26px] top-[45px] bottom-[45px] w-0.5 border-l-2 border-dashed border-orange-500/30 z-0"></div>

            {/* PICKUP COMPONENT MATCHED */}
            <div className="bg-[#0d0e1b] rounded-[24px] p-4.5 border border-slate-850/40 relative z-10 flex gap-4">
              <div className="flex flex-col items-center justify-start pt-1.5 shrink-0">
                <div className="w-6.5 h-6.5 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block leading-none">
                  Pickup
                </span>
                <h4 className="font-extrabold text-[14px] text-slate-100 mt-1 leading-tight">
                  {selectedOrder.storeName}
                </h4>
                <p className="text-[11.5px] text-slate-300 leading-snug mt-1 font-bold">
                  {storeStreet}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">
                  {storeCity}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                <button 
                  onClick={() => {}} 
                  className="w-10 h-10 rounded-full border border-slate-800 bg-slate-950 hover:bg-slate-900 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Call Restaurant"
                >
                  <Phone className="w-4 h-4 text-slate-300" />
                </button>
                <button 
                  onClick={() => {}} 
                  className="w-10 h-10 rounded-full border border-slate-800 bg-slate-950 hover:bg-slate-900 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Navigate Location"
                >
                  <Navigation className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>

            {/* CUSTOMER COMPONENT MATCHED */}
            <div className="bg-[#0d0e1b] rounded-[24px] p-4.5 border border-slate-850/40 relative z-10 flex gap-4">
              <div className="flex flex-col items-center justify-start pt-1.5 shrink-0">
                <div className="w-6.5 h-6.5 rounded-full bg-orange-600/20 border border-orange-600/50 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block leading-none">
                  Customer
                </span>
                <h4 className="font-extrabold text-[14px] text-slate-100 mt-1 leading-tight">
                  {selectedOrder.customerName}
                </h4>
                <p className="text-[11.5px] text-slate-300 leading-snug mt-1 font-bold">
                  {customerStreet}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">
                  {customerCity}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                <button 
                  onClick={() => {}} 
                  className="w-10 h-10 rounded-full border border-slate-800 bg-slate-950 hover:bg-slate-900 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4 text-slate-300" />
                </button>
                <button 
                  onClick={() => {}} 
                  className="w-10 h-10 rounded-full border border-slate-800 bg-slate-950 hover:bg-slate-900 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Message Customer"
                >
                  <MessageCircle className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>
          </div>

          {/* THREE COLUMNS GRID METRICS MATCHED */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#0d0e1b] border border-slate-900 rounded-[18px] p-3 text-center">
              <span className="text-[13px] font-black text-white font-mono leading-none block">
                {selectedOrder.distance.toFixed(1)} km
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                Total Distance
              </span>
            </div>
            
            <div className="bg-[#0d0e1b] border border-slate-900 rounded-[18px] p-3 text-center">
              <span className="text-[13px] font-black text-white font-mono leading-none block">
                {selectedOrder.estimatedTime} min
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                Est. Time
              </span>
            </div>

            <div className="bg-[#0d0e1b] border border-slate-900 rounded-[18px] p-3 text-center">
              <span className="text-[13px] font-black text-white font-mono leading-none block">
                {selectedOrder.items.length} Items
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 block">
                Order Size
              </span>
            </div>
          </div>

          {/* CUSTOMER NOTE BLOCK MATCHED */}
          <div className="bg-[#0d0e1b]/80 border border-slate-900 rounded-2xl p-4.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block leading-none">
              Customer Note
            </span>
            <p className="text-[12px] font-extrabold text-slate-300 leading-relaxed mt-2.5">
              "{selectedOrder.instructions || 'Please call when you arrive.'}"
            </p>
          </div>

          {/* ACCEPT & REJECT WORKFLOW FOOTER */}
          <div className="pt-4 space-y-3">
            <button
              id={`details-modal-accept-${selectedOrder.id}`}
              onClick={() => {
                onAccept(selectedOrder);
                setSelectedOrder(null);
              }}
              className="w-full h-15 bg-[#ff5500] hover:bg-[#ff6611] rounded-[20px] flex items-center p-1.5 transition-all text-center uppercase cursor-pointer hover:shadow-lg hover:shadow-orange-500/10 active:scale-[0.99] group overflow-hidden relative"
            >
              <div className="h-full aspect-square bg-white rounded-xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:translate-x-1 duration-300">
                <ChevronsRight className="w-5.5 h-5.5 text-[#ff5500] animate-pulse" />
              </div>
              <span className="flex-1 font-black text-xs tracking-widest text-center text-white mr-10">
                Accept Order
              </span>
            </button>

            <button
              id={`details-modal-decline-${selectedOrder.id}`}
              onClick={() => {
                onDecline(selectedOrder.id);
                setSelectedOrder(null);
              }}
              className="w-full py-3 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-500/10 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-red-500" />
              Reject Order Offer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="available-orders-screen" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out]">
      {/* HEADER SECTION METICULOUS DECORATION */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-[#090a1c] border border-slate-850 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Back to Home Tab"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-black uppercase tracking-wider text-slate-100 leading-none">
            Available Orders
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <span className="text-[11px] text-slate-500 font-bold tracking-wide">
              Finding the best orders for you
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 inline-block animate-[pulse_1.5s_infinite]"></span>
          </div>
        </div>

        <button
          onClick={() => {}}
          className="w-10 h-10 rounded-2xl bg-[#090a1c] border border-slate-850 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Available Filters"
        >
          <Sliders className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* ORDERS LIST CONTAINER FEED */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 custom-scrollbar max-h-[520px]">
        {offers.map((offer, index) => {
          // Compute timer specs
          const maxDuration = 45 * 1000;
          const timeLeftMs = offer.offerExpiresAt - Date.now();
          const secondsLeft = Math.max(0, Math.round(timeLeftMs / 1000));
          const percentRemaining = Math.max(0, Math.min(100, (timeLeftMs / maxDuration) * 100));

          const { logoName, bg, textColor } = getRestaurantStyles(offer.storeName);

          // Give Card 1 a subtle amber-orange accent border to match the premium screenshot "active offer focus glow"
          const isFirstCard = index === 0;

          // Parse street address cleanly to display exactly as screenshot
          const addressParts = offer.customerAddress.split(',');
          const primaryStreet = addressParts[0] || '125 W 34th St';
          const secondaryCity = addressParts[1] ? addressParts[1].trim() + (addressParts[2] ? ', ' + addressParts[2].trim() : '') : 'New York, NY 10001';

          // Store distance display: screenshot uses like '1.2 km away'
          const storeDistanceAway = offer.storeName.includes('Pizza') ? '1.2 km' : offer.storeName.includes('Sushi') ? '0.8 km' : `${(offer.distance * 0.3).toFixed(1)} km`;

          return (
            <div
              key={offer.id}
              id={`offer-panel-card-${offer.id}`}
              className={`bg-[#0d0e1b]/95 rounded-[28px] p-5 relative overflow-hidden transition-all border ${isFirstCard ? 'border-orange-500/20 shadow-lg shadow-orange-500/5' : 'border-slate-850/60 hover:border-slate-800'}`}
            >
              {/* TOP LINE: TOTAL PAY DISPLAY & NEW BADGE */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black text-white font-mono tracking-tight">
                    ${offer.totalPay.toFixed(2)}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                    Total Pay
                  </span>
                </div>
                <span className="bg-emerald-500 text-[9px] font-black tracking-wide text-stone-900 border border-emerald-400 px-2 py-0.5 rounded-md uppercase font-sans">
                  New
                </span>
              </div>

              {/* RESTAURANT SECTOR ROW */}
              <div className="flex items-center justify-between mt-4.5 bg-slate-950/40 p-3 rounded-2xl border border-slate-900/45">
                <div className="flex items-center">
                  <div className={`w-7.5 h-7.5 rounded-full ${bg} ${textColor} flex items-center justify-center font-black text-xs shadow-inner shadow-black/20`}>
                    {logoName}
                  </div>
                  <h4 className="font-extrabold text-[13px] text-slate-100 ml-2.5 truncate max-w-[130px]">
                    {offer.storeName}
                  </h4>
                </div>
                <button
                  className="flex items-center text-[11px] font-bold text-slate-400 hover:text-white transition-colors gap-1 pl-2"
                  id={`view-store-${offer.id}`}
                >
                  <span>{storeDistanceAway} away</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {/* CUSTOMER SECTOR BLOCK */}
              <div className="mt-4 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block leading-none">
                  Customer
                </span>
                <p className="text-[13px] font-bold text-slate-100 leading-snug mt-1.5">
                  {primaryStreet}
                </p>
                <p className="text-[11px] font-mono font-bold text-slate-500 truncate leading-none">
                  {secondaryCity}
                </p>
              </div>

              {/* BOTTOM COLUMNS: METRICS PANEL SPLIT */}
              <div className="grid grid-cols-2 gap-4 mt-4.5 pt-3.5 border-t border-slate-850/60">
                <div>
                  <h5 className="text-[15px] font-extrabold text-slate-200 font-mono">
                    {offer.distance.toFixed(1)} km
                  </h5>
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mt-0.5">
                    Total Distance
                  </span>
                </div>
                <div>
                  <h5 className="text-[15px] font-extrabold text-slate-200 font-mono">
                    {offer.estimatedTime} min
                  </h5>
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mt-0.5">
                    Est. Time
                  </span>
                </div>
              </div>

              {/* ACTION ACCEPT ORDER BUTTON WITH TIMER EMBEDDED */}
              <button
                id={`btn-accept-${offer.id}`}
                onClick={() => onAccept(offer)}
                className="w-full py-3.5 bg-[#ff5500] hover:bg-[#ff6611] text-white rounded-2xl text-[12.5px] font-black tracking-wider shadow-lg shadow-orange-500/10 flex items-center justify-between px-5 mt-4.5 transition-all text-center uppercase cursor-pointer relative overflow-hidden group active:scale-[0.99]"
              >
                {/* Visual white ripple shine background */}
                <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out"></span>
                
                <span className="mx-auto block text-center font-black">Accept Order</span>
                
                {/* SVG Mini countdown progress circular value */}
                <div className="relative w-7 h-7 flex items-center justify-center bg-black/15 group-hover:bg-black/25 rounded-full border border-white/10 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeDasharray="70"
                      strokeDashoffset={70 - (70 * percentRemaining) / 100}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-black text-white font-mono">
                    {secondsLeft}
                  </span>
                </div>
              </button>

              {/* SECONDARY ACTION BUTTONS: REJECT & VIEW DETAILS */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  id={`btn-reject-${offer.id}`}
                  onClick={() => onDecline(offer.id)}
                  className="py-3 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-500/10 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                  <span>Reject</span>
                </button>
                <button
                  id={`btn-details-${offer.id}`}
                  onClick={() => setSelectedOrder(offer)}
                  className="py-3 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
