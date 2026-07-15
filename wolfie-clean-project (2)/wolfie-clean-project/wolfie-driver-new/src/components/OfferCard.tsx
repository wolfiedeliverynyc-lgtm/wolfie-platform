import React, { useEffect, useState } from 'react';
import { Clock, Navigation, DollarSign, ShoppingBag, X, Check, Eye } from 'lucide-react';
import { Order } from '../types';

interface OfferCardProps {
  order: Order;
  onAccept: (order: Order) => void;
  onDecline: (orderId: string) => void;
}

export default function OfferCard({ order, onAccept, onDecline }: OfferCardProps) {
  const [timeLeft, setTimeLeft] = useState<number>(45); // 45 seconds to accept

  // Tick down timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [order.id]);

  useEffect(() => {
    if (timeLeft === 0) {
      onDecline(order.id);
    }
  }, [timeLeft, order.id, onDecline]);

  const percentageRemaining = (timeLeft / 45) * 100;

  return (
    <div id={`offer-card-${order.id}`} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl relative space-y-6">
        
        {/* TOP COUNTER HEADER */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500/90 text-slate-100 p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest bg-black/25 px-2 py-0.5 rounded text-orange-200">
              New Delivery Offer
            </span>
            <h3 className="text-xl font-black mt-1.5 tracking-tight font-sans">Guaranteed Payout</h3>
          </div>

          {/* SVG Circular Countdown */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeDasharray="150"
                strokeDashoffset={150 - (150 * percentageRemaining) / 100}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute text-sm font-black text-slate-100 font-mono">
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* PAYOUT VALUE DISPLAY */}
        <div className="px-6 text-center">
          <span className="text-4xl font-black text-slate-100 font-mono tracking-tight">
            ${order.totalPay.toFixed(2)}
          </span>
          <div className="flex justify-center items-center gap-2 mt-1.5 text-xs font-semibold text-slate-400">
            <span>{order.distance} miles total</span>
            <span>•</span>
            <span>{order.estimatedTime} mins estimated</span>
          </div>
        </div>

        {/* MERCHANT & CUSTOMER ROUTE SUMMARY */}
        <div className="px-6 space-y-4">
          <div className="relative pl-6 space-y-4">
            {/* Visual routing dashed line connector */}
            <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-dashed border-l-2 border-slate-700"></div>

            {/* Merchant Pickup */}
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-[10px] border border-orange-500/20">
                P
              </span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pickup</p>
              <h4 className="font-bold text-xs text-slate-200 mt-0.5">{order.storeName}</h4>
              <p className="text-[10px] text-slate-400 truncate">{order.storeAddress}</p>
            </div>

            {/* Customer Dropoff */}
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-[10px] border border-emerald-500/20">
                D
              </span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dropoff</p>
              <h4 className="font-bold text-xs text-slate-200 mt-0.5">{order.customerName}</h4>
              <p className="text-[10px] text-slate-400 truncate">{order.customerAddress}</p>
            </div>
          </div>
        </div>

        {/* ITEMS PREVIEW list */}
        <div className="mx-6 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Food Basket</span>
            <p className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
              {order.items.length} bags of food items
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
            Item Checklist Ready
          </span>
        </div>

        {/* PROMO CHIPS */}
        <div className="px-6 flex flex-wrap gap-1.5 justify-center">
          <span className="bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-medium px-2.5 py-1 rounded-full">
            Base Pay: ${order.basePay.toFixed(2)}
          </span>
          {order.tipPay > 0 && (
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              Incl. Customer Tip
            </span>
          )}
          {order.promoPay > 0 && (
            <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-semibold px-2.5 py-1 rounded-full animate-pulse">
              Promo Peak Bonus: +${order.promoPay.toFixed(2)}
            </span>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="p-4 bg-slate-950 border-t border-slate-850 flex gap-3">
          <button
            id="offer-decline"
            onClick={() => onDecline(order.id)}
            className="flex-1 py-3 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-all"
          >
            <X className="w-4 h-4 text-slate-500" />
            Decline
          </button>
          
          <button
            id="offer-accept"
            onClick={() => onAccept(order)}
            className="flex-[2] py-3 text-xs font-bold bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-slate-100 rounded-xl shadow-lg shadow-orange-500/10 flex items-center justify-center gap-1.5 border border-orange-500/30 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 text-white" />
            Accept Delivery
          </button>
        </div>
        
      </div>
    </div>
  );
}
