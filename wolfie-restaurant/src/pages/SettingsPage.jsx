import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, MapPin, Target, Zap, Clock, Activity, AlertTriangle, Fingerprint, Image, Check, Save
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

const AVAILABLE_LOGOS = [
  { name: "Wendy's Red", path: "/assets/restaurant_logo_wendys.png" },
  { name: "Shake Shack", path: "/assets/restaurant_logo_shakeshack.png" },
  { name: "McDonald's", path: "/assets/restaurant_logo_mcdonalds.png" },
  { name: "Wolfie Yellow", path: "/assets/wolf_logo.png" }
];

const AVAILABLE_COVERS = [
  { name: "Wendy's Grill", path: "/assets/restaurant_cover_wendys.png" },
  { name: "Shake Shack Neon", path: "/assets/restaurant_cover_shakeshack.png" },
  { name: "McDonald's Classic", path: "/assets/restaurant_cover_mcdonalds.png" },
  { name: "Wolfie Speed Hero", path: "/assets/wolf_hero.png" }
];

export default function SettingsPage() {
  const { restaurant, settings, updateSettings } = useRestaurantStore();
  const [activeTab, setActiveTab] = useState('identity');
  
  // Local states linked to store
  const [restaurantName, setRestaurantName] = useState(restaurant.name);
  const [restaurantDesc, setRestaurantDesc] = useState(restaurant.description || '');
  const [restaurantAddress, setRestaurantAddress] = useState(restaurant.address || '');
  const [restaurantHours, setRestaurantHours] = useState(restaurant.operatingHours || 'Mon - Sun: 10:00 AM - 11:00 PM');
  const [isBusyMode, setIsBusyMode] = useState(settings.pauseOrders || false);

  const [viewport, setViewport] = useState({
    latitude: restaurant.latitude || 36.8990,
    longitude: restaurant.longitude || 8.4410,
    zoom: 14
  });

  useEffect(() => {
    if (restaurant.latitude && restaurant.longitude) {
      setViewport(prev => ({
        ...prev,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude
      }));
    }
  }, [restaurant.latitude, restaurant.longitude]);

  const handleRestaurantUpdate = (field, value) => {
    useRestaurantStore.setState({
      restaurant: {
        ...restaurant,
        [field]: value
      }
    });
  };

  const handleNameChange = (e) => {
    setRestaurantName(e.target.value);
    handleRestaurantUpdate('name', e.target.value);
  };

  const handleDescChange = (e) => {
    setRestaurantDesc(e.target.value);
    handleRestaurantUpdate('description', e.target.value);
  };

  const handleAddressChange = (e) => {
    setRestaurantAddress(e.target.value);
    handleRestaurantUpdate('address', e.target.value);
  };

  const handleHoursChange = (e) => {
    setRestaurantHours(e.target.value);
    handleRestaurantUpdate('operatingHours', e.target.value);
  };

  const toggleSetting = (key) => updateSettings({ [key]: !settings[key] });
  const handlePrepTimeChange = (e) => updateSettings({ prepTimeDefault: parseInt(e.target.value) || 15 });
  
  const handleBusyModeToggle = () => {
    setIsBusyMode(!isBusyMode);
    updateSettings({ pauseOrders: !isBusyMode });
  };

  return (
    <div className="w-full h-full text-[var(--text-primary)] p-8 lg:p-12 overflow-y-auto overflow-x-hidden relative bg-[var(--bg-app)] transition-colors duration-300">
      
      {/* Background ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent-yellow)] opacity-5 blur-[120px] pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-12 relative z-10">
        
        {/* Futuristic Header */}
        <motion.div variants={itemVariants} className="flex items-end justify-between border-none pb-8">
          <div>
            <motion.div initial={{ width: 0 }} animate={{ width: "40px" }} className="h-1 bg-[var(--accent-yellow)] mb-6 shadow-[0_0_10px_var(--accent-yellow)]" />
            <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] uppercase font-poppins">Systems Core</h1>
            <p className="text-[14px] uppercase tracking-[0.15em] text-[var(--text-secondary)] mt-4 font-sans flex items-center gap-2 font-poppins">
              <Shield size={12} className="text-[var(--accent-yellow)]" /> Identity & Operations Configuration
            </p>
          </div>
          
          <button
            onClick={handleBusyModeToggle}
            className={`px-8 py-4 rounded-full text-[13px] font-black uppercase tracking-[0.15em] flex items-center gap-3 transition-all ${
              isBusyMode 
                ? 'bg-[var(--accent-red)] text-black shadow-[0_0_30px_rgba(239,42,57,0.5)] animate-pulse'
                : 'bg-transparent border border-[var(--accent-red)]/50 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
            }`}
          >
            {isBusyMode ? <AlertTriangle size={14} /> : <Zap size={14} />}
            {isBusyMode ? 'SYSTEM OVERLOAD / PAUSED' : 'ENGAGE BUSY MODE'}
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Panel: Navigation Pill & Profile */}
          <motion.div variants={itemVariants} className="lg:col-span-3 flex flex-col gap-8">
            <div className="bg-[var(--bg-card)] border-none rounded-[24px] p-8 flex flex-col items-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-yellow)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="w-32 h-32 rounded-full border border-[var(--accent-yellow)]/30 p-1 mb-6 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-[var(--accent-yellow)] animate-spin" style={{ animationDuration: '3s' }} />
                <div className="w-full h-full rounded-full bg-[var(--bg-card-hover)] overflow-hidden">
                  <img src={restaurant.logo || '/assets/restaurant_logo_wendys.png'} alt="Restaurant Logo" className="w-full h-full object-contain p-2" />
                </div>
              </div>
              <h3 className="text-xl font-bold tracking-wide text-[var(--text-primary)] font-poppins">{restaurantName}</h3>
              <p className="text-[13px] uppercase tracking-[0.2em] text-[var(--accent-yellow)] mt-2 font-sans font-poppins">Level 9 Authorization</p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { id: 'identity', label: 'Identity & Info', icon: Fingerprint },
                { id: 'operations', label: 'Operating Hours', icon: Clock },
                { id: 'zones', label: 'Territory Matrix', icon: Target }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full p-5 rounded-[24px] flex items-center gap-4 transition-all duration-500 relative overflow-hidden ${
                    activeTab === tab.id 
                      ? 'bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-transparent' 
                      : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] border border-transparent'
                  }`}
                >
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-yellow)] shadow-[0_0_10px_var(--accent-yellow)]" />}
                  <tab.icon size={18} />
                  <span className="text-[14px] uppercase tracking-[0.15em] font-bold font-poppins">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Right Panel: Content Area */}
          <motion.div variants={itemVariants} className="lg:col-span-9">
            <AnimatePresence mode="wait">
              
              {activeTab === 'identity' && (
                <motion.div key="identity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="bg-[var(--bg-card)] border-none rounded-[24px] p-10 relative overflow-hidden">
                    <p className="text-[14px] uppercase tracking-[0.2em] text-[var(--accent-yellow)] font-bold mb-8 font-sans flex items-center gap-3 font-poppins">
                      <Fingerprint size={16} /> Business Profile
                    </p>
                    
                    <div className="space-y-8 max-w-xl text-left">
                      {/* Name input */}
                      <div className="space-y-2 group">
                        <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] group-focus-within:text-[var(--accent-yellow)] transition-colors font-poppins">Restaurant Name</label>
                        <input
                          type="text"
                          value={restaurantName}
                          onChange={handleNameChange}
                          className="w-full bg-transparent border-b border-[var(--text-secondary)]/20 py-3 text-2xl font-light tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] transition-colors font-poppins font-bold"
                        />
                      </div>

                      {/* Description textarea */}
                      <div className="space-y-2 group">
                        <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] group-focus-within:text-[var(--accent-yellow)] transition-colors font-poppins">Business Description</label>
                        <textarea
                          rows={2}
                          value={restaurantDesc}
                          onChange={handleDescChange}
                          className="w-full bg-transparent border-b border-[var(--text-secondary)]/20 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] transition-colors font-poppins resize-none"
                          placeholder="Tell customers about your kitchen..."
                        />
                      </div>

                      {/* Address input */}
                      <div className="space-y-2 group">
                        <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] group-focus-within:text-[var(--accent-yellow)] transition-colors font-poppins">Physical Address</label>
                        <input
                          type="text"
                          value={restaurantAddress}
                          onChange={handleAddressChange}
                          className="w-full bg-transparent border-b border-[var(--text-secondary)]/20 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] transition-colors font-poppins"
                          placeholder="e.g. 234 Bedford Ave, Brooklyn, NY"
                        />
                      </div>

                      {/* Logo Selector */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Select Brand Logo</label>
                          <label className="text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--accent-yellow)] cursor-pointer hover:underline flex items-center gap-1 font-poppins bg-[var(--bg-card-hover)] px-2.5 py-1 rounded-full border border-[var(--text-secondary)]/10">
                            Upload Custom
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (uploadEvent) => {
                                    handleRestaurantUpdate('logo', uploadEvent.target.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-5 gap-4">
                          {AVAILABLE_LOGOS.map((lg) => (
                            <button
                              key={lg.path}
                              onClick={() => handleRestaurantUpdate('logo', lg.path)}
                              className={`p-2 rounded-xl bg-[var(--bg-card-hover)] border-2 transition-all flex items-center justify-center h-16 ${
                                restaurant.logo === lg.path ? 'border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 scale-105' : 'border-transparent hover:border-[var(--text-secondary)]/30'
                              }`}
                            >
                              <img src={lg.path} alt={lg.name} className="max-h-12 object-contain" />
                            </button>
                          ))}
                          {restaurant.logo && !AVAILABLE_LOGOS.some(l => l.path === restaurant.logo) && (
                            <div className="p-2 rounded-xl bg-[var(--bg-card-hover)] border-2 border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 scale-105 flex items-center justify-center h-16 relative">
                              <img src={restaurant.logo} alt="Custom Logo" className="max-h-12 object-contain" />
                              <span className="absolute -top-1 -right-1 bg-[var(--accent-yellow)] text-black text-[13px] font-bold px-1 rounded">Custom</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hero Image Selector */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Select Hero Picture</label>
                          <label className="text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--accent-yellow)] cursor-pointer hover:underline flex items-center gap-1 font-poppins bg-[var(--bg-card-hover)] px-2.5 py-1 rounded-full border border-[var(--text-secondary)]/10">
                            Upload Custom
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (uploadEvent) => {
                                    handleRestaurantUpdate('heroImage', uploadEvent.target.result);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {AVAILABLE_COVERS.map((cv) => (
                            <button
                              key={cv.path}
                              onClick={() => handleRestaurantUpdate('heroImage', cv.path)}
                              className={`rounded-xl bg-[var(--bg-card-hover)] border-2 overflow-hidden transition-all h-20 relative flex items-center justify-center ${
                                restaurant.heroImage === cv.path ? 'border-[var(--accent-yellow)] scale-102' : 'border-transparent hover:border-[var(--text-secondary)]/30'
                              }`}
                            >
                              <img src={cv.path} alt={cv.name} className="w-full h-full object-cover opacity-75" />
                              <span className="absolute bottom-1 left-2 text-[13px] bg-black/80 px-2 py-0.5 rounded text-white font-bold">{cv.name}</span>
                            </button>
                          ))}
                          {restaurant.heroImage && !AVAILABLE_COVERS.some(c => c.path === restaurant.heroImage) && (
                            <div className="rounded-xl bg-[var(--bg-card-hover)] border-2 border-[var(--accent-yellow)] overflow-hidden h-20 relative flex items-center justify-center scale-102">
                              <img src={restaurant.heroImage} alt="Custom Hero" className="w-full h-full object-cover opacity-75" />
                              <span className="absolute bottom-1 left-2 text-[13px] bg-[var(--accent-yellow)] text-black font-extrabold px-2 py-0.5 rounded uppercase font-poppins">Custom</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Store Controls */}
                      <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="bg-[var(--bg-card-hover)] p-6 rounded-[24px] border-none relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--accent-yellow)]/10 blur-[20px]" />
                          <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2 font-poppins">Automated Dispatch</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className={`text-xs font-sans tracking-widest font-poppins font-bold ${settings.autoAccept ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-secondary)]/40'}`}>
                              {settings.autoAccept ? 'ACTIVE' : 'OFFLINE'}
                            </span>
                            <button onClick={() => toggleSetting('autoAccept')} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.autoAccept ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card)]'}`}>
                              <motion.div layout className="w-4 h-4 bg-white rounded-full" style={{ marginLeft: settings.autoAccept ? 'auto' : '0' }} />
                            </button>
                          </div>
                        </div>

                        <div className="bg-[var(--bg-card-hover)] p-6 rounded-[24px] border-none relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--accent-yellow)]/10 blur-[20px]" />
                          <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2 font-poppins">Acoustic Alerts</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className={`text-xs font-sans tracking-widest font-poppins font-bold ${settings.soundAlerts ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-secondary)]/40'}`}>
                              {settings.soundAlerts ? 'ACTIVE' : 'MUTED'}
                            </span>
                            <button onClick={() => toggleSetting('soundAlerts')} className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.soundAlerts ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card)]'}`}>
                              <motion.div layout className="w-4 h-4 bg-white rounded-full" style={{ marginLeft: settings.soundAlerts ? 'auto' : '0' }} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 group mt-8">
                        <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] group-focus-within:text-[var(--accent-yellow)] transition-colors font-poppins">Default Buffer Time (Mins)</label>
                        <input
                          type="number"
                          value={settings.prepTimeDefault}
                          onChange={handlePrepTimeChange}
                          className="w-32 bg-transparent border-b border-[var(--text-secondary)]/20 py-3 text-3xl font-sans tracking-wider text-[var(--accent-yellow)] outline-none focus:border-[var(--accent-yellow)] transition-colors text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'operations' && (
          <motion.div key="operations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 text-left">
            <div className="bg-[var(--bg-card)] border-none rounded-[24px] p-10">
              <p className="text-[14px] uppercase tracking-[0.2em] text-[var(--accent-yellow)] font-bold mb-8 font-sans flex items-center gap-3 font-poppins">
                <Clock size={16} /> Operating Hours
              </p>

              {/* 7‑day schedule with time inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
                {[
                  { label: 'Monday', key: 'mon' },
                  { label: 'Tuesday', key: 'tue' },
                  { label: 'Wednesday', key: 'wed' },
                  { label: 'Thursday', key: 'thu' },
                  { label: 'Friday', key: 'fri' },
                  { label: 'Saturday', key: 'sat' },
                  { label: 'Sunday', key: 'sun' }
                ].map(day => (
                  <div key={day.key} className="flex items-center space-x-4">
                    <span className="w-24 font-poppins text-[var(--text-primary)]">{day.label}</span>
                    <input
                      type="time"
                      value={restaurant.operatingHours[day.key]?.open ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        useRestaurantStore.setState(state => ({
                          restaurant: {
                            ...state.restaurant,
                            operatingHours: {
                              ...state.restaurant.operatingHours,
                              [day.key]: {
                                ...state.restaurant.operatingHours[day.key],
                                open: val
                              }
                            }
                          }
                        }));
                      }}
                      className="w-24 bg-transparent border-b border-[var(--text-secondary)]/20 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] font-poppins"
                    />
                    <span className="text-[var(--text-secondary)]">-</span>
                    <input
                      type="time"
                      value={restaurant.operatingHours[day.key]?.close ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        useRestaurantStore.setState(state => ({
                          restaurant: {
                            ...state.restaurant,
                            operatingHours: {
                              ...state.restaurant.operatingHours,
                              [day.key]: {
                                ...state.restaurant.operatingHours[day.key],
                                close: val
                              }
                            }
                          }
                        }));
                      }}
                      className="w-24 bg-transparent border-b border-[var(--text-secondary)]/20 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] font-poppins"
                    />
                  </div>
                ))}
              </div>

              {/* Confirm Button */}
              <div className="pt-6 flex justify-end">
                <button
                  onClick={() => {
                    const btn = document.getElementById('ops-confirm-btn');
                    if (btn) {
                      btn.textContent = '✓ Hours Saved!';
                      btn.classList.add('bg-[#22c55e]');
                      btn.classList.remove('bg-[var(--accent-yellow)]');
                      setTimeout(() => {
                        btn.textContent = '';
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Confirm Operating Hours';
                        btn.classList.remove('bg-[#22c55e]');
                        btn.classList.add('bg-[var(--accent-yellow)]');
                      }, 2000);
                    }
                  }}
                  id="ops-confirm-btn"
                  className="px-8 py-4 rounded-2xl bg-[var(--accent-yellow)] text-black text-[13px] font-black uppercase tracking-[0.15em] border-none hover:shadow-[0_0_25px_rgba(255,184,0,0.4)] transition-all cursor-pointer font-poppins flex items-center gap-2"
                >
                  <Save size={14} /> Confirm Operating Hours
                </button>
              </div>
            </div>
          </motion.div>
        )}

              {activeTab === 'zones' && (
                <motion.div key="zones" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="bg-[var(--bg-card)] border-none rounded-[24px] p-10">
                    <p className="text-[14px] uppercase tracking-[0.2em] text-[var(--accent-yellow)] font-bold mb-8 font-sans flex items-center gap-3 font-poppins">
                      <Target size={16} /> Territory Boundaries
                    </p>
                    
                    <div className="h-[50vh] rounded-[24px] overflow-hidden border-none relative group">
                      <div className="absolute inset-0 bg-[var(--bg-card-hover)] z-0" />
                      {MAPBOX_TOKEN ? (
                        <Map
                          {...viewport}
                          onMove={evt => setViewport(evt.viewState)}
                          mapStyle={MAP_STYLE}
                          mapboxAccessToken={MAPBOX_TOKEN}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <Marker latitude={restaurant.latitude || 36.8990} longitude={restaurant.longitude || 8.4410}>
                            <div className="w-4 h-4 bg-[var(--accent-yellow)] rounded-full animate-pulse shadow-[0_0_20px_var(--accent-yellow)]" />
                          </Marker>
                        </Map>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)]/30 z-10 p-6">
                          <MapPin size={40} strokeWidth={1} className="mb-6" />
                          <p className="text-[13px] uppercase tracking-[0.15em] font-sans font-poppins">Map Link Offline</p>
                          <p className="text-xs font-light mt-2 text-[var(--text-primary)] font-poppins">Insert Vector Token to engage.</p>
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
