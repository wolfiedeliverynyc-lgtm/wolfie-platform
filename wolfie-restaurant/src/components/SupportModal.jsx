import React, { useState } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { X, Send, AlertTriangle } from 'lucide-react';

export default function SupportModal() {
  const { 
    isSupportModalOpen, 
    setSupportModalOpen, 
    orders, 
    addSupportTicket 
  } = useRestaurantStore();

  const [ticketType, setTicketType] = useState('driver_no_show');
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [message, setMessage] = useState('');

  if (!isSupportModalOpen) return null;

  const handleSubmit = (e) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-fade-in border"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              rows={4}
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
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
      </div>
    </div>
  );
}
