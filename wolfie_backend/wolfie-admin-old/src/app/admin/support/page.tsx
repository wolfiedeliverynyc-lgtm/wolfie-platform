"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function SupportOperationsPage() {
  const { 
    tickets, 
    refunds,
    fetchDashboardData, 
    resolveTicket, 
    escalateTicket,
    approveRefund,
    denyRefund
  } = useDashboardStore();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Selected Ticket detail
  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  const handleResolve = async (ticketId: string) => {
    const resolution = prompt("Enter resolution notes:", "Refund processed / Issue resolved");
    if (resolution) {
      const success = await resolveTicket(ticketId, resolution);
      if (success) {
        alert("Ticket resolved successfully.");
      }
    }
  };

  const handleEscalate = async (ticketId: string) => {
    const reason = prompt("Enter escalation reason:");
    if (reason) {
      const success = await escalateTicket(ticketId, reason);
      if (success) {
        alert("Ticket escalated successfully to Level 2 support.");
      }
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch = 
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        (t.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.order_id || "").toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === "all" ? true : t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Support Operations Desk</div>
          <div className="page-subtitle">Manage customer incidents, view AI case summaries, and approve refunds</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--gap-lg)", height: "calc(100vh - 120px)" }}>
        
        {/* Left Side: Tickets List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-md)", overflow: "hidden" }}>
          
          {/* Quick stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gap-md)" }}>
            <div className="panel" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Open Support cases</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "var(--status-red)" }}>
                {tickets.filter(t => t.status === 'open').length}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-sm)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  Pending Refund Requests ({refunds.filter(r => r.status === 'pending').length})
                </div>
                {refunds.filter(r => r.status === 'pending').map((refund) => (
                  <div 
                    key={refund.id}
                    style={{ 
                      padding: "8px 10px", 
                      background: "var(--bg-base)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "11.5px" }}>{refund.customer_name}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        Order #{refund.order_id} · {refund.amount_requested} DA
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button 
                        className="btn btn-primary btn-xs" 
                        onClick={() => approveRefund(refund.id)}
                        style={{ padding: "2px 5px", fontSize: 10 }}
                      >
                        ✓
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs" 
                        onClick={() => {
                          const r = prompt("Denial reason:");
                          if (r) denyRefund(refund.id, r);
                        }}
                        style={{ padding: "2px 5px", fontSize: 10, color: "var(--status-red)" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {refunds.filter(r => r.status === 'pending').length === 0 && (
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    No pending refunds.
                  </div>
                )}
            </div>
            <div className="panel" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Escalated to L2</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "var(--status-amber)" }}>
                {tickets.filter(t => t.status === 'escalated').length}
              </div>
            </div>
          </div>

          {/* Filtering bar */}
          <div className="panel" style={{ padding: "12px 16px", display: "flex", gap: "var(--gap-md)", alignItems: "center" }}>
            <input 
              type="text" 
              placeholder="Search by Customer, Category or Order ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
                fontSize: 12.5,
                background: "var(--bg-base)"
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              {["all", "open", "in_progress", "resolved", "escalated"].map((status) => (
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

          {/* Table list */}
          <div className="panel" style={{ flex: 1, overflowY: "auto" }}>
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Related Order</th>
                  <th>Fulfillment Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const prioColor = ticket.priority === 'urgent' ? 'badge-red' 
                                  : ticket.priority === 'high' ? 'badge-red' 
                                  : ticket.priority === 'medium' ? 'badge-amber' 
                                  : 'badge-gray';

                  return (
                    <tr 
                      key={ticket.id} 
                      style={{ cursor: "pointer", background: selectedTicketId === ticket.id ? "var(--bg-hover)" : "transparent" }}
                      onClick={() => setSelectedTicketId(selectedTicketId === ticket.id ? null : ticket.id)}
                    >
                      <td className="mono" style={{ fontWeight: 600 }}>#{ticket.id}</td>
                      <td style={{ fontWeight: 500 }}>{ticket.customer_name}</td>
                      <td>{ticket.category}</td>
                      <td>
                        <span className={`badge ${prioColor}`}>{ticket.priority}</span>
                      </td>
                      <td className="mono">#{ticket.order_id || "None"}</td>
                      <td>
                        <span className={`badge ${ticket.status === 'resolved' ? 'badge-green' : ticket.status === 'open' ? 'badge-amber' : 'badge-blue'}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        {ticket.status !== 'resolved' && (
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <button 
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleResolve(ticket.id)}
                            >
                              Resolve
                            </button>
                            <button 
                              className="btn btn-ghost btn-xs"
                              style={{ color: "var(--status-amber)" }}
                              onClick={() => handleEscalate(ticket.id)}
                            >
                              Escalate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Side: Details View */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
          {selectedTicket ? (
            <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="panel-header">
                <div className="panel-title">Ticket Details</div>
                <button className="btn btn-ghost btn-xs" onClick={() => setSelectedTicketId(null)}>✕</button>
              </div>
              <div className="panel-body" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", padding: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Support Category</div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{selectedTicket.category}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Customer</div>
                    <div style={{ fontWeight: 600 }}>{selectedTicket.customer_name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Order ID</div>
                    <div className="mono" style={{ fontWeight: 600 }}>#{selectedTicket.order_id || "—"}</div>
                  </div>
                </div>

                {selectedTicket.ai_summary && (
                  <div style={{ 
                    padding: "10px 12px", 
                    background: "var(--bg-sunken)", 
                    borderRadius: "var(--radius-md)", 
                    borderLeft: "3px solid var(--accent)" 
                  }}>
                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>AI Copilot Summary</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: "1.4" }}>
                      {selectedTicket.ai_summary}
                    </div>
                  </div>
                )}

                {selectedTicket.resolution && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Resolution History</div>
                    <div style={{ fontSize: "12px", fontStyle: "italic", marginTop: "4px" }}>
                      &quot;{selectedTicket.resolution}&quot;
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedTicket.status !== 'resolved' && (
                    <>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => handleResolve(selectedTicket.id)}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        Mark as Resolved
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleEscalate(selectedTicket.id)}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        Escalate to L2
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
              <div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", opacity: 0.5 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Select a support ticket from the list to view timeline details and resolution history
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
