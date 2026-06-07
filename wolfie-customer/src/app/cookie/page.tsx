'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie, ShieldCheck, Check } from 'lucide-react';
import Header from '../../components/Header';
import { useRealtimeStore } from '../../stores/useRealtimeStore';

export default function CookieSettingsPage() {
  const { addNotification } = useRealtimeStore();

  // Interactive toggle states
  const [performanceCookies, setPerformanceCookies] = useState(true);
  const [targetingCookies, setTargetingCookies] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePreferences = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addNotification(
        'Preferences Updated! 🍪',
        `Saved settings: Essential (ON), Performance (${performanceCookies ? 'ON' : 'OFF'}), Targeting (${targetingCookies ? 'ON' : 'OFF'}).`,
        'success'
      );
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full text-left">
        {/* Breadcrumb */}
        <div className="mb-8 select-none">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-black text-[#F15A24] hover:text-[#E04D1B] uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Explore</span>
          </Link>
        </div>

        {/* Title Deck */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.015)] relative overflow-hidden mb-10 select-none">
          <div className="absolute top-[-30px] right-[-30px] w-36 h-36 bg-[#F15A24]/5 rounded-full blur-3xl" />
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-orange-50 text-[#F15A24] rounded-2xl border border-orange-100">
              <Cookie className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] bg-[#FFF2ED] text-[#F15A24] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                User Preferences
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Cookie Settings
              </h1>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Manage your browser storage and custom telemetry options.
              </p>
            </div>
          </div>
        </div>

        {/* Content Deck */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-6">
          <p className="text-sm text-slate-500 leading-relaxed font-semibold">
            We use cookies and local storage tokens to optimize your culinary ordering experience. Please review individual categories and select your preferences:
          </p>

          <div className="space-y-4 pt-2">
            
            {/* Category 1: Essential */}
            <div className="flex items-start justify-between p-5 border border-slate-105 rounded-2xl bg-slate-50/50">
              <div className="space-y-1 max-w-[80%] text-left">
                <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span>Essential Cookies</span>
                  <span className="text-[8px] bg-slate-200 text-slate-650 font-black uppercase tracking-wider px-1.5 py-0.5 rounded">Always Active</span>
                </h3>
                <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                  Required to persist your ordering cart selections, addresses lists, payment tokens, and login sessions across page navigations.
                </p>
              </div>
              <div className="flex items-center justify-center w-11 h-6 bg-slate-200 rounded-full cursor-not-allowed relative">
                <div className="w-4 h-4 bg-slate-400 rounded-full absolute right-1 flex items-center justify-center text-[7px] text-white font-bold select-none">
                  <Check className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

            {/* Category 2: Performance */}
            <div className="flex items-start justify-between p-5 border border-slate-105 rounded-2xl bg-white hover:bg-slate-50/20 transition-all">
              <div className="space-y-1 max-w-[80%] text-left">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Performance & Query Cache</h3>
                <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                  Enables us to cache culinary menus and kitchen directories locally via TanStack Query state caches, speeding up transition speeds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPerformanceCookies(prev => !prev)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative flex items-center ${
                  performanceCookies ? 'bg-[#F15A24]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute shadow-sm ${
                    performanceCookies ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Category 3: Targeting */}
            <div className="flex items-start justify-between p-5 border border-slate-105 rounded-2xl bg-white hover:bg-slate-50/20 transition-all">
              <div className="space-y-1 max-w-[80%] text-left">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Targeting & AI Recommendations</h3>
                <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                  Stores details of your culinary exploration histories to prompt custom AI toppings recommendations and spotlight filter categories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetingCookies(prev => !prev)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative flex items-center ${
                  targetingCookies ? 'bg-[#F15A24]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`w-4.5 h-4.5 bg-white rounded-full transition-transform absolute shadow-sm ${
                    targetingCookies ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="px-6 py-3.5 bg-[#F15A24] hover:bg-[#E04D1B] disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md hover:shadow-[0_8px_20px_rgba(241,90,36,0.15)] transition-all cursor-pointer flex items-center space-x-2"
            >
              <span>{isSaving ? 'Saving Configurations...' : 'Save Cookie Settings'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Mini footer */}
      <footer className="py-8 bg-[#0B0F19] text-slate-500 text-center text-xs border-t border-slate-800/40 select-none">
        &copy; {new Date().getFullYear()} Wolfie Technologies Inc. All Rights Reserved.
      </footer>
    </div>
  );
}
