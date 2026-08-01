"use client";
import React, { useMemo, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function FinanceLedgerPage() {
  const { orders, refunds, fetchDashboardData, approveRefund, denyRefund } = useDashboardStore();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Gross Merchandise Value
  const grossGMV = useMemo(() => {
    return orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.amount, 0);
  }, [orders]);

  // Average commission calculations (e.g. 15% flat rate on GMV)
  const commissionRevenue = useMemo(() => {
    return Math.round(grossGMV * 0.15);
  }, [grossGMV]);

  // Active payout lists matching completed orders
  const completedOrders = useMemo(() => {
    return orders.filter(o => o.status === 'completed');
  }, [orders]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Finance & Payout Operations Ledger</div>
          <div className="page-subtitle">Track platform commissions, gross GMV volumes, and approve support refund requests</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--gap-md)" }}>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Gross Volume (GMV)</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{grossGMV.toLocaleString()} DA</div>
            <div style={{ fontSize: 11, color: "var(--status-green)", marginTop: 6, fontWeight: 600 }}>● Completed order totals</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Platform Revenue (15% Avg)</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--accent)" }}>{commissionRevenue.toLocaleString()} DA</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Before processing fees</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Pending Refunds Outlay</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--status-red)" }}>
              {refunds
                .filter(r => r.status === 'pending')
                .reduce((sum, r) => sum + r.amount_requested, 0)
                .toLocaleString()} DA
            </div>
            <div style={{ fontSize: 11, color: "var(--status-amber)", marginTop: 6, fontWeight: 600 }}>
              {refunds.filter(r => r.status === 'pending').length} requests pending review
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-lg)" }}>
          
          {/* Refund Review Queue */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Refund Authorizations</div>
            </div>
            <div style={{ maxHeight: 350, overflowY: "auto" }}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Refund ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Fraud Score</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                        No refund proposals registered.
                      </td>
                    </tr>
                  ) : (
                    refunds.map((refund) => (
                      <tr key={refund.id}>
                        <td className="mono" style={{ fontWeight: 600 }}>#{refund.id}</td>
                        <td style={{ fontWeight: 500 }}>{refund.customer_name}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{refund.amount_requested} DA</td>
                        <td>
                          {refund.fraud_score !== undefined ? (
                            <span style={{ 
                              fontWeight: 600, 
                              color: refund.fraud_score > 0.4 ? "var(--status-red)" : "var(--text-primary)" 
                            }}>
                              {(refund.fraud_score * 100).toFixed(0)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <span className={`badge ${refund.status === 'approved' ? 'badge-green' : refund.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>
                            {refund.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {refund.status === 'pending' && (
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              <button 
                                className="btn btn-primary btn-xs"
                                onClick={() => approveRefund(refund.id)}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-ghost btn-xs"
                                style={{ color: "var(--status-red)" }}
                                onClick={() => {
                                  const reason = prompt("Enter denial reason:");
                                  if (reason) denyRefund(refund.id, reason);
                                }}
                              >
                                Deny
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform Merchant Payout Queue */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Completed Orders Payout List</div>
            </div>
            <div style={{ maxHeight: 350, overflowY: "auto" }}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Merchant</th>
                    <th>Gross Amt</th>
                    <th>Comm. Fee (15%)</th>
                    <th>Net Merchant Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                        No completed transactions in system database yet.
                      </td>
                    </tr>
                  ) : (
                    completedOrders.map((o) => {
                      const fee = Math.round(o.amount * 0.15);
                      const net = o.amount - fee;
                      return (
                        <tr key={o.id}>
                          <td className="mono" style={{ fontWeight: 600 }}>#{o.id}</td>
                          <td style={{ fontWeight: 500 }}>{o.merchant_name}</td>
                          <td className="mono">{o.amount.toLocaleString()} DA</td>
                          <td className="mono" style={{ color: "var(--status-amber)" }}>-{fee.toLocaleString()} DA</td>
                          <td className="mono" style={{ fontWeight: 600, color: "var(--status-green)" }}>{net.toLocaleString()} DA</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
