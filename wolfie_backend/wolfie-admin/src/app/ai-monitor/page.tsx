"use client";
import React, { useState, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";

export default function AiWapMonitorPage() {
  const { aiMetrics, fetchDashboardData, retrainWapModel, toggleWapFallback } = useDashboardStore();
  const [retraining, setRetraining] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRetrain = async () => {
    setRetraining(true);
    const success = await retrainWapModel();
    setRetraining(false);
    if (success) {
      alert("Model retraining job queued successfully! Real-time alerts will notify you of completions.");
    } else {
      alert("Failed to queue model retraining.");
    }
  };

  const handleToggleFallback = async () => {
    const nextState = !fallbackActive;
    const success = await toggleWapFallback(nextState);
    if (success) {
      setFallbackActive(nextState);
      alert(`WAP Fallback mode set to: ${nextState ? "ENABLED (Heuristic prediction)" : "DISABLED (Model prediction)"}`);
    } else {
      alert("Failed to toggle fallback mode.");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">AI Engine: WAP Prediction Monitor</div>
          <div className="page-subtitle">Track Wait Time at Restaurant (WAP) model drift, accuracy metrics, and manage model fallback switches</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
        
        {/* Actions Controls Strip */}
        <div className="panel" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--text-primary)" }}>Model Operations Override Panel</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Force AI model retraining or activate heuristic fallback if prediction drift exceeds target SLAs.
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              className={`btn ${fallbackActive ? 'btn-primary' : 'btn-secondary'} btn-sm`} 
              onClick={handleToggleFallback}
              style={{ borderColor: fallbackActive ? 'var(--status-amber)' : 'var(--border)' }}
            >
              <span className="rt-dot live" style={{ background: fallbackActive ? 'var(--status-amber)' : 'var(--status-gray)', marginRight: 2 }} />
              {fallbackActive ? "Disable WAP Heuristic Fallback" : "Enable WAP Heuristic Fallback"}
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleRetrain}
              disabled={retraining}
            >
              {retraining ? "Queuing Job..." : "Queue WAP Retraining"}
            </button>
          </div>
        </div>

        {/* Accuracy KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--gap-md)" }}>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Overall MAE</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>2.8 min</div>
            <div style={{ fontSize: 11, color: "var(--status-green)", marginTop: 6, fontWeight: 600 }}>● Within target (3.0m MAE)</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>R² Accuracy Score</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "var(--accent)" }}>0.84</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Model version: wap-v2.1</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Training Samples</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>2,050</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Last retrained: 2 hrs ago</div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Drift Status</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: fallbackActive ? "var(--status-amber)" : "var(--status-green)" }}>
              {fallbackActive ? "Fallback Active" : "Healthy"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Fulfillment error bounds normal</div>
          </div>
        </div>

        {/* Model Metrics Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Model Accuracy per Merchant Partner</div>
          </div>
          <table className="ops-table">
            <thead>
              <tr>
                <th>Merchant Partner</th>
                <th>Model Version</th>
                <th>Mean Absolute Error (MAE)</th>
                <th>Root Mean Square Error (RMSE)</th>
                <th>MAPE (%)</th>
                <th>R² Score</th>
                <th>Total Samples</th>
                <th style={{ textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {aiMetrics.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No WAP metrics computed in database.
                  </td>
                </tr>
              ) : (
                aiMetrics.map((metric) => (
                  <tr key={metric.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{metric.restaurant_name}</td>
                    <td className="mono">{metric.model_version}</td>
                    <td className="mono">{metric.mae} min</td>
                    <td className="mono">{metric.rmse} min</td>
                    <td className="mono">{metric.mape}%</td>
                    <td className="mono" style={{ fontWeight: 600, color: metric.r2_score > 0.8 ? "var(--status-green)" : "var(--status-amber)" }}>
                      {metric.r2_score}
                    </td>
                    <td className="mono">{metric.training_samples}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${metric.mae > 4.0 ? 'badge-red' : 'badge-green'}`}>
                        {metric.mae > 4.0 ? 'Drifting' : 'Optimal'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
}
