import React, { useState } from 'react';
import { 
  ArrowLeft, ChevronRight, CheckCircle2, Landmark, RefreshCw, Check
} from 'lucide-react';
import { useDriverStore } from '../store/useDriverStore';
import { useEffect } from 'react';

interface WalletDashProps {
  onBack: () => void;
  playBeep?: (type: 'CLICK' | 'SUCCESS' | 'OFFER' | 'NAV') => void;
}

export default function WalletDash({
  onBack,
  playBeep
}: WalletDashProps) {
  const { wallet, addCashoutRequest, performance } = useDriverStore();
  const [activeSubTab, setActiveSubTab] = useState<'WALLET' | 'HISTORY'>('WALLET');
  
  const [payoutMethod, setPayoutMethod] = useState<'Zelle' | 'Chase Direct' | 'Debit Card'>('Zelle');
  const [showMethodSelector, setShowMethodSelector] = useState<boolean>(false);
  const [cashoutStatus, setCashoutStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [lastCashedAmount, setLastCashedAmount] = useState<number>(0);

  const currentAvailableBalance = wallet.availableBalance;

  useEffect(() => {
    const fetchEarnings = async () => {
      const { token, updateWallet } = useDriverStore.getState();
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5000/api/v1/payments/driver/earnings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          updateWallet({
            availableBalance: data.total_paid + data.pending_payout,
            pendingBalance: data.pending_payout
          });
        }
      } catch (err) {
        console.error("Failed to fetch earnings", err);
      }
    };
    fetchEarnings();
  }, []);

  const handleTriggerClick = (type: 'CLICK' | 'SUCCESS' | 'OFFER' | 'NAV') => {
    if (playBeep) playBeep(type);
  };

  const handleCashOut = () => {
    if (currentAvailableBalance <= 0) return;
    
    handleTriggerClick('CLICK');
    setCashoutStatus('PROCESSING');
    const transferringSum = currentAvailableBalance;
    setLastCashedAmount(transferringSum);

    setTimeout(() => {
      setCashoutStatus('SUCCESS');
      handleTriggerClick('SUCCESS');
      addCashoutRequest(transferringSum, payoutMethod);
    }, 1800);
  };

  return (
    <div id="wallet-dashboard-panel" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] space-y-4 pb-2">
      <div className="relative flex items-center justify-between pb-3 border-b border-slate-900">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-100 hover:bg-slate-900 transition-all cursor-pointer shadow-md">
          <ArrowLeft className="w-5 h-5 text-slate-100 stroke-[2.5px]" />
        </button>
        <h2 className="text-[17px] font-extrabold tracking-tight text-white font-sans">Wallet</h2>
        <button onClick={() => { handleTriggerClick('CLICK'); setActiveSubTab(activeSubTab === 'WALLET' ? 'HISTORY' : 'WALLET'); }} className="text-sm font-extrabold text-[#f05523] hover:text-[#d0491d] transition-colors cursor-pointer">
          {activeSubTab === 'WALLET' ? 'Payout History' : 'Wallet Tab'}
        </button>
      </div>

      {activeSubTab === 'WALLET' ? (
        <div className="space-y-4.5 flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[28px] p-5.5 space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="space-y-1">
              <span className="text-[12px] font-bold text-slate-400 tracking-wide block">Available Balance</span>
              <h1 className="text-4xl font-black text-white font-sans tracking-tight leading-none pt-1">
                ${currentAvailableBalance.toFixed(2)}
              </h1>
            </div>
            <div className="flex items-center justify-between bg-slate-950/40 p-3.5 rounded-2xl border border-slate-900/60 mt-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center shadow">
                  <Landmark className="w-4.5 h-4.5 text-slate-300" />
                </div>
                <div className="leading-normal">
                  <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">Payout Method</span>
                  <span className="text-xs font-black text-slate-100 mt-0.5 block">{payoutMethod}</span>
                </div>
              </div>
              <button onClick={() => { handleTriggerClick('CLICK'); setShowMethodSelector(true); }} className="text-xs font-black text-[#f05523] hover:text-orange-400 flex items-center gap-0.5 cursor-pointer">
                Change <ChevronRight className="w-3.5 h-3.5 stroke-[2.5px]" />
              </button>
            </div>
            <button onClick={handleCashOut} disabled={currentAvailableBalance <= 0 || cashoutStatus === 'PROCESSING'} className={`w-full py-4 rounded-[22px] font-black text-sm tracking-wide text-white transition-all shadow-lg text-center ${currentAvailableBalance <= 0 ? 'bg-slate-900 text-slate-500 border border-slate-950/80 cursor-not-allowed shadow-none' : 'bg-[#f05523] hover:bg-[#d04417] active:scale-[0.98] cursor-pointer shadow-[#f05523]/10'}`}>
              {cashoutStatus === 'PROCESSING' ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin text-white" />Processing...</span> : 'Cash Out Now'}
            </button>
          </div>

          {showMethodSelector && (
            <div className="bg-[#0b0c1e] border border-slate-900 p-4.5 rounded-[24px] space-y-3 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
              <div className="flex justify-between items-center pb-1 border-b border-slate-900/40">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Payout Account</span>
                <button onClick={() => setShowMethodSelector(false)} className="text-[10px] text-slate-500 font-bold hover:text-slate-200 cursor-pointer">Close</button>
              </div>
              <div className="space-y-2 text-xs font-bold pt-1">
                {['Zelle', 'Chase Direct', 'Debit Card'].map((method) => (
                  <div key={method} onClick={() => { setPayoutMethod(method as any); setShowMethodSelector(false); handleTriggerClick('CLICK'); }} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${payoutMethod === method ? 'bg-[#f05523]/5 border-[#f05523]/30 text-white' : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:border-slate-800'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{method === 'Zelle' ? '⚡' : method === 'Chase Direct' ? '🏦' : '💳'}</span>
                      <div>
                        <span>{method === 'Chase Direct' ? 'Chase Direct Checking' : method === 'Debit Card' ? 'Instant Visa Debit Card' : 'Zelle Transfer'}</span>
                        <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{method === 'Zelle' ? 'iheboucief@gmail.com' : method === 'Chase Direct' ? 'Chase Bank (•••• 9482)' : 'Visa Ending in 8802 (1.5% fee)'}</span>
                      </div>
                    </div>
                    {payoutMethod === method && <Check className="w-4 h-4 text-[#f05523]" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Recent Payouts</h3>
            <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] overflow-hidden divide-y divide-slate-900/60 shadow-lg">
              {wallet.completedPayouts.slice(0, 3).map((payout) => (
                <div key={payout.id} className="flex items-center justify-between py-4.5 px-5 font-sans hover:bg-slate-900/10 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[13.5px] font-bold text-slate-200 tracking-tight block">{new Date(payout.date).toLocaleDateString()}</span>
                    <span className="text-[11px] text-slate-500 font-bold block leading-none">{payout.method}</span>
                  </div>
                  <span className="text-[12.5px] font-bold text-slate-500 hidden sm:block">{payout.method}</span>
                  <div className="text-right space-y-1">
                    <span className="text-[13.5px] font-extrabold text-white font-mono block">${payout.amount.toFixed(2)}</span>
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center justify-end gap-1 font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/10" />Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold tracking-wide text-center uppercase py-1">⚡ Transfers clear instantly in under 2 minutes</p>
        </div>
      ) : (
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[28px] p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Transfer Report</h3>
                <p className="text-[10.5px] text-slate-500 font-bold mt-0.5">Showing all payouts</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 text-[#f05523] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Active Year: 2024</div>
            </div>
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="bg-[#080916] border border-slate-900 p-4 rounded-2xl">
                <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Total Cashed Out</span>
                <span className="text-lg font-black font-mono text-emerald-400 block mt-1">${wallet.completedPayouts.reduce((acc, p) => acc + p.amount, 0).toFixed(2)}</span>
              </div>
              <div className="bg-[#080916] border border-slate-900 p-4 rounded-2xl">
                <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Completed Transf.</span>
                <span className="text-lg font-black font-mono text-white block mt-1">{wallet.completedPayouts.length}</span>
              </div>
            </div>
          </div>
          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] p-5 space-y-3 shadow-lg">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Payout Ledger History (Verified)</h4>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-0.5 scrollbar-thin">
              {wallet.completedPayouts.map((p) => (
                <div key={p.id} className="p-3 bg-slate-950/40 border border-slate-900/60 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-bold text-white">{new Date(p.date).toLocaleDateString()}</span>
                      <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-850">{p.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-[9.5px] text-slate-500 font-bold">Requested via {p.method} • Instant Settlement</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[12.5px] font-extrabold font-mono text-slate-100">${p.amount.toFixed(2)}</span>
                    <span className="text-[8.5px] font-black text-emerald-450 text-emerald-400 bg-emerald-500/5 px-1.5 py-0.2 rounded border border-emerald-500/10 block mt-0.5 uppercase tracking-wide">Success</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <p className="text-xs text-slate-350 font-medium">Awesome! <span className="font-mono text-emerald-400 font-extrabold">${lastCashedAmount.toFixed(2)}</span> was transferred instantly to your connected <span className="text-white font-extrabold">{payoutMethod}</span> account.</p>
              <p className="text-[10px] text-slate-500 font-bold pt-1.5">Funds should reflect on your balance statement in under 2 minutes.</p>
            </div>
            <button onClick={() => { handleTriggerClick('CLICK'); setCashoutStatus('IDLE'); }} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-black text-xs text-white uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10">
              Back to Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
