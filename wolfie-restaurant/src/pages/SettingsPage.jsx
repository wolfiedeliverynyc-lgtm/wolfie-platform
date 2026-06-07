import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, MapPin, Target, Zap, Clock, Activity, AlertTriangle, Fingerprint
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const MAP_STYLE = import.meta.env.VITE_MAP_STYLE || 'mapbox://styles/mapbox/dark-v11';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function SettingsPage() {
  const { restaurant, settings, updateSettings, supportTickets } = useRestaurantStore();
  const [activeTab, setActiveTab] = useState('identity');
  const [restaurantName, setRestaurantName] = useState(restaurant.name);
  const [isBusyMode, setIsBusyMode] = useState(settings.pauseOrders || false);

  const [viewport, setViewport] = useState({
    latitude: 40.718,
    longitude: -73.957,
    zoom: 12
  });

  const handleNameChange = (e) => {
    setRestaurantName(e.target.value);
    useRestaurantStore.setState({ restaurant: { ...restaurant, name: e.target.value } });
  };

  const toggleSetting = (key) => updateSettings({ [key]: !settings[key] });
  const handlePrepTimeChange = (e) => updateSettings({ prepTimeDefault: parseInt(e.target.value) || 15 });
  
  const handleBusyModeToggle = () => {
    setIsBusyMode(!isBusyMode);
    updateSettings({ pauseOrders: !isBusyMode });
  };

  return (
    <div className="w-full h-full text-white p-8 lg:p-12 overflow-y-auto overflow-x-hidden relative bg-[#050505]">
      
      {/* Background ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[40%] h-[40%] bg-[#FF6129] opacity-5 blur-[120px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-12 relative z-10">
        
        {/* Futuristic Header */}
        <motion.div variants={itemVariants} className="flex items-end justify-between border-b border-white/5 pb-8">
          <div>
            <motion.div initial={{ width: 0 }} animate={{ width: "40px" }} className="h-1 bg-[#FF6129] mb-6 shadow-[0_0_10px_#FF6129]" />
            <h1 className="text-6xl font-light tracking-tighter text-white uppercase" style={{ fontStretch: 'expanded' }}>Systems Core</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(232,220,200,0.4)] mt-4 font-sans flex items-center gap-2">
              <Shield size={10} className="text-[#FF6129]" /> Identity & Operations Configuration
            </p>
          </div>
          
          <button
            onClick={handleBusyModeToggle}
            className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all ${
              isBusyMode 
                ? 'bg-[#ef4444] text-[#050505] shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse'
                : 'bg-transparent border border-[#ef4444]/50 text-[#ef4444] hover:bg-[#ef4444]/10'
            }`}
          >
            {isBusyMode ? <AlertTriangle size={14} /> : <Zap size={14} />}
            {isBusyMode ? 'SYSTEM OVERLOAD / PAUSED' : 'ENGAGE BUSY MODE'}
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Panel: Navigation Pill & Profile */}
          <motion.div variants={itemVariants} className="lg:col-span-3 flex flex-col gap-8">
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 flex flex-col items-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-[#FF6129]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="w-32 h-32 rounded-full border border-[#FF6129]/30 p-1 mb-6 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-[#FF6129] animate-spin" style={{ animationDuration: '3s' }} />
                <div className="w-full h-full rounded-full bg-[#110f0c] overflow-hidden">
                  <img src="https://i.pravatar.cc/150?u=louis" alt="Admin" className="w-full h-full object-cover grayscale opacity-80 mix-blend-screen" />
                </div>
              </div>
              <h3 className="text-xl font-light tracking-widest text-white uppercase">{restaurantName}</h3>
              <p className="text-[9px] uppercase tracking-[0.4em] text-[#FF6129] mt-2 font-sans">Level 9 Authorization</p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { id: 'identity', label: 'Identity & Params', icon: Fingerprint },
                { id: 'operations', label: 'Operations Sync', icon: Activity },
                { id: 'zones', label: 'Territory Matrix', icon: Target }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full p-5 rounded-[2.5rem] flex items-center gap-4 transition-all duration-500 relative overflow-hidden ${
                    activeTab === tab.id 
                      ? 'bg-[#FF6129]/10 text-[#FF6129] border border-[#FF6129]/30' 
                      : 'bg-transparent text-[rgba(232,220,200,0.4)] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF6129] shadow-[0_0_10px_#FF6129]" />}
                  <tab.icon size={18} />
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Right Panel: Content Area */}
          <motion.div variants={itemVariants} className="lg:col-span-9">
            <AnimatePresence mode="wait">
              
              {activeTab === 'identity' && (
                <motion.div key="identity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[#FF6129] font-bold mb-8 font-sans flex items-center gap-3">
                      <Fingerprint size={14} /> Node Identity
                    </p>
                    
                    <div className="space-y-8 max-w-xl">
                      <div className="space-y-2 group">
                        <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(232,220,200,0.4)] group-focus-within:text-[#FF6129] transition-colors">Designation / Alias</label>
                        <input
                          type="text"
                          value={restaurantName}
                          onChange={handleNameChange}
                          className="w-full bg-transparent border-b border-white/10 py-3 text-2xl font-light tracking-wider text-white outline-none focus:border-[#FF6129] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="bg-[#110f0c] p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[#38bdf8]/10 blur-[20px]" />
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(232,220,200,0.4)] mb-2">Automated Dispatch</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className={`text-xs font-sans tracking-widest ${settings.autoAccept ? 'text-[#38bdf8]' : 'text-white/20'}`}>
                              {settings.autoAccept ? 'ACTIVE' : 'OFFLINE'}
                            </span>
                            <button onClick={() => toggleSetting('autoAccept')} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.autoAccept ? 'bg-[#38bdf8]' : 'bg-white/10'}`}>
                              <motion.div layout className="w-4 h-4 bg-white rounded-full" style={{ marginLeft: settings.autoAccept ? 'auto' : '0' }} />
                            </button>
                          </div>
                        </div>

                        <div className="bg-[#110f0c] p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF6129]/10 blur-[20px]" />
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(232,220,200,0.4)] mb-2">Acoustic Alerts</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className={`text-xs font-sans tracking-widest ${settings.soundAlerts ? 'text-[#FF6129]' : 'text-white/20'}`}>
                              {settings.soundAlerts ? 'ACTIVE' : 'MUTED'}
                            </span>
                            <button onClick={() => toggleSetting('soundAlerts')} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.soundAlerts ? 'bg-[#FF6129]' : 'bg-white/10'}`}>
                              <motion.div layout className="w-4 h-4 bg-white rounded-full" style={{ marginLeft: settings.soundAlerts ? 'auto' : '0' }} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 group mt-8">
                        <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-[rgba(232,220,200,0.4)] group-focus-within:text-[#FF6129] transition-colors">Default Buffer Time (Mins)</label>
                        <input
                          type="number"
                          value={settings.prepTimeDefault}
                          onChange={handlePrepTimeChange}
                          className="w-32 bg-transparent border-b border-white/10 py-3 text-3xl font-sans tracking-wider text-[#38bdf8] outline-none focus:border-[#38bdf8] transition-colors text-center"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'operations' && (
                <motion.div key="operations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[#38bdf8] font-bold mb-8 font-sans flex items-center gap-3">
                      <Activity size={14} /> Global Schedule
                    </p>
                    
                    <div className="flex items-center justify-center h-[300px] text-center border border-dashed border-white/10 rounded-[2.5rem]">
                      <div>
                        <Clock size={40} strokeWidth={1} className="mx-auto mb-6 text-[rgba(232,220,200,0.2)]" />
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(232,220,200,0.4)] mb-2 font-sans">Temporal Matrix Offline</p>
                        <p className="text-sm font-light text-white">Schedule override in effect. System running 24/7 protocols.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'zones' && (
                <motion.div key="zones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[#FF6129] font-bold mb-8 font-sans flex items-center gap-3">
                      <Target size={14} /> Territory Boundaries
                    </p>
                    
                    <div className="h-[400px] rounded-[2.5rem] overflow-hidden border border-white/10 relative group">
                      <div className="absolute inset-0 bg-[#020202] z-0" />
                      {MAPBOX_TOKEN ? (
                        <Map
                          {...viewport}
                          onMove={evt => setViewport(evt.viewState)}
                          mapStyle={MAP_STYLE}
                          mapboxAccessToken={MAPBOX_TOKEN}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <Marker latitude={40.718} longitude={-73.957}>
                            <div className="w-4 h-4 bg-[#FF6129] rounded-full animate-pulse shadow-[0_0_20px_#FF6129]" />
                          </Marker>
                        </Map>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[rgba(232,220,200,0.2)] z-10">
                          <MapPin size={40} strokeWidth={1} className="mb-6" />
                          <p className="text-[10px] uppercase tracking-[0.3em] font-sans">Map Link Offline</p>
                          <p className="text-xs font-light mt-2 text-white">Insert Vector Token to engage.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
