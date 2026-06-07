'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, ShieldAlert, Locating, MapPin } from 'lucide-react';
import Header from '../../components/Header';

export default function PrivacyPolicyPage() {
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
              <Shield className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] bg-[#FFF2ED] text-[#F15A24] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                Privacy Safeguards
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Last updated: May 29, 2026 • Version 2.1
              </p>
            </div>
          </div>
        </div>

        {/* Content Deck */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-8 leading-relaxed text-sm text-slate-600">
          
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              1. Information Collection & Inputs
            </h2>
            <p>
              We collect user-provided details necessary to process delivery transactions, including your email address, billing details, and order customizations. Payment credentials (such as credit card numbers) are processed through an isolated clearing gateway and are never cached in raw text formats on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              2. Real-time Phone Geolocation (GPS)
            </h2>
            <div className="p-4.5 bg-orange-50/20 border border-orange-100 rounded-2xl flex items-start space-x-3 text-xs font-semibold text-slate-600">
              <MapPin className="w-5 h-5 text-[#F15A24] shrink-0 stroke-[2]" />
              <div className="leading-relaxed space-y-1 text-left">
                <p className="font-black text-slate-900">Phone Geolocation & Reverse-Geocoding Details:</p>
                <p>
                  When you select &ldquo;Use Current Location&rdquo; or &ldquo;Autofill Current Location&rdquo;, Wolfie queries your browser's GPS hardware. The resolved coordinates are queried via OpenStreetMap Nominatim API to autofill the delivery street address. Location tracking is only requested with active user permission and is utilized strictly for route dispatching.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              3. Data Usage & Simulated kitchen alerts
            </h2>
            <p>
              Your address coordinates and ordering notes (allergies, gate codes) are dispatched to the kitchen terminal of the corresponding restaurant and mapped to the courier companion client. We simulate rider telemetry metrics using automated background signals to coordinate arrival indicators.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              4. Cookies & Persistent Session States
            </h2>
            <p>
              We utilize browser storage options (such as `localStorage`) to store active cart lists, user addresses, favorite dining kitchens, and session email states. You may manage these storage options through your browser configurations or modify individual permissions on the Cookie Settings panel.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              5. Data Security Standards
            </h2>
            <p>
              We enforce strict end-to-end security measures. All communications are encrypted over HTTPS. Transaction records are managed through the secure Antigravity Vault framework, ensuring that address arrays and payment records remain secure and private.
            </p>
          </section>

        </div>
      </main>

      {/* Mini footer */}
      <footer className="py-8 bg-[#0B0F19] text-slate-500 text-center text-xs border-t border-slate-800/40 select-none">
        &copy; {new Date().getFullYear()} Wolfie Technologies Inc. All Rights Reserved.
      </footer>
    </div>
  );
}
