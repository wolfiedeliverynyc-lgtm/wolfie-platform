'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/providers/SocketProvider';
import { getAuthUserId } from '@/utils/api';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'recipient';
  text: string;
  timestamp: string;
}

interface ChatViewProps {
  driverName?: string;
  chatRecipient: 'driver' | 'support';
  setChatRecipient: (val: 'driver' | 'support') => void;
  onBack: () => void;
  profilePicture?: string;
  activeOrderId?: string;
}

export default function ChatView({
  driverName = 'Driver',
  chatRecipient,
  setChatRecipient,
  onBack,
  profilePicture = '/assets/avatar.png',
  activeOrderId = 'WOLF_983210',
}: ChatViewProps) {
  const { socket } = useSocket();
  const [chatInputText, setChatInputText] = useState('');

  const [supportMessages, setSupportMessages] = useState<ChatMessage[]>([
    { id: 'msg_1', sender: 'user', text: "Hello, I ordered two fried chicken burgers. can I know how much time it will get to arrive?", timestamp: "12:30 PM" },
    { id: 'msg_2', sender: 'recipient', text: "Ok, please let me check!", timestamp: "12:31 PM" },
    { id: 'msg_3', sender: 'user', text: "Sure...", timestamp: "12:31 PM" },
    { id: 'msg_4', sender: 'recipient', text: "It’ll get 25 minutes to arrive to your address", timestamp: "12:32 PM" },
    { id: 'msg_5', sender: 'user', text: "Ok, thanks you for your support", timestamp: "12:33 PM" }
  ]);

  const [driverMessages, setDriverMessages] = useState<ChatMessage[]>([
    { id: 'dmsg_1', sender: 'recipient', text: "Hi! I am heading over now with your hot Wolfie order. Be there soon!", timestamp: "12:05 PM" },
    { id: 'dmsg_2', sender: 'user', text: "Sounds great, thank you! Please leave it at the front door.", timestamp: "12:06 PM" }
  ]);

  // Connect to order room if driver recipient is active
  useEffect(() => {
    if (chatRecipient === 'driver' && socket && activeOrderId) {
      socket.emit('join_order', { order_id: activeOrderId });
      
      const handleIncomingMessage = (data: any) => {
        if (data.message && data.sender !== 'customer') {
          const newMsg: ChatMessage = {
            id: `msg_${Date.now()}`,
            sender: 'recipient',
            text: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setDriverMessages(prev => [...prev, newMsg]);
        }
      };

      socket.on('chat_message', handleIncomingMessage);

      return () => {
        socket.emit('leave_order', { order_id: activeOrderId });
        socket.off('chat_message', handleIncomingMessage);
      };
    }
  }, [chatRecipient, socket, activeOrderId]);

  const handleSendMessage = () => {
    if (!chatInputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: chatInputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (chatRecipient === 'support') {
      setSupportMessages(prev => [...prev, newMsg]);
      setChatInputText('');

      // Simulate support response
      setTimeout(() => {
        const replyMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          sender: 'recipient',
          text: "You are welcome! Let us know if you need anything else.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSupportMessages(prev => [...prev, replyMsg]);
      }, 1500);
    } else {
      setDriverMessages(prev => [...prev, newMsg]);
      
      // Emit over socket
      if (socket && activeOrderId) {
        socket.emit('order_chat', {
          order_id: activeOrderId,
          message: chatInputText.trim(),
          sender_type: 'customer',
          sender_id: getAuthUserId() || 'guest_id'
        });
      }
      setChatInputText('');

      // Simulate driver response fallback if offline
      setTimeout(() => {
        const replyMsg: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          sender: 'recipient',
          text: "Copy that, I'm waiting at the red light right now. Will be there shortly!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setDriverMessages(prev => [...prev, replyMsg]);
      }, 2500);
    }
  };

  const messages = chatRecipient === 'support' ? supportMessages : driverMessages;
  const recipientName = chatRecipient === 'support' ? 'Customer Support' : driverName;
  const recipientAvatar = chatRecipient === 'support' ? '/assets/wolf_logo.png' : '/assets/driver_avatar.png';
  const recipientStatus = chatRecipient === 'support' ? 'Online • 24/7 Support Desk' : 'Active • Courier On Road';

  return (
    <div className="max-w-[1400px] mx-auto select-none animate-fadeIn text-left bg-white border border-gray-100 rounded-[28px] shadow-sm overflow-hidden h-[calc(100vh-140px)] flex">
      {/* Left Side: Channel Selector Sidebar */}
      <div className="w-[300px] border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-poppins font-bold text-[18px] text-[#3C2F2F]">Conversations</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {/* Support channel */}
          <button
            onClick={() => setChatRecipient('support')}
            className={`w-full p-3.5 rounded-[18px] border flex items-center gap-3 transition-all cursor-pointer focus:outline-none text-left ${
              chatRecipient === 'support' 
                ? 'bg-[#EF2A39]/5 border-[#EF2A39]/20 text-[#EF2A39]' 
                : 'bg-white border-transparent text-[#3C2F2F] hover:bg-gray-50'
            }`}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <img src="/assets/wolf_logo.png" alt="Support" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-poppins font-bold text-[13.5px] block truncate">Customer Support</span>
              <span className={`font-roboto text-[11px] block mt-0.5 truncate ${chatRecipient === 'support' ? 'text-[#EF2A39]/85' : 'text-[#A6A6A6]'}`}>
                Online • 24/7 help desk
              </span>
            </div>
          </button>

          {/* Driver channel */}
          <button
            onClick={() => setChatRecipient('driver')}
            className={`w-full p-3.5 rounded-[18px] border flex items-center gap-3 transition-all cursor-pointer focus:outline-none text-left ${
              chatRecipient === 'driver' 
                ? 'bg-[#EF2A39]/5 border-[#EF2A39]/20 text-[#EF2A39]' 
                : 'bg-white border-transparent text-[#3C2F2F] hover:bg-gray-50'
            }`}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              <img src="/assets/driver_avatar.png" alt="Driver Kenji" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-poppins font-bold text-[13.5px] block truncate">{driverName} (Courier)</span>
              <span className={`font-roboto text-[11px] block mt-0.5 truncate ${chatRecipient === 'driver' ? 'text-[#EF2A39]/85' : 'text-[#A6A6A6]'}`}>
                On active delivery route
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Right Side: Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50/20">
        {/* Chat Window Header */}
        <div className="h-[74px] bg-white border-b border-gray-100 px-6 flex items-center justify-between select-none">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 shrink-0">
              <img src={recipientAvatar} alt={recipientName} className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <h4 className="font-poppins font-bold text-[14.5px] text-[#3C2F2F]">{recipientName}</h4>
              <span className="font-roboto text-[11px] text-[#A6A6A6]">{recipientStatus}</span>
            </div>
          </div>

          <button 
            onClick={onBack}
            className="px-4 py-1.5 bg-gray-50 border border-gray-150 rounded-full text-[12.5px] font-roboto font-bold text-[#6A6A6A] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
          >
            Go Back
          </button>
        </div>

        {/* Messages Scroll Box */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
          <span className="bg-gray-100 border border-gray-150/50 text-[#A6A6A6] text-[10.5px] font-roboto font-bold px-3 py-1 rounded-full uppercase tracking-wider mx-auto mb-2 select-none">
            Manhattan, NY • Active Session
          </span>

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={msg.id}
                className={`flex items-end gap-3.5 max-w-[70%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                <div className="w-[34px] h-[34px] rounded-full overflow-hidden border border-gray-100 shrink-0">
                  <img src={isUser ? profilePicture : recipientAvatar} alt={msg.sender} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <div className={`rounded-[20px] p-4 text-[14px] font-roboto leading-relaxed text-left ${
                    isUser 
                      ? 'bg-[#EF2A39] text-white rounded-br-xs' 
                      : 'bg-white text-[#3C2F2F] border border-gray-100 rounded-bl-xs shadow-xs'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[10px] font-roboto text-[#A6A6A6] block ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input Box */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
          <input 
            type="text" 
            placeholder="Type your message here..."
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            className="flex-1 bg-[#F9FAFB] border border-gray-150 rounded-[18px] px-5 py-3.5 text-[14.5px] font-medium text-[#3C2F2F] outline-none focus:border-[#EF2A39]/30"
          />
          <button 
            onClick={handleSendMessage}
            className="w-[48px] h-[48px] bg-[#EF2A39] hover:bg-[#D61B29] rounded-full flex items-center justify-center text-white shadow-sm transition-colors cursor-pointer focus:outline-none shrink-0"
            title="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform rotate-45 -translate-x-0.5 translate-y-0.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
