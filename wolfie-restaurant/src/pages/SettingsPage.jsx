import React, { useState, useEffect } from 'react';
import { useRestaurantStore } from '../store/useRestaurantStore';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, MapPin, Target, Zap, Clock, Activity, AlertTriangle, Fingerprint, Image, Check, Save, Loader, Compass
} from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';
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
  { name: "Wendy's Red", path: "./assets/restaurant_logo_wendys.png" },
  { name: "Shake Shack", path: "./assets/restaurant_logo_shakeshack.png" },
  { name: "McDonald's", path: "./assets/restaurant_logo_mcdonalds.png" },
  { name: "Wolfie Yellow", path: "./assets/wolf_logo.png" }
];

const AVAILABLE_COVERS = [
  { name: "Wendy's Grill", path: "./assets/restaurant_cover_wendys.png" },
  { name: "Shake Shack Neon", path: "./assets/restaurant_cover_shakeshack.png" },
  { name: "McDonald's Classic", path: "./assets/restaurant_cover_mcdonalds.png" },
  { name: "Wolfie Speed Hero", path: "./assets/wolf_hero.png" }
];

export default function SettingsPage() {
  const { restaurant, settings, updateSettings, updateProfile } = useRestaurantStore();
  const [activeTab, setActiveTab] = useState('identity');
  
  // Local states linked to store
  const [restaurantName, setRestaurantName] = useState(restaurant.name || '');
  const [restaurantDesc, setRestaurantDesc] = useState(restaurant.description || '');
  const [restaurantAddress, setRestaurantAddress] = useState(restaurant.address || '');
  const [isBusyMode, setIsBusyMode] = useState(settings.pauseOrders || false);

  // Map coordinates state
  const [locLatitude, setLocLatitude] = useState(restaurant.latitude || 40.7128);
  const [locLongitude, setLocLongitude] = useState(restaurant.longitude || -74.0060);
  const [isCoordinatesConfirmed, setIsCoordinatesConfirmed] = useState(true);

  // Save states for different cards
  const [profileSaveStatus, setProfileSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
  const [locationSaveStatus, setLocationSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
  const [opsSaveStatus, setOpsSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'
  const [hoursSaveStatus, setHoursSaveStatus] = useState(''); // '', 'saving', 'saved', 'error'

  const [viewport, setViewport] = useState({
    latitude: restaurant.latitude || 40.7128,
    longitude: restaurant.longitude || -74.0060,
    zoom: 14
  });

  useEffect(() => {
    if (restaurant.name) setRestaurantName(restaurant.name);
    if (restaurant.description) setRestaurantDesc(restaurant.description);
    if (restaurant.address) setRestaurantAddress(restaurant.address);
    if (restaurant.latitude) setLocLatitude(restaurant.latitude);
    if (restaurant.longitude) setLocLongitude(restaurant.longitude);
  }, [restaurant]);

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

  const handleNameChange = (e) => setRestaurantName(e.target.value);
  const handleDescChange = (e) => setRestaurantDesc(e.target.value);
  const handleAddressChange = (e) => setRestaurantAddress(e.target.value);

  const toggleSetting = (key) => updateSettings({ [key]: !settings[key] });
  const handlePrepTimeChange = (e) => updateSettings({ prepTimeDefault: parseInt(e.target.value) || 15 });
  
  const handleBusyModeToggle = () => {
    setIsBusyMode(!isBusyMode);
    updateSettings({ pauseOrders: !isBusyMode });
  };

  // Map Click handler to change address coordinate marker
  const handleMapClick = (evt) => {
    const { lngLat } = evt;
    if (lngLat) {
      const lat = typeof lngLat.lat === 'function' ? lngLat.lat() : lngLat.lat;
      const lng = typeof lngLat.lng === 'function' ? lngLat.lng() : lngLat.lng;
      setLocLatitude(lat);
      setLocLongitude(lng);
      setIsCoordinatesConfirmed(false);
    }
  };

  const handleConfirmLocation = () => {
    setIsCoordinatesConfirmed(true);
  };

  // Profile Identity Save Handler (Card 1)
  const handleSaveProfile = async () => {
    try {
      setProfileSaveStatus('saving');
      await updateProfile({
        name: restaurantName,
        description: restaurantDesc,
        logo: restaurant.logo || restaurant.image,
        heroImage: restaurant.heroImage
      });
      setProfileSaveStatus('saved');
      setTimeout(() => setProfileSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setProfileSaveStatus('error');
      setTimeout(() => setProfileSaveStatus(''), 3000);
    }
  };

  // Location / Address Save Handler (Card 2)
  const handleSaveLocation = async () => {
    try {
      setLocationSaveStatus('saving');
      await updateProfile({
        address: restaurantAddress,
        latitude: locLatitude,
        longitude: locLongitude
      });
      setIsCoordinatesConfirmed(true);
      setLocationSaveStatus('saved');
      setTimeout(() => setLocationSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setLocationSaveStatus('error');
      setTimeout(() => setLocationSaveStatus(''), 3000);
    }
  };

  // Operational Settings Save Handler (Card 3)
  const handleSaveOps = async () => {
    try {
      setOpsSaveStatus('saving');
      await updateSettings({
        prepTimeDefault: settings.prepTimeDefault,
        autoAccept: settings.autoAccept,
        soundAlerts: settings.soundAlerts
      });
      setOpsSaveStatus('saved');
      setTimeout(() => setOpsSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setOpsSaveStatus('error');
      setTimeout(() => setOpsSaveStatus(''), 3000);
    }
  };

  // Hours Save handler
  const handleSaveHours = async () => {
    try {
      setHoursSaveStatus('saving');
      const { request } = await import('../api');
      await request('/restaurants/hours', {
        method: 'PATCH',
        body: JSON.stringify({ operating_hours: restaurant.operatingHours })
      });
      setHoursSaveStatus('saved');
      setTimeout(() => setHoursSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setHoursSaveStatus('error');
      setTimeout(() => setHoursSaveStatus(''), 3000);
    }
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
                <div className="w-full h-full rounded-full bg-[var(--bg-card-hover)] overflow-hidden flex items-center justify-center">
                  <img src={restaurant.logo || restaurant.image || './assets/restaurant_logo_wendys.png'} alt="Restaurant Logo" className="w-full h-full object-contain p-2" />
                </div>
              </div>
              <h3 className="text-xl font-bold tracking-wide text-[var(--text-primary)] font-poppins">{restaurantName || restaurant.name}</h3>
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
                  
                  {/* Card 1: Business Profile Identity */}
                  <div className="bg-[var(--bg-card)] border-none rounded-[24px] p-10 relative overflow-hidden">
                    <p className="text-[14px] uppercase tracking-[0.2em] text-[var(--accent-yellow)] font-bold mb-8 font-sans flex items-center gap-3 font-poppins">
                      <Fingerprint size={16} /> Business Profile
                    </p>
                    
                    <div className="space-y-8 text-left">
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
                          rows={3}
                          value={restaurantDesc}
                          onChange={handleDescChange}
                          className="w-full bg-transparent border-b border-[var(--text-secondary)]/20 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] transition-colors font-poppins resize-none font-medium"
                          placeholder="Tell customers about your kitchen..."
                        />
                      </div>

                      {/* Brand Logo Selector */}
                      <div className="space-y-3 pt-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Select Brand Logo</label>
                          <label className="text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--accent-yellow)] cursor-pointer hover:underline flex items-center gap-1 font-poppins bg-[var(--bg-card-hover)] px-3 py-1.5 rounded-full border border-[var(--text-secondary)]/10 text-xs">
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
                        <div className="grid grid-cols-4 gap-4">
                          {AVAILABLE_LOGOS.map((lg) => {
                            const isSelected = restaurant.logo === lg.path || restaurant.image === lg.path;
                            return (
                              <button
                                key={lg.path}
                                type="button"
                                onClick={() => {
                                  handleRestaurantUpdate('logo', lg.path);
                                  handleRestaurantUpdate('image', lg.path);
                                }}
                                className={`p-3 rounded-xl bg-[var(--bg-card-hover)] border-2 transition-all flex items-center justify-center h-16 ${
                                  isSelected ? 'border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 scale-105' : 'border-transparent hover:border-[var(--text-secondary)]/30'
                                }`}
                              >
                                <img src={lg.path} alt={lg.name} className="max-h-12 object-contain" />
                              </button>
                            );
                          })}
                          {(restaurant.logo && !AVAILABLE_LOGOS.some(l => l.path === restaurant.logo)) || (restaurant.image && !AVAILABLE_LOGOS.some(l => l.path === restaurant.image)) ? (
                            <div className="p-2 rounded-xl bg-[var(--bg-card-hover)] border-2 border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 scale-105 flex items-center justify-center h-16 relative">
                              <img src={restaurant.logo || restaurant.image} alt="Custom Logo" className="max-h-12 object-contain" />
                              <span className="absolute -top-1 -right-1 bg-[var(--accent-yellow)] text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Custom</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Hero Image Selector */}
                      <div className="space-y-3 pt-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Select Hero Picture</label>
                          <label className="text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--accent-yellow)] cursor-pointer hover:underline flex items-center gap-1 font-poppins bg-[var(--bg-card-hover)] px-3 py-1.5 rounded-full border border-[var(--text-secondary)]/10 text-xs">
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {AVAILABLE_COVERS.map((cv) => (
                            <button
                              key={cv.path}
                              type="button"
                              onClick={() => handleRestaurantUpdate('heroImage', cv.path)}
                              className={`rounded-xl bg-[var(--bg-card-hover)] border-2 overflow-hidden transition-all h-20 relative flex items-center justify-center ${
                                restaurant.heroImage === cv.path ? 'border-[var(--accent-yellow)] scale-102 bg-[var(--accent-yellow)]/5' : 'border-transparent hover:border-[var(--text-secondary)]/30'
                              }`}
                            >
                              <img src={cv.path} alt={cv.name} className="w-full h-full object-cover opacity-75" />
                              <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/80 px-2 py-0.5 rounded text-white font-bold">{cv.name}</span>
                            </button>
                          ))}
                          {restaurant.heroImage && !AVAILABLE_COVERS.some(c => c.path === restaurant.heroImage) && (
                            <div className="rounded-xl bg-[var(--bg-card-hover)] border-2 border-[var(--accent-yellow)] overflow-hidden h-20 relative flex items-center justify-center scale-102">
                              <img src={restaurant.heroImage} alt="Custom Hero" className="w-full h-full object-cover opacity-75" />
                              <span className="absolute bottom-1.5 left-2 text-[9px] bg-[var(--accent-yellow)] text-black font-extrabold px-2 py-0.5 rounded uppercase font-poppins">Custom</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dedicated Save Profile Details Button */}
                      <div className="pt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={profileSaveStatus === 'saving'}
                          className={`px-8 py-4.5 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] border-none transition-all flex items-center gap-3 cursor-pointer shadow-lg ${
                            profileSaveStatus === 'saved' 
                              ? 'bg-[#22c55e] text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                              : profileSaveStatus === 'error'
                              ? 'bg-[var(--accent-red)] text-white shadow-[0_0_20px_rgba(239,42,57,0.3)]'
                              : 'bg-[var(--accent-yellow)] text-black hover:shadow-[0_0_30px_rgba(255,184,0,0.3)] hover:scale-102'
                          }`}
                        >
                          {profileSaveStatus === 'saving' ? (
                            <Loader size={14} className="animate-spin" />
                          ) : profileSaveStatus === 'saved' ? (
                            <Check size={14} />
                          ) : (
                            <Save size={14} />
                          )}
                          {profileSaveStatus === 'saving' 
                            ? 'Saving Profile Details...' 
                            : profileSaveStatus === 'saved' 
                            ? 'Profile Details Saved!' 
                            : profileSaveStatus === 'error' 
                            ? 'Failed to Save Profile!' 
                            : 'Save Profile Details'}
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Card 2: Physical Address & Map Location Picker */}
                  <div className="bg-[var(--bg-card)] border-none rounded-[24px] p-10 relative overflow-hidden">
                    <p className="text-[14px] uppercase tracking-[0.2em] text-[var(--accent-yellow)] font-bold mb-8 font-sans flex items-center gap-3 font-poppins">
                      <MapPin size={16} /> Location & Address Configuration
                    </p>

                    <div className="space-y-8 text-left">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Address text input */}
                        <div className="space-y-6">
                          <div className="space-y-2 group">
                            <label className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] group-focus-within:text-[var(--accent-yellow)] transition-colors font-poppins">Physical Address</label>
                            <input
                              type="text"
                              value={restaurantAddress}
                              onChange={handleAddressChange}
                              className="w-full bg-transparent border-b border-[var(--text-secondary)]/20 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] transition-colors font-poppins font-semibold"
                              placeholder="e.g. 234 Bedford Ave, Brooklyn, NY"
                            />
                          </div>

                          <div className="bg-[var(--bg-card-hover)] p-5 rounded-2xl border border-[var(--text-secondary)]/5 font-poppins">
                            <div className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Selected Coordinates</div>
                            <div className="text-sm font-mono text-[var(--text-primary)]">
                              Lat: {locLatitude.toFixed(6)} <br/> Lng: {locLongitude.toFixed(6)}
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                              <span className="text-[11px] text-[var(--text-secondary)] uppercase">Status:</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isCoordinatesConfirmed ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] animate-pulse'}`}>
                                {isCoordinatesConfirmed ? 'Confirmed' : 'Pending Confirmation'}
                              </span>
                            </div>
                            {!isCoordinatesConfirmed && (
                              <button
                                type="button"
                                onClick={handleConfirmLocation}
                                className="w-full mt-4 py-2.5 rounded-xl bg-[var(--accent-yellow)] text-black text-xs font-black uppercase tracking-wider border-none cursor-pointer hover:brightness-105"
                              >
                                Confirm Coordinates Pin
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive map */}
                        <div className="space-y-4">
                          <label className="block text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] font-poppins">Click Map to Pick Pinpoint Location</label>
                          <div className="h-[260px] rounded-2xl overflow-hidden border border-[var(--text-secondary)]/10 relative">
                            {MAPBOX_TOKEN ? (
                              <Map
                                {...viewport}
                                onMove={evt => setViewport(evt.viewState)}
                                onClick={handleMapClick}
                                mapStyle={MAP_STYLE}
                                mapboxAccessToken={MAPBOX_TOKEN}
                                style={{ width: '100%', height: '100%' }}
                              >
                                <Marker latitude={locLatitude} longitude={locLongitude}>
                                  <div className="w-6 h-6 bg-[var(--accent-yellow)] border-2 border-black rounded-full shadow-[0_0_15px_var(--accent-yellow)] flex items-center justify-center animate-bounce">
                                    <MapPin size={12} className="text-black" />
                                  </div>
                                </Marker>
                              </Map>
                            ) : (
                              <div className="absolute inset-0 bg-[var(--bg-card-hover)] flex flex-col items-center justify-center text-[var(--text-secondary)]/30">
                                <Compass size={32} className="animate-spin mb-4" />
                                <span className="text-xs">Connecting Vector Core...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dedicated Save Location Button */}
                      <div className="pt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveLocation}
                          disabled={locationSaveStatus === 'saving'}
                          className={`px-8 py-4.5 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] border-none transition-all flex items-center gap-3 cursor-pointer shadow-lg ${
                            locationSaveStatus === 'saved' 
                              ? 'bg-[#22c55e] text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                              : locationSaveStatus === 'error'
                              ? 'bg-[var(--accent-red)] text-white shadow-[0_0_20px_rgba(239,42,57,0.3)]'
                              : 'bg-[var(--accent-yellow)] text-black hover:shadow-[0_0_30px_rgba(255,184,0,0.3)] hover:scale-102'
                          }`}
                        >
                          {locationSaveStatus === 'saving' ? (
                            <Loader size={14} className="animate-spin" />
                          ) : locationSaveStatus === 'saved' ? (
                            <Check size={14} />
                          ) : (
                            <Save size={14} />
                          )}
                          {locationSaveStatus === 'saving' 
                            ? 'Saving Location Settings...' 
                            : locationSaveStatus === 'saved' 
                            ? 'Location & Address Saved!' 
                            : locationSaveStatus === 'error' 
                            ? 'Failed to Save Location!' 
                            : 'Save Location & Address'}
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Card 3: Operational Rules */}
                  <div className="bg-[var(--bg-card)] border-none rounded-[24px] p-10 relative overflow-hidden">
                    <p className="text-[14px] uppercase tracking-[0.2em] text-[var(--accent-yellow)] font-bold mb-8 font-sans flex items-center gap-3 font-poppins">
                      <Zap size={16} /> Operational Control Settings
                    </p>

                    <div className="space-y-8 text-left">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[var(--bg-card-hover)] p-6 rounded-[24px] border border-[var(--text-secondary)]/5 relative overflow-hidden">
                          <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2 font-poppins">Automated Accept</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className={`text-xs tracking-widest font-bold ${settings.autoAccept ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-secondary)]/40'}`}>
                              {settings.autoAccept ? 'ACTIVE' : 'OFFLINE'}
                            </span>
                            <button type="button" onClick={() => toggleSetting('autoAccept')} className={`w-12 h-6 rounded-full p-1 transition-colors border-none cursor-pointer ${settings.autoAccept ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card)]'}`}>
                              <motion.div layout className="w-4 h-4 bg-white rounded-full" style={{ marginLeft: settings.autoAccept ? 'auto' : '0' }} />
                            </button>
                          </div>
                        </div>

                        <div className="bg-[var(--bg-card-hover)] p-6 rounded-[24px] border border-[var(--text-secondary)]/5 relative overflow-hidden">
                          <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2 font-poppins">Sound Alerts</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className={`text-xs tracking-widest font-bold ${settings.soundAlerts ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-secondary)]/40'}`}>
                              {settings.soundAlerts ? 'ACTIVE' : 'MUTED'}
                            </span>
                            <button type="button" onClick={() => toggleSetting('soundAlerts')} className={`w-12 h-6 rounded-full p-1 transition-colors border-none cursor-pointer ${settings.soundAlerts ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-card)]'}`}>
                              <motion.div layout className="w-4 h-4 bg-white rounded-full" style={{ marginLeft: settings.soundAlerts ? 'auto' : '0' }} />
                            </button>
                          </div>
                        </div>

                        <div className="bg-[var(--bg-card-hover)] p-6 rounded-[24px] border border-[var(--text-secondary)]/5 relative overflow-hidden">
                          <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] mb-2 font-poppins">Default Buffer (Mins)</p>
                          <div className="flex items-center justify-between mt-1">
                            <input
                              type="number"
                              value={settings.prepTimeDefault}
                              onChange={handlePrepTimeChange}
                              className="w-20 bg-transparent border-b border-[var(--text-secondary)]/20 py-2 text-2xl font-bold text-[var(--accent-yellow)] outline-none focus:border-[var(--accent-yellow)] transition-colors text-left"
                            />
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase">Mins</span>
                          </div>
                        </div>
                      </div>

                      {/* Dedicated Save Ops Settings Button */}
                      <div className="pt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveOps}
                          disabled={opsSaveStatus === 'saving'}
                          className={`px-8 py-4.5 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] border-none transition-all flex items-center gap-3 cursor-pointer shadow-lg ${
                            opsSaveStatus === 'saved' 
                              ? 'bg-[#22c55e] text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                              : opsSaveStatus === 'error'
                              ? 'bg-[var(--accent-red)] text-white shadow-[0_0_20px_rgba(239,42,57,0.3)]'
                              : 'bg-[var(--accent-yellow)] text-black hover:shadow-[0_0_30px_rgba(255,184,0,0.3)] hover:scale-102'
                          }`}
                        >
                          {opsSaveStatus === 'saving' ? (
                            <Loader size={14} className="animate-spin" />
                          ) : opsSaveStatus === 'saved' ? (
                            <Check size={14} />
                          ) : (
                            <Save size={14} />
                          )}
                          {opsSaveStatus === 'saving' 
                            ? 'Saving Operations...' 
                            : opsSaveStatus === 'saved' 
                            ? 'Operations Saved!' 
                            : opsSaveStatus === 'error' 
                            ? 'Failed to Save Settings!' 
                            : 'Save Operational Settings'}
                        </button>
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

                    {/* 7‑day schedule with time and open/closed inputs */}
                    <div className="space-y-4 max-w-xl">
                      {[
                        { label: 'Monday', key: 'mon' },
                        { label: 'Tuesday', key: 'tue' },
                        { label: 'Wednesday', key: 'wed' },
                        { label: 'Thursday', key: 'thu' },
                        { label: 'Friday', key: 'fri' },
                        { label: 'Saturday', key: 'sat' },
                        { label: 'Sunday', key: 'sun' }
                      ].map(day => {
                        const dayConfig = restaurant.operatingHours[day.key] || { open: '10:00', close: '22:00', closed: false };
                        const isDayClosed = dayConfig.closed === true;
                        
                        return (
                          <div key={day.key} className="flex items-center justify-between p-4 bg-[var(--bg-card-hover)]/40 rounded-2xl border border-[var(--text-secondary)]/5 hover:border-[var(--text-secondary)]/10 transition-colors">
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => {
                                  useRestaurantStore.setState(state => ({
                                    restaurant: {
                                      ...state.restaurant,
                                      operatingHours: {
                                        ...state.restaurant.operatingHours,
                                        [day.key]: {
                                          ...dayConfig,
                                          closed: !isDayClosed
                                        }
                                      }
                                    }
                                  }));
                                }}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors border-none cursor-pointer ${
                                  !isDayClosed ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                                }`}
                              >
                                {!isDayClosed ? 'ACTIVE / OPEN' : 'CLOSED'}
                              </button>
                              <span className="font-poppins text-sm font-bold tracking-wide">{day.label}</span>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <input
                                type="time"
                                disabled={isDayClosed}
                                value={dayConfig.open || '10:00'}
                                onChange={e => {
                                  const val = e.target.value;
                                  useRestaurantStore.setState(state => ({
                                    restaurant: {
                                      ...state.restaurant,
                                      operatingHours: {
                                        ...state.restaurant.operatingHours,
                                        [day.key]: {
                                          ...dayConfig,
                                          open: val
                                        }
                                      }
                                    }
                                  }));
                                }}
                                className="w-24 bg-transparent border-b border-[var(--text-secondary)]/20 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] disabled:opacity-20 disabled:border-transparent font-poppins text-center"
                              />
                              <span className="text-[var(--text-secondary)] disabled:opacity-20">-</span>
                              <input
                                type="time"
                                disabled={isDayClosed}
                                value={dayConfig.close || '22:00'}
                                onChange={e => {
                                  const val = e.target.value;
                                  useRestaurantStore.setState(state => ({
                                    restaurant: {
                                      ...state.restaurant,
                                      operatingHours: {
                                        ...state.restaurant.operatingHours,
                                        [day.key]: {
                                          ...dayConfig,
                                          close: val
                                        }
                                      }
                                    }
                                  }));
                                }}
                                className="w-24 bg-transparent border-b border-[var(--text-secondary)]/20 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-yellow)] disabled:opacity-20 disabled:border-transparent font-poppins text-center"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Operating Hours Save Actions */}
                    <div className="pt-8 flex justify-end max-w-xl">
                      <button
                        type="button"
                        onClick={handleSaveHours}
                        disabled={hoursSaveStatus === 'saving'}
                        className={`px-10 py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] border-none transition-all flex items-center gap-3 cursor-pointer shadow-lg ${
                          hoursSaveStatus === 'saved' 
                            ? 'bg-[#22c55e] text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                            : hoursSaveStatus === 'error'
                            ? 'bg-[var(--accent-red)] text-white shadow-[0_0_20px_rgba(239,42,57,0.3)]'
                            : 'bg-[var(--accent-yellow)] text-black hover:shadow-[0_0_30px_rgba(255,184,0,0.3)] hover:scale-102'
                        }`}
                      >
                        {hoursSaveStatus === 'saving' ? (
                          <Loader size={14} className="animate-spin" />
                        ) : hoursSaveStatus === 'saved' ? (
                          <Check size={14} />
                        ) : (
                          <Save size={14} />
                        )}
                        {hoursSaveStatus === 'saving' 
                          ? 'Persisting Hours...' 
                          : hoursSaveStatus === 'saved' 
                          ? 'Hours Confirmed & Saved!' 
                          : hoursSaveStatus === 'error' 
                          ? 'Failed to Save Hours!' 
                          : 'Confirm Operating Hours'}
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
                          <Marker latitude={locLatitude} longitude={locLongitude}>
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
