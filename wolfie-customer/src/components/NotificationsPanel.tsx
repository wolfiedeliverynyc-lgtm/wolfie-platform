'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BellRing, CheckCircle2, AlertCircle, Info, Bike, X } from 'lucide-react';
import { useRealtimeStore } from '../stores/useRealtimeStore';

export default function NotificationsPanel() {
  const { notifications, dismissNotification } = useRealtimeStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'rider':
        return <Bike className="w-5 h-5 text-blue-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBgStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-100/60 shadow-[0_8px_30px_rgba(16,185,129,0.08)]';
      case 'alert':
        return 'bg-amber-50 border-amber-100/60 shadow-[0_8px_30px_rgba(245,158,11,0.08)]';
      case 'rider':
        return 'bg-blue-50 border-blue-100/60 shadow-[0_8px_30px_rgba(59,130,246,0.08)]';
      case 'info':
      default:
        return 'bg-slate-50/95 border-slate-200/50 shadow-[0_8px_30px_rgba(15,23,42,0.03)]';
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[60] w-full max-w-sm pointer-events-none space-y-3 font-sans">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`pointer-events-auto border rounded-2xl p-4 flex items-start space-x-3.5 ${getBgStyle(
              notif.type
            )}`}
            id={`toast-${notif.id}`}
          >
            <div className="shrink-0 pt-0.5">{getIcon(notif.type)}</div>
            <div className="flex-1 text-left select-none">
              <h4 className="text-xs font-black text-slate-900 tracking-tight leading-none uppercase">
                {notif.title}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-sans mt-1.5">
                {notif.body}
              </p>
              <span className="text-[9px] text-slate-400 font-bold block mt-1.5 font-mono">
                {notif.time}
              </span>
            </div>
            <button
              onClick={() => dismissNotification(notif.id)}
              className="shrink-0 p-1 hover:bg-slate-200/40 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
              title="Dismiss Alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
export type { NotificationItem } from '../lib/types';
