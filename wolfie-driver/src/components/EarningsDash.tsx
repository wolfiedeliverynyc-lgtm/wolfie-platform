import React, { useState } from 'react';
import { 
  ArrowLeft, Calendar, ChevronDown, ChevronRight, TrendingUp, Search, SlidersHorizontal
} from 'lucide-react';
import { useDriverStore } from '../store/useDriverStore';

interface EarningsDashProps {
  onBack?: () => void;
}

export default function EarningsDash({ onBack }: EarningsDashProps) {
  const { wallet, completedTrips, performance } = useDriverStore();
  const [activeSubTab, setActiveSubTab] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'HIGH_PAY' | 'LONG_DIST'>('ALL');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Compute live mathematical equivalents based on actual completed trips
  // In a real app we'd filter completedTrips by today. For now we use the sum of completed trips for today.
  const todayTrips = completedTrips; // Assuming all completed trips are today for simulation
  const todayEarnings = todayTrips.reduce((acc, curr) => acc + curr.payout + curr.tip, 0);
  const todayDeliveries = todayTrips.length;
  
  // Baseline static stats for the layout
  const BASE_EARNINGS = 128.45;
  const BASE_DELIVERIES = 4;
  const BASE_MINUTES = 272; // 4h 32m

  const BASE_PAY_VAL = 24.00;
  const BASE_DIST_VAL = 18.25;
  const BASE_TIME_VAL = 12.40;
  const BASE_TIPS_VAL = 73.80;

  const displayTotalToday = BASE_EARNINGS + todayEarnings;
  const displayDeliveriesCount = BASE_DELIVERIES + todayDeliveries;
  const displayMinutes = BASE_MINUTES + (performance.activeHoursToday * 60);
  
  const formatMinutesStr = (m: number) => {
    const hours = Math.floor(m / 60);
    const minutes = Math.floor(m % 60);
    return `${hours}h ${minutes}m`;
  };
  const displayOnlineTimeStr = formatMinutesStr(displayMinutes);

  const displayAvgPerOrder = displayDeliveriesCount > 0 ? (displayTotalToday / displayDeliveriesCount) : 0;

  const displayBasePay = BASE_PAY_VAL + (todayEarnings * 0.40);
  const displayDistancePay = BASE_DIST_VAL + (todayEarnings * 0.25);
  const displayTimePay = BASE_TIME_VAL + (todayEarnings * 0.15);
  const displayTips = BASE_TIPS_VAL + (todayEarnings * 0.20);

  const getTodayDateStr = () => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const d = new Date();
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };
  const currentDateFormatted = getTodayDateStr();

  // Weekly panel aggregates from Zustand wallet
  const weeklyHistoryTotal = wallet.weeklyEarnings.reduce((prev, curr) => prev + curr.amount, 0);
  const weeklyHistoryDeliveries = wallet.weeklyEarnings.reduce((prev, curr) => prev + curr.deliveries, 0);
  const displayWeeklyTotal = weeklyHistoryTotal + todayEarnings;
  const displayWeeklyDeliveries = weeklyHistoryDeliveries + todayDeliveries;

  const displayMonthlyTotal = 2480.00 + displayWeeklyTotal;
  const displayMonthlyDeliveries = 184 + displayWeeklyDeliveries;

  return (
    <div id="earnings-page-content" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] space-y-4 pb-2">
      <div className="relative flex items-center justify-between pb-3 border-b border-slate-900">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-100 hover:bg-slate-900 transition-all cursor-pointer shadow-md" title="Back to Home Dashboard">
          <ArrowLeft className="w-5 h-5 text-slate-200 stroke-[2.5px]" />
        </button>
        <h2 className="text-base font-extrabold tracking-tight text-white font-sans">Earnings</h2>
        <div className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-300 shadow-md">
          <Calendar className="w-4.5 h-4.5 text-slate-200" />
        </div>
      </div>

      <div className="bg-[#0c0d1c] p-1 rounded-[18px] border border-slate-900/60 flex w-full">
        <button onClick={() => { setActiveSubTab('DAILY'); setShowLogs(false); }} className={`flex-1 font-bold text-xs py-2.5 rounded-xl text-center transition-all cursor-pointer ${activeSubTab === 'DAILY' ? 'bg-[#f05523] text-white shadow-md font-extrabold' : 'text-slate-400 hover:text-slate-200'}`}>Daily</button>
        <button onClick={() => { setActiveSubTab('WEEKLY'); setShowLogs(false); }} className={`flex-1 font-bold text-xs py-2.5 rounded-xl text-center transition-all cursor-pointer ${activeSubTab === 'WEEKLY' ? 'bg-[#f05523] text-white shadow-md font-extrabold' : 'text-slate-400 hover:text-slate-200'}`}>Weekly</button>
        <button onClick={() => { setActiveSubTab('MONTHLY'); setShowLogs(false); }} className={`flex-1 font-bold text-xs py-2.5 rounded-xl text-center transition-all cursor-pointer ${activeSubTab === 'MONTHLY' ? 'bg-[#f05523] text-white shadow-md font-extrabold' : 'text-slate-400 hover:text-slate-200'}`}>Monthly</button>
      </div>

      {activeSubTab === 'DAILY' && !showLogs && (
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.25s_ease-out]">
          <div className="bg-[#0b0c1e] p-5 rounded-[28px] border border-slate-900/80 flex items-center justify-between gap-3 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"></div>
            <div>
              <div className="flex items-center gap-1 cursor-pointer group">
                <span className="font-extrabold text-[15px] text-white">Today</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-y-0.5 stroke-[2.5px]" />
              </div>
              <p className="text-[12px] text-slate-400 font-bold leading-tight mt-1">{currentDateFormatted}</p>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-black text-white tracking-tight font-sans">${displayTotalToday.toFixed(2)}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5 font-sans">Total Earnings</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#080916] border border-slate-900 rounded-[20px] p-3.5 text-center flex flex-col justify-center items-center shadow-md">
              <span className="text-xl font-black text-white tracking-tight font-sans">{displayDeliveriesCount}</span>
              <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">Orders</span>
            </div>
            <div className="bg-[#080916] border border-slate-900 rounded-[20px] p-3.5 text-center flex flex-col justify-center items-center shadow-md">
              <span className="text-base font-black text-white tracking-tight font-sans leading-none pb-0.5 pt-0.5">{displayOnlineTimeStr}</span>
              <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">Online Time</span>
            </div>
            <div className="bg-[#080916] border border-slate-900 rounded-[20px] p-3.5 text-center flex flex-col justify-center items-center shadow-md">
              <span className="text-[15px] font-black text-white tracking-tight font-sans">${displayAvgPerOrder.toFixed(2)}</span>
              <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1.5 leading-none">Avg per Order</span>
            </div>
          </div>

          <div className="bg-[#0b0c1e] border border-slate-900/80 rounded-[28px] p-5 space-y-4.5 shadow-lg">
            <h4 className="text-xs font-black text-slate-350 tracking-wider font-sans uppercase">Earnings Breakdown</h4>
            <div className="space-y-3.5 pt-0.5 text-[13px] font-bold">
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Base Pay</span><span className="text-slate-100 font-mono">${displayBasePay.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Distance Pay</span><span className="text-slate-100 font-mono">${displayDistancePay.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Time Pay</span><span className="text-slate-100 font-mono">${displayTimePay.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Tips</span><span className="text-slate-100 font-mono">${displayTips.toFixed(2)}</span></div>
            </div>
          </div>

          <button onClick={() => setShowLogs(true)} className="bg-[#0c0d1c] hover:bg-[#11122a] border border-slate-900 p-5 rounded-[24px] flex items-center justify-between text-left transition-all cursor-pointer shadow-md group active:scale-[0.99] w-full">
            <span className="text-sm font-extrabold text-slate-100 font-sans tracking-tight">View Earnings History</span>
            <ChevronRight className="w-5 h-5 text-slate-400 stroke-[2.5px] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {activeSubTab === 'WEEKLY' && !showLogs && (
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.25s_ease-out]">
          <div className="bg-[#0b0c1e] p-5 rounded-[28px] border border-slate-900/80 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="font-extrabold text-[15px] text-white">This Week</span>
              <p className="text-[12px] text-slate-400 font-bold mt-1">Active</p>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-black text-white tracking-tight">${displayWeeklyTotal.toFixed(2)}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Weekly Earnings</p>
            </div>
          </div>

          <div className="bg-[#080916] border border-slate-900 rounded-[28px] p-5 space-y-4 shadow-lg">
            <div className="flex justify-between items-center pb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Income Trend</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />+18.4% vs last week</span>
            </div>
            <div className="h-44 w-full relative flex items-end justify-between pt-6 px-1">
              {wallet.weeklyEarnings.map((day, idx) => {
                const heightPercent = `${Math.max(15, (day.amount / 250) * 85)}%`;
                return (
                  <div key={`hist-${idx}`} className="flex-1 flex flex-col items-center group relative h-full justify-end z-10 px-1">
                    <div className="absolute bottom-[104%] bg-black border border-slate-800 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">${day.amount.toFixed(2)}</div>
                    <div style={{ height: heightPercent }} className="w-full bg-slate-800 hover:bg-[#f05523] rounded-md transition-all duration-300 relative overflow-hidden"><div className="h-0.5 bg-orange-400 w-full opacity-50"></div></div>
                    <span className="text-[10px] text-slate-400 font-bold mt-2 font-mono uppercase">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-[#0b0c1e] p-4.5 border border-slate-900/80 rounded-[24px] flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Total Trips Completed</span>
            <span className="text-white bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">{displayWeeklyDeliveries} trips</span>
          </div>
        </div>
      )}

      {activeSubTab === 'MONTHLY' && !showLogs && (
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.25s_ease-out]">
          <div className="bg-[#0b0c1e] p-5 rounded-[28px] border border-slate-900/80 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="font-extrabold text-[15px] text-white">Active Month</span>
              <p className="text-[12px] text-slate-400 font-bold mt-1">Current</p>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-black text-white tracking-tight">${displayMonthlyTotal.toFixed(2)}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">Monthly Balance</p>
            </div>
          </div>
          <div className="bg-[#0b0c1e] border border-slate-900/80 rounded-[28px] p-5 space-y-4 shadow-lg">
            <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase">Monthly Aggregates</h4>
            <div className="space-y-3.5 text-[13px] font-bold">
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Completed Deliveries</span><span className="text-slate-200">{displayMonthlyDeliveries} trips</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Estimated Driving Time</span><span className="text-slate-200">142 hrs 10 mins</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Average Payout per Mile</span><span className="text-emerald-450 text-emerald-400">$3.82 / mi</span></div>
              <div className="flex justify-between items-center border-t border-slate-900/60 pt-3.5"><span className="text-slate-200">Deposits Sent to Bank</span><span className="text-[#f05523] font-mono">${(displayMonthlyTotal - displayWeeklyTotal).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      )}

      {showLogs && (
        <div className="bg-transparent min-h-[500px] flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out] space-y-4 pb-2">
          <div className="relative flex items-center justify-between pb-1 border-b border-transparent">
            <button onClick={() => { setShowLogs(false); setExpandedDay(null); }} className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-150 hover:bg-slate-900 transition-all cursor-pointer shadow-md" title="Return to Earnings"><ArrowLeft className="w-5 h-5 text-slate-100 stroke-[2.5px]" /></button>
            <h2 className="text-[17px] font-extrabold text-white font-sans tracking-tight">Earnings History</h2>
            <button onClick={() => setShowFilters(!showFilters)} className={`w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-200 hover:text-orange-500 transition-all cursor-pointer shadow-md ${showFilters ? 'text-orange-500 border-orange-500/20 bg-orange-500/5' : ''}`} title="Filters"><SlidersHorizontal className="w-4.5 h-4.5 stroke-[2.5px]" /></button>
          </div>

          {showFilters && (
            <div className="bg-[#0b0c1e] border border-slate-900/80 p-4 rounded-2xl space-y-3.5 animate-[fadeIn_0.15s_ease-out] text-xs font-bold shadow-lg">
              <div className="flex justify-between items-center"><span className="text-slate-400">Filter Trips by Criteria</span><button onClick={() => { setFilterType('ALL'); setSearchTerm(''); }} className="text-[11px] text-[#f05523] uppercase cursor-pointer">Reset</button></div>
              <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Search store name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#080916] border border-slate-900 rounded-xl pl-9 pr-4 py-2 text-[11px] text-slate-150 focus:outline-none focus:border-[#f05523] focus:ring-1 focus:ring-[#f05523]/30" /></div>
              <div className="flex gap-1.5 pt-1">
                <button onClick={() => setFilterType('ALL')} className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${filterType === 'ALL' ? 'bg-[#f05523] text-white' : 'bg-[#080916] text-slate-400 border border-slate-900'}`}>All Days</button>
                <button onClick={() => setFilterType('HIGH_PAY')} className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${filterType === 'HIGH_PAY' ? 'bg-[#f05523] text-white' : 'bg-[#080916] text-slate-400 border border-slate-900'}`}>High Pay ($12+)</button>
                <button onClick={() => setFilterType('LONG_DIST')} className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${filterType === 'LONG_DIST' ? 'bg-[#f05523] text-white' : 'bg-[#080916] text-slate-400 border border-slate-900'}`}>Far Delivery</button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-1 text-sm font-sans font-bold">
            <span className="font-extrabold text-white text-[15px]">Active Month</span>
            <span className="font-bold text-slate-400 text-xs">Total: <span className="font-mono text-white text-sm font-black">${(1247.30 + todayEarnings).toFixed(2)}</span></span>
          </div>

          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] overflow-hidden shadow-2xl">
            <div className="divide-y divide-slate-900/60">
              {[
                { date: 'Today', ordersCount: displayDeliveriesCount, rawAmount: displayTotalToday, itemsKey: 'today' },
                { date: 'Yesterday', ordersCount: 6, rawAmount: 186.50, itemsKey: 'may12' },
              ].map((day) => {
                const isExpanded = expandedDay === day.date;
                let dayTrips: any[] = [];
                if (day.itemsKey === 'today') {
                  dayTrips = todayTrips.length > 0 ? todayTrips.map(t => ({ id: t.id, storeName: t.restaurantName, totalPay: t.payout + t.tip, distance: t.distanceKm, completedAt: t.date ? new Date(t.date).toLocaleTimeString() : 'Recently' })) : [
                    { id: 'TRIP-8750', storeName: 'Pizza Palace', totalPay: 8.75, distance: 1.8, completedAt: '03:14 PM' },
                    { id: 'TRIP-1294', storeName: 'Burger Queen', totalPay: 15.20, distance: 2.1, completedAt: '12:44 PM' }
                  ];
                } else {
                  dayTrips = [
                    { id: 'TRIP-2938', storeName: 'Sushi Star', totalPay: 22.40, distance: 2.4, completedAt: '08:12 PM' },
                    { id: 'TRIP-5847', storeName: 'Pizza Palace', totalPay: 19.50, distance: 1.9, completedAt: '06:15 PM' }
                  ];
                }

                const matchesFilters = dayTrips.filter(t => {
                  if (searchTerm && !t.storeName.toLowerCase().includes(searchTerm.toLowerCase()) && !t.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                  if (filterType === 'HIGH_PAY' && t.totalPay < 12) return false;
                  if (filterType === 'LONG_DIST' && t.distance < 1.5) return false;
                  return true;
                });

                return (
                  <div key={day.date} className="w-full">
                    <div onClick={() => setExpandedDay(isExpanded ? null : day.date)} className="flex items-center justify-between py-4 px-5 hover:bg-slate-900/35 transition-all cursor-pointer font-sans select-none">
                      <span className="text-[13.5px] font-bold text-slate-350 tracking-tight">{day.date}</span>
                      <span className="text-[12.5px] font-bold text-slate-500">{day.ordersCount} Orders</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[13.5px] font-extrabold text-white font-mono">${day.rawAmount.toFixed(2)}</span>
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isExpanded ? 'rotate-90 text-[#f05523]' : ''} stroke-[3px]`} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-[#080916] px-5 py-4 space-y-3 border-t border-slate-900/50">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-900/50">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Detailed Trip Summary</span>
                          <span className="text-[9px] font-bold text-slate-500">{matchesFilters.length} of {dayTrips.length} matched</span>
                        </div>
                        {matchesFilters.length === 0 ? (
                          <p className="text-[11px] text-slate-500 text-center py-2">No trips match your search/filter.</p>
                        ) : (
                          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-0.5 scrollbar-thin">
                            {matchesFilters.map((trip) => (
                              <div key={trip.id} className="p-3 bg-slate-950/40 border border-slate-900/70 rounded-xl flex items-center justify-between hover:border-slate-800 transition-all">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-black text-slate-200">{trip.storeName}</span>
                                    <span className="text-[8.5px] font-mono text-slate-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-850/50">{trip.id}</span>
                                  </div>
                                  <p className="text-[9.5px] text-slate-500 font-extrabold mt-1">{trip.distance} mi • Completed at {trip.completedAt}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[11px] font-extrabold font-mono text-slate-200">${trip.totalPay.toFixed(2)}</span>
                                  <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/5 px-1 py-0.2 rounded mt-0.5 uppercase tracking-wider block">Delivered</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-center py-2"><p className="text-[10px] text-slate-500 font-extrabold tracking-wide uppercase">💡 Tip: Click on any row to expand specific orders</p></div>
        </div>
      )}
    </div>
  );
}
