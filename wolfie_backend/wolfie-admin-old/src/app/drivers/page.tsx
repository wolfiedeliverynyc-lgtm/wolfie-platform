"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import StatusBadge from "@/shared/components/StatusBadge";

export default function DriversFleetPage() {
  const { drivers, fetchDashboardData, activateDriver, updateDriver, addActivity } = useDashboardStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState("");
  const [currentDriverName, setCurrentDriverName] = useState("");
  const [driverReviews, setDriverReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const handleViewReviews = async (driverId: string, name: string) => {
    setCurrentDriverId(driverId);
    setCurrentDriverName(name);
    setReviewsModalOpen(true);
    setLoadingReviews(true);
    setDriverReviews([]);
    try {
      const res = await fetch(`http://localhost:5000/api/ratings/driver/${driverId}`);
      if (res.ok) {
        const data = await res.json();
        setDriverReviews(data.reviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle active status toggle (mock local toggles or POST requests)
  const handleToggleStatus = async (driverId: string, currentStatus: string) => {
    if (currentStatus === "offline") {
      alert("Driver is offline and cannot be set to active directly. They must turn on their app.");
      return;
    }
    
    if (currentStatus === "available" || currentStatus === "preparing" || currentStatus === "delivering") {
      const confirmDeact = confirm("Are you sure you want to suspend/deactivate this driver?");
      if (confirmDeact) {
        // Suspend driver locally and trigger activity log
        updateDriver({ id: driverId, status: "offline" });
        addActivity({
          text: `Suspended Driver ${driverId} operations override`,
          color: "var(--status-red)"
        });
      }
    } else {
      // Activate driver
      const success = await activateDriver(driverId);
      if (success) {
        alert("Driver activated successfully.");
      }
    }
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesSearch = 
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.phone.includes(search) ||
        d.zone.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "all" ? true : d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drivers, search, statusFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Drivers Fleet Management</div>
          <div className="page-subtitle">Oversee active driver statuses, ratings, zones, and toggle system suspension overrides</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gap-md)" }}>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Total Drivers</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{drivers.length}</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Active / Online</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--status-green)" }}>
              {drivers.filter(d => d.status !== "offline").length}
            </div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Idle & Available</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--status-blue)" }}>
              {drivers.filter(d => d.status === "available").length}
            </div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Average rating</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              ★ {(drivers.reduce((sum, d) => sum + d.rating, 0) / (drivers.length || 1)).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="panel" style={{ padding: "12px 16px", display: "flex", gap: "var(--gap-md)", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search drivers by name, phone or zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "6px 12px",
              fontSize: "13px",
              background: "var(--bg-base)"
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "available", "preparing", "delivering", "offline"].map((status) => (
              <button
                key={status}
                className={`btn ${statusFilter === status ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => setStatusFilter(status)}
                style={{ textTransform: "capitalize" }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Fleet Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Active Fleet Registry</div>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{filteredDrivers.length} matching</span>
          </div>
          <table className="ops-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Zone</th>
                <th>Current Status</th>
                <th>Completed Trips</th>
                <th>Rating</th>
                <th style={{ textAlign: "right" }}>Actions Override</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No drivers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>#{driver.id}</td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{driver.name}</td>
                    <td>{driver.phone}</td>
                    <td>{driver.zone}</td>
                    <td>
                      <StatusBadge status={driver.status} />
                    </td>
                    <td className="mono">{driver.completed_trips}</td>
                    <td style={{ fontWeight: 600 }}>★ {driver.rating}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleViewReviews(driver.id, driver.name)}
                        style={{ marginRight: 8, color: "var(--gold)" }}
                      >
                        View Reviews
                      </button>
                      <button
                        className={`btn ${driver.status === 'offline' ? 'btn-secondary' : 'btn-ghost'} btn-xs`}
                        onClick={() => handleToggleStatus(driver.id, driver.status)}
                        style={{ color: driver.status === 'offline' ? 'var(--status-green)' : 'var(--status-red)' }}
                      >
                        {driver.status === 'offline' ? 'Approve & Activate' : 'Suspend Driver'}
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
            <div className="panel-title" style={{ marginBottom: 16 }}>Reviews for {currentDriverName}</div>
            
            {loadingReviews ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading reviews...</p>
            ) : driverReviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No reviews found for this driver.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {driverReviews.map((r, i) => (
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
