'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Bike, 
  MapPin, 
  Send, 
  ShieldCheck, 
  Dot, 
  Clock, 
  Compass, 
  ArrowRight,
  Sparkles,
  ShoppingBag,
  MessageSquare
} from 'lucide-react';
import { useRealtimeStore } from '../../../stores/useRealtimeStore';
import InteractiveMap from '../../maps/components/InteractiveMap';

export default function TrackingView() {
  const router = useRouter();
  const { 
    activeOrder, 
    messages, 
    addMessage, 
    accelerateSimulation, 
    resetSimulation 
  } = useRealtimeStore();

  const [inputMsg, setInputMsg] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    addMessage(inputMsg, 'user');
    setInputMsg('');
  };

  if (!activeOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6 select-none font-sans" id="tracking-no-orders">
        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto border border-orange-100/60 shadow-sm relative">
          <span className="absolute inset-0 bg-orange-150/30 rounded-full animate-ping animate-duration-2000" />
          <ShoppingBag className="w-10 h-10 text-[#F15A24] stroke-[2]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Zero Active Deliveries</h2>
          <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
            Order coordinates are clear. Explore our premium neighborhood kitchens to dispatch a gourmet dish!
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="py-3.5 px-8 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>Find Kitchens</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto px-4 py-8 text-slate-800 font-sans" id="tracking-view-layout">
      {/* Left Column: Interactive map and Order stats */}
      <div className="lg:col-span-8 space-y-6">
        <div className="h-[480px] w-full">
          <InteractiveMap
            restaurant={activeOrder.restaurant}
            address={activeOrder.address}
            status={activeOrder.status}
          />
        </div>

        {/* Action Panel: Simulator controller */}
        <div className="bg-white border border-[#ECEFF2] p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs select-none">
          <div className="text-left">
            <span className="inline-flex items-center gap-1 bg-[#FFF2ED] text-[#F15A24] text-[8.5px] uppercase font-black px-2.5 py-1 rounded-md border border-orange-105">
              <Sparkles className="w-3 h-3 text-[#F15A24] animate-pulse" />
              <span>Developer Simulation Mode</span>
            </span>
            <h4 className="text-sm font-black text-slate-900 mt-2 font-sans">
              Simulate Rider Transit Speeds
            </h4>
            <p className="text-[10px] text-slate-400 font-bold font-sans mt-0.5 leading-relaxed">
              Step the rider courier through cooking phases, dispatch parameters and handoff.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={accelerateSimulation}
              className="flex-1 sm:flex-none py-3 px-5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
            >
              Advance Status ⚡
            </button>
            <button
              onClick={resetSimulation}
              className="flex-1 sm:flex-none py-3 px-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              Reset Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Live Chat & Order details */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Chat Drawer */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-6 shadow-xs flex flex-col h-[400px]" id="chat-container">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 select-none">
            <div className="flex items-center space-x-3 text-left">
              <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs">
                MC
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-none">Rider Marcus</h4>
                <span className="text-[9.5px] font-bold text-slate-400 block mt-1 uppercase tracking-wider">supercharged e-bike</span>
              </div>
            </div>
            <span className="bg-emerald-50 text-emerald-600 text-[8.5px] font-black tracking-widest px-2 py-0.5 rounded-md">
              LIVE COURIER
            </span>
          </div>

          {/* Message log */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 border-b border-slate-100 mb-3 scrollbar-none flex flex-col pt-1">
            {messages.map((m) => {
              const isRider = m.sender === 'rider';
              return (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${
                    isRider
                      ? 'bg-slate-100 text-slate-900 mr-auto rounded-tl-none font-semibold text-left'
                      : 'bg-[#111827] text-white ml-auto rounded-tr-none text-left'
                  }`}
                >
                  <p className="leading-relaxed leading-normal">{m.text}</p>
                  <span className="text-[8px] block mt-1 text-right font-bold" style={{ color: isRider ? '#94A3B8' : 'rgba(255,255,255,0.6)' }}>
                    {m.timestamp} {isRider ? '(Courier)' : '(Me)'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chat Form input */}
          <form onSubmit={handleSend} className="flex items-center space-x-2 select-none">
            <input
              type="text"
              placeholder="Message your courier..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              className="flex-1 bg-slate-50 text-slate-800 font-semibold text-xs px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-1 focus:ring-slate-300 transition-all placeholder-slate-400"
            />
            <button
              type="submit"
              className="w-11 h-11 bg-[#111827] hover:bg-slate-800 text-white rounded-2xl shadow-sm hover:scale-102 transition-transform cursor-pointer shrink-0 flex items-center justify-center"
              title="Send Message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>

        {/* Order Info block */}
        <div className="bg-[#111827] text-white rounded-[2rem] p-6 shadow-md text-left select-none relative overflow-hidden">
          <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-[#F15A24]/10 rounded-full blur-2xl" />
          <h4 className="text-[10px] uppercase font-black tracking-wider text-[#F15A24] border-b border-slate-800 pb-3 mb-4">
            Receipt Overview
          </h4>
          <div className="space-y-3.5 text-xs text-slate-300">
            <div className="flex justify-between font-bold">
              <span>Subtotal:</span>
              <span className="font-mono text-white">${activeOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Service Fee:</span>
              <span className="font-mono text-white">${activeOrder.serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Transit Fee:</span>
              <span className="font-mono text-white">${activeOrder.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Local Tax:</span>
              <span className="font-mono text-white">${activeOrder.tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-800 pt-3.5 flex justify-between">
              <span className="font-black text-white">Grand Total:</span>
              <span className="font-mono text-sm font-black text-[#F15A24]">${activeOrder.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
export type { Message } from '../../../lib/types';
export type { Order } from '../../../lib/types';
