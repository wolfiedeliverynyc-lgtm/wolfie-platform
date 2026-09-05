"use client";
import React, { useState } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";

export type DatePreset = "all" | "today" | "yesterday" | "7days" | "30days" | "custom";

export interface DateRangeState {
  preset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface DateRangeFilterProps {
  value: DateRangeState;
  onChange: (val: DateRangeState) => void;
  className?: string;
}

export function isOrderInDateRange(
  dateStr: string | undefined | null,
  range: DateRangeState
): boolean {
  if (!dateStr || range.preset === "all") return true;
  const orderDate = new Date(dateStr);
  if (isNaN(orderDate.getTime())) return true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (range.preset === "today") {
    return orderDate >= todayStart && orderDate <= todayEnd;
  }

  if (range.preset === "yesterday") {
    const yestStart = new Date(todayStart);
    yestStart.setDate(yestStart.getDate() - 1);
    const yestEnd = new Date(todayEnd);
    yestEnd.setDate(yestEnd.getDate() - 1);
    return orderDate >= yestStart && orderDate <= yestEnd;
  }

  if (range.preset === "7days") {
    const past7 = new Date(todayStart);
    past7.setDate(past7.getDate() - 7);
    return orderDate >= past7 && orderDate <= todayEnd;
  }

  if (range.preset === "30days") {
    const past30 = new Date(todayStart);
    past30.setDate(past30.getDate() - 30);
    return orderDate >= past30 && orderDate <= todayEnd;
  }

  if (range.preset === "custom") {
    if (range.startDate) {
      const s = new Date(range.startDate);
      s.setHours(0, 0, 0, 0);
      if (orderDate < s) return false;
    }
    if (range.endDate) {
      const e = new Date(range.endDate);
      e.setHours(23, 59, 59, 999);
      if (orderDate > e) return false;
    }
    return true;
  }

  return true;
}

export default function DateRangeFilter({ value, onChange, className = "" }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets: { id: DatePreset; label: string }[] = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "7days", label: "Last 7 Days" },
    { id: "30days", label: "Last 30 Days" },
    { id: "custom", label: "Custom Range..." },
  ];

  const currentLabel = presets.find((p) => p.id === value.preset)?.label || "Date Filter";

  const handleSelectPreset = (p: DatePreset) => {
    if (p === "custom") {
      onChange({ ...value, preset: "custom" });
    } else {
      onChange({ ...value, preset: p });
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#10131b] hover:bg-white/[0.06]  text-slate-200 text-xs font-semibold transition-all shadow-sm cursor-pointer"
      >
        <Calendar size={14} className="text-slate-400" />
        <span>{value.preset === "custom" && value.startDate ? `${value.startDate} - ${value.endDate || "now"}` : currentLabel}</span>
        <ChevronDown size={13} className="text-slate-400 ml-0.5" />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-64 p-2 rounded-xl bg-[#0f1219]  shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
              Filter by Date
            </div>

            <div className="flex flex-col gap-0.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    value.preset === p.id
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <span>{p.label}</span>
                  {value.preset === p.id && <Check size={13} className="text-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {value.preset === "custom" && (
              <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex flex-col gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={value.startDate}
                    onChange={(e) => onChange({ ...value, startDate: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded-md bg-[#131722]  text-slate-200 outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={value.endDate}
                    onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded-md bg-[#131722]  text-slate-200 outline-none focus:border-rose-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-1 py-1 px-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                >
                  Apply Custom Range
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
