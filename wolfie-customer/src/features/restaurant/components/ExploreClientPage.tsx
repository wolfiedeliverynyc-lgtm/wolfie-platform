'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { Star, Clock, Heart, Search, Sparkles, Plus, AlertCircle, Compass, Layout, ArrowRight, Info, Users, HelpCircle, Shield, Bike, ChefHat, FileText, Globe } from 'lucide-react';

// Custom inline SVG icons to fix Lucide-react export mismatches
const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
import Header from '../../../components/Header';
import NotificationsPanel from '../../../components/NotificationsPanel';
import FoodFilterSidebar from './FoodFilterSidebar';
import { useUiStore } from '../../../stores/useUiStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { restaurantApi } from '../../../services/api';
import { Restaurant } from '../../../lib/types';
import CartDrawer from '../../cart/components/CartDrawer';
import { useRealtimeStore } from '../../../stores/useRealtimeStore';

interface ExploreClientPageProps {
  initialRestaurants: Restaurant[];
}

export default function ExploreClientPage({ initialRestaurants }: ExploreClientPageProps) {
  // Pull filter states from Zustand
  const { exploreSearch, setExploreSearch, exploreFilter, sidebarFilter } = useUiStore();
  const { favorites, toggleFavorite, history } = useAuthStore();
  const { addNotification } = useRealtimeStore();

  // Query restaurants catalog (TanStack Query client database sync)
  const { data: restaurants = initialRestaurants } = useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantApi.getRestaurants,
    initialData: initialRestaurants,
  });

  // Filter restaurants based on search, category tab, and left spotlights
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((rest) => {
      const matchSearch = rest.name.toLowerCase().includes(exploreSearch.toLowerCase()) ||
        rest.description.toLowerCase().includes(exploreSearch.toLowerCase());
      
      const matchFilter = exploreFilter === 'All' || rest.category.includes(exploreFilter);
      
      // Left sidebar spotlight filters
      if (sidebarFilter === 'favorite') {
        if (!favorites.includes(rest.id)) return false;
      } else if (sidebarFilter === 'history') {
        if (!history.includes(rest.id)) return false;
      } else if (sidebarFilter === 'closest') {
        if (rest.deliveryTimeMin > 22) return false;
      } else if (sidebarFilter === 'best_seller') {
        if (rest.rating < 4.85) return false;
      } else if (sidebarFilter === 'promos') {
        if (rest.deliveryFee > 1.50) return false;
      }

      return matchSearch && matchFilter;
    });
  }, [restaurants, exploreSearch, exploreFilter, sidebarFilter, favorites, history]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Header />
      <NotificationsPanel />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 select-none">
        
        {/* Onboarding Welcome banner card */}
        <div className="relative rounded-[2.5rem] bg-[#111827] text-white p-8 md:p-12 mb-8 overflow-hidden shadow-xl border border-slate-850 select-none text-left">
          <div className="absolute top-[-30px] right-[-30px] w-36 h-36 bg-[#F15A24]/10 rounded-full blur-2xl animate-pulse" />
          <div className="max-w-xl space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-[#F15A24]/20 text-[#F15A24] font-black tracking-widest text-[9px] uppercase px-3 py-1.5 rounded-full border border-[#F15A24]/30">
              <Sparkles className="w-3 h-3 text-[#F15A24] animate-pulse" /> Welcome to Wolfie Premium
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none text-white">
              NYC Gastronomy Delivered At 25% Savings
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed font-bold font-sans max-w-md">
              Order tonkotsu bowls, truffle gnocchi or organic elixirs and follow courier e-bikes in real-time coordinates.
            </p>
          </div>
        </div>

        {/* Categories search bar */}
        <div className="bg-white border border-[#ECEFF2] rounded-[2rem] p-5 shadow-xs mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
          <div className="flex items-center space-x-3 text-left">
            <Compass className="w-5 h-5 text-[#F15A24]" />
            <div>
              <h2 className="text-xs font-black text-slate-905 uppercase tracking-wider">Neighborhood Kitchens</h2>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Explore curated dining choices</span>
            </div>
          </div>

          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search kitchen name or description..."
              value={exploreSearch}
              onChange={(e) => setExploreSearch(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 pl-11 pr-4 py-3 rounded-full border border-slate-105 text-xs focus:ring-1 focus:ring-[#F15A24] focus:bg-white focus:border-[#F15A24] focus:outline-none placeholder-slate-400 transition-all font-sans shadow-sm font-semibold"
            />
          </div>
        </div>

        {/* Split Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Filters */}
          <div className="lg:col-span-3">
            <FoodFilterSidebar />
          </div>

          {/* Right: Restaurant listings card grid */}
          <div className="lg:col-span-9 space-y-6">
            {filteredRestaurants.length === 0 ? (
              <div className="text-center py-20 bg-white border border-[#ECEFF2] rounded-[2.5rem] p-10 shadow-xs select-none">
                <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-slate-700">No Kitchens Found</h3>
                <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto mt-2 leading-relaxed">
                  We could not find matches for your selection. Try adjusting the tags or filter terms.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="restaurants-catalog-grid">
                {filteredRestaurants.map((rest) => {
                  const isFavorite = favorites.includes(rest.id);
                  return (
                    <div
                      key={rest.id}
                      className="group bg-white border border-[#ECEFF2] rounded-[2.2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                    >
                      <Link href={`/restaurant/${rest.id}`} className="block relative h-48 overflow-hidden select-none cursor-pointer">
                        {/* Hero Image */}
                        <img
                          src={rest.heroImage}
                          alt={rest.name}
                          className="w-full h-full object-cover scale-102 group-hover:scale-108 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        
                        {/* Category Floating Badge */}
                        <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-slate-900 border border-slate-100 text-[8px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider">
                          {rest.category.split(' / ')[0]}
                        </span>

                        {/* Layout Emblem indicator */}
                        <span className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-amber-300 border border-slate-700/60 text-[8.5px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                          <Layout className="w-3 h-3 text-amber-300" />
                          <span>{rest.layout} layout</span>
                        </span>

                        {/* Title overlay */}
                        <div className="absolute bottom-4 left-4 right-4 text-left">
                          <h3 className="text-base font-black text-white tracking-tight drop-shadow-sm truncate">
                            {rest.name}
                          </h3>
                          <p className="text-[10px] text-slate-350 font-bold tracking-wide truncate max-w-[280px]">
                            {rest.bio}
                          </p>
                        </div>
                      </Link>

                      {/* Content stats */}
                      <div className="p-5 space-y-4 text-left select-none">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 font-sans">
                          {/* Rating */}
                          <div className="flex items-center text-amber-500 font-extrabold gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{rest.rating.toFixed(2)}</span>
                            <span className="text-slate-400 font-medium font-sans">({rest.ratingCount})</span>
                          </div>
                          
                          {/* ETA */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{rest.deliveryTimeMin} mins</span>
                          </div>

                          {/* Fee */}
                          <span className="text-[#F15A24] font-black">
                            {rest.deliveryFee === 0 ? 'FREE' : `$${rest.deliveryFee.toFixed(2)} delivery`}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between border-t border-slate-100/80 pt-4">
                          <button
                            onClick={() => {
                              toggleFavorite(rest.id);
                              addNotification(
                                isFavorite ? 'Removed from favorites 💔' : 'Saved to favorites! ❤️', 
                                isFavorite ? `Removed ${rest.name} from lists.` : `Added ${rest.name} to gourmet list.`, 
                                isFavorite ? 'info' : 'success'
                              );
                            }}
                            className="p-2.5 hover:bg-slate-50 border border-slate-105 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-red-500"
                            title="Toggle favorite status"
                          >
                            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-450'}`} />
                          </button>

                          <Link
                            href={`/restaurant/${rest.id}`}
                            className="py-2.5 px-5 bg-slate-900 hover:bg-[#F15A24] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <span>Enter Kitchen</span>
                            <ArrowRight className="w-3.5 h-3.5 text-white" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Premium Footer Section */}
      <footer className="bg-[#0B0F19] text-slate-350 border-t border-slate-800/60 font-sans mt-24">
        {/* Main Grid */}
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          
          {/* Brand Col */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="flex items-center space-x-2 select-none">
              <span className="text-xl font-black text-white tracking-wider font-sans uppercase">
                Wolfie<span className="text-[#F15A24]">.</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold max-w-[280px]">
              Next-generation high-fidelity gourmet delivery engine. Satisfying your artisan cravings with volcanic speed and custom AI pairings.
            </p>
            {/* Social media links */}
            <div className="flex items-center space-x-3.5">
              <a
                href="https://instagram.com/wolfie"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-350 hover:text-white hover:bg-[#F15A24] hover:border-transparent transition-all cursor-pointer"
                title="Follow Wolfie on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/wolfie"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-350 hover:text-white hover:bg-[#F15A24] hover:border-transparent transition-all cursor-pointer"
                title="Follow Wolfie on Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com/wolfie"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-350 hover:text-white hover:bg-[#F15A24] hover:border-transparent transition-all cursor-pointer"
                title="Follow Wolfie on Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links Col 1: Explore */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>About Us</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <a href="/about" className="hover:text-white transition-colors cursor-pointer block">Our Story</a>
              </li>
              <li>
                <a href="/careers" className="hover:text-white transition-colors cursor-pointer block">Careers</a>
              </li>
              <li>
                <a href="/press" className="hover:text-white transition-colors cursor-pointer block">Press Kit</a>
              </li>
              <li>
                <a href="/blog" className="hover:text-white transition-colors cursor-pointer block">Culinary Blog</a>
              </li>
            </ul>
          </div>

          {/* Links Col 2: Join Us */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Join Us</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <a href="/driver/signup" className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-[#F15A24]" />
                  <span>Join as Driver</span>
                </a>
              </li>
              <li>
                <a href="/restaurant/signup" className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-[#F15A24]" />
                  <span>Become a Partner</span>
                </a>
              </li>
              <li>
                <a href="/corporate" className="hover:text-white transition-colors cursor-pointer block">Corporate Delivery</a>
              </li>
            </ul>
          </div>

          {/* Links Col 3: Support */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Support</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <a href="/help" className="hover:text-white transition-colors cursor-pointer block">Help Center</a>
              </li>
              <li>
                <a href="/faq" className="hover:text-white transition-colors cursor-pointer block">Delivery FAQs</a>
              </li>
              <li>
                <a href="/contact" className="hover:text-white transition-colors cursor-pointer block">Contact Dispatch</a>
              </li>
              <li>
                <a href="/refunds" className="hover:text-white transition-colors cursor-pointer block">Refund Policy</a>
              </li>
            </ul>
          </div>

          {/* Links Col 4: Legal */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Legal</span>
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <a href="/terms" className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Terms of Service</span>
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Privacy Policy</span>
                </a>
              </li>
              <li>
                <a href="/cookie" className="hover:text-white transition-colors cursor-pointer block">Cookie Settings</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto px-6 py-6 border-t border-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-[11px] font-bold text-slate-500 select-none gap-4">
          <div>
            &copy; {new Date().getFullYear()} Wolfie Technologies Inc. All Rights Reserved.
          </div>
          <div className="flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>Ledger secured via Antigravity Secure Protocol.</span>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <AnimatePresence>
        <CartDrawer />
      </AnimatePresence>
    </div>
  );
}
