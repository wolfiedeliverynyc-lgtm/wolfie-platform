import React, { useEffect, useState } from 'react';
import { financeApi } from '../../api';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { Wallet, Activity, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function FinanceDashboard() {
  const { finance, setFinance } = useRestaurantStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balRes, txsRes, payRes, aiRes] = await Promise.all([
        financeApi.getBalance(),
        financeApi.getTransactions({ limit: 5 }),
        financeApi.getPayouts({ limit: 5 }),
        financeApi.getAiSub(),
      ]);
      setFinance({
        balance: balRes,
        transactions: txsRes.transactions,
        payouts: payRes.payouts,
        aiSubscription: aiRes,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutRequest = async () => {
    if (!window.confirm('Request payout for all available balance?')) return;
    try {
      await financeApi.requestPayout({});
      alert('Payout requested successfully!');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to request payout');
    }
  };

  if (loading && !finance.balance.total_balance) {
    return <div className="p-8 text-[rgba(232,220,200,0.5)] uppercase tracking-widest text-xs font-bold animate-pulse">Synchronizing financial data...</div>;
  }

  const { balance, transactions, payouts, aiSubscription } = finance;

  return (
    <div className="space-y-8 w-full h-full text-[#e8dcc8] p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-light tracking-tighter text-white mb-2">Finance & Payouts</h1>
          <p className="text-xs uppercase tracking-widest text-[rgba(232,220,200,0.5)]">
            Manage your balances and recent settlements
          </p>
        </div>
        <button 
          onClick={handlePayoutRequest}
          disabled={balance.available_balance <= 0}
          className="flex items-center gap-2 bg-[#FF6129]/10 text-[#FF6129] border border-[#FF6129]/30 px-6 py-3 rounded-[2.5rem] text-xs font-bold uppercase tracking-widest hover:bg-[#FF6129] hover:text-[#080808] disabled:opacity-50 disabled:hover:bg-[#FF6129]/10 disabled:hover:text-[#FF6129] transition-all shadow-[0_0_20px_rgba(255,97,41,0.15)] hover:shadow-[0_0_30px_rgba(255,97,41,0.4)]"
        >
          <Wallet size={16} /> Request Payout
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Available Balance */}
        <div className="bg-[#0d0b09] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group shadow-[0_0_40px_rgba(255,97,41,0.05)] hover:border-[#FF6129]/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6129]/10 blur-[50px] pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />
          <p className="text-[10px] font-bold text-[rgba(232,220,200,0.5)] uppercase tracking-[0.2em]">Available Balance</p>
          <div className="mt-4 flex items-baseline">
            <span className="text-5xl font-light text-white font-sans tracking-tighter">${balance.available_balance?.toFixed(2) || '0.00'}</span>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-[#22c55e] font-bold flex items-center gap-2">
            <TrendingUp size={12} /> Ready to transfer
          </p>
        </div>
        
        {/* Pending Settlement */}
        <div className="bg-[#0d0b09] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group shadow-inner">
          <p className="text-[10px] font-bold text-[rgba(232,220,200,0.5)] uppercase tracking-[0.2em]">Pending Settlement</p>
          <div className="mt-4 flex items-baseline">
            <span className="text-5xl font-light text-[rgba(232,220,200,0.8)] font-sans tracking-tighter">${balance.pending_balance?.toFixed(2) || '0.00'}</span>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-[#38bdf8] font-bold flex items-center gap-2">
            <Activity size={12} /> Clearing soon
          </p>
        </div>

        {/* AI Plan */}
        <div className="bg-[#0d0b09] rounded-[2.5rem] border border-white/5 p-8 flex flex-col justify-between relative overflow-hidden group shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.05)_0%,transparent_60%)] pointer-events-none" />
          <div>
            <p className="text-[10px] font-bold text-[rgba(232,220,200,0.5)] uppercase tracking-[0.2em]">WAP AI Plan</p>
            <div className="mt-6">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                {aiSubscription?.plan_name || 'Free Tier'}
              </span>
            </div>
          </div>
          <div className="text-[9px] uppercase tracking-widest text-[rgba(232,220,200,0.3)] mt-8">
            Next billing: <span className="font-sans text-[rgba(232,220,200,0.5)]">{aiSubscription?.billing_cycle_start ? new Date(aiSubscription.billing_cycle_start).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Recent Transactions */}
        <div className="bg-[#0d0b09] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner flex flex-col">
          <div className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-[rgba(255,255,255,0.02)]">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Recent Transactions</h3>
            <span className="text-[10px] uppercase tracking-widest text-[#FF6129] hover:text-[#e8b86d] cursor-pointer font-bold flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={12} />
            </span>
          </div>
          <ul className="divide-y divide-white/5 flex-1">
            {transactions?.length === 0 ? (
              <li className="px-8 py-12 text-center text-[10px] uppercase tracking-widest text-[rgba(232,220,200,0.4)]">No transactions yet.</li>
            ) : (
              transactions?.map(tx => (
                <li key={tx.id} className="px-8 py-5 hover:bg-white/[0.02] flex items-center justify-between transition-colors">
                  <div>
                    <p className="text-[11px] font-bold text-white uppercase tracking-wider">{tx.tx_type.replace('_', ' ')}</p>
                    <p className="text-[10px] text-[rgba(232,220,200,0.4)] mt-1 font-sans tracking-widest">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-[13px] font-sans font-bold tracking-widest ${tx.amount > 0 ? 'text-[#22c55e]' : 'text-white'}`}>
                    {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recent Payouts */}
        <div className="bg-[#0d0b09] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner flex flex-col">
          <div className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-[rgba(255,255,255,0.02)]">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Recent Payouts</h3>
            <span className="text-[10px] uppercase tracking-widest text-[#FF6129] hover:text-[#e8b86d] cursor-pointer font-bold flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={12} />
            </span>
          </div>
          <ul className="divide-y divide-white/5 flex-1">
            {payouts?.length === 0 ? (
              <li className="px-8 py-12 text-center text-[10px] uppercase tracking-widest text-[rgba(232,220,200,0.4)]">No payouts yet.</li>
            ) : (
              payouts?.map(p => (
                <li key={p.id} className="px-8 py-5 hover:bg-white/[0.02] flex items-center justify-between transition-colors">
                  <div>
                    <p className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Wallet size={12} className="text-[#FF6129]" /> Bank Transfer <span className="opacity-50 font-sans tracking-widest">({balance.bank_last4 || '****'})</span>
                    </p>
                    <p className="text-[10px] text-[#38bdf8] uppercase tracking-widest font-bold mt-1.5">{p.payout_status}</p>
                  </div>
                  <span className="text-[13px] font-sans font-bold text-white tracking-widest">${p.amount.toFixed(2)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
