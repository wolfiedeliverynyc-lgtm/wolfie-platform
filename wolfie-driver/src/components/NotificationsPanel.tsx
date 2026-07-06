import React from 'react';
import { X, Bell, AlertTriangle, CloudRain, Clock, Settings, Info } from 'lucide-react';
import { useDriverStore } from '../store/useDriverStore';

interface NotificationsPanelProps {
  onClose: () => void;
}

export default function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { intelligenceAlerts, dismissAlert } = useDriverStore();

  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'demand_surge': return <AlertTriangle className="w-5 h-5 text-primary" />;
      case 'weather_warning': return <CloudRain className="w-5 h-5 text-sky-400" />;
      case 'traffic_delay': return <Clock className="w-5 h-5 text-rose-500" />;
      case 'system_update': return <Settings className="w-5 h-5 text-emerald-400" />;
      default: return <Info className="w-5 h-5 text-text-secondary" />;
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-bg-app animate-[slideInRight_0.2s_ease-out]">
      <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-bg-card">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-black text-text-primary uppercase tracking-wider">Notifications</h2>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-bg-card border border-slate-800 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {intelligenceAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary space-y-4">
            <Bell className="w-12 h-12 text-slate-800" />
            <p className="text-sm font-semibold">No new notifications</p>
          </div>
        ) : (
          intelligenceAlerts.map(alert => (
            <div key={alert.id} className="bg-bg-card border border-slate-800 rounded-2xl p-4 flex gap-4 relative overflow-hidden group">
              <div className="mt-1">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-text-primary">{alert.title}</h4>
                  <span className="text-[10px] text-text-secondary font-mono">{alert.timestamp}</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{alert.message}</p>
              </div>
              <button 
                onClick={() => dismissAlert(alert.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-text-secondary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
