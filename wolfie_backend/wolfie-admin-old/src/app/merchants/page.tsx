"use client";
import React, { useState, useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

interface MerchantItem {
  id: string;
  name: string;
  category: string;
  rating: number;
  commissionPct: number;
  status: "active" | "paused" | "suspended";
  zone: string;
}

const INITIAL_MERCHANTS: MerchantItem[] = [
  { id: "m1", name: "Pizza Bleu", category: "Italian", rating: 4.8, commissionPct: 18, status: "active", zone: "Algiers Centre" },
  { id: "m2", name: "Burgers Co", category: "Fast Food", rating: 4.5, commissionPct: 15, status: "active", zone: "El Biar" },
  { id: "m3", name: "Sushi House", category: "Japanese", rating: 4.9, commissionPct: 20, status: "active", zone: "Hussein Dey" },
  { id: "m4", name: "Tacos Grill", category: "Mexican", rating: 4.2, commissionPct: 12, status: "active", zone: "Bab Ezzouar" },
  { id: "m5", name: "Crepe Box", category: "Dessert", rating: 4.6, commissionPct: 15, status: "paused", zone: "Kouba" },
  { id: "m6", name: "Salad Bar", category: "Healthy", rating: 4.4, commissionPct: 15, status: "suspended", zone: "Ain Taya" },
];

export default function MerchantsOperationsPage() {
  const { orders, addActivity } = useDashboardStore();
  const [merchants, setMerchants] = useState<MerchantItem[]>(INITIAL_MERCHANTS);
  const [search, setSearch] = useState("");

  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [currentMerchantId, setCurrentMerchantId] = useState("");
  const [currentMerchantName, setCurrentMerchantName] = useState("");
  const [merchantReviews, setMerchantReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const handleViewReviews = async (merchantId: string, name: string) => {
    setCurrentMerchantId(merchantId);
    setCurrentMerchantName(name);
    setReviewsModalOpen(true);
    setLoadingReviews(true);
    setMerchantReviews([]);
    try {
      const res = await fetch(`http://localhost:5000/api/ratings/restaurant/${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setMerchantReviews(data.reviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Calculate order volume per merchant dynamically
  const merchantStats = useMemo(() => {
    return merchants.map((m) => {
      const merchantOrders = orders.filter(o => o.merchant_name === m.name);
      return {
        ...m,
        ordersCount: merchantOrders.length,
        revenue: merchantOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.amount, 0)
      };
    });
  }, [merchants, orders]);

  const handleAdjustCommission = (merchantId: string, name: string, current: number) => {
    const rateStr = prompt(`Adjust commission percentage for ${name}:`, current.toString());
    if (rateStr !== null) {
      const rate = parseFloat(rateStr);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        alert("Please enter a valid percentage between 0 and 100.");
        return;
      }
      setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, commissionPct: rate } : m));
      addActivity({
        text: `Adjusted commission for ${name} to ${rate}%`,
        color: "var(--accent)"
      });
    }
  };

  const handleToggleSuspend = (merchantId: string, name: string, currentStatus: string) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const confirmMsg = currentStatus === "suspended" 
      ? `Activate merchant ${name}?` 
      : `Suspend merchant ${name}? This will temporarily pause their incoming orders.`;
    
    if (confirm(confirmMsg)) {
      setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, status: newStatus } : m));
      addActivity({
        text: `${newStatus === "suspended" ? "Suspended" : "Re-activated"} Merchant ${name}`,
        color: newStatus === "suspended" ? "var(--status-red)" : "var(--status-green)"
      });
    }
  };

  const filteredMerchants = useMemo(() => {
    return merchantStats.filter(m => 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      m.zone.toLowerCase().includes(search.toLowerCase())
    );
  }, [merchantStats, search]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Merchant Partner Operations</div>
          <div className="page-subtitle">Oversee restaurant catalog status, adjust commission schedules, and handle operational overrides</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* Filter / Search Bar */}
        <div className="panel" style={{ padding: "12px 16px" }}>
          <input
            type="text"
            placeholder="Search merchant partners by name, category or Algiers zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "6px 12px",
              fontSize: "13px",
              background: "var(--bg-base)"
            }}
          />
        </div>

        {/* Merchants List Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Registered Merchant Partners</div>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{filteredMerchants.length} active partnerships</span>
          </div>
          <table className="ops-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Category</th>
                <th>Zone</th>
                <th>Rating</th>
                <th>Commission Schedule</th>
                <th>Today&apos;s Orders</th>
                <th>Today&apos;s Volume</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions Override</th>
              </tr>
            </thead>
            <tbody>
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No merchant partners found matching search filter.
                  </td>
                </tr>
              ) : (
                filteredMerchants.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.name}</td>
                    <td>{m.category}</td>
                    <td>{m.zone}</td>
                    <td style={{ fontWeight: 600 }}>★ {m.rating}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {m.commissionPct}%
                      <button 
                        className="btn btn-ghost btn-xs" 
                        onClick={() => handleAdjustCommission(m.id, m.name, m.commissionPct)}
                        style={{ marginLeft: 8, padding: "2px 4px", fontSize: 10, color: "var(--accent)" }}
                      >
                        Edit
                      </button>
                    </td>
                    <td className="mono">{m.ordersCount}</td>
                    <td className="mono">{m.revenue.toLocaleString()} DA</td>
                    <td>
                      <span className={`badge ${m.status === 'active' ? 'badge-green' : m.status === 'paused' ? 'badge-amber' : 'badge-red'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleViewReviews(m.id, m.name)}
                        style={{ marginRight: 8, color: "var(--gold)" }}
                      >
                        View Reviews
                      </button>
                      <button
                        className={`btn ${m.status === 'suspended' ? 'btn-secondary' : 'btn-ghost'} btn-xs`}
                        onClick={() => handleToggleSuspend(m.id, m.name, m.status)}
                        style={{ color: m.status === 'suspended' ? 'var(--status-green)' : 'var(--status-red)' }}
                      >
                        {m.status === 'suspended' ? 'Activate Partner' : 'Suspend Partner'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Reviews Modal */}
      {reviewsModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="panel" style={{ width: 500, maxHeight: '80vh', overflowY: 'auto', padding: 24, position: 'relative' }}>
            <button 
              onClick={() => setReviewsModalOpen(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}
            >✕</button>
            <div className="panel-title" style={{ marginBottom: 16 }}>Reviews for {currentMerchantName}</div>
            
            {loadingReviews ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading reviews...</p>
            ) : merchantReviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No reviews found for this merchant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {merchantReviews.map((r, i) => (
                  <div key={i} style={{ background: 'var(--bg-base)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                      {r.comment ? `"${r.comment}"` : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No comment provided.</span>}
                    </p>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Order ID: {r.order_id.slice(-8).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
