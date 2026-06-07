"use client";
import React, { useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    autoAssignment: true,
    dynamicSurge: true,
    platformCommission: 15,
    defaultDeliveryFee: 4.49,
    minOrderValue: 10.00,
  });

  const [saved, setSaved] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSave = () => {
    // Mock save logic
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Advanced Configuration</div>
          <div className="page-subtitle">Manage global system parameters, pricing rules, and operational toggles</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Configuration
        </button>
      </div>

      {saved && (
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: "var(--bg-card)", border: "1px solid var(--status-green)", color: "var(--status-green)", borderRadius: "var(--radius-md)" }}>
          Settings saved successfully!
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-lg)" }}>
        
        {/* Core Operational Toggles */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Operational Toggles</div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>System Maintenance Mode</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Disables ordering app for customers globally</div>
              </div>
              <button 
                className={`btn ${settings.maintenanceMode ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => handleToggle("maintenanceMode")}
              >
                {settings.maintenanceMode ? "Active" : "Disabled"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Auto-Assignment Algorithm</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Automatically dispatches orders to nearest drivers</div>
              </div>
              <button 
                className={`btn ${settings.autoAssignment ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => handleToggle("autoAssignment")}
              >
                {settings.autoAssignment ? "Active" : "Disabled"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Dynamic Surge Pricing</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Enable multiplier pricing during high demand / bad weather</div>
              </div>
              <button 
                className={`btn ${settings.dynamicSurge ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => handleToggle("dynamicSurge")}
              >
                {settings.dynamicSurge ? "Active" : "Disabled"}
              </button>
            </div>

          </div>
        </div>

        {/* Global Finance Settings */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Financial Defaults</div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Platform Commission (%)</label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Default commission rate applied to restaurant payouts</div>
              <input 
                type="number"
                value={settings.platformCommission}
                onChange={(e) => handleChange("platformCommission", e.target.value)}
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Base Delivery Fee (DA)</label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Minimum base delivery fee before distance multipliers</div>
              <input 
                type="number"
                value={settings.defaultDeliveryFee}
                onChange={(e) => handleChange("defaultDeliveryFee", e.target.value)}
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Minimum Order Value (DA)</label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Below this amount, a small order fee will be added</div>
              <input 
                type="number"
                value={settings.minOrderValue}
                onChange={(e) => handleChange("minOrderValue", e.target.value)}
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
              />
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
