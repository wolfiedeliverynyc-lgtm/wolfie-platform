import React, { useState } from 'react';
import { MapPin, ShieldAlert, RefreshCw, Settings } from 'lucide-react';
import { useDriverStore } from '../store/useDriverStore';

interface GPSRequiredOverlayProps {
  onRetry: () => void;
}

export default function GPSRequiredOverlay({ onRetry }: GPSRequiredOverlayProps) {
  const gpsStatus = useDriverStore((state) => state.gpsStatus);
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    // Try to trigger geolocation query to prompt browser permission dialog
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          onRetry();
          setLoading(false);
        },
        () => {
          onRetry();
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setLoading(false);
    }
  };

  const getErrorMessage = () => {
    if (gpsStatus === 'denied') {
      return 'Wolfie was denied access to your location services. Please check your browser or system settings to allow location access.';
    }
    return 'We cannot detect your GPS location. Please make sure location services are enabled on your device to receive delivery orders.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
        {/* Glow Background effect */}
        <div className="relative mx-auto w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
          <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping blur-[2px]" style={{ animationDuration: '3s' }}></div>
          <MapPin className="w-10 h-10 text-rose-500 relative animate-bounce" />
          <ShieldAlert className="w-5 h-5 text-rose-400 absolute bottom-0 right-0 bg-slate-900 rounded-full" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {gpsStatus === 'denied' ? 'Location Access Denied' : 'GPS Location Required'}
          </h2>
          <p className="text-sm font-semibold text-slate-400 leading-relaxed px-2">
            {getErrorMessage()}
          </p>
        </div>

        {/* Informative Instructions Card */}
        <div className="bg-slate-950/60 border border-slate-850 p-4.5 rounded-2xl text-left text-xs text-slate-400 space-y-2 font-medium leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-rose-500 font-bold">1.</span>
            <span>Ensure your device's global location services are turned ON.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-rose-500 font-bold">2.</span>
            <span>Check your browser permissions for Wolfie (click the lock icon in the address bar).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-rose-500 font-bold">3.</span>
            <span>Reload the page and try going online again.</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            disabled={loading}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white rounded-2xl text-sm font-black tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>TRY ACTIVATE GPS</span>
          </button>
          
          <button
            onClick={() => alert("Please open your device's Location Settings / Browser Permissions to enable location access for Wolfie.")}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-2xl text-sm font-black tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700 active:scale-[0.98]"
          >
            <Settings className="w-4 h-4" />
            <span>SHOW SYSTEM INSTRUCTIONS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
