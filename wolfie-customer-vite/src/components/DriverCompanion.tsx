/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, Message, OrderStatus } from '../types';
import { 
  Bike, 
  MapPin, 
  Send, 
  CheckCircle, 
  Navigation, 
  Coffee, 
  Maximize2, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Grid, 
  CheckCheck,
  User,
  ShoppingBag,
  Sparkles
} from 'lucide-react';

interface DriverCompanionProps {
  activeOrder: Order | null;
  messages: Message[];
  onSendMessage: (text: string, sender: 'user' | 'rider') => void;
  onUpdateOrderStatus: (status: OrderStatus) => void;
  onAutoPlaceDemoOrder: () => void;
  userEmail: string;
}

export default function DriverCompanion({
  activeOrder,
  messages,
  onSendMessage,
  onUpdateOrderStatus,
  onAutoPlaceDemoOrder,
  userEmail,
}: DriverCompanionProps) {
  const [driverInput, setDriverInput] = useState('');
  
  // Custom templates to send instantly
  const templates = [
    "Hi there! Marcus here, your rider. I am prepped and heading over to the kitchen now! 🚲",
    "Food is hot and sealed in my thermal pack. Cruising onto Broadway now! ⚡",
    "I'm pulling up outside your building! Be ready to grab the container. 📦",
    "Left the secure package at your doorstep as requested. Have a wonderful meal! 🍒"
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverInput.trim()) return;
    onSendMessage(driverInput, 'rider');
    setDriverInput('');
  };

  const getStatusActionTextAndTarget = (status: OrderStatus): { label: string; next: OrderStatus; style: string } | null => {
    switch (status) {
      case 'placed':
        return { 
          label: 'Accept Job & Start Cooking 🍳', 
          next: 'preparing', 
          style: 'bg-amber-500 hover:bg-amber-600 shadow-[0_4px_15px_rgba(245,158,11,0.2)]' 
        };
      case 'preparing':
        return { 
          label: 'Mark Cooking In-Progress 🔥', 
          next: 'cooking', 
          style: 'bg-orange-500 hover:bg-orange-600 shadow-[0_4px_15px_rgba(249,115,22,0.2)]' 
        };
      case 'cooking':
        return { 
          label: 'Pick Up & Dispatch E-Bike 🚲', 
          next: 'riding', 
          style: 'bg-[#F15A24] hover:bg-[#E04D1B] shadow-[0_4px_15px_rgba(241,90,36,0.2)]' 
        };
      case 'riding':
        return { 
          label: 'Report Near Dropoff 🗺️', 
          next: 'arriving', 
          style: 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_15px_rgba(79,70,229,0.2)]' 
        };
      case 'arriving':
        return { 
          label: 'Confirm Handoff & Complete 🎉', 
          next: 'delivered', 
          style: 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_15px_rgba(16,185,129,0.2)]' 
        };
      default:
        return null;
    }
  };

  const statusAction = activeOrder ? getStatusActionTextAndTarget(activeOrder.status) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto px-4 py-8 text-slate-800 font-sans" id="driver-app-layout">
      {/* LEFT COLUMN: Rider Profile & Delivery Stats */}
      <div className="lg:col-span-4 space-y-6">
        {/* Rider Badge Card */}
        <div className="bg-[#111827] text-white rounded-[2rem] p-6 relative overflow-hidden shadow-xl border border-slate-800 select-none">
          <div className="absolute top-[-40px] right-[-40px] w-32 h-32 bg-[#F15A24]/10 rounded-full blur-3xl" />
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#F15A24] bg-slate-800 flex items-center justify-center text-xl font-black">
                MC
              </div>
              <div className="absolute bottom-0 right-0 bg-emerald-500 w-4 h-4 rounded-full border-2 border-[#111827] flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-[#F15A24] text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-md uppercase">
                  PARTNER PRO
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight mt-1 font-sans">Marcus Cruz</h3>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider">Active Courier License: #WD-9041</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-center">
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60">
              <span className="block text-slate-400 text-[8.5px] uppercase font-bold tracking-wider">Jobs Today</span>
              <span className="block text-lg font-black text-white mt-1">12</span>
            </div>
            
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60">
              <span className="block text-[#F15A24] text-[8.5px] uppercase font-bold tracking-wider">Rating</span>
              <span className="block text-lg font-black text-white mt-1">4.98 ★</span>
            </div>
            
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60 font-mono">
              <span className="block text-emerald-400 text-[8.5px] uppercase font-bold font-sans tracking-wider">Today</span>
              <span className="block text-sm font-black text-emerald-300 mt-1.5">$187.40</span>
            </div>
          </div>

          <div className="mt-5 space-y-3 pt-4 border-t border-slate-800/40 text-xs">
            <div className="flex items-center justify-between text-slate-40 level select-none">
              <span className="text-slate-400 font-bold">Ride Mode:</span>
              <span className="font-sans font-black text-slate-200 flex items-center">
                <Bike className="w-3.5 h-3.5 text-emerald-400 mr-1.5 stroke-[2.5]" />
                Supercharged E-Bike CC
              </span>
            </div>
            
            <div className="flex items-center justify-between text-slate-40 select-none">
              <span className="text-slate-400 font-bold">Battery Pack:</span>
              <span className="font-mono font-black text-emerald-400">88% Charge</span>
            </div>
          </div>
        </div>

        {/* System Guidance */}
        <div className="bg-white rounded-3xl p-6 border border-[#ECEFF2] shadow-xs select-none">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-[#F15A24] shrink-0 stroke-[2.5] mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Bilateral Sync Mode</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-bold mt-2 font-sans">
                You are logged in as Rider Marcus. Use this workspace to send instant status updates and chat replies back to Client {userEmail.split('@')[0]}. 
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Room & Actions Interface */}
      <div className="lg:col-span-8 space-y-6">
        {activeOrder ? (
          <div className="space-y-6">
            
            {/* Active Job coordinates and status controls */}
            <div className="bg-white rounded-[2rem] p-6 border border-[#ECEFF2] shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 select-none">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-[#F15A24]">Active Delivery Assignment</span>
                  <h3 className="text-md font-black text-slate-900 tracking-tight mt-1 font-sans">
                    Order from {activeOrder.restaurant.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-xl uppercase">
                    ID: #{activeOrder.id.substring(0, 6).toUpperCase()}
                  </span>
                  <span className="bg-orange-50 text-[#F15A24] text-[10px] font-black tracking-widest px-3 py-1.5 rounded-xl uppercase border border-orange-100">
                    {activeOrder.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Courier navigation points details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 select-none text-xs">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/70">
                  <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider mb-1">Pick Up Point 🍳</span>
                  <p className="font-extrabold text-slate-800">{activeOrder.restaurant.name}</p>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5 truncate">{activeOrder.restaurant.address}</p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/70">
                  <span className="block text-[9px] uppercase font-black text-slate-400 tracking-wider mb-1">Destination coordinates 🔑</span>
                  <p className="font-extrabold text-[#F15A24]">{activeOrder.address.label}</p>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5 truncate">
                    {activeOrder.address.street}, {activeOrder.address.city}
                  </p>
                </div>
              </div>

              {/* Next status action dispatcher */}
              {statusAction ? (
                <div className="pt-2">
                  <span className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2 select-none">
                    Dispatch Control Center
                  </span>
                  <button
                    onClick={() => onUpdateOrderStatus(statusAction.next)}
                    className={`w-full py-4 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all duration-300 active:scale-98 cursor-pointer ${statusAction.style}`}
                    id="driver-btn-action-status"
                  >
                    {statusAction.label}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-100 font-sans font-black text-xs text-center flex items-center justify-center space-x-2 select-none">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Job Success! Delivery was completed and handed over securely</span>
                </div>
              )}
            </div>

            {/* LIVE CONVERSATION CONTEXT - CHAT WITH CLIENT */}
            <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col h-[400px]" id="driver-chat-container">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-3 select-none">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-full flex items-center justify-center text-[#F15A24] font-black text-xs">
                    C
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-none">Customer Chat</h4>
                    <span className="text-[9.5px] font-bold text-slate-400 block mt-1 uppercase tracking-wider">{userEmail}</span>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-600 text-[8.5px] font-black tracking-widest px-2.5 py-1 rounded-lg uppercase">
                  ACTIVE CONNECT
                </span>
              </div>

              {/* Chat Quick Response Templates bar for the Rider */}
              <div className="mb-3 select-none">
                <span className="block text-[9px] uppercase font-black tracking-wider text-slate-400 mb-1.5">Quick Dispatch Pings</span>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {templates.map((tmpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(tmpl, 'rider')}
                      className="py-1.5 px-3 bg-slate-50 hover:bg-orange-50 hover:text-[#F15A24] border border-slate-100 hover:border-orange-200 text-slate-600 text-[10px] font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all"
                    >
                      Ping Mode #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Message listing screen */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 border-b border-slate-100 mb-3 scrollbar-none flex flex-col pt-1">
                {messages.map((m) => {
                  const isRider = m.sender === 'rider';
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${
                        isRider
                          ? 'bg-[#111827] text-white ml-auto rounded-tr-none'
                          : 'bg-slate-100 text-slate-900 mr-auto rounded-tl-none font-semibold'
                      }`}
                    >
                      <p className="leading-relaxed leading-normal">{m.text}</p>
                      <span className="text-[8px] block mt-1 text-right font-bold" style={{ color: isRider ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>
                        {m.timestamp} {isRider ? '(Me)' : '(Customer)'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Message Typing Form */}
              <form onSubmit={handleSend} className="flex items-center space-x-2 select-none">
                <input
                  type="text"
                  placeholder="Type a custom reply to the customer..."
                  value={driverInput}
                  onChange={(e) => setDriverInput(e.target.value)}
                  className="flex-1 bg-slate-50 text-slate-800 font-semibold text-xs px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-1 focus:ring-slate-300 transition-all placeholder-slate-400"
                  id="driver-message-input"
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

          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-10 border border-[#ECEFF2] text-center space-y-6 shadow-sm select-none" id="driver-no-orders">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto relative">
              <span className="absolute inset-0 bg-amber-100/30 rounded-full animate-ping" />
              <Bike className="w-10 h-10 text-amber-500 stroke-[2]" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-black text-slate-900 font-sans tracking-tight">On Guard. Waiting for Orders...</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                We are actively scanning coordinates. Checkout first as a Customer, or tap below to instantly generate a simulated gourmet meal job.
              </p>
            </div>

            <div className="pt-4 max-w-sm mx-auto">
              <button
                onClick={onAutoPlaceDemoOrder}
                className="w-full py-4 bg-[#FFD54F] hover:bg-[#FBC02D] text-slate-900 text-xs font-black tracking-widest uppercase rounded-2xl shadow-md transition-transform active:scale-98 flex items-center justify-center space-x-2 cursor-pointer font-sans"
              >
                <Sparkles className="w-4 h-4 text-slate-900" />
                <span>Simulate Food Request</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
