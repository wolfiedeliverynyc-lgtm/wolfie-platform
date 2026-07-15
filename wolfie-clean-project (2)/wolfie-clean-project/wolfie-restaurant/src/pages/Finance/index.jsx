import React, { useEffect, useState } from 'react';
import { financeApi } from '../../api';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { Wallet, Activity, ArrowUpRight, TrendingUp, BellRing } from 'lucide-react';
import Card from '../../components/dashboard/Card';

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
    return (
      <div className="p-8 text-[var(--text-secondary)] uppercase tracking-widest text-xs font-bold animate-pulse font-poppins">
        Synchronizing financial data...
      </div>
    );
  }

  const { balance, transactions, payouts, aiSubscription } = finance;

  return (
    <div className="space-y-8 w-full h-full p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2 font-poppins">
            Finance & Payouts
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] font-poppins">
            Manage your balances and recent settlements
          </p>
        </div>
        <button 
          onClick={handlePayoutRequest}
          disabled={balance.available_balance <= 0}
          className="flex items-center gap-2 bg-[var(--accent-yellow)] text-black font-poppins font-bold px-6 py-3 rounded-full text-xs uppercase tracking-wider hover:bg-[var(--accent-yellow-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Wallet size={16} /> Request Payout
        </button>
      </div>

      {/* Balance Cards (Smaller size, overview style with 3D tilt) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Available Balance */}
        <Card 
          id="avail_bal" 
          title="Available Balance" 
          className="premium-card accent-solid-orange"
          onClick={() => {}}
        >
          <div className="premium-card-inner">
            <div className="premium-header">
              <span className="premium-title text-black font-poppins font-bold text-[13px] uppercase tracking-wider">Available Balance</span>
              <div className="premium-badge text-black bg-black/10">Ready</div>
            </div>
            
            <div className="premium-main flex flex-col items-center justify-center py-2">
              <div className="text-3xl font-extrabold text-black font-poppins tracking-tight">
                ${balance.available_balance?.toFixed(2) || '0.00'}
              </div>
              <p className="mt-2 text-[13px] uppercase tracking-wider text-black font-bold flex items-center gap-1.5">
                <TrendingUp size={12} /> Ready to transfer
              </p>
            </div>

            <div className="premium-footer bg-black/10 border-none rounded-xl p-2.5 flex justify-center items-center">
              <span className="text-[13px] text-black font-bold uppercase tracking-wider">Instantly withdraw to bank</span>
            </div>
          </div>
        </Card>
        
        {/* Pending Settlement */}
        <Card 
          id="pend_settle" 
          title="Pending Settlement" 
          className="premium-card accent-blue"
          onClick={() => {}}
        >
          <div className="premium-card-inner">
            <div className="premium-header">
              <span className="premium-title font-poppins font-bold text-[13px] uppercase tracking-wider">Pending Settlement</span>
              <div className="premium-badge">Clearing</div>
            </div>
            
            <div className="premium-main flex flex-col items-center justify-center py-2">
              <div className="text-3xl font-extrabold text-[var(--text-primary)] font-poppins tracking-tight">
                ${balance.pending_balance?.toFixed(2) || '0.00'}
              </div>
              <p className="mt-2 text-[13px] uppercase tracking-wider text-[var(--accent-red)] font-bold flex items-center gap-1.5">
                <Activity size={12} /> Clearing soon
              </p>
            </div>

            <div className="premium-footer">
              <span className="text-[13px] text-[var(--text-secondary)] uppercase tracking-wider">Deposited in 1-2 business days</span>
            </div>
          </div>
        </Card>

        {/* AI Plan */}
        <Card 
          id="wap_ai_plan" 
          title="WAP AI Plan" 
          className="premium-card accent-blue"
          onClick={() => {}}
        >
          <div className="premium-card-inner">
            <div className="premium-header">
              <span className="premium-title font-poppins font-bold text-[13px] uppercase tracking-wider">WAP AI Plan</span>
              <div className="premium-badge">Active Plan</div>
            </div>
            
            <div className="premium-main flex flex-col items-center justify-center py-2">
              <div className="my-1">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[13px] font-black uppercase tracking-widest bg-[var(--bg-card-hover)] text-[var(--accent-yellow)]">
                  {aiSubscription?.plan_name || 'Free Tier'}
                </span>
              </div>
              <p className="text-[13px] uppercase tracking-widest text-[var(--text-secondary)] mt-3">
                Next billing: <span className="font-sans text-[var(--text-primary)] font-bold">{aiSubscription?.billing_cycle_start ? new Date(aiSubscription.billing_cycle_start).toLocaleDateString() : 'N/A'}</span>
              </p>
            </div>

            <div className="premium-footer">
              <span className="text-[13px] text-[var(--text-secondary)] uppercase tracking-wider">Premium platform features</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Recent Transactions */}
        <div className="dashboard-card accent-blue cursor-default flex flex-col">
          <div className="px-6 py-4 flex justify-between items-center bg-[var(--bg-card-hover)] rounded-t-[24px]">
            <h3 className="text-[13px] uppercase tracking-[0.2em] font-bold text-[var(--text-primary)] font-poppins">Recent Transactions</h3>
            <span className="text-[13px] uppercase tracking-widest text-[var(--accent-yellow)] hover:text-[var(--accent-yellow-hover)] cursor-pointer font-bold flex items-center gap-1 transition-colors font-poppins">
              View All <ArrowUpRight size={12} />
            </span>
          </div>
          <ul className="flex flex-col gap-2 p-4 flex-1">
            {transactions?.length === 0 ? (
              <li className="px-6 py-12 text-center text-[13px] uppercase tracking-widest text-[var(--text-secondary)] font-poppins">
                No transactions yet.
              </li>
            ) : (
              transactions?.map(tx => (
                <li key={tx.id} className="px-6 py-4 hover:bg-[var(--bg-card-hover)] rounded-xl flex items-center justify-between transition-colors font-poppins">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      {tx.tx_type.replace('_', ' ')}
                    </p>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1 font-sans tracking-widest">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-[13px] font-sans font-bold tracking-widest ${tx.amount > 0 ? 'text-green-500' : 'text-[var(--text-primary)]'}`}>
                    {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recent Payouts */}
        <div className="dashboard-card accent-blue cursor-default flex flex-col">
          <div className="px-6 py-4 flex justify-between items-center bg-[var(--bg-card-hover)] rounded-t-[24px]">
            <h3 className="text-[13px] uppercase tracking-[0.2em] font-bold text-[var(--text-primary)] font-poppins">Recent Payouts</h3>
            <span className="text-[13px] uppercase tracking-widest text-[var(--accent-yellow)] hover:text-[var(--accent-yellow-hover)] cursor-pointer font-bold flex items-center gap-1 transition-colors font-poppins">
              View All <ArrowUpRight size={12} />
            </span>
          </div>
          <ul className="flex flex-col gap-2 p-4 flex-1">
            {payouts?.length === 0 ? (
              <li className="px-6 py-12 text-center text-[13px] uppercase tracking-widest text-[var(--text-secondary)] font-poppins">
                No payouts yet.
              </li>
            ) : (
              payouts?.map(p => (
                <li key={p.id} className="px-6 py-4 hover:bg-[var(--bg-card-hover)] rounded-xl flex items-center justify-between transition-colors font-poppins">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <Wallet size={12} className="text-[var(--accent-yellow)]" /> Bank Transfer <span className="opacity-50 font-sans tracking-widest">({balance.bank_last4 || '****'})</span>
                    </p>
                    <p className="text-[13px] text-[var(--accent-red)] uppercase tracking-widest font-bold mt-1.5">
                      {p.payout_status}
                    </p>
                  </div>
                  <span className="text-[13px] font-sans font-bold text-[var(--text-primary)] tracking-widest">
                    ${p.amount.toFixed(2)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
