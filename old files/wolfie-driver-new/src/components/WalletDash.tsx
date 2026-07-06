import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle2, 
  Building, 
  Wallet, 
  ArrowUpRight, 
  Coins,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  RefreshCw,
  Landmark,
  Check
} from 'lucide-react';
import { EarningSummary } from '../types';

interface PayoutItem {
  id: string;
  date: string;
  method: string;
  amount: number;
  status: 'Completed' | 'Processing';
}

interface WalletDashProps {
  todayEarnings: number;
  onBack: () => void;
  playBeep?: (type: 'CLICK' | 'SUCCESS' | 'OFFER' | 'NAV') => void;
}

export default function WalletDash({
  todayEarnings,
  onBack,
  playBeep
}: WalletDashProps) {
  const [activeSubTab, setActiveSubTab] = useState<'WALLET' | 'HISTORY'>('WALLET');
  
  // Custom states for interactive simulation
  const [payoutMethod, setPayoutMethod] = useState<'Zelle' | 'Chase Direct' | 'Debit Card'>('Zelle');
  const [showMethodSelector, setShowMethodSelector] = useState<boolean>(false);
  
  // Cash out triggers & lists
  const [sessionCashedOutToday, setSessionCashedOutToday] = useState<number>(0);
  const [recentPayouts, setRecentPayouts] = useState<PayoutItem[]>([
    { id: 'PAY-9021', date: 'May 12, 2024', method: 'Zelle', amount: 186.50, status: 'Completed' },
    { id: 'PAY-8821', date: 'May 11, 2024', method: 'Zelle', amount: 142.30, status: 'Completed' },
    { id: 'PAY-7740', date: 'May 10, 2024', method: 'Zelle', amount: 175.00, status: 'Completed' }
  ]);

  // Cash out animation states
  const [cashoutStatus, setCashoutStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [lastCashedAmount, setLastCashedAmount] = useState<number>(0);

  // Calculate dynamic active balance
  // Baseline is $256.80 + any earnings made in this session (todayEarnings) minus what's been cashed out
  const startingBaseline = 256.80;
  const currentAvailableBalance = Math.max(0, startingBaseline + todayEarnings - sessionCashedOutToday);

  // Click handler
  const handleTriggerClick = (type: 'CLICK' | 'SUCCESS' | 'OFFER' | 'NAV') => {
    if (playBeep) {
      playBeep(type);
    }
  };

  // Perform interactive cash out
  const handleCashOut = () => {
    if (currentAvailableBalance <= 0) return;
    
    handleTriggerClick('CLICK');
    setCashoutStatus('PROCESSING');
    const transferringSum = currentAvailableBalance;
    setLastCashedAmount(transferringSum);

    // Simulate transfer network delay
    setTimeout(() => {
      setCashoutStatus('SUCCESS');
      handleTriggerClick('SUCCESS');
      setSessionCashedOutToday((prev) => prev + transferringSum);

      // Append code to recent payouts log
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      
      const newPayout: PayoutItem = {
        id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        date: dateStr,
        method: payoutMethod,
        amount: transferringSum,
        status: 'Completed'
      };

      setRecentPayouts((prev) => [newPayout, ...prev]);
    }, 1800);
  };

  return (
    <div id="wallet-dashboard-panel" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] space-y-4 pb-2">
      
      {/* 1. TOP HEADER NAVIGATION (Matches Photograph exactly) */}
      <div className="relative flex items-center justify-between pb-3 border-b border-slate-900">
        {/* Back Chevron */}
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-100 hover:bg-slate-900 transition-all cursor-pointer shadow-md"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-100 stroke-[2.5px]" />
        </button>

        {/* Center Title */}
        <h2 className="text-[17px] font-extrabold tracking-tight text-white font-sans">
          Wallet
        </h2>

        {/* Right Toggle "Payout History" (Exactly styled as the orange text link in photo!) */}
        <button
          onClick={() => {
            handleTriggerClick('CLICK');
            setActiveSubTab(activeSubTab === 'WALLET' ? 'HISTORY' : 'WALLET');
          }}
          className="text-sm font-extrabold text-[#f05523] hover:text-[#d0491d] transition-colors bg-transparent border-none outline-none cursor-pointer tracking-tight"
        >
          {activeSubTab === 'WALLET' ? 'Payout History' : 'Wallet Tab'}
        </button>
      </div>

      {/* RENDER VIEW SECTORS */}
      {activeSubTab === 'WALLET' ? (
        <div className="space-y-4.5 flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out]">
          
          {/* AVAILABLE BALANCE CONTAINER PANEL */}
          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[28px] p-5.5 space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Title & Large Figure */}
            <div className="space-y-1">
              <span className="text-[12px] font-bold text-slate-400 tracking-wide block">
                Available Balance
              </span>
              <h1 className="text-4xl font-black text-white font-sans tracking-tight leading-none pt-1">
                ${currentAvailableBalance.toFixed(2)}
              </h1>
            </div>

            {/* Payout method choice line (Exactly replicates screenshot design detail) */}
            <div className="flex items-center justify-between bg-slate-950/40 p-3.5 rounded-2xl border border-slate-900/60 mt-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center shadow">
                  <Landmark className="w-4.5 h-4.5 text-slate-300" />
                </div>
                <div className="leading-normal">
                  <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">
                    Payout Method
                  </span>
                  <span className="text-xs font-black text-slate-100 mt-0.5 block">
                    {payoutMethod}
                  </span>
                </div>
              </div>

              {/* Change Button link triggers selector popup overlay */}
              <button
                onClick={() => { handleTriggerClick('CLICK'); setShowMethodSelector(true); }}
                className="text-xs font-black text-[#f05523] hover:text-orange-400 flex items-center gap-0.5 cursor-pointer"
              >
                Change <ChevronRight className="w-3.5 h-3.5 stroke-[2.5px]" />
              </button>
            </div>

            {/* Prominent Large Orange Action Button (Cash Out Now) */}
            <button
              onClick={handleCashOut}
              disabled={currentAvailableBalance <= 0 || cashoutStatus === 'PROCESSING'}
              className={`w-full py-4 rounded-[22px] font-black text-sm tracking-wide text-white transition-all shadow-lg text-center ${
                currentAvailableBalance <= 0 
                  ? 'bg-slate-900 text-slate-500 border border-slate-950/80 cursor-not-allowed shadow-none' 
                  : 'bg-[#f05523] hover:bg-[#d04417] active:scale-[0.98] cursor-pointer shadow-[#f05523]/10'
              }`}
            >
              {cashoutStatus === 'PROCESSING' ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Processing instant payout...
                </span>
              ) : (
                'Cash Out Now'
              )}
            </button>
          </div>

          {/* DYNAMIC OR COLLAPSIBLE METHOD SELECTOR ACCORDION */}
          {showMethodSelector && (
            <div className="bg-[#0b0c1e] border border-slate-900 p-4.5 rounded-[24px] space-y-3 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
              <div className="flex justify-between items-center pb-1 border-b border-slate-900/40">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Payout Account</span>
                <button
                  onClick={() => setShowMethodSelector(false)}
                  className="text-[10px] text-slate-500 font-bold hover:text-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 text-xs font-bold pt-1">
                {/* Option 1: Zelle */}
                <div 
                  onClick={() => { setPayoutMethod('Zelle'); setShowMethodSelector(false); handleTriggerClick('CLICK'); }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${payoutMethod === 'Zelle' ? 'bg-[#f05523]/5 border-[#f05523]/30 text-white' : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:border-slate-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚡</span>
                    <div>
                      <span>Zelle Transfer</span>
                      <span className="block text-[9px] text-slate-500 font-mono mt-0.5">iheboucief@gmail.com</span>
                    </div>
                  </div>
                  {payoutMethod === 'Zelle' && <Check className="w-4 h-4 text-[#f05523]" />}
                </div>

                {/* Option 2: Chase Direct */}
                <div 
                  onClick={() => { setPayoutMethod('Chase Direct'); setShowMethodSelector(false); handleTriggerClick('CLICK'); }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${payoutMethod === 'Chase Direct' ? 'bg-[#f05523]/5 border-[#f05523]/30 text-white' : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:border-slate-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏦</span>
                    <div>
                      <span>Chase Direct Checking</span>
                      <span className="block text-[9px] text-slate-500 font-mono mt-0.5">Chase Bank (•••• 9482)</span>
                    </div>
                  </div>
                  {payoutMethod === 'Chase Direct' && <Check className="w-4 h-4 text-[#f05523]" />}
                </div>

                {/* Option 3: Debit Card */}
                <div 
                  onClick={() => { setPayoutMethod('Debit Card'); setShowMethodSelector(false); handleTriggerClick('CLICK'); }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${payoutMethod === 'Debit Card' ? 'bg-[#f05523]/5 border-[#f05523]/30 text-white' : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:border-slate-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💳</span>
                    <div>
                      <span>Instant Visa Debit Card</span>
                      <span className="block text-[9px] text-slate-500 font-mono mt-0.5">Visa Ending in 8802 (1.5% fee)</span>
                    </div>
                  </div>
                  {payoutMethod === 'Debit Card' && <Check className="w-4 h-4 text-[#f05523]" />}
                </div>
              </div>
            </div>
          )}

          {/* RECENT PAYOUTS TABLE LIST SECTION (Exact visual translation) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
              Recent Payouts
            </h3>

            <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] overflow-hidden divide-y divide-slate-900/60 shadow-lg">
              {recentPayouts.map((payout) => (
                <div 
                  key={payout.id} 
                  className="flex items-center justify-between py-4.5 px-5 font-sans hover:bg-slate-900/10 transition-colors"
                >
                  {/* Left Column: Date & Method subhead */}
                  <div className="space-y-1">
                    <span className="text-[13.5px] font-bold text-slate-200 tracking-tight block">
                      {payout.date}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold block leading-none">
                      {payout.method}
                    </span>
                  </div>

                  {/* Middle Column: Method repetition exactly like photograph */}
                  <span className="text-[12.5px] font-bold text-slate-500 hidden sm:block">
                    {payout.method}
                  </span>

                  {/* Right Column: Price and Status (Completed in green style) */}
                  <div className="text-right space-y-1">
                    <span className="text-[13.5px] font-extrabold text-white font-mono block">
                      ${payout.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center justify-end gap-1 font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/10" />
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FOOTNOTE */}
          <p className="text-[10px] text-slate-500 font-semibold tracking-wide text-center uppercase py-1">
            ⚡ Transfers clear instantly in under 2 minutes
          </p>

        </div>
      ) : (
        /* PAYOUT HISTORY VIEW MODE (Provides an extended, beautiful chart/data breakdown of past payouts) */
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[28px] p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Transfer Report
                </h3>
                <p className="text-[10.5px] text-slate-500 font-bold mt-0.5">
                  Showing all payouts in May 2024
                </p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 text-[#f05523] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                Active Year: 2024
              </div>
            </div>

            {/* Payout statistics summary */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="bg-[#080916] border border-slate-900 p-4 rounded-2xl">
                <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Total Cashed Out</span>
                <span className="text-lg font-black font-mono text-emerald-400 block mt-1">
                  ${recentPayouts.reduce((acc, p) => acc + p.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-[#080916] border border-slate-900 p-4 rounded-2xl">
                <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Completed Transf.</span>
                <span className="text-lg font-black font-mono text-white block mt-1">
                  {recentPayouts.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] p-5 space-y-3 shadow-lg">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Payout Ledger History (Verified)
            </h4>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-0.5 scrollbar-thin">
              {recentPayouts.map((p, idx) => (
                <div key={p.id} className="p-3 bg-slate-950/40 border border-slate-900/60 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-bold text-white">{p.date}</span>
                      <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-850">{p.id}</span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 font-bold">
                      Requested via {p.method} • Instant Settlement
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[12.5px] font-extrabold font-mono text-slate-100">${p.amount.toFixed(2)}</span>
                    <span className="text-[8.5px] font-black text-emerald-450 text-emerald-400 bg-emerald-500/5 px-1.5 py-0.2 rounded border border-emerald-500/10 block mt-0.5 uppercase tracking-wide">
                      Success
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CASHOUT POPUP SUCCESS COVER MODAL OVERLAY */}
      {cashoutStatus === 'PROCESSING' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-6 animate-[fadeIn_0.15s_ease-out] select-none">
          <div className="bg-[#0c0d1c] border border-slate-900 p-7.5 rounded-[32px] max-w-sm w-full text-center space-y-4.5 shadow-2xl relative">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-500">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white uppercase tracking-wider">Instructing Settlement</h3>
              <p className="text-xs text-slate-400 font-medium">Securing instant deposit rails for ${lastCashedAmount.toFixed(2)} to your {payoutMethod} account.</p>
            </div>
          </div>
        </div>
      )}

      {cashoutStatus === 'SUCCESS' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-6 animate-[fadeIn_0.15s_ease-out] select-none">
          <div className="bg-[#0c0d1c] border border-slate-900/80 p-8 rounded-[32px] max-w-sm w-full text-center space-y-5 shadow-2xl relative">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 animate-[bounce_1s_ease-in-out_infinite]">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 fill-emerald-500/10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Instant Cash-Out Succeeded!</h3>
              <p className="text-xs text-slate-350 font-medium">
                Awesome! <span className="font-mono text-emerald-400 font-extrabold">${lastCashedAmount.toFixed(2)}</span> was transferred instantly to your connected <span className="text-white font-extrabold">{payoutMethod}</span> account. 
              </p>
              <p className="text-[10px] text-slate-500 font-bold pt-1.5">
                Funds should reflect on your balance statement in under 2 minutes.
              </p>
            </div>
            <button
              onClick={() => { handleTriggerClick('CLICK'); setCashoutStatus('IDLE'); }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-black text-xs text-white uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              Back to Wallet
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
