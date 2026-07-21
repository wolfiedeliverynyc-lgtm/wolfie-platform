import React, { useState, useEffect, useRef } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { X, Send, AlertTriangle, MessageSquare, Ticket } from 'lucide-react';

export default function SupportModal() {
  const { 
    isSupportModalOpen, 
    setSupportModalOpen, 
    orders, 
    addSupportTicket 
  } = useRestaurantStore();

  const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' or 'chat'
  const [ticketType, setTicketType] = useState('driver_no_show');
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [message, setMessage] = useState('');

  // AI Support Chat States
  const [sessionId, setSessionId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Initialize Support Session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let savedSession = localStorage.getItem('wolfie_restaurant_support_session_id');
      if (!savedSession) {
        savedSession = 'sess_rest_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('wolfie_restaurant_support_session_id', savedSession);
      }
      setSessionId(savedSession);
    }
  }, []);

  const getRestaurantToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('wolfie_restaurant_token') || localStorage.getItem('restaurant_token') || '';
  };

  const getApiUrl = () => {
    // Check vite env
    const origin = import.meta.env.VITE_API_URL || 'https://wolfie-backend-pt9u.onrender.com';
    return `${origin}/api/v1`;
  };

  // Fetch AI chat history when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat' && sessionId) {
      setIsHistoryLoading(true);
      const token = getRestaurantToken();
      fetch(`${getApiUrl()}/support/history?session_id=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          const historyMsgs = data.messages || [];
          const formatted = historyMsgs.map(m => ({
            id: m.id,
            sender: m.role === 'assistant' ? 'support' : 'restaurant',
            text: m.message,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setChatMessages(formatted);
          scrollToBottom();
        })
        .catch(err => console.error("Failed to load restaurant support history:", err))
        .finally(() => setIsHistoryLoading(false));
    }
  }, [activeTab, sessionId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, isTyping, activeTab]);

  if (!isSupportModalOpen) return null;

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const selectedOrder = orders.find(o => o.id === selectedOrderId);

    const newTicket = {
      id: 't' + Date.now(),
      type: ticketType,
      orderId: selectedOrder ? selectedOrder.orderNumber : 'N/A',
      message: message.trim(),
      status: 'open',
      time: new Date().toISOString()
    };

    addSupportTicket(newTicket);
    setMessage('');
    setSupportModalOpen(false);
  };

  const handleSendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const textToSend = chatInput.trim();
    setChatInput('');

    const newMsg = {
      id: 'msg_rest_' + Date.now(),
      sender: 'restaurant',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setIsTyping(true);

    const token = getRestaurantToken();
    fetch(`${getApiUrl()}/support/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        message: textToSend
      })
    })
      .then(res => res.json())
      .then(data => {
        const replyMsg = {
          id: 'msg_support_' + Date.now(),
          sender: 'support',
          text: data.response || "I have received your request. An agent is looking into this.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, replyMsg]);
      })
      .catch(err => {
        console.error("AI support error:", err);
        const errorMsg = {
          id: 'msg_err_' + Date.now(),
          sender: 'support',
          text: "I'm having trouble connecting right now. Please try again or submit a ticket.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, errorMsg]);
      })
      .finally(() => {
        setIsTyping(false);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border h-[550px]"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="ticket">🎫</span>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              Contact Wolfie Support
            </h3>
          </div>
          <button 
            onClick={() => setSupportModalOpen(false)}
            className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-1 rounded-2xl hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b text-xs font-bold" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('ticket')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'ticket' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Ticket size={14} /> Submit Support Ticket
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'chat' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <MessageSquare size={14} /> Live AI Chat
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'ticket' ? (
          <form onSubmit={handleSubmitTicket} className="p-6 space-y-4 flex-1 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-4">
              {/* Ticket Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Issue Type
                </label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border text-sm outline-none bg-white focus:border-amber-500"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="driver_no_show">Driver No Show / Late Arrival</option>
                  <option value="refund_dispute">Customer Refund Dispute</option>
                  <option value="late_delivery">Late Delivery SLA Warning</option>
                  <option value="payment_issue">Payout / Billing Issue</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              {/* Related Order */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Related Order
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border text-sm outline-none bg-white focus:border-amber-500"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">No specific order</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.customerName} ({o.status.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Describe the Issue
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please provide details (e.g. driver details, specific item dispute, prep delays...)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border text-sm outline-none resize-none focus:border-amber-500"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Banner Info */}
              <div 
                className="p-3 rounded-2xl border flex gap-2 text-[11px] leading-relaxed"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Your support request will be escalated to the active logistics agent. Typical resolution time is under 5 minutes.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="flex-1 py-2 px-4 border rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-50 cursor-pointer transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send size={12} /> Submit Ticket
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden bg-neutral-50/30">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="mx-auto max-w-xs text-center">
                <span className="text-[10px] bg-neutral-100 border text-neutral-400 font-bold uppercase py-1 px-3.5 rounded-full select-none">
                  Wolfie AI Support Desk
                </span>
              </div>

              {isHistoryLoading ? (
                <div className="text-center text-xs text-neutral-400 py-6">Loading conversation...</div>
              ) : (
                chatMessages.map((msg) => {
                  const isRest = msg.sender === 'restaurant';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[80%] ${isRest ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div 
                        className={`p-3.5 rounded-3xl text-sm leading-relaxed text-left ${
                          isRest 
                            ? 'bg-amber-500 text-white rounded-br-none' 
                            : 'bg-white text-neutral-800 border rounded-bl-none shadow-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-neutral-400 font-bold mt-1 px-1 font-mono">{msg.time}</span>
                    </div>
                  );
                })
              )}

              {isTyping && (
                <div className="mr-auto flex flex-col items-start max-w-[50%] animate-pulse">
                  <div className="bg-white border p-3.5 rounded-3xl rounded-bl-none shadow-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce delay-200"></span>
                    </span>
                  </div>
                  <span className="text-[9px] text-neutral-400 font-bold mt-1 pl-1">AI Agent typing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
              <input
                type="text"
                placeholder="Ask about active orders, payouts, POS agent..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl border text-sm outline-none focus:border-amber-500 bg-neutral-50/50"
                style={{ borderColor: 'var(--border)' }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  chatInput.trim() 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95' 
                    : 'bg-neutral-100 text-neutral-300 border cursor-not-allowed'
                }`}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

