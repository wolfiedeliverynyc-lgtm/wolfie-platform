/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShoppingBag, Flame, Bike, MapPin, Sparkles, X, CheckCircle } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'success' | 'info' | 'alert' | 'rider';
  time: string;
}

interface NotificationsPanelProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export default function NotificationsPanel({ notifications, onDismiss }: NotificationsPanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'info':
        return <Bell className="w-5 h-5 text-blue-600" />;
      case 'alert':
        return <Flame className="w-5 h-5 text-rose-600" />;
      case 'rider':
        return <Bike className="w-5 h-5 text-indigo-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-emerald-250';
      case 'info':
        return 'border-blue-200';
      case 'alert':
        return 'border-rose-250';
      case 'rider':
        return 'border-indigo-200';
      default:
        return 'border-amber-200';
    }
  };

  return (
    <div className="fixed top-24 right-4 z-50 pointer-events-none flex flex-col space-y-3 max-w-sm w-full px-4" id="notifications-hud-wrapper">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto w-full p-4 bg-white text-slate-800 rounded-xl shadow-xl border ${getBorderColor(
              notif.type
            )} flex items-start space-x-3.5`}
            id={`notif-${notif.id}`}
          >
            <div className="flex-shrink-0 mt-0.5 p-1.5 bg-slate-50 rounded-lg border border-slate-105">
              {getIcon(notif.type)}
            </div>

            <div className="flex-1 min-w-0 font-sans">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 tracking-tight leading-4">
                  {notif.title}
                </p>
                <span className="text-[10px] font-mono text-slate-400 ml-2">
                  {notif.time}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-5">
                {notif.body}
              </p>
            </div>

            <button
              onClick={() => onDismiss(notif.id)}
              className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 p-1 hover:bg-slate-100 rounded cursor-pointer"
              title="Close Notification"
              id={`dismiss-notif-${notif.id}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
