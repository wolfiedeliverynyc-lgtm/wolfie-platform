import React, { useState } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  DollarSign, TrendingUp, Clock, ShoppingBag, Award, 
  BellRing, ArrowUpRight, CheckCircle2, XCircle, Users, BarChart3
} from 'lucide-react';
import Card from '../components/dashboard/Card';

function getFoodImage(name) {
  const n = name.toLowerCase();
  if (n.includes('alpha') || n.includes('wolf')) return '/assets/hamburger_1.png';
  if (n.includes('ramen') || n.includes('bowl')) return '/assets/hamburger_4.png';
  if (n.includes('pizza') || n.includes('margherita')) return '/assets/hamburger_3.png';
  if (n.includes('fries') || n.includes('loaded')) return '/assets/hamburger_2.png';
  if (n.includes('combo') || n.includes('meal')) return '/assets/hamburger_details.png';
  if (n.includes('coke') || n.includes('cola') || n.includes('drink') || n.includes('lemonade')) return '/assets/hamburger_2.png';
  return '/assets/hamburger_1.png';
}

const renderPremiumChart = (type) => {
  if (type === 'red') {
    return (
      <svg viewBox="0 0 200 100" className="premium-svg-chart red-chart">
        <defs>
          <linearGradient id="glow-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-red)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-red)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d="M0,80 Q30,85 50,60 T100,25 T150,75 T200,45 L200,100 L0,100 Z" fill="url(#glow-red)" />
        <path d="M0,80 Q30,85 50,60 T100,25 T150,75 T200,45" fill="none" stroke="var(--accent-red)" strokeWidth="3" className="glowing-path" />
        <circle cx="100" cy="25" r="4" fill="var(--accent-red)" className="glowing-dot" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 100" className="premium-svg-chart yellow-chart">
      <defs>
        <linearGradient id="glow-yellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-yellow)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent-yellow)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d="M0,90 Q40,65 70,75 T140,30 T200,15 L200,100 L0,100 Z" fill="url(#glow-yellow)" />
      <path d="M0,90 Q40,65 70,75 T140,30 T200,15" fill="none" stroke="var(--accent-yellow)" strokeWidth="3" className="glowing-path" />
      <circle cx="140" cy="30" r="4" fill="var(--accent-yellow)" className="glowing-dot" />
    </svg>
  );
};

export default function Analytics() {
  const { metrics, hourlyData, topItems, setActivePage } = useRestaurantStore();
  const [activeTab, setActiveTab] = useState('sales');
  const [salesPeriod, setSalesPeriod] = useState('daily');

  // Interactive Mock Data for sales periods
  const weeklySalesData = [
    { name: 'Mon', revenue: 1100, orders: 40 },
    { name: 'Tue', revenue: 1250, orders: 46 },
    { name: 'Wed', revenue: 1050, orders: 38 },
    { name: 'Thu', revenue: 1400, orders: 52 },
    { name: 'Fri', revenue: 1850, orders: 68 },
    { name: 'Sat', revenue: 2100, orders: 75 },
    { name: 'Sun', revenue: 1950, orders: 70 }
  ];

  const monthlySalesData = [
    { name: 'Week 1', revenue: 8400, orders: 310 },
    { name: 'Week 2', revenue: 9200, orders: 345 },
    { name: 'Week 3', revenue: 10500, orders: 390 },
    { name: 'Week 4', revenue: 12400, orders: 450 }
  ];

  // Worst menu items (for Menu Analytics)
  const worstItems = [
    { name: 'Coca Cola', sold: 3, revenue: 7.50 },
    { name: 'Gluten-Free Bun Upgrade', sold: 1, revenue: 2.00 }
  ];

  // Customer retention segments (for Customer Analytics)
  const customerSegments = [
    { name: 'New Customers', value: 35.8, color: 'var(--accent-red)' },
    { name: 'Repeat (2-5 orders)', value: 42.4, color: 'var(--accent-yellow)' },
    { name: 'Loyal (5+ orders)', value: 21.8, color: '#22c55e' }
  ];

  const customerGrowthData = [
    { name: 'Jan', total: 1200 },
    { name: 'Feb', total: 1450 },
    { name: 'Mar', total: 1700 },
    { name: 'Apr', total: 2100 },
    { name: 'May', total: 2450 },
    { name: 'Jun', total: 2847 }
  ];

  const handleExport = (period) => {
    alert(`Generating ${period} Report! CSV file has been sent to your registered email.`);
  };

  const getSalesChartData = () => {
    if (salesPeriod === 'weekly') return weeklySalesData;
    if (salesPeriod === 'monthly') return monthlySalesData;
    return hourlyData; // Daily (hourly)
  };

  const salesChartData = getSalesChartData();
  const salesXKey = salesPeriod === 'daily' ? 'h' : 'name';

  return (
    <div className="space-y-8 p-4 lg:p-8 text-left bg-[var(--bg-app)] min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-end border-none pb-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2 font-poppins">
            Analytics & Reports
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[var(--text-secondary)] font-poppins">
            Operational dashboard sync, customer metrics, and revenue charts.
          </p>
        </div>
        <button 
          onClick={() => handleExport(activeTab.toUpperCase())}
          className="px-6 py-3 rounded-full bg-[var(--accent-yellow)] text-black text-xs font-bold hover:scale-102 transition-transform border-none font-poppins cursor-pointer"
        >
          Export Current View
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-none gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'sales', label: 'Sales Analytics', icon: DollarSign },
          { id: 'ops', label: 'Operational Sync', icon: Clock },
          { id: 'menu', label: 'Menu Leaderboards', icon: Award },
          { id: 'customers', label: 'Customer Retention', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3.5 rounded-full font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 border-none cursor-pointer font-poppins ${
              activeTab === tab.id
                ? 'bg-[var(--accent-yellow)] text-black'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          
          {/* TAB 1: SALES ANALYTICS */}
          {activeTab === 'sales' && (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card id="revenue_kpi" title="Revenue Today" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Gross Revenue</span>
                      <div className="premium-badge">Live <BellRing size={10} className="animate-pulse text-[var(--accent-yellow)]" /></div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Gross Revenue Today</span>
                      <span className="premium-stat-value">${metrics.revenueToday.toFixed(2)}</span>
                      <span className="text-[13px] text-green-500 font-bold flex items-center gap-1 mt-1">
                        <TrendingUp size={10} /> +14.2% since yesterday
                      </span>
                      <div className="premium-chart-container mt-2">{renderPremiumChart('yellow')}</div>
                    </div>
                  </div>
                </Card>

                <Card id="aov_kpi" title="Average Ticket Size" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Ticket Size (AOV)</span>
                      <div className="premium-badge">Average</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Average Order Value</span>
                      <span className="premium-stat-value">${metrics.avgOrderValue.toFixed(2)}</span>
                      <span className="text-[13px] text-[var(--text-secondary)] font-bold mt-1">Consistently healthy basket</span>
                      <div className="premium-chart-container mt-2">{renderPremiumChart('red')}</div>
                    </div>
                  </div>
                </Card>

                <Card id="orders_kpi" title="Total Orders" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Total Orders</span>
                      <div className="premium-badge">Count</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Orders Completed Today</span>
                      <span className="premium-stat-value">{metrics.ordersToday}</span>
                      <span className="text-[13px] text-green-500 font-bold flex items-center gap-1 mt-1">
                        <TrendingUp size={10} /> +8.5% compared to yesterday
                      </span>
                      <div className="premium-chart-container mt-2">{renderPremiumChart('yellow')}</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Main Interactive Chart Card */}
              <div className="dashboard-card accent-blue flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="premium-header">
                    <span className="premium-title font-poppins font-bold">Sales & Revenue Trends</span>
                    <div className="premium-badge">Interactive Matrix</div>
                  </div>
                  <div className="flex gap-1 bg-[var(--bg-card-hover)] p-1 rounded-full border-none">
                    {['daily', 'weekly', 'monthly'].map(p => (
                      <button
                        key={p}
                        onClick={() => setSalesPeriod(p)}
                        className={`px-3 py-1.5 rounded-full text-[13px] uppercase font-bold border-none cursor-pointer transition-all ${
                          salesPeriod === p ? 'bg-[var(--accent-yellow)] text-black' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-72 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesChartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-yellow)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--accent-yellow)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey={salesXKey} stroke="var(--text-secondary)" tickLine={false} />
                      <YAxis stroke="var(--text-secondary)" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '12px' }} 
                        labelStyle={{ color: 'var(--text-secondary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} 
                      />
                      <Area type="monotone" dataKey="revenue" stroke="var(--accent-yellow)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Printable Reports Table */}
              <div className="dashboard-card accent-blue flex flex-col">
                <div className="premium-header mb-6">
                  <span className="premium-title font-poppins font-bold">Standard Sales Reports</span>
                  <div className="premium-badge">Downloadable</div>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Daily Sales Summary - Jun 14", range: "24 Hours (Today)", size: "45 KB", type: "Daily" },
                    { title: "Weekly Performance Matrix - Week 24", range: "Jun 7 - Jun 14", size: "120 KB", type: "Weekly" },
                    { title: "Monthly Financial Reconciliation - May", range: "May 1 - May 31", size: "480 KB", type: "Monthly" }
                  ].map((rep, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-[var(--bg-card-hover)] rounded-xl">
                      <div className="text-left font-poppins">
                        <span className="font-bold text-sm text-[var(--text-primary)] block">{rep.title}</span>
                        <span className="text-[13px] text-[var(--text-secondary)]">{rep.range} • {rep.size}</span>
                      </div>
                      <button 
                        onClick={() => handleExport(rep.type)}
                        className="text-[13px] text-[var(--accent-yellow)] hover:underline border-none bg-transparent font-bold cursor-pointer"
                      >
                        Download Report
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPERATIONAL ANALYTICS */}
          {activeTab === 'ops' && (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card id="prep_kpi" title="Preparation Time" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Avg Prep SLA</span>
                      <div className="premium-badge">Time</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Average Preparation Duration</span>
                      <span className="premium-stat-value">{metrics.avgPrepTime} mins</span>
                      <span className="text-[13px] text-green-500 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 size={10} /> Prep time within target threshold
                      </span>
                    </div>
                  </div>
                </Card>

                <Card id="accept_kpi" title="Acceptance Rate" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Acceptance Rate</span>
                      <div className="premium-badge">Percent</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Order Acceptance Ratio</span>
                      <span className="premium-stat-value">98.4%</span>
                      <span className="text-[13px] text-green-500 font-bold flex items-center gap-1 mt-1">
                        <CheckCircle2 size={10} /> Ideal workflow acceptance
                      </span>
                    </div>
                  </div>
                </Card>

                <Card id="complete_kpi" title="Completion Rate" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Completion Rate</span>
                      <div className="premium-badge">Percent</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Successful Dispatch Ratio</span>
                      <span className="premium-stat-value">96.8%</span>
                      <span className="text-[13px] text-[var(--accent-red)] font-bold flex items-center gap-1 mt-1">
                        <XCircle size={10} /> 2.1% cancellations (investigating)
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* SLA Performance Tracker */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="dashboard-card accent-blue flex flex-col justify-between">
                  <div>
                    <div className="premium-header mb-6">
                      <span className="premium-title font-poppins font-bold">Handoff SLA Success Rate</span>
                      <div className="premium-badge">Performance</div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Preparation Deadline Compliance</span>
                          <span className="font-bold text-[var(--text-primary)]">94.0%</span>
                        </div>
                        <div className="h-2.5 rounded bg-[var(--bg-card-hover)] overflow-hidden">
                          <div className="h-full bg-[var(--accent-yellow)] rounded" style={{ width: '94%' }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Driver Handoff SLA</span>
                          <span className="font-bold text-[var(--text-primary)]">91.8%</span>
                        </div>
                        <div className="h-2.5 rounded bg-[var(--bg-card-hover)] overflow-hidden">
                          <div className="h-full bg-[var(--accent-red)] rounded" style={{ width: '91.8%' }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Courier Acceptance Rate</span>
                          <span className="font-bold text-[var(--text-primary)]">99.1%</span>
                        </div>
                        <div className="h-2.5 rounded bg-[var(--bg-card-hover)] overflow-hidden">
                          <div className="h-full bg-green-500 rounded" style={{ width: '99.1%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[var(--text-secondary)]/10 text-xs text-[var(--text-secondary)] text-left font-poppins">
                    All SLA parameters are synchronized with Brooklyn dispatch rules.
                  </div>
                </div>

                {/* Dispatch Delay Reasons */}
                <div className="dashboard-card accent-blue flex flex-col">
                  <div className="premium-header mb-6">
                    <span className="premium-title font-poppins font-bold">Cancellation & Dispute Breakdown</span>
                    <div className="premium-badge">Analytics</div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { reason: "Customer Cancelled", percent: 45, clr: "var(--accent-yellow)" },
                      { reason: "Out of Stock Items", percent: 25, clr: "var(--accent-red)" },
                      { reason: "Kitchen Overload", percent: 18, clr: "rgba(255,255,255,0.3)" },
                      { reason: "Courier No-show", percent: 12, clr: "rgba(255,255,255,0.1)" }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-primary)] font-semibold">{item.reason}</span>
                          <span className="text-[var(--text-secondary)]">{item.percent}%</span>
                        </div>
                        <div className="h-2 rounded bg-[var(--bg-card-hover)] overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${item.percent}%`, backgroundColor: item.clr }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MENU ANALYTICS */}
          {activeTab === 'menu' && (
            <div className="space-y-8">
              {/* Leaderboards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Best Sellers */}
                <div className="dashboard-card accent-blue flex flex-col text-left">
                  <div className="premium-header mb-6">
                    <span className="premium-title font-poppins font-bold">Top Performing Items</span>
                    <div className="premium-badge bg-green-500/10 text-green-500">Best Sellers</div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: 'Alpha Wolf Burger', sold: 18, revenue: 269.82 },
                      { name: 'Loaded Fries', sold: 14, revenue: 125.86 },
                      { name: 'Spicy Ramen Bowl', sold: 12, revenue: 198.00 },
                      { name: 'Margherita Pizza', sold: 9, revenue: 108.00 },
                      { name: 'Wolf Pack Combo Meal', sold: 7, revenue: 153.93 }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-card-hover)] rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[var(--accent-yellow)] w-6 pl-1 text-sm">#{idx+1}</span>
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center p-1 font-poppins">
                            <img src={getFoodImage(item.name)} alt={item.name} className="max-h-8 max-w-8 object-contain" />
                          </div>
                          <span className="font-bold text-sm text-[var(--text-primary)]">{item.name}</span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-bold text-[var(--text-primary)] block">{item.sold} sold</span>
                          <span className="text-[var(--text-secondary)]">${item.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Worst Sellers */}
                <div className="dashboard-card accent-blue flex flex-col text-left">
                  <div className="premium-header mb-6">
                    <span className="premium-title font-poppins font-bold">Underperforming Items</span>
                    <div className="premium-badge bg-[var(--accent-red)]/10 text-[var(--accent-red)]">Worst Sellers</div>
                  </div>
                  <div className="space-y-3">
                    {worstItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-card-hover)] rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[var(--accent-red)] w-6 pl-1 text-sm">#{idx+1}</span>
                          <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center p-1 font-poppins">
                            <img src={getFoodImage(item.name)} alt={item.name} className="max-h-8 max-w-8 object-contain" />
                          </div>
                          <span className="font-bold text-sm text-[var(--text-primary)]">{item.name}</span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-bold text-[var(--text-primary)] block">{item.sold} sold</span>
                          <span className="text-[var(--text-secondary)]">${item.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {/* Placeholder elements for worst sellers count matching height */}
                    {[1, 2, 3].map((num) => (
                      <div key={num} className="p-3 bg-[var(--bg-card-hover)] rounded-xl border border-dashed border-[var(--text-secondary)]/15 flex items-center justify-center h-14">
                        <span className="text-xs text-[var(--text-secondary)]/30 font-bold uppercase tracking-wider font-poppins">Catalog Item Slot Available</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMER ANALYTICS */}
          {activeTab === 'customers' && (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card id="repeat_kpi" title="Repeat Customer Rate" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Retention</span>
                      <div className="premium-badge">Ratio</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Returning Customer Rate</span>
                      <span className="premium-stat-value">64.2%</span>
                      <span className="text-[13px] text-green-500 font-bold flex items-center gap-1 mt-1">
                        <TrendingUp size={10} /> +5% growth since last month
                      </span>
                    </div>
                  </div>
                </Card>

                <Card id="growth_kpi" title="New Customers" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Acquisitions</span>
                      <div className="premium-badge">Monthly</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">New Customers Registered</span>
                      <span className="premium-stat-value">+398</span>
                      <span className="text-[13px] text-green-500 font-bold flex items-center gap-1 mt-1">
                        <TrendingUp size={10} /> +28% registration velocity
                      </span>
                    </div>
                  </div>
                </Card>

                <Card id="sat_kpi" title="Satisfaction Score" className="premium-card accent-blue" onClick={() => {}}>
                  <div className="premium-card-inner">
                    <div className="premium-header">
                      <span className="premium-title font-poppins font-bold">Rating Index</span>
                      <div className="premium-badge">Score</div>
                    </div>
                    <div className="premium-main flex flex-col items-center justify-center py-2">
                      <span className="premium-stat-label">Customer Feedback Index</span>
                      <span className="premium-stat-value">4.9 / 5</span>
                      <span className="text-[13px] text-green-500 font-bold flex items-center gap-1 mt-1">
                        ★ Outstanding (based on 280+ ratings)
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Customer Retention & Growth Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                {/* Growth line chart */}
                <div className="lg:col-span-7 dashboard-card accent-blue flex flex-col">
                  <div className="premium-header mb-6">
                    <span className="premium-title font-poppins font-bold">Cumulative Customer Base Growth</span>
                    <div className="premium-badge">Growth Chart</div>
                  </div>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={customerGrowthData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" tickLine={false} />
                        <YAxis stroke="var(--text-secondary)" tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-card)', border: 'none', borderRadius: '12px' }} 
                          labelStyle={{ color: 'var(--text-secondary)' }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Line type="monotone" dataKey="total" stroke="var(--accent-yellow)" strokeWidth={3} dot={{ fill: 'var(--accent-yellow)', r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Retention breakdown Pie Chart */}
                <div className="lg:col-span-5 dashboard-card accent-blue flex flex-col items-center justify-between">
                  <div className="w-full">
                    <div className="premium-header mb-4">
                      <span className="premium-title font-poppins font-bold">Customer Loyalty Segments</span>
                      <div className="premium-badge">Breakdown</div>
                    </div>
                  </div>
                  
                  {/* Pie graphic */}
                  <div className="h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={customerSegments}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {customerSegments.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends */}
                  <div className="w-full space-y-2 mt-4 text-xs font-poppins">
                    {customerSegments.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center px-4 py-1 border-b border-[var(--text-secondary)]/5 last:border-none">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                          <span className="text-[var(--text-primary)] font-semibold">{item.name}</span>
                        </div>
                        <span className="text-[var(--text-secondary)] font-bold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
