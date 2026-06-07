'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import Header from '../../components/Header';

export default function TermsOfServicePage() {
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
              <FileText className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] bg-[#FFF2ED] text-[#F15A24] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                Legal Document
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
                Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, or utilizing the Wolfie food ordering and logistics platform (collectively the &ldquo;Services&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, please terminate your usage of our applications immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              2. Account Registration & Security
            </h2>
            <p>
              To authorize transactions and request courier dispatches, you must create a validated account. You are solely responsible for maintaining the confidentiality of your session tokens and security vault settings. Wolfie is not liable for unauthorized access resulting from shared credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              3. Platform Mechanics & Dynamic Menus
            </h2>
            <p>
              Wolfie operates as a restaurant website generator engine. We host digital store fronts and facilitate food preps and bicycle couriers. Menus, pricing structures, layouts, and ingredients lists are updated in real-time by individual restaurant partners. We do not warrant the absolute precision of chef-generated materials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              4. Payment Clearing & Secure Vault
            </h2>
            <p>
              All payment methods (including credit cards and Google Pay linkages) are tokenized and cleared securely via our Antigravity Secure Vault protocol. By submitting an order, you authorize Wolfie to clear the grand total sum (inclusive of items, delivery fee, service fee, and local taxes) immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              5. Courier Logistics & Tracking
            </h2>
            <p>
              Delivery times displayed on item detail screens are estimates based on kitchen throughput and traffic conditions. Real-time bike coordinates are simulated using transit telemetry. Wolfie Couriers strive to meet delivery targets but accept no liability for acts of nature, kitchen delays, or traffic congestion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#F15A24] rounded-full" />
              6. Limitation of Liability
            </h2>
            <div className="p-4.5 bg-slate-50 border border-slate-105 rounded-2xl flex items-start space-x-3 text-xs font-semibold text-slate-500">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 stroke-[2.5]" />
              <p className="leading-relaxed">
                WOLFIE AND ITS RESTAURANT PARTNERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF FOOD PREPARATIONS, ALLERGIC REACTIONS TO LISTED INGREDIENTS, OR COURIER COURIER TRANSLATIONS.
              </p>
            </div>
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
