import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Store, FileText, Building, Upload, 
  Sparkles, Lock, ShieldCheck, MapPin, Eye, EyeOff, Check, X
} from 'lucide-react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { onboardingApi, setToken } from '../api';
import AuthCarousel from '../components/AuthCarousel';
import AiMenuImport from '../components/AiMenuImport';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';
const MAP_STYLE = import.meta.env.VITE_MAP_STYLE || 'mapbox://styles/mapbox/dark-v11';

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

const RestaurantRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Controlled Form States (Step 1)
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password Validation States
  const [passChecks, setPassChecks] = useState({
    length: false,
    upper: false,
    number: false,
    special: false
  });

  // KYC States (Step 2)
  const [ownerIdFile, setOwnerIdFile] = useState(null);
  const [businessLicenseFile, setBusinessLicenseFile] = useState(null);
  const [healthPermitFile, setHealthPermitFile] = useState(null);
  const [storefrontPhotoFile, setStorefrontPhotoFile] = useState(null);

  // Banking Details States (Step 3)
  const [bankName, setBankName] = useState('Wolfie Bank');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  // Menu Operations States (Step 4)
  const [menuManagementType, setMenuManagementType] = useState('Upload PDF / Images');
  const [menuFile, setMenuFile] = useState(null);
  const [estimatedMenuItems, setEstimatedMenuItems] = useState('1-15');
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [posIntegration, setPosIntegration] = useState(false);

  // Profile & Survey States (Step 5)
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('./assets/wolf_logo.png');
  const [heroImageUrl, setHeroImageUrl] = useState('./assets/wolf_hero.png');
  const [address, setAddress] = useState('');
  const [locLatitude, setLocLatitude] = useState(40.7128);
  const [locLongitude, setLocLongitude] = useState(-74.0060);
  const [viewport, setViewport] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 13
  });

  // Operational Questions (Step 5)
  const [dailyOrdersEstimate, setDailyOrdersEstimate] = useState('1-20');
  const [peakHours, setPeakHours] = useState('Both');
  const [usesDeliveryCurrently, setUsesDeliveryCurrently] = useState('No');
  const [currentPlatform, setCurrentPlatform] = useState('None');
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(5);

  useEffect(() => {
    setPassChecks({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [password]);

  const isPasswordValid = passChecks.length && passChecks.upper && passChecks.number && passChecks.special;

  const steps = [
    { num: 1, title: 'Basic Info', icon: <Store size={16} /> },
    { num: 2, title: 'KYC Docs', icon: <ShieldCheck size={16} /> },
    { num: 3, title: 'Bank Info', icon: <Building size={16} /> },
    { num: 4, title: 'Menu Setup', icon: <FileText size={16} /> },
    { num: 5, title: 'Profile & Map', icon: <MapPin size={16} /> },
  ];

  const handleNext = async () => {
    setError('');
    
    if (step === 1) {
      if (!restaurantName || !cuisineType || !phone || !email || !password) {
        setError('Please fill in all basic fields.');
        return;
      }
      if (!isPasswordValid) {
        setError('Password must meet all requirements.');
        return;
      }
      
      setIsLoading(true);
      try {
        const regData = await onboardingApi.register({
          email,
          password,
          full_name: restaurantName + ' Owner',
          phone,
          restaurant_name: restaurantName,
          cuisine_type: cuisineType,
        });
        setToken(regData.access_token);
        setStep(2);
      } catch (err) {
        setError(err.message || 'Registration failed. Try again.');
      } finally {
        setIsLoading(false);
      }
    } 
    else if (step === 2) {
      if (!ownerIdFile || !businessLicenseFile || !healthPermitFile || !storefrontPhotoFile) {
        setError('Please upload all 4 required KYC documents to proceed.');
        return;
      }
      
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('owner_id', ownerIdFile);
        formData.append('business_license', businessLicenseFile);
        formData.append('health_permit', healthPermitFile);
        formData.append('storefront_photo', storefrontPhotoFile);

        await onboardingApi.uploadKyc(formData);
        setStep(3);
      } catch (err) {
        setError(err.message || 'KYC Upload failed. Try again.');
      } finally {
        setIsLoading(false);
      }
    } 
    else if (step === 3) {
      if (!accountHolderName || !routingNumber || !accountNumber || !bankName) {
        setError('Please complete all banking details.');
        return;
      }
      if (!termsAccepted) {
        setError('You must accept the terms of service.');
        return;
      }

      setIsLoading(true);
      try {
        await onboardingApi.setupPayout({
          bank_name: bankName,
          account_last4: accountNumber.slice(-4),
          routing_number: routingNumber,
          account_number: accountNumber
        });

        await onboardingApi.acceptLegal({
          accepted_terms: true,
          accepted_privacy: true,
          accepted_wap_ai_terms: true
        });

        setStep(4);
      } catch (err) {
        setError(err.message || 'Bank Setup failed. Try again.');
      } finally {
        setIsLoading(false);
      }
    } 
    else if (step === 4) {
      setStep(5);
    } 
    else if (step === 5) {
      if (!address) {
        setError('Please enter your restaurant address.');
        return;
      }

      setIsLoading(true);
      try {
        await onboardingApi.setupProfile({
          description,
          logo_url: logoUrl,
          hero_image_url: heroImageUrl,
          address,
          latitude: locLatitude,
          longitude: locLongitude,
          daily_orders_estimate: dailyOrdersEstimate,
          peak_hours: peakHours,
          uses_delivery_currently: usesDeliveryCurrently,
          current_platform: currentPlatform,
          delivery_radius_km: parseFloat(deliveryRadiusKm)
        });

        navigate('/pending-approval');
      } catch (err) {
        setError(err.message || 'Failed to submit profile details.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleMapClick = (evt) => {
    const { lngLat } = evt;
    if (lngLat) {
      const lat = typeof lngLat.lat === 'function' ? lngLat.lat() : lngLat.lat;
      const lng = typeof lngLat.lng === 'function' ? lngLat.lng() : lngLat.lng;
      setLocLatitude(lat);
      setLocLongitude(lng);
    }
  };

  const handleCustomFileUpload = (e, setFileState) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileState(file);
    }
  };

  const inputClass = "w-full h-[50px] bg-[#121212] border border-white/5 focus:border-[#FFE100] rounded-xl px-4 text-white text-[14px] outline-none transition-all placeholder-[#94a3b8]/30 font-['Poppins',sans-serif]";
  const labelClass = "text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] block mb-1.5 font-['Poppins',sans-serif]";

  return (
    <div className="min-h-screen w-full bg-[#000000] text-white font-['Poppins',sans-serif] flex overflow-y-auto selection:bg-[#FFE100] selection:text-black">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Hero Carousel */}
        <AuthCarousel />

        {/* Right Side: Registration Wizard */}
        <div className="flex items-center justify-center p-6 lg:p-16 overflow-y-auto bg-[#000000]">
          <div className="w-full max-w-[550px] space-y-6 text-left">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center gap-3 mb-2">
              <span className="text-2xl">🐺</span>
              <span className="font-extrabold text-xl text-white tracking-tight">Wolfie <span className="text-[#FFE100]">OS</span></span>
            </div>

            <div>
              <button 
                onClick={() => navigate('/login')} 
                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#94a3b8] hover:text-[#FFE100] transition-colors mb-4 cursor-pointer bg-transparent border-0"
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
              <h1 className="text-2xl font-black tracking-tight text-white mb-1">Partner Registration</h1>
              <p className="text-[12px] uppercase tracking-[0.15em] text-[#94a3b8]">Join Wolfie OS & unlock instant merchant growth</p>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-center relative py-2">
              <div className="absolute top-1/2 left-[5%] right-[5%] h-[2px] bg-white/5 -translate-y-1/2" />
              <div 
                className="absolute top-1/2 left-[5%] h-[2px] bg-[#FFE100] -translate-y-1/2 transition-all duration-500"
                style={{ width: `${((step - 1) / 4) * 90}%` }}
              />
              
              {steps.map((s) => (
                <div key={s.num} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 ${
                    step >= s.num 
                      ? 'bg-[#FFE100] text-black shadow-[0_0_15px_rgba(255,225,0,0.25)]' 
                      : 'bg-[#121212] text-[#94a3b8]/50'
                  }`}>
                    {step > s.num ? <CheckCircle size={16} /> : s.icon}
                  </div>
                  <span className={`text-[8px] font-bold tracking-[0.1em] uppercase transition-colors duration-300 ${
                    step >= s.num ? 'text-white' : 'text-[#94a3b8]/30'
                  }`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Form Container */}
            <div className="bg-[#080808] rounded-[24px] p-6 lg:p-8 space-y-6 relative overflow-hidden border border-white/5">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE100]/20 to-transparent" />
              
              {error && (
                <div className="bg-[#EF2A39]/10 border border-[#EF2A39]/20 text-[#EF2A39] text-[13px] px-4 py-3 rounded-xl font-bold font-poppins">
                  {error}
                </div>
              )}

              {/* STEP 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-[13px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2">
                    <Store size={14} /> Basic Information
                  </h3>
                  <div>
                    <label className={labelClass}>Restaurant Name</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="e.g. Abu Ali's Kitchen" 
                      value={restaurantName}
                      onChange={e => setRestaurantName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Cuisine Type</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        placeholder="e.g. Mediterranean" 
                        value={cuisineType}
                        onChange={e => setCuisineType(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Owner Phone</label>
                      <input 
                        type="tel" 
                        className={inputClass} 
                        placeholder="(555) 123-4567" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input 
                      type="email" 
                      className={inputClass} 
                      placeholder="manager@kitchen.com" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className={inputClass} 
                        placeholder="••••••••" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    
                    {/* Live Password Indicator */}
                    <div className="mt-3 p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 text-xs">
                      <div className="text-[#94a3b8] font-bold uppercase tracking-wider text-[10px] mb-1">Password Requirements:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          {passChecks.length ? <Check size={12} className="text-[#22c55e]" /> : <X size={12} className="text-red-500" />}
                          <span className={passChecks.length ? 'text-[#22c55e]' : 'text-gray-500'}>8+ Characters</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passChecks.upper ? <Check size={12} className="text-[#22c55e]" /> : <X size={12} className="text-red-500" />}
                          <span className={passChecks.upper ? 'text-[#22c55e]' : 'text-gray-500'}>Uppercase Letter</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passChecks.number ? <Check size={12} className="text-[#22c55e]" /> : <X size={12} className="text-red-500" />}
                          <span className={passChecks.number ? 'text-[#22c55e]' : 'text-gray-500'}>One Number</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passChecks.special ? <Check size={12} className="text-[#22c55e]" /> : <X size={12} className="text-red-500" />}
                          <span className={passChecks.special ? 'text-[#22c55e]' : 'text-gray-500'}>Special Symbol</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: KYC Docs */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-[13px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2">
                    <ShieldCheck size={14} /> KYC Verification Documents
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Wolfie enforces safe compliance guidelines. Please upload high-resolution images or PDFs of the following documents:
                  </p>

                  <div className="space-y-3">
                    {[
                      { label: "Owner National ID / Passport", state: ownerIdFile, setState: setOwnerIdFile, id: "owner_id" },
                      { label: "Business License / Commercial Register", state: businessLicenseFile, setState: setBusinessLicenseFile, id: "biz_license" },
                      { label: "Health Permit Certificate", state: healthPermitFile, setState: setHealthPermitFile, id: "health_permit" },
                      { label: "Storefront / Main Entrance Photo", state: storefrontPhotoFile, setState: setStorefrontPhotoFile, id: "storefront" }
                    ].map((doc) => (
                      <div key={doc.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-xs font-bold text-white">{doc.label}</div>
                          {doc.state ? (
                            <span className="text-[10px] text-[#22c55e] font-mono">{doc.state.name}</span>
                          ) : (
                            <span className="text-[10px] text-gray-500">Not uploaded</span>
                          )}
                        </div>
                        <label className="bg-[#FFE100]/10 hover:bg-[#FFE100]/20 text-[#FFE100] text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer border border-[#FFE100]/20 transition-all">
                          Upload File
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            className="hidden" 
                            onChange={(e) => handleCustomFileUpload(e, doc.setState)} 
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Banking & Payout */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-[13px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2">
                    <Building size={14} /> Banking & Legal setup
                  </h3>
                  
                  <div>
                    <label className={labelClass}>Account Holder Name</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="e.g. Abu Ali Kitchen LLC" 
                      value={accountHolderName}
                      onChange={e => setAccountHolderName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Routing Number (9-digits)</label>
                      <input 
                        type="text" 
                        maxLength={9}
                        className={inputClass} 
                        placeholder="021000021" 
                        value={routingNumber}
                        onChange={e => setRoutingNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Account Number</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        placeholder="9876543210" 
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-[#FFE100]/5 border border-[#FFE100]/10 rounded-xl p-4 text-xs space-y-1.5 leading-relaxed text-[#94a3b8]">
                    <div className="text-[#FFE100] font-bold uppercase tracking-wider text-[10px]">Weekly Settlements</div>
                    Payouts are calculated automatically every Monday and settled to your connected account.
                  </div>

                  <div className="flex items-start gap-2.5 pt-2">
                    <input 
                      type="checkbox" 
                      id="accept-terms" 
                      className="accent-[#FFE100] mt-0.5"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                    />
                    <label htmlFor="accept-terms" className="text-[10px] text-gray-400 leading-normal select-none cursor-pointer">
                      I agree to the Wolfie OS <Link to="/legal" className="text-[#FFE100] hover:underline font-bold">Terms of Service</Link> and <Link to="/legal" className="text-[#FFE100] hover:underline font-bold">Privacy Policy</Link>. I consent to the standard weekly settlement matrix.
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: Menu Upload & AI Import */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[13px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2">
                      <FileText size={14} /> Menu Setup & AI Scanning
                    </h3>
                    
                    <button
                      type="button"
                      onClick={() => setIsAiImportOpen(true)}
                      className="bg-gradient-to-r from-[#FFE100] to-orange-500 hover:brightness-105 text-black font-black uppercase tracking-wider text-[9px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-lg"
                    >
                      <Sparkles size={11} /> AI Import
                    </button>
                  </div>

                  <div>
                    <label className={labelClass}>How do you manage your menu?</label>
                    <select 
                      value={menuManagementType}
                      onChange={e => setMenuManagementType(e.target.value)}
                      className="w-full bg-[#121212] border border-white/5 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-[#FFE100]"
                    >
                      <option value="Upload PDF / Images">Upload PDF / Images</option>
                      <option value="Build manually">Build manually</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Upload Menu file</label>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[#FFE100]/40 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMenuFile(file);
                          }
                        }}
                      />
                      <Upload size={22} className="mx-auto text-gray-500 mb-2" />
                      <div className="text-xs font-bold text-white">Drag & drop or Click to choose file</div>
                      <div className="text-[10px] text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</div>
                    </div>
                    {menuFile && (
                      <div className="mt-2 p-2 bg-[#FFE100]/5 border border-[#FFE100]/10 rounded-lg flex justify-between items-center text-xs">
                        <span className="text-white truncate font-mono text-[10px]">{menuFile.name}</span>
                        <button type="button" onClick={() => setMenuFile(null)} className="text-red-500 font-bold hover:underline">Remove</button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Estimated Menu Items</label>
                    <div className="flex gap-2.5">
                      {['1-15', '16-40', '40+'].map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setEstimatedMenuItems(range)}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase border transition-all ${
                            estimatedMenuItems === range
                              ? 'bg-[#FFE100] text-black border-[#FFE100]'
                              : 'bg-transparent text-gray-500 border-white/5 hover:border-white/20'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* POS Integration Toggle (Disabled/Coming Soon) */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <div>
                      <div className="text-xs font-bold text-white">POS / WAP API Autopilot Agent</div>
                      <div className="text-[9px] text-gray-500">Sync with Clover, Lightspeed, or Square automatically</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={posIntegration}
                        onChange={() => alert("WAP/POS autopilot integration will be activated upon merchant account validation by the administrator.")}
                      />
                      <div className="w-9 h-5 bg-[#121212] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FFE100]/10 peer-checked:after:bg-[#FFE100]"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 5: Location & Profile Details */}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="text-[13px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2">
                    <MapPin size={14} /> Location picker & Brand profile
                  </h3>

                  <div>
                    <label className={labelClass}>Street Address</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="e.g. 234 Bedford Ave, Brooklyn, NY" 
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>

                  {/* Interactive Mapbox Picker */}
                  <div className="h-[180px] rounded-xl overflow-hidden border border-white/5 relative">
                    <Map
                      {...viewport}
                      onMove={evt => setViewport(evt.viewState)}
                      onClick={handleMapClick}
                      mapStyle={MAP_STYLE}
                      mapboxAccessToken={MAPBOX_TOKEN}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <Marker latitude={locLatitude} longitude={locLongitude}>
                        <div className="w-5 h-5 bg-[#FFE100] border-2 border-black rounded-full shadow-[0_0_10px_rgba(255,225,0,0.5)] flex items-center justify-center">
                          <MapPin size={10} className="text-black" />
                        </div>
                      </Marker>
                    </Map>
                  </div>

                  {/* Operational survey questions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                    <div>
                      <label className={labelClass}>Daily Orders Estimate</label>
                      <select 
                        value={dailyOrdersEstimate}
                        onChange={e => setDailyOrdersEstimate(e.target.value)}
                        className="w-full bg-[#121212] border border-white/5 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#FFE100]"
                      >
                        <option value="1-20">1-20 orders</option>
                        <option value="21-50">21-50 orders</option>
                        <option value="51-100">51-100 orders</option>
                        <option value="100+">100+ orders</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Peak Business Hours</label>
                      <select 
                        value={peakHours}
                        onChange={e => setPeakHours(e.target.value)}
                        className="w-full bg-[#121212] border border-white/5 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#FFE100]"
                      >
                        <option value="Lunch">Lunch Peak</option>
                        <option value="Dinner">Dinner Peak</option>
                        <option value="Both">Both (Lunch & Dinner)</option>
                        <option value="Late Night">Late Night</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Currently use delivery?</label>
                      <select 
                        value={usesDeliveryCurrently}
                        onChange={e => setUsesDeliveryCurrently(e.target.value)}
                        className="w-full bg-[#121212] border border-white/5 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#FFE100]"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Current primary platform</label>
                      <select 
                        value={currentPlatform}
                        onChange={e => setCurrentPlatform(e.target.value)}
                        className="w-full bg-[#121212] border border-white/5 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#FFE100]"
                      >
                        <option value="None">None (Independent)</option>
                        <option value="Uber Eats">Uber Eats</option>
                        <option value="DoorDash">DoorDash</option>
                        <option value="Deliveroo / Local">Deliveroo / Local fleet</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Restaurant Bio / Description</label>
                    <textarea
                      rows={2}
                      className="w-full bg-[#121212] border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-[#FFE100] resize-none"
                      placeholder="Tell customers about your kitchen story..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={handleBack}
                  disabled={isLoading || step === 1}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-[0.1em] uppercase transition-all bg-[#121212] text-[#94a3b8] hover:text-white border-none cursor-pointer ${
                    step === 1 ? 'opacity-0 pointer-events-none' : ''
                  }`}
                >
                  <ArrowLeft size={12} /> Back
                </button>
                
                <button 
                  type="button" 
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black tracking-[0.1em] uppercase transition-all bg-[#FFE100] hover:shadow-[0_0_20px_rgba(255,225,0,0.2)] active:scale-[0.98] text-black border-none cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      {step === 5 ? 'Complete Registration' : 'Continue'}
                      {step !== 5 && <ArrowRight size={12} />}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Security Footer */}
            <p className="text-[9px] uppercase tracking-[0.15em] text-[#94a3b8]/30 text-center">
              Secured with 256-bit SSL encryption · Wolfie Inc. © 2026
            </p>
          </div>
        </div>
      </div>

      {/* Embedded AI Menu Import Modal */}
      <AiMenuImport 
        isOpen={isAiImportOpen} 
        onClose={() => setIsAiImportOpen(false)} 
      />
    </div>
  );
};

export default RestaurantRegister;
