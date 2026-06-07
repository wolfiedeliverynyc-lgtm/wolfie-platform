import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Search, 
  Filter,
  DollarSign,
  Briefcase,
  SlidersHorizontal
} from 'lucide-react';
import { EarningSummary, Order } from '../types';

interface EarningsDashProps {
  summary: EarningSummary;
  onBack?: () => void;
}

export default function EarningsDash({ summary, onBack }: EarningsDashProps) {
  const [activeSubTab, setActiveSubTab] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'HIGH_PAY' | 'LONG_DIST'>('ALL');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Exact matching baseline metrics from photograph
  const BASE_EARNINGS = 128.45;
  const BASE_DELIVERIES = 4;
  const BASE_MINUTES = 272; // 4h 32m

  const BASE_PAY_VAL = 24.00;
  const BASE_DIST_VAL = 18.25;
  const BASE_TIME_VAL = 12.40;
  const BASE_TIPS_VAL = 73.80;

  // Compute live mathematical equivalents
  const displayTotalToday = BASE_EARNINGS + summary.todayEarnings;
  const displayDeliveriesCount = BASE_DELIVERIES + summary.todayDeliveries;
  const displayMinutes = BASE_MINUTES + summary.todayTimeMinutes;
  
  // Convert minutes to clean duration string (e.g. "4h 32m")
  const formatMinutesStr = (m: number) => {
    const hours = Math.floor(m / 60);
    const minutes = m % 60;
    return `${hours}h ${minutes}m`;
  };
  const displayOnlineTimeStr = formatMinutesStr(displayMinutes);

  // Dynamic Average per Order
  const displayAvgPerOrder = displayDeliveriesCount > 0 
    ? (displayTotalToday / displayDeliveriesCount) 
    : 0;

  // Fully balanced distribution breakdown math
  const displayBasePay = BASE_PAY_VAL + (summary.todayEarnings * 0.40);
  const displayDistancePay = BASE_DIST_VAL + (summary.todayEarnings * 0.25);
  const displayTimePay = BASE_TIME_VAL + (summary.todayEarnings * 0.15);
  const displayTips = BASE_TIPS_VAL + (summary.todayEarnings * 0.20);

  // Fetch the real formatting for Today's Date element
  const getTodayDateStr = () => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const d = new Date();
    // Default fallback to "May 13, 2024" format but utilizing active local time
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };
  const currentDateFormatted = getTodayDateStr();

  // Weekly panel aggregates (summing the weekly list + today's dynamically)
  const weeklyHistoryTotal = summary.weeklyHistory.reduce((prev, curr) => prev + curr.amount, 0);
  const weeklyHistoryDeliveries = summary.weeklyHistory.reduce((prev, curr) => prev + curr.deliveries, 0);
  const displayWeeklyTotal = weeklyHistoryTotal + summary.todayEarnings;
  const displayWeeklyDeliveries = weeklyHistoryDeliveries + summary.todayDeliveries;

  // Monthly panel aggregates (representing May or active month)
  const displayMonthlyTotal = 2480.00 + displayWeeklyTotal;
  const displayMonthlyDeliveries = 184 + displayWeeklyDeliveries;

  // Filter & search of historical logs
  const filteredOrders = summary.orderHistory.filter((order) => {
    const matchesSearch =
      order.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'HIGH_PAY') {
      return order.totalPay >= 12;
    }
    if (filterType === 'LONG_DIST') {
      return order.distance >= 1.5;
    }
    return true;
  });

  return (
    <div id="earnings-page-content" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] space-y-4 pb-2">
      
      {/* HEADER BLOCK (exact matching picture style) */}
      <div className="relative flex items-center justify-between pb-3 border-b border-slate-900">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-100 hover:bg-slate-900 transition-all cursor-pointer shadow-md"
          title="Back to Home Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-slate-200 stroke-[2.5px]" />
        </button>
        <h2 className="text-base font-extrabold tracking-tight text-white font-sans">
          Earnings
        </h2>
        <div className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-300 shadow-md">
          <Calendar className="w-4.5 h-4.5 text-slate-200" />
        </div>
      </div>

      {/* SEGMENTED TABS CONTROLLER (matching photograph pill selector) */}
      <div className="bg-[#0c0d1c] p-1 rounded-[18px] border border-slate-900/60 flex w-full">
        <button
          onClick={() => { setActiveSubTab('DAILY'); setShowLogs(false); }}
          className={`flex-1 font-bold text-xs py-2.5 rounded-xl text-center transition-all cursor-pointer ${
            activeSubTab === 'DAILY'
              ? 'bg-[#f05523] text-white shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => { setActiveSubTab('WEEKLY'); setShowLogs(false); }}
          className={`flex-1 font-bold text-xs py-2.5 rounded-xl text-center transition-all cursor-pointer ${
            activeSubTab === 'WEEKLY'
              ? 'bg-[#f05523] text-white shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => { setActiveSubTab('MONTHLY'); setShowLogs(false); }}
          className={`flex-1 font-bold text-xs py-2.5 rounded-xl text-center transition-all cursor-pointer ${
            activeSubTab === 'MONTHLY'
              ? 'bg-[#f05523] text-white shadow-md font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* RENDER DYNAMIC SEGMENTS */}
      {activeSubTab === 'DAILY' && !showLogs && (
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.25s_ease-out]">
          
          {/* TOTAL EARNINGS TODAY BOX HERO PANEL */}
          <div className="bg-[#0b0c1e] p-5 rounded-[28px] border border-slate-900/80 flex items-center justify-between gap-3 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl"></div>
            <div>
              <div className="flex items-center gap-1 cursor-pointer group">
                <span className="font-extrabold text-[15px] text-white">Today</span>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-y-0.5 stroke-[2.5px]" />
              </div>
              <p className="text-[12px] text-slate-400 font-bold leading-tight mt-1">
                {currentDateFormatted}
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-black text-white tracking-tight font-sans">
                ${displayTotalToday.toFixed(2)}
              </h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5 font-sans">
                Total Earnings
              </p>
            </div>
          </div>

          {/* THREE COLUMN STAT TILES ROW */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Orders Tile */}
            <div className="bg-[#080916] border border-slate-900 rounded-[20px] p-3.5 text-center flex flex-col justify-center items-center shadow-md">
              <span className="text-xl font-black text-white tracking-tight font-sans">
                {displayDeliveriesCount}
              </span>
              <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">
                Orders
              </span>
            </div>

            {/* Online Duration Tile */}
            <div className="bg-[#080916] border border-slate-900 rounded-[20px] p-3.5 text-center flex flex-col justify-center items-center shadow-md">
              <span className="text-base font-black text-white tracking-tight font-sans leading-none pb-0.5 pt-0.5">
                {displayOnlineTimeStr}
              </span>
              <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">
                Online Time
              </span>
            </div>

            {/* Avg per Order Tile */}
            <div className="bg-[#080916] border border-slate-900 rounded-[20px] p-3.5 text-center flex flex-col justify-center items-center shadow-md">
              <span className="text-[15px] font-black text-white tracking-tight font-sans">
                ${displayAvgPerOrder.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1.5 leading-none">
                Avg per Order
              </span>
            </div>
          </div>

          {/* EARNINGS BREAKDOWN ITEM LIST CARD */}
          <div className="bg-[#0b0c1e] border border-slate-900/80 rounded-[28px] p-5 space-y-4.5 shadow-lg">
            <h4 className="text-xs font-black text-slate-350 tracking-wider font-sans uppercase">
              Earnings Breakdown
            </h4>

            <div className="space-y-3.5 pt-0.5 text-[13px] font-bold">
              {/* Base Pay Row */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Base Pay</span>
                <span className="text-slate-100 font-mono">${displayBasePay.toFixed(2)}</span>
              </div>

              {/* Distance Pay Row */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Distance Pay</span>
                <span className="text-slate-100 font-mono">${displayDistancePay.toFixed(2)}</span>
              </div>

              {/* Time Pay Row */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Time Pay</span>
                <span className="text-slate-100 font-mono">${displayTimePay.toFixed(2)}</span>
              </div>

              {/* Tips Row */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Tips</span>
                <span className="text-slate-100 font-mono">${displayTips.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* CLICKABLE TRIGGER FOR EXPANDING HISTORIC LOGS LIST */}
          <button
            onClick={() => setShowLogs(true)}
            className="bg-[#0c0d1c] hover:bg-[#11122a] border border-slate-900 p-5 rounded-[24px] flex items-center justify-between text-left transition-all cursor-pointer shadow-md group active:scale-[0.99] w-full"
          >
            <span className="text-sm font-extrabold text-slate-100 font-sans tracking-tight">
              View Earnings History
            </span>
            <ChevronRight className="w-5 h-5 text-slate-400 stroke-[2.5px] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {/* WEEKLY TREND SEGMENT */}
      {activeSubTab === 'WEEKLY' && !showLogs && (
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.25s_ease-out]">
          
          {/* TOTAL WEEKLY REVENUE PANEL */}
          <div className="bg-[#0b0c1e] p-5 rounded-[28px] border border-slate-900/80 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="font-extrabold text-[15px] text-white">This Week</span>
              <p className="text-[12px] text-slate-400 font-bold mt-1">May 24 – May 30</p>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-black text-white tracking-tight">
                ${displayWeeklyTotal.toFixed(2)}
              </h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">
                Weekly Earnings
              </p>
            </div>
          </div>

          {/* WEEKLY BAR GRAPH SVG TREND */}
          <div className="bg-[#080916] border border-slate-900 rounded-[28px] p-5 space-y-4 shadow-lg">
            <div className="flex justify-between items-center pb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Daily Income Trend
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +18.4% vs last week
              </span>
            </div>

            {/* Simulated bar representations */}
            <div className="h-44 w-full relative flex items-end justify-between pt-6 px-1">
              {summary.weeklyHistory.map((day, idx) => {
                const heightPercent = `${Math.max(15, (day.amount / 250) * 85)}%`;
                return (
                  <div key={`hist-chart-bar-${idx}`} className="flex-1 flex flex-col items-center group relative h-full justify-end z-10 px-1">
                    <div className="absolute bottom-[104%] bg-black border border-slate-800 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      ${day.amount.toFixed(2)}
                    </div>
                    <div
                      style={{ height: heightPercent }}
                      className="w-full bg-slate-800 hover:bg-[#f05523] rounded-md transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="h-0.5 bg-orange-400 w-full opacity-50"></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold mt-2 font-mono uppercase">
                      {day.date}
                    </span>
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

      {/* MONTHLY TREND SEGMENT */}
      {activeSubTab === 'MONTHLY' && !showLogs && (
        <div className="space-y-4 flex flex-col flex-1 animate-[fadeIn_0.25s_ease-out]">
          
          {/* TOTAL MONTHLY REVENUE PANEL */}
          <div className="bg-[#0b0c1e] p-5 rounded-[28px] border border-slate-900/80 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <span className="font-extrabold text-[15px] text-white">Active Month</span>
              <p className="text-[12px] text-slate-400 font-bold mt-1">May 2026</p>
            </div>
            <div className="text-right">
              <h3 className="text-3xl font-black text-white tracking-tight">
                ${displayMonthlyTotal.toFixed(2)}
              </h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-0.5">
                Monthly Balance
              </p>
            </div>
          </div>

          {/* SUMMARY PILL REPORT METRIC SPLIT */}
          <div className="bg-[#0b0c1e] border border-slate-900/80 rounded-[28px] p-5 space-y-4 shadow-lg">
            <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase">
              Monthly Aggregates
            </h4>

            <div className="space-y-3.5 text-[13px] font-bold">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Completed Deliveries</span>
                <span className="text-slate-200">{displayMonthlyDeliveries} trips</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Estimated Driving Time</span>
                <span className="text-slate-200">142 hrs 10 mins</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Average Payout per Mile</span>
                <span className="text-emerald-450 text-emerald-400">$3.82 / mi</span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-900/60 pt-3.5">
                <span className="text-slate-200">Deposits Sent to Bank</span>
                <span className="text-[#f05523] font-mono">${(displayMonthlyTotal - displayWeeklyTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERABLE LIST VIEW FOR ORDER HISTORIES (Slide Open / Expanded state) */}
      {showLogs && (
        <div className="bg-transparent min-h-[500px] flex flex-col flex-1 animate-[fadeIn_0.2s_ease-out] space-y-4 pb-2">
          
          {/* HEADER (exact MATCH with the screenshot!) */}
          <div className="relative flex items-center justify-between pb-1 border-b border-transparent">
            {/* Left Button with chevron arrow */}
            <button
              onClick={() => { setShowLogs(false); setExpandedDay(null); }}
              className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-150 hover:bg-slate-900 transition-all cursor-pointer shadow-md"
              title="Return to Earnings"
            >
              <ArrowLeft className="w-5 h-5 text-slate-100 stroke-[2.5px]" />
            </button>
            
            {/* Title */}
            <h2 className="text-[17px] font-extrabold text-white font-sans tracking-tight">
              Earnings History
            </h2>
            
            {/* Right Button (Sliders / Filters) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-200 hover:text-orange-500 transition-all cursor-pointer shadow-md ${showFilters ? 'text-orange-500 border-orange-500/20 bg-orange-500/5' : ''}`}
              title="Filters"
            >
              <SlidersHorizontal className="w-4.5 h-4.5 stroke-[2.5px]" />
            </button>
          </div>

          {/* DYNAMIC OR COLLAPSIBLE FILTER CONTROLS */}
          {showFilters && (
            <div className="bg-[#0b0c1e] border border-slate-900/80 p-4 rounded-2xl space-y-3.5 animate-[fadeIn_0.15s_ease-out] text-xs font-bold shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Filter Trips by Criteria</span>
                <button 
                  onClick={() => { setFilterType('ALL'); setSearchTerm(''); }}
                  className="text-[11px] text-[#f05523] uppercase"
                >
                  Reset
                </button>
              </div>

              {/* SEARCH */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search store name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#080916] border border-slate-900 rounded-xl pl-9 pr-4 py-2 text-[11px] text-slate-150 focus:outline-none focus:border-[#f05523] focus:ring-1 focus:ring-[#f05523]/30"
                />
              </div>

              {/* CHIP SELECTION */}
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    filterType === 'ALL' ? 'bg-[#f05523] text-white' : 'bg-[#080916] text-slate-400 border border-slate-900'
                  }`}
                >
                  All Days
                </button>
                <button
                  onClick={() => setFilterType('HIGH_PAY')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    filterType === 'HIGH_PAY' ? 'bg-[#f05523] text-white' : 'bg-[#080916] text-slate-400 border border-slate-900'
                  }`}
                >
                  High Pay ($12+)
                </button>
                <button
                  onClick={() => setFilterType('LONG_DIST')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    filterType === 'LONG_DIST' ? 'bg-[#f05523] text-white' : 'bg-[#080916] text-slate-400 border border-slate-900'
                  }`}
                >
                  Far Delivery
                </button>
              </div>
            </div>
          )}

          {/* MONTH & MONTH TOTAL HEADER ROW (exact match with photo style!) */}
          <div className="flex items-center justify-between px-1 text-sm font-sans font-bold">
            <span className="font-extrabold text-white text-[15px]">May 2024</span>
            <span className="font-bold text-slate-400 text-xs">
              Total: <span className="font-mono text-white text-sm font-black">${(1247.30 + summary.todayEarnings).toFixed(2)}</span>
            </span>
          </div>

          {/* EARNINGS GRID TABLE CONTAINER WITH THIN DIVIDERS (matching screenshot EXACTLY) */}
          <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] overflow-hidden shadow-2xl">
            <div className="divide-y divide-slate-900/60">
              
              {/* ITERATIVE DAYS LIST */}
              {[
                { date: 'May 13, 2024', ordersCount: displayDeliveriesCount, rawAmount: displayTotalToday, itemsKey: 'today' },
                { date: 'May 12, 2024', ordersCount: 6, rawAmount: 186.50, itemsKey: 'may12' },
                { date: 'May 11, 2024', ordersCount: 5, rawAmount: 142.30, itemsKey: 'may11' },
                { date: 'May 10, 2024', ordersCount: 4, rawAmount: 175.00, itemsKey: 'may10' },
                { date: 'May 9, 2024', ordersCount: 3, rawAmount: 95.20, itemsKey: 'may9' },
                { date: 'May 8, 2024', ordersCount: 4, rawAmount: 138.75, itemsKey: 'may8' }
              ].map((day) => {
                const isExpanded = expandedDay === day.date;
                
                // Construct realistic sub-orders list depending on day
                let dayTrips: any[] = [];
                if (day.itemsKey === 'today') {
                  // Mix of current summary orderHistory and baseline
                  dayTrips = summary.orderHistory.length > 0 
                    ? [...summary.orderHistory]
                    : [
                        { id: 'TRIP-8750', storeName: 'Pizza Palace', totalPay: 8.75, distance: 1.8, completedAt: '03:14 PM' },
                        { id: 'TRIP-1294', storeName: 'Burger Queen', totalPay: 15.20, distance: 2.1, completedAt: '12:44 PM' },
                        { id: 'TRIP-3392', storeName: 'Taco Town', totalPay: 11.50, distance: 1.3, completedAt: '11:15 AM' },
                        { id: 'TRIP-9081', storeName: 'Wok Walk', totalPay: 93.00, distance: 3.5, completedAt: '10:02 AM' }
                      ];
                } else if (day.itemsKey === 'may12') {
                  dayTrips = [
                    { id: 'TRIP-2938', storeName: 'Sushi Star', totalPay: 22.40, distance: 2.4, completedAt: '08:12 PM' },
                    { id: 'TRIP-5847', storeName: 'Pizza Palace', totalPay: 19.50, distance: 1.9, completedAt: '06:15 PM' },
                    { id: 'TRIP-3091', storeName: 'Taco Town', totalPay: 14.20, distance: 1.1, completedAt: '04:30 PM' },
                    { id: 'TRIP-1234', storeName: 'Burger Queen', totalPay: 12.80, distance: 1.5, completedAt: '02:10 PM' },
                    { id: 'TRIP-7462', storeName: 'Wok Walk', totalPay: 35.60, distance: 4.2, completedAt: '12:15 PM' },
                    { id: 'TRIP-8371', storeName: 'Salad Spot', totalPay: 82.00, distance: 2.0, completedAt: '10:30 AM' }
                  ];
                } else if (day.itemsKey === 'may11') {
                  dayTrips = [
                    { id: 'TRIP-3021', storeName: 'Salad Spot', totalPay: 18.50, distance: 1.6, completedAt: '07:44 PM' },
                    { id: 'TRIP-4910', storeName: 'Taco Town', totalPay: 15.30, distance: 1.2, completedAt: '05:22 PM' },
                    { id: 'TRIP-1930', storeName: 'Burger Queen', totalPay: 25.00, distance: 3.1, completedAt: '03:10 PM' },
                    { id: 'TRIP-9302', storeName: 'Wok Walk', totalPay: 11.50, distance: 1.0, completedAt: '01:05 PM' },
                    { id: 'TRIP-4903', storeName: 'Sushi Star', totalPay: 72.00, distance: 2.8, completedAt: '11:15 AM' }
                  ];
                } else if (day.itemsKey === 'may10') {
                  dayTrips = [
                    { id: 'TRIP-1102', storeName: 'Pizza Palace', totalPay: 32.50, distance: 2.2, completedAt: '09:12 PM' },
                    { id: 'TRIP-8492', storeName: 'Sushi Star', totalPay: 45.00, distance: 3.8, completedAt: '07:15 PM' },
                    { id: 'TRIP-3901', storeName: 'Taco Town', totalPay: 18.50, distance: 1.4, completedAt: '05:10 PM' },
                    { id: 'TRIP-8592', storeName: 'Burger Queen', totalPay: 79.00, distance: 4.1, completedAt: '02:30 PM' }
                  ];
                } else if (day.itemsKey === 'may9') {
                  dayTrips = [
                    { id: 'TRIP-2195', storeName: 'Wok Walk', totalPay: 22.10, distance: 2.3, completedAt: '08:15 PM' },
                    { id: 'TRIP-4921', storeName: 'Burger Queen', totalPay: 18.50, distance: 1.5, completedAt: '06:12 PM' },
                    { id: 'TRIP-5903', storeName: 'Salad Spot', totalPay: 54.60, distance: 3.0, completedAt: '03:10 PM' }
                  ];
                } else {
                  dayTrips = [
                    { id: 'TRIP-8591', storeName: 'Pizza Palace', totalPay: 24.50, distance: 2.1, completedAt: '08:45 PM' },
                    { id: 'TRIP-4012', storeName: 'Taco Town', totalPay: 19.25, distance: 1.2, completedAt: '06:15 PM' },
                    { id: 'TRIP-5021', storeName: 'Burger Queen', totalPay: 15.00, distance: 1.6, completedAt: '04:10 PM' },
                    { id: 'TRIP-9321', storeName: 'Sushi Star', totalPay: 80.00, distance: 3.9, completedAt: '01:15 PM' }
                  ];
                }

                // Filter on search term or constraints in expanded lists
                const matchesFilters = dayTrips.filter(t => {
                  if (searchTerm && !t.storeName.toLowerCase().includes(searchTerm.toLowerCase()) && !t.id.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                  }
                  if (filterType === 'HIGH_PAY' && t.totalPay < 12) return false;
                  if (filterType === 'LONG_DIST' && t.distance < 1.5) return false;
                  return true;
                });

                return (
                  <div key={day.date} className="w-full">
                    {/* Row Item clickable (Matches screenshot perfectly) */}
                    <div
                      onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                      className="flex items-center justify-between py-4 px-5 hover:bg-slate-900/35 transition-all cursor-pointer font-sans select-none"
                    >
                      {/* Left: Date */}
                      <span className="text-[13.5px] font-bold text-slate-350 tracking-tight">
                        {day.date}
                      </span>

                      {/* Center: Orders count */}
                      <span className="text-[12.5px] font-bold text-slate-500">
                        {day.ordersCount} Orders
                      </span>

                      {/* Right: Amount & Chevron */}
                      <div className="flex items-center gap-1">
                        <span className="text-[13.5px] font-extrabold text-white font-mono">
                          ${day.rawAmount.toFixed(2)}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isExpanded ? 'rotate-90 text-[#f05523]' : ''} stroke-[3px]`} />
                      </div>
                    </div>

                    {/* EXPANDED VIEW AREA FOR DETAILED SUB-TRIPS */}
                    {isExpanded && (
                      <div className="bg-[#080916] px-5 py-4 space-y-3 border-t border-slate-900/50">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-900/50">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Detailed Trip Summary
                          </span>
                          <span className="text-[9px] font-bold text-slate-500">
                            {matchesFilters.length} of {dayTrips.length} matched
                          </span>
                        </div>
                        {matchesFilters.length === 0 ? (
                          <p className="text-[11px] text-slate-500 text-center py-2">
                            No trips on this day match your search/filter.
                          </p>
                        ) : (
                          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-0.5 scrollbar-thin">
                            {matchesFilters.map((trip) => (
                              <div key={trip.id} className="p-3 bg-slate-950/40 border border-slate-900/70 rounded-xl flex items-center justify-between hover:border-slate-800 transition-all">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-black text-slate-200">{trip.storeName}</span>
                                    <span className="text-[8.5px] font-mono text-slate-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-850/50">{trip.id}</span>
                                  </div>
                                  <p className="text-[9.5px] text-slate-500 font-extrabold mt-1">
                                    {trip.distance} mi • Completed at {trip.completedAt}
                                  </p>
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

          {/* FOOTNOTE INSTRUCTIONS FOR INTERACTIVE REWARDING */}
          <div className="text-center py-2">
            <p className="text-[10px] text-slate-500 font-extrabold tracking-wide uppercase">
              💡 Tip: Click on any row to expand specific orders
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
