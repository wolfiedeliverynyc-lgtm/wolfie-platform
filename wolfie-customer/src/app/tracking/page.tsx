'use client';

import React from 'react';
import Header from '../../components/Header';
import NotificationsPanel from '../../components/NotificationsPanel';
import TrackingView from '../../features/tracking/components/TrackingView';
import CartDrawer from '../../features/cart/components/CartDrawer';
import { AnimatePresence } from 'motion/react';

export default function OrderTrackingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <NotificationsPanel />
      
      <main className="flex-1">
        <TrackingView />
      </main>

      <AnimatePresence>
        <CartDrawer />
      </AnimatePresence>
    </div>
  );
}
