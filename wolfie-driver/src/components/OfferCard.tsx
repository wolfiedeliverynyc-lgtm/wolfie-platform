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
    <div id={`offer-card-${order.id}`} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-card border border-slate-800 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl relative space-y-6">
        
        {/* TOP COUNTER HEADER */}
        <div className="bg-gradient-to-r from-primary to-primary-hover text-black p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest bg-black/10 px-2 py-0.5 rounded text-black/85">
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
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="#000000"
                strokeWidth="4"
                strokeDasharray="150"
                strokeDashoffset={150 - (150 * percentageRemaining) / 100}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute text-sm font-black text-black font-mono">
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* PAYOUT VALUE DISPLAY */}
        <div className="px-6 text-center">
          <span className="text-4xl font-black text-text-primary font-mono tracking-tight">
            ${order.totalPay.toFixed(2)}
          </span>
          <div className="flex justify-center items-center gap-2 mt-1.5 text-xs font-semibold text-text-secondary">
            <span>{order.distance} miles total</span>
            <span>•</span>
            <span>{order.estimatedTime} mins estimated</span>
          </div>
        </div>

        {/* MERCHANT & CUSTOMER ROUTE SUMMARY */}
        <div className="px-6 space-y-4">
          <div className="relative pl-6 space-y-4">
            {/* Visual routing dashed line connector */}
            <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-dashed border-l-2 border-slate-800"></div>

            {/* Merchant Pickup */}
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/20">
                P
              </span>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Pickup</p>
              <h4 className="font-bold text-xs text-text-primary mt-0.5">{order.storeName}</h4>
              <p className="text-[10px] text-text-secondary truncate">{order.storeAddress}</p>
            </div>

            {/* Customer Dropoff */}
            <div className="relative">
              <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-[10px] border border-accent/20">
                D
              </span>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Dropoff</p>
              <h4 className="font-bold text-xs text-text-primary mt-0.5">{order.customerName}</h4>
              <p className="text-[10px] text-text-secondary truncate">{order.customerAddress}</p>
            </div>
          </div>
        </div>

        {/* ITEMS PREVIEW list */}
        <div className="mx-6 bg-bg-app p-3.5 rounded-2xl border border-slate-850 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[9px] uppercase font-extrabold text-text-secondary tracking-wider">Food Basket</span>
            <p className="text-xs font-bold text-text-primary flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-primary" />
              {order.items.length} bags of food items
            </p>
          </div>
          <span className="text-[10px] font-mono text-text-secondary bg-bg-card border border-slate-850 px-2 py-0.5 rounded-lg">
            Checklist Ready
          </span>
        </div>

        {/* PROMO CHIPS */}
        <div className="px-6 flex flex-wrap gap-1.5 justify-center">
          <span className="bg-bg-app border border-slate-850 text-text-secondary text-[10px] font-medium px-2.5 py-1 rounded-full">
            Base Pay: ${order.basePay.toFixed(2)}
          </span>
          {order.tipPay > 0 && (
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              Incl. Customer Tip
            </span>
          )}
          {order.promoPay > 0 && (
            <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold px-2.5 py-1 rounded-full animate-pulse">
              Promo Peak Bonus: +${order.promoPay.toFixed(2)}
            </span>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="p-4 bg-bg-app border-t border-slate-850 flex gap-3">
          <button
            id="offer-decline"
            onClick={() => onDecline(order.id)}
            className="flex-1 py-3 text-xs font-bold bg-bg-card hover:bg-bg-card-hover text-text-primary rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-text-secondary" />
            Decline
          </button>
          
          <button
            id="offer-accept"
            onClick={() => onAccept(order)}
            className="flex-[2] py-3 text-xs font-bold bg-primary hover:bg-primary-hover text-black rounded-xl shadow-lg flex items-center justify-center gap-1.5 border-none transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 text-black" />
            Accept Delivery
          </button>
        </div>
        
      </div>
    </div>
  );
}
