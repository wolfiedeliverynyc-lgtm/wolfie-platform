import React, { useState } from 'react';
import { Play, Square, Zap, DollarSign, RefreshCw, Layers, Sliders, BatteryCharging, AlertTriangle } from 'lucide-react';
import { Order, LatLng, EarningSummary } from '../types';

interface SimulationControlsProps {
  online: boolean;
  simulationSpeed: number;
  driverCoords: LatLng;
  earningsSummary: EarningSummary;
  onSetOnline: (online: boolean) => void;
  onSetSimulationSpeed: (speed: number) => void;
  onForceSpawnOffer: () => void;
  onInjectCash: (amount: number) => void;
  onResetApp: () => void;
}

export default function SimulationControls({
  online,
  simulationSpeed,
  driverCoords,
  earningsSummary,
  onSetOnline,
  onSetSimulationSpeed,
  onForceSpawnOffer,
  onInjectCash,
  onResetApp,
}: SimulationControlsProps) {
  const [showCheats, setShowCheats] = useState<boolean>(false);

  return (
    <div id="simulation-controls-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-orange-500 animate-spin" style={{ animationDuration: '4s' }} />
          Simulation Control
        </h3>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
          State Engine v1.4
        </span>
      </div>

      {/* CORE CONTROL SLIDERS */}
      <div className="space-y-3">
        {/* Toggle online status */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-400">Dash Duty Status</span>
          <button
            id="control-online-toggle"
            onClick={() => onSetOnline(!online)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${online ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/30'}`}
          >
            {online ? 'ONLINE' : 'OFFLINE'}
          </button>
        </div>

        {/* GPS Simulation Speed Selector */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-400">Rider Map Speed</span>
            <span className="text-orange-400 font-bold font-mono">{simulationSpeed}X Fast</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 5, 12].map((speed) => (
              <button
                key={`speed-sel-${speed}`}
                id={`btn-speed-sel-${speed}`}
                onClick={() => onSetSimulationSpeed(speed)}
                className={`py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all border ${simulationSpeed === speed ? 'bg-orange-500/15 text-orange-500 border-orange-500/40' : 'bg-slate-950 hover:bg-slate-850 border-slate-850 text-slate-400'}`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="pt-2 border-t border-slate-850 grid grid-cols-1 gap-2">
        <button
          id="btn-force-dispatch"
          onClick={onForceSpawnOffer}
          disabled={!online}
          className={`w-full py-2 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 border transition-all ${online ? 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-200 cursor-pointer' : 'bg-slate-950 border-slate-850 text-slate-600 cursor-not-allowed'}`}
          title={online ? 'Instantly generate an order offer' : 'Must go Online first!'}
        >
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span>Force Offer Dispatch</span>
        </button>
      </div>

      {/* HIDDABLE CHEAT CODES BAR */}
      <div className="pt-1.5">
        <button
          id="cheat-panel-toggle"
          onClick={() => setShowCheats(!showCheats)}
          className="text-[10px] text-slate-500 hover:text-orange-400 font-bold transition-all uppercase tracking-wider flex items-center gap-1 w-full justify-center"
        >
          <span>{showCheats ? 'Hide Sandbox Utilities' : 'Show Sandbox Utilities'}</span>
          <span className="text-[8px]">{showCheats ? '▲' : '▼'}</span>
        </button>

        {showCheats && (
          <div className="mt-3 bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-3 animate-fade-in text-[11px]">
            {/* Cash injecting */}
            <div className="space-y-1.5">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Mock Earnings Injector</span>
              <div className="grid grid-cols-3 gap-1">
                {[15.00, 30.00, 75.00].map((c) => (
                  <button
                    key={`cheats-cash-${c}`}
                    id={`btn-inject-cash-${c}`}
                    onClick={() => onInjectCash(c)}
                    className="py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded font-mono font-bold text-emerald-400 transition-all text-[10px]"
                  >
                    +${c}
                  </button>
                ))}
              </div>
            </div>

            {/* General state descriptions */}
            <div className="space-y-1 text-slate-500 font-mono text-[10px] border-t border-slate-850 pt-2.5">
              <div className="flex justify-between">
                <span>Scooter X/Y:</span>
                <span className="text-slate-400">{Math.round(driverCoords.x)}, {Math.round(driverCoords.y)}</span>
              </div>
              <div className="flex justify-between">
                <span>Orders today:</span>
                <span className="text-slate-400">{earningsSummary.todayDeliveries} runs</span>
              </div>
              <div className="flex justify-between">
                <span>Wallet:</span>
                <span className="text-emerald-500 font-bold">${earningsSummary.todayEarnings.toFixed(2)}</span>
              </div>
            </div>

            {/* Reset buttons */}
            <div className="pt-1">
              <button
                id="btn-reset-simulator"
                onClick={onResetApp}
                className="w-full py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded border border-rose-500/15 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset All Stats & Cash</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
