"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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

  // Emergency platform killswitch
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Financial defaults (isolated per market)
  const [marketFinancials, setMarketFinancials] = useState<Record<MarketId, MarketFinancials>>(DEFAULT_FINANCIALS);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wolfie_admin_settings_v2");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.maintenanceMode === "boolean") setMaintenanceMode(parsed.maintenanceMode);
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
        maintenanceMode,
        marketFinancials,
      };
      localStorage.setItem("wolfie_admin_settings_v2", JSON.stringify(payload));
    } catch (e) {
      console.error(e);
    }
    setSaved(true);
    addActivity({
      text: `Saved platform settings for ${activeConfig.name} (Commission: ${currentFinancials.platformCommission}%, Min Order: ${activeConfig.currencySymbol}${currentFinancials.minOrderValue})`,
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
            Manage emergency platform controls and market-isolated baseline rates for {activeConfig.name}
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
          Active Market Baseline:
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
        
        {/* Left Column: Automation Engine Telemetry & Emergency Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-lg)" }}>
          
          {/* Emergency Killswitch */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Emergency System Control (Global)</div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>System Maintenance Mode</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Emergency halt: temporarily disables consumer order placement across all markets
                  </div>
                </div>
                <button 
                  type="button"
                  className={`btn ${maintenanceMode ? "btn-primary" : "btn-secondary"} btn-xs`}
                  style={{
                    background: maintenanceMode ? "var(--status-red)" : undefined,
                    borderColor: maintenanceMode ? "var(--status-red)" : undefined,
                    color: maintenanceMode ? "#fff" : undefined,
                  }}
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                >
                  {maintenanceMode ? "ACTIVE (HALTED)" : "Disabled (Normal)"}
                </button>
              </div>
            </div>
          </div>

          {/* Backend Automation Status */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Backend Automation Architecture</div>
              <span className="badge badge-green">Always-On</span>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
              
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                    Automated Courier Dispatch Engine
                  </div>
                  <span className="badge badge-green">Autonomous Backend</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Orders are automatically matched to the nearest eligible couriers using real-time GPS telemetry, fit scoring, and SLA risk prediction. No manual intervention needed during normal operations.
                </div>
              </div>

              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                    Dynamic Surge & Pricing Engine
                  </div>
                  <span className="badge badge-green">Autonomous Backend</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Calculates real-time demand-to-supply ratio, weather telemetry, and peak multipliers automatically in backend Celery tasks.
                </div>
                <div style={{ marginTop: 8 }}>
                  <Link href="/pricing" className="text-rose-400 hover:text-rose-300 text-xs font-semibold">
                    Manage Contract Tiers & Surge Rules &rarr;
                  </Link>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                    Traffic-Aware ETA Engine
                  </div>
                  <span className="badge badge-green">Autonomous Backend</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Fulfillment duration and estimated courier transit are computed in real time via routing APIs and historical corridor completion speeds.
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Baseline Market Financials */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              Baseline Financial Defaults &bull; {activeConfig.name} ({activeConfig.currency})
            </div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
            
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", background: "var(--bg-sunken)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", lineHeight: 1.5 }}>
              These parameters serve as fallback baseline defaults for {activeConfig.name}. To set customized tiered commissions or special agreements per restaurant, use <Link href="/pricing" className="text-rose-400 font-bold hover:underline">Pricing & Contracts</Link>.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Default Platform Commission (%)
              </label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                Fallback contract commission percentage applied to merchant payouts in {activeConfig.name}
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
