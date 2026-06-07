import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ChevronRight, Headphones, MessageSquare, Send, CheckCircle, AlertTriangle, MapPin, UtensilsCrossed, DollarSign
} from 'lucide-react';
import { useDriverStore } from '../store/useDriverStore';

interface SupportDashProps {
  onBack: () => void;
  playBeep?: (type: 'CLICK' | 'SUCCESS' | 'OFFER' | 'NAV') => void;
}

export default function SupportDash({
  onBack,
  playBeep
}: SupportDashProps) {
  const { driverProfile, supportTickets, addSupportTicket } = useDriverStore();
  const [activeView, setActiveView] = useState<'MAIN' | 'CHAT'>('MAIN');
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [aiInteractionCount, setAiInteractionCount] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickHelpTopics = [
    { id: 'issue_order', title: 'I have an issue with my order', icon: <UtensilsCrossed className="w-4 h-4 text-orange-400" />, initialResponse: "Hi there! I can help with order details. If this is an active order, please select what's wrong: Is a customer item missing, is the food damaged, or has there been an issue or delay with preparing the food at the merchant site?" },
    { id: 'cant_find_restaurant', title: 'I can\'t find the restaurant', icon: <MapPin className="w-4 h-4 text-emerald-400" />, initialResponse: "Sometimes merchants are tucked away inside shopping malls or have a ghost kitchen entrance around the back! Would you like me to ping the exact coordinates, or do you want to contact the restaurant manager directly?" },
    { id: 'customer_no_receive', title: 'Customer didn\'t receive the order', icon: <CheckCircle className="w-4 h-4 text-sky-400" />, initialResponse: "Oh no! We want to make sure the food gets to the customer securely. Did you drop it off at the doorstep as requested, or are you currently trying to locate them? Remember to take a drop-off photo in the app if they have designated 'Leave at door'." },
    { id: 'help_payment', title: 'I need help with payment', icon: <DollarSign className="w-4 h-4 text-amber-400" />, initialResponse: "For payments and payouts, please verify that your routing number is correct in your Bank / Payout profiles. Direct deposits are initiated every Monday. Instant checkouts to Zelle reflect in 2 minutes. What payment topic are you experiencing?" },
    { id: 'other_issue', title: 'Other issue', icon: <AlertTriangle className="w-4 h-4 text-rose-400" />, initialResponse: "No worries! Please describe your issue clearly below. A help representative or our automated support system will guide you through immediate resolution." }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeView === 'CHAT') {
      scrollToBottom();
    }
  }, [supportTickets, activeTicketId, isTyping, activeView]);

  const triggerSound = (type: 'CLICK' | 'SUCCESS' | 'OFFER' | 'NAV') => {
    if (playBeep) playBeep(type);
  };

  const startChatWithTopic = (topicId: string, topicTitle: string, responseText: string) => {
    triggerSound('CLICK');
    setSelectedTopic(topicTitle);
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTicket = {
      id: `tick-${Date.now()}`,
      subject: topicTitle,
      message: responseText,
      level: 'ai_agent' as const,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
      responses: [
        { from: 'SUPPORT', message: `Hello ${driverProfile?.name?.split(' ')[0] || 'Driver'}! You've selected our virtual guide for: "${topicTitle}".`, timestamp: timeStr },
        { from: 'SUPPORT', message: responseText, timestamp: timeStr }
      ]
    };
    
    addSupportTicket(newTicket);
    setActiveTicketId(newTicket.id);
    setActiveView('CHAT');
  };

  const startGeneralSupportChat = () => {
    triggerSound('CLICK');
    setSelectedTopic('General Agent Support');
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTicket = {
      id: `tick-${Date.now()}`,
      subject: 'General Support',
      message: 'Courier Helpdesk connected.',
      level: 'ai_agent' as const,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
      responses: [
        { from: 'SUPPORT', message: "Courier Helpdesk connected. How can we help you solve your delivery challenge today?", timestamp: timeStr }
      ]
    };

    addSupportTicket(newTicket);
    setActiveTicketId(newTicket.id);
    setActiveView('CHAT');
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeTicketId) return;

    triggerSound('CLICK');
    const userText = inputText.trim();
    setInputText('');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    useDriverStore.getState().updateSupportTicket(activeTicketId, {
      responses: [...(supportTickets.find(t => t.id === activeTicketId)?.responses || []), { from: 'DRIVER', message: userText, timestamp: timeStr }]
    });
    
    setIsTyping(true);
    setAiInteractionCount(prev => prev + 1);

    setTimeout(() => {
      let botResponse = "I've received your request! Let me coordinate with our backend system. If you are current on a delivery slot, transit times won't count against your dispatcher ratings metrics. Hold on briefly.";

      const textLower = userText.toLowerCase();
      if (textLower.includes('delay') || textLower.includes('wait')) {
        botResponse = "If you're experiencing a long merchant line wait, click the 'Report Store Wait' status inside the app. This updates the eta and protects your rating stats.";
      } else if (textLower.includes('missing') || textLower.includes('wrong')) {
        botResponse = "Please contact the customer immediately using the app call option to verify. If a core dish is missing, ask the merchant's staff to re-bag or report the item list adjustment.";
      } else if (textLower.includes('cancel') || textLower.includes('stop')) {
        botResponse = "If you can't complete the transit slot, select 'Unassign Order' under active options. This will re-add your route slots to the driver pool so another courier can grab it.";
      } else if (textLower.includes('cash') || textLower.includes('money') || textLower.includes('payout') || textLower.includes('wallet')) {
        botResponse = "Your balance can be deposited instantly through Zelle from your Wallet page! Daily completions automatically increment your balance ledger immediately.";
      } else if (textLower.includes('hello') || textLower.includes('hi')) {
        botResponse = `Hello ${driverProfile?.name?.split(' ')[0] || 'Driver'}! How's your current delivery sprint going? Let me know how I can make your dispatch simpler.`;
      } else if (textLower.includes('human')) {
        botResponse = "I'm escalating your ticket to a Human Admin right away. Please hold...";
        useDriverStore.getState().updateSupportTicket(activeTicketId, { level: 'human_admin', status: 'escalated' });
      }

      useDriverStore.getState().updateSupportTicket(activeTicketId, {
        responses: [...(useDriverStore.getState().supportTickets.find(t => t.id === activeTicketId)?.responses || []), { from: 'SUPPORT', message: botResponse, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
      });

      setIsTyping(false);
      triggerSound('SUCCESS');
    }, 1500);
  };

  const handleEscalate = (level: 'human_admin' | 'owner_review') => {
    if (!activeTicketId) return;
    triggerSound('CLICK');
    useDriverStore.getState().updateSupportTicket(activeTicketId, { level, status: 'escalated' });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    useDriverStore.getState().updateSupportTicket(activeTicketId, {
      responses: [...(supportTickets.find(t => t.id === activeTicketId)?.responses || []), { from: 'SUPPORT', message: `Ticket escalated to ${level === 'human_admin' ? 'Human Admin' : 'Owner Review'}. Please hold for assistance.`, timestamp: timeStr }]
    });
  };

  const activeTicket = supportTickets.find(t => t.id === activeTicketId);
  const chatMessages = activeTicket?.responses || [];

  return (
    <div id="support-panel" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] space-y-4 pb-2">
      <div className="relative flex items-center justify-between pb-3 border-b border-slate-900">
        <button onClick={() => { triggerSound('CLICK'); if (activeView === 'CHAT') { setActiveView('MAIN'); } else { onBack(); } }} className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-100 hover:bg-slate-900 transition-all cursor-pointer shadow-md">
          <ArrowLeft className="w-5 h-5 text-slate-100 stroke-[2.5px]" />
        </button>
        <h2 className="text-[17px] font-extrabold tracking-tight text-white font-sans">{activeView === 'MAIN' ? 'Support' : 'Live Help'}</h2>
        <div className="w-10"></div>
      </div>

      {activeView === 'MAIN' ? (
        <div className="space-y-4.5 flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[28px] p-5.5 flex items-center gap-4.5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#f05523]/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="w-13 h-13 rounded-2xl bg-[#f05523]/10 border border-[#f05523]/25 flex items-center justify-center text-[#f05523] shrink-0">
              <Headphones className="w-7 h-7 stroke-[2.2px] animate-[pulse_2s_infinite]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[16px] font-black tracking-tight text-white font-sans">How can we help you?</h3>
              <p className="text-[12.5px] text-slate-400 font-bold">We're here 24/7</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mt-1">Quick Help</h3>
            <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] overflow-hidden divide-y divide-slate-900/60 shadow-lg">
              {quickHelpTopics.map((topic) => (
                <button key={topic.id} onClick={() => startChatWithTopic(topic.id, topic.title, topic.initialResponse)} className="w-full flex items-center justify-between py-4 px-5 hover:bg-slate-900/15 text-left transition-colors cursor-pointer bg-transparent border-none">
                  <div className="flex items-center gap-3.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-950/50 border border-slate-900 flex items-center justify-center shrink-0">{topic.icon}</div>
                    <span className="text-[13.5px] font-bold text-slate-200 tracking-tight">{topic.title}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 stroke-[2px]" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button onClick={startGeneralSupportChat} className="w-full py-4 bg-[#f05523] hover:bg-[#d04417] text-white rounded-[22px] text-sm font-black tracking-wide text-center transition-all shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5">
              <MessageSquare className="w-4.5 h-4.5 fill-white/10" />
              <span>Chat with Support</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 bg-[#0b0c1e]/45 border border-slate-900 rounded-[28px] overflow-hidden h-full shadow-2xl relative">
          <div className="bg-[#0b0c1e] px-4.5 py-3 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[ping_1.5s_infinite]"></div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">
                  {activeTicket?.level === 'owner_review' ? 'Owner Review' : activeTicket?.level === 'human_admin' ? 'Human Admin' : 'Assigned Support Bot'}
                </span>
                <span className="text-[12px] font-black text-white truncate max-w-[200px] block">{selectedTopic}</span>
              </div>
            </div>
            <span className="text-[9.5px] font-mono text-slate-500 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-900 font-bold">
              ID: {activeTicketId?.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[350px] min-h-[300px]">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col max-w-[85%] ${msg.from === 'DRIVER' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                <div className={`p-3.5 rounded-2xl text-[12.5px] font-bold leading-relaxed ${msg.from === 'DRIVER' ? 'bg-[#f05523] text-white rounded-tr-none' : 'bg-slate-950/60 border border-slate-900 text-slate-200 rounded-tl-none'}`}>
                  {msg.message}
                </div>
                <span className="text-[9px] text-slate-500 font-bold mt-1.5 px-1 font-mono">{msg.timestamp}</span>
              </div>
            ))}
            {isTyping && (
              <div className="mr-auto flex flex-col items-start max-w-[50%]">
                <div className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-2xl rounded-tl-none">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-200"></span>
                  </span>
                </div>
                <span className="text-[9px] text-slate-600 font-bold mt-1 pl-1">Agent writing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-2 border-t border-slate-900/60 flex gap-2 overflow-x-auto whitespace-nowrap bg-slate-950/15 scrollbar-none">
            {activeTicket?.level === 'ai_agent' && aiInteractionCount >= 2 && (
              <button onClick={() => handleEscalate('human_admin')} className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] text-red-400 hover:text-red-300 transition-colors hover:border-red-500/40 cursor-pointer font-bold">Escalate to Human Admin</button>
            )}
            {activeTicket?.level === 'human_admin' && (
              <button onClick={() => handleEscalate('owner_review')} className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] text-red-400 hover:text-red-300 transition-colors hover:border-red-500/40 cursor-pointer font-bold">Escalate to Owner</button>
            )}
            <button onClick={() => { setInputText("How do I cancel active route?"); }} className="px-3 py-1 bg-slate-900/95 border border-slate-850 rounded-full text-[10px] text-slate-350 hover:text-white transition-colors hover:border-slate-700 cursor-pointer font-bold">Cancel active route?</button>
            <button onClick={() => { setInputText("Merchant order is delayed"); }} className="px-3 py-1 bg-slate-900/95 border border-slate-850 rounded-full text-[10px] text-slate-350 hover:text-white transition-colors hover:border-slate-700 cursor-pointer font-bold">Order is delayed</button>
            <button onClick={() => { setInputText("What is payout method Zelle fee?"); }} className="px-3 py-1 bg-slate-900/95 border border-slate-850 rounded-full text-[10px] text-slate-350 hover:text-white transition-colors hover:border-slate-700 cursor-pointer font-bold">How much are fees?</button>
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-[#080916] border-t border-slate-900 flex gap-2 items-center">
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Describe your active challenge..." className="flex-1 bg-slate-950 px-4 py-3 rounded-2xl border border-slate-900 text-[12px] font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#f05523]/50" />
            <button type="submit" disabled={!inputText.trim()} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all stroke-[2.5px] ${inputText.trim() ? 'bg-[#f05523] hover:bg-[#d04417] text-white cursor-pointer active:scale-[0.94]' : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'}`}>
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
