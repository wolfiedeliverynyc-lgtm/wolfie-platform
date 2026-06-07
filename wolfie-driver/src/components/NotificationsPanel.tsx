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
      case 'demand_surge': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'weather_warning': return <CloudRain className="w-5 h-5 text-sky-400" />;
      case 'traffic_delay': return <Clock className="w-5 h-5 text-rose-500" />;
      case 'system_update': return <Settings className="w-5 h-5 text-emerald-400" />;
      default: return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-[#050611] animate-[slideInRight_0.2s_ease-out]">
      <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#0c0d1c]">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-wider">Notifications</h2>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {intelligenceAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <Bell className="w-12 h-12 text-slate-800" />
            <p className="text-sm font-semibold">No new notifications</p>
          </div>
        ) : (
          intelligenceAlerts.map(alert => (
            <div key={alert.id} className="bg-[#0b0c1e] border border-slate-800 rounded-2xl p-4 flex gap-4 relative overflow-hidden group">
              <div className="mt-1">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-slate-200">{alert.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">{alert.timestamp}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
              </div>
              <button 
                onClick={() => dismissAlert(alert.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-500 hover:text-white"
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
