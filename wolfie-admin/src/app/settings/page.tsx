"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDashboardStore } from "@/stores/dashboardStore";
import { useMarketStore, MarketId, MARKETS } from "@/stores/marketStore";

interface MarketFinancials {
  platformCommission: number;
  defaultDeliveryFee: number;
  minOrderValue: number;
}

const DEFAULT_FINANCIALS: Record<MarketId, MarketFinancials> = {
  NYC: {
    platformCommission: 15,
    defaultDeliveryFee: 3.99,
    minOrderValue: 15.00,
  },
  EL_KALA: {
    platformCommission: 15,
    defaultDeliveryFee: 250,
    minOrderValue: 500,
  },
};

export default function SettingsPage() {
  const { addActivity } = useDashboardStore();
  const { currentMarketId, setMarket, getMarketConfig } = useMarketStore();
  const activeConfig = getMarketConfig();

  // Operational toggles (global)
  const [operationalToggles, setOperationalToggles] = useState({
    maintenanceMode: false,
    autoAssignment: true,
    dynamicSurge: true,
  });

  // Financial defaults (isolated per market)
  const [marketFinancials, setMarketFinancials] = useState<Record<MarketId, MarketFinancials>>(DEFAULT_FINANCIALS);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wolfie_admin_settings_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.operationalToggles) setOperationalToggles(parsed.operationalToggles);
        if (parsed.marketFinancials) {
          setMarketFinancials(prev => ({
            ...prev,
            ...parsed.marketFinancials,
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const currentFinancials = useMemo(() => {
    return marketFinancials[currentMarketId] || DEFAULT_FINANCIALS[currentMarketId];
  }, [marketFinancials, currentMarketId]);

  const handleToggle = (key: keyof typeof operationalToggles) => {
    setOperationalToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinancialChange = (field: keyof MarketFinancials, value: string) => {
    const num = parseFloat(value) || 0;
    setMarketFinancials(prev => ({
      ...prev,
      [currentMarketId]: {
        ...prev[currentMarketId],
        [field]: num,
      },
    }));
  };

  const handleSave = () => {
    try {
      const payload = {
        operationalToggles,
        marketFinancials,
      };
      localStorage.setItem("wolfie_admin_settings_v2", JSON.stringify(payload));
    } catch (e) {
      console.error(e);
    }
    setSaved(true);
    addActivity({
      text: `Saved configuration for ${activeConfig.name} (Commission: ${currentFinancials.platformCommission}%, Min Order: ${activeConfig.currencySymbol}${currentFinancials.minOrderValue})`,
      color: "var(--status-green)"
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <div className="page-title">Advanced Configuration</div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                background: activeConfig.badgeBg,
                border: `1px solid ${activeConfig.badgeBorder}`,
                color: activeConfig.badgeText,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {activeConfig.badgeLabel}
            </span>
          </div>
          <div className="page-subtitle">
            Manage global operational toggles and market-isolated financial defaults for {activeConfig.name}
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Save Configuration
        </button>
      </div>

      {saved && (
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: "var(--bg-card)", border: "1px solid var(--status-green)", color: "var(--status-green)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600 }}>
          Configuration for {activeConfig.name} and platform systems saved successfully!
        </div>
      )}

      {/* Market Selector Tabs on Settings */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center", marginRight: 8, fontWeight: 600 }}>
          Active Market Settings:
        </span>
        {(Object.keys(MARKETS) as MarketId[]).map((mId) => {
          const m = MARKETS[mId];
          const isSelected = currentMarketId === mId;
          return (
            <button
              key={mId}
              type="button"
              onClick={() => setMarket(mId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-white/[0.08] text-white border border-white/20"
                  : "text-slate-400 hover:text-white bg-transparent border border-transparent"
              }`}
              style={{
                color: isSelected ? m.badgeText : undefined,
                borderColor: isSelected ? m.badgeBorder : undefined,
              }}
            >
              {m.name} ({m.currency})
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-lg)" }}>
        
        {/* Core Operational Toggles */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Operational Toggles (Global)</div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>System Maintenance Mode</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Disables ordering app for customers across all zones</div>
              </div>
              <button 
                type="button"
                className={`btn ${operationalToggles.maintenanceMode ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => handleToggle("maintenanceMode")}
              >
                {operationalToggles.maintenanceMode ? "Active" : "Disabled"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Auto-Assignment Algorithm</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Automatically dispatches orders to nearest eligible couriers</div>
              </div>
              <button 
                type="button"
                className={`btn ${operationalToggles.autoAssignment ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => handleToggle("autoAssignment")}
              >
                {operationalToggles.autoAssignment ? "Active" : "Disabled"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Dynamic Surge Pricing</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Enable multiplier pricing during high order demand or bad weather</div>
              </div>
              <button 
                type="button"
                className={`btn ${operationalToggles.dynamicSurge ? "btn-primary" : "btn-secondary"} btn-xs`}
                onClick={() => handleToggle("dynamicSurge")}
              >
                {operationalToggles.dynamicSurge ? "Active" : "Disabled"}
              </button>
            </div>

          </div>
        </div>

        {/* Global Finance Settings (Market Isolated) */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              Financial Defaults &bull; {activeConfig.name} ({activeConfig.currency})
            </div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Platform Commission (%)
              </label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                Default contract commission percentage applied to merchant payouts in {activeConfig.name}
              </div>
              <input 
                type="number"
                step="0.5"
                value={currentFinancials.platformCommission}
                onChange={(e) => handleFinancialChange("platformCommission", e.target.value)}
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Base Delivery Fee ({activeConfig.currencySymbol})
              </label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                Minimum base delivery fee for {activeConfig.name} before distance/traffic multipliers ({activeConfig.currency})
              </div>
              <input 
                type="number"
                step={currentMarketId === "NYC" ? "0.25" : "10"}
                value={currentFinancials.defaultDeliveryFee}
                onChange={(e) => handleFinancialChange("defaultDeliveryFee", e.target.value)}
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Minimum Order Value ({activeConfig.currencySymbol})
              </label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                Below this order value, a small order fee surcharge will be calculated in {activeConfig.currency}
              </div>
              <input 
                type="number"
                step={currentMarketId === "NYC" ? "1.00" : "50"}
                value={currentFinancials.minOrderValue}
                onChange={(e) => handleFinancialChange("minOrderValue", e.target.value)}
                style={{ background: "var(--bg-base)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }}
              />
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
