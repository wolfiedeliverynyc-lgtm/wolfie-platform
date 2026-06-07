import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const RestaurantStats = () => {
  const weeklyData = [
    { name: 'Mon', revenue: 4000, orders: 120 },
    { name: 'Tue', revenue: 3000, orders: 98 },
    { name: 'Wed', revenue: 2000, orders: 86 },
    { name: 'Thu', revenue: 2780, orders: 105 },
    { name: 'Fri', revenue: 5890, orders: 180 },
    { name: 'Sat', revenue: 6390, orders: 210 },
    { name: 'Sun', revenue: 4490, orders: 150 },
  ];

  return (
    <DashboardLayout>
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Analytics & Insights</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Track your performance and growth.</p>
        </div>
        <select className="form-input" style={{ width: 'auto', background: 'var(--bg-panel)' }}>
          <option>This Week</option>
          <option>Last Week</option>
          <option>This Month</option>
          <option>Year to Date</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Revenue</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>$28,550.00</div>
          </div>
          <div style={{ height: '250px', margin: '0 -1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Orders</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>949</div>
          </div>
          <div style={{ height: '250px', margin: '0 -1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="orders" stroke="var(--success)" strokeWidth={3} dot={{ r: 4, fill: 'var(--success)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Customer Retention vs Third-Party</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Wolfie Direct</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>68% Repeat Rate</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '68%', height: '100%', background: 'var(--success)' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>DoorDash / UberEats</span>
              <span style={{ fontWeight: 700, color: 'var(--warning)' }}>12% Repeat Rate</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '12%', height: '100%', background: 'var(--warning)' }}></div>
            </div>
          </div>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          By shifting volume to Wolfie, you're building a loyal customer base. 
          Your direct customers order <strong style={{ color: 'var(--text-primary)' }}>1.8x more frequently</strong> than customers acquired through third-party platforms.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default RestaurantStats;
