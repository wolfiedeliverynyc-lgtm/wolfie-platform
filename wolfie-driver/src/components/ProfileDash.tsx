import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  User, 
  FileCheck2, 
  Car, 
  Wallet, 
  ChevronRight, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Battery, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  CheckCircle,
  HelpCircle,
  Sliders
} from 'lucide-react';
import { DriverStats } from '../types';

interface ProfileDashProps {
  stats: DriverStats;
  simulationSpeed: number;
  setSimulationSpeed: (val: number) => void;
  onBack?: () => void;
  onMatchOrder?: () => void;
  onInjectCash?: (amount: number) => void;
  onReset?: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  todayEarnings: number;
  onNavigateToWallet?: () => void;
  onNavigateToSupport?: () => void;
}

export default function ProfileDash({
  stats,
  simulationSpeed,
  setSimulationSpeed,
  onBack,
  onMatchOrder,
  onInjectCash,
  onReset,
  soundEnabled,
  setSoundEnabled,
  todayEarnings,
  onNavigateToWallet,
  onNavigateToSupport
}: ProfileDashProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [soundVolume, setSoundVolume] = useState<number>(0.8);

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  // Profile picture styled representation of "Ahmed Ali" using a highly-detailed profile avatar SVG
  // representing a friendly smiling young bearded driver.
  const renderAvatar = () => {
    return (
      <div className="relative w-22 h-22 rounded-full border-2 border-slate-700/60 bg-gradient-to-tr from-slate-900 to-slate-800 p-0.5 shadow-xl shrink-0 group overflow-hidden">
        {/* Customized silhouette avatar with high aesthetic touch */}
        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-400">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#0a0c20', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#1a1f42', stopOpacity: 1 }} />
            </linearGradient>
            <pattern id="clothingPattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 0,10 L 10,0 M 0,0 L 10,10" fill="none" stroke="#252a4e" strokeWidth="1" />
            </pattern>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#grad)" />
          {/* Background overlay lights */}
          <circle cx="80" cy="20" r="15" fill="#f05523" opacity="0.15" />
          
          {/* Hair & Beard elements */}
          <path d="M 30,55 Q 50,45 70,55" fill="none" stroke="#0e101f" strokeWidth="8" strokeLinecap="round" />
          
          {/* Beard under */}
          <path d="M 28,45 C 28,80 72,80 72,45 C 72,40 28,40 28,45 Z" fill="#111425" />
          
          {/* Safe Face */}
          <ellipse cx="50" cy="46" rx="20" ry="24" fill="#d08465" />
          
          {/* Beard Details (Ahmed's trademark thick dark beard!) */}
          <path d="M 29,42 C 29,66 71,66 71,42 C 64,52 36,52 29,42 Z" fill="#13172e"/>
          <path d="M 29,42 C 34,74 66,74 71,42 C 71,85 29,85 29,42 Z" fill="#1a1e3b" opacity="0.95" />
          
          {/* Hair top */}
          <path d="M 28,34 C 34,16 66,16 72,34 C 75,25 65,18 50,20 C 35,18 25,25 28,34 Z" fill="#13172e" />
          
          {/* Mouth smiling */}
          <path d="M 44,56 Q 50,62 56,56" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Nose */}
          <path d="M 48,46 Q 50,51 52,46" fill="none" stroke="#b26d50" strokeWidth="2" strokeLinecap="round" />
          
          {/* Eyes */}
          <circle cx="43" cy="38" r="3" fill="#1a1e3b" />
          <circle cx="57" cy="38" r="3" fill="#1a1e3b" />
          <path d="M 39,33 Q 43,31 47,33" fill="none" stroke="#13172e" strokeWidth="2.5" />
          <path d="M 53,33 Q 57,31 61,33" fill="none" stroke="#13172e" strokeWidth="2.5" />

          {/* Mustache detail */}
          <path d="M 39,50 Q 50,46 61,50 Q 50,53 39,50" fill="#13172e" />

          {/* Golden reflections inside glass effect */}
          <rect x="0" y="0" width="100" height="100" fill="none" stroke="#2c3258" strokeWidth="2" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none"></div>
      </div>
    );
  };

  return (
    <div id="profile-page-content" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] space-y-4 pb-2">
      
      {/* HEADER SECTION (with return keys and settings icon) */}
      <div className="relative flex items-center justify-between pb-3 border-b border-slate-900">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-100 hover:bg-slate-900 transition-all cursor-pointer shadow-md"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-100 stroke-[2.5px]" />
        </button>
        <h2 className="text-base font-extrabold tracking-tight text-white font-sans">
          Profile
        </h2>
        <button
          onClick={() => toggleMenu('SETTINGS')}
          className={`w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-md ${activeMenu === 'SETTINGS' ? 'border-orange-500/20 bg-orange-500/5 text-orange-500' : ''}`}
          title="App Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* AHMED ALI PERSONAL DETAILS HEADER CARD */}
      <div className="flex items-center gap-4.5 py-2 px-1 relative overflow-hidden">
        {renderAvatar()}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-white tracking-tight">
              Ahmed Ali
            </h3>
            <div className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>4.9</span>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1.5 font-sans">
            Member since Mar 2024
          </p>
        </div>
      </div>

      {/* THE 3 BOXES GRID ROW STATS (Completion, Acceptance, Rating Matching Photograph) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Completion Card */}
        <div className="bg-[#080916] border border-slate-900 rounded-[20px] py-4 px-3 text-center flex flex-col justify-center items-center shadow-md">
          <span className="text-lg font-black text-white font-sans">
            {Math.round(stats.completionRate)}%
          </span>
          <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">
            Completion
          </span>
        </div>

        {/* Acceptance Card */}
        <div className="bg-[#080916] border border-slate-900 rounded-[20px] py-4 px-3 text-center flex flex-col justify-center items-center shadow-md">
          <span className="text-lg font-black text-white font-sans">
            {Math.round(stats.acceptanceRate)}%
          </span>
          <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">
            Acceptance
          </span>
        </div>

        {/* Rating Card */}
        <div className="bg-[#080916] border border-slate-900 rounded-[20px] py-4 px-3 text-center flex flex-col justify-center items-center shadow-md">
          <span className="text-lg font-black text-white font-sans">
            {stats.rating.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">
            Rating
          </span>
        </div>
      </div>

      {/* ACCORDION MENU STRUCTURE (Personal Info, Documents, etc.) */}
      <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] divide-y divide-slate-900/60 overflow-hidden shadow-xl">
        
        {/* ITEM 1: PERSONAL INFORMATION */}
        <div className="w-full">
          <button
            onClick={() => toggleMenu('PERSONAL')}
            className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'PERSONAL' ? 'bg-slate-900/15' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-xs font-bold text-slate-200">Personal Information</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'PERSONAL' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'PERSONAL' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-900/60 pt-4">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Full Name</span>
                  <span className="text-slate-200 mt-1 block">Ahmed Ali</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Contact Number</span>
                  <span className="text-slate-200 mt-1 block flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#f05523]" />
                    <span>+1 (555) 758-2041</span>
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase block">Email Address</span>
                  <span className="text-slate-200 mt-1 block flex items-center gap-1 font-mono text-[11px]">
                    <Mail className="w-3 h-3 text-[#f05523]" />
                    <span>iheboucief@gmail.com</span>
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase block">Delivery Hub Area</span>
                  <span className="text-slate-200 mt-1 block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#f05523]" />
                    <span>San Francisco Metro Area (District 4)</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ITEM 2: DOCUMENTS (Contains Verified Badge!) */}
        <div className="w-full">
          <button
            onClick={() => toggleMenu('DOCS')}
            className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'DOCS' ? 'bg-slate-900/15' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80">
                <FileCheck2 className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-xs font-bold text-slate-200">Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#23a24d] bg-[#23a24d]/10 px-2 py-0.5 rounded-[6px] border border-[#23a24d]/20 uppercase">
                Verified
              </span>
              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'DOCS' ? 'rotate-90 text-orange-500' : ''}`} />
            </div>
          </button>
          {activeMenu === 'DOCS' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="space-y-3 border-t border-slate-900/60 pt-4">
                <div className="flex justify-between items-center bg-[#080916] p-3 rounded-xl border border-slate-900">
                  <div>
                    <span className="text-slate-200 block text-xs">UK/US Driving License</span>
                    <span className="text-slate-500 text-[10px] mt-0.5 block font-mono">DL-93821-ALI</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-450 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 fill-emerald-500/10 text-emerald-400" /> Verified
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#080916] p-3 rounded-xl border border-slate-900">
                  <div>
                    <span className="text-slate-200 block text-xs">Sooter Operator Permit</span>
                    <span className="text-slate-500 text-[10px] mt-0.5 block font-mono">SP-88220</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-450 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 fill-emerald-500/10 text-emerald-400" /> Verified
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#080916] p-3 rounded-xl border border-slate-900">
                  <div>
                    <span className="text-slate-200 block text-xs">Food Handler Certificate</span>
                    <span className="text-slate-500 text-[10px] mt-0.5 block font-mono">FH-2024-55</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-450 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 fill-emerald-500/10 text-emerald-400" /> Verified
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ITEM 3: VEHICLE INFORMATION */}
        <div className="w-full">
          <button
            onClick={() => toggleMenu('VEHICLE')}
            className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'VEHICLE' ? 'bg-slate-900/15' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80">
                <Car className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-xs font-bold text-slate-200">Vehicle Information</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'VEHICLE' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'VEHICLE' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-900/60 pt-4">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Vehicle Category</span>
                  <span className="text-slate-200 mt-1 block">Active E-Bike / Scooter</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Assigned Plate ID</span>
                  <span className="text-slate-200 mt-1 block font-mono">SCOOT-8750</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Engine / Charger Status</span>
                  <span className="text-slate-200 mt-1 block flex items-center gap-1 text-emerald-450 text-emerald-400">
                    <Battery className="w-4 h-4 fill-emerald-500/15" />
                    <span>94% Battery Health</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Registration Expiry</span>
                  <span className="text-slate-200 mt-1 block">December 15, 2026</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ITEM 4: BANK / PAYOUT (Reflects Dynamic Cash details) */}
        <div className="w-full">
          <button
            onClick={() => toggleMenu('BANK')}
            className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'BANK' ? 'bg-slate-900/15' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80">
                <Wallet className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-xs font-bold text-slate-200">Bank / Payout</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'BANK' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'BANK' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="space-y-3 border-t border-slate-900/60 pt-4">
                <div className="flex justify-between items-center bg-[#080916] p-3 rounded-xl border border-slate-900">
                  <span className="text-slate-400 font-medium">Available Payout Balance</span>
                  <span className="font-mono text-emerald-400 font-black text-sm bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                    ${(128.45 + todayEarnings).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-550 text-slate-500 font-medium">Bank Account Connected</span>
                  <span className="text-slate-200 font-mono">Chase Bank (•••• 9482)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-550 text-slate-500 font-medium">Auto Deposit Frequency</span>
                  <span className="text-slate-200">Weekly (Every Monday Morning)</span>
                </div>
                
                {onNavigateToWallet && (
                  <button
                    onClick={() => onNavigateToWallet()}
                    className="w-full mt-2 py-3 bg-[#f05523]/10 hover:bg-[#f05523]/25 border border-[#f05523]/30 text-[#f05523] rounded-xl text-[11px] font-black uppercase tracking-wider text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/5 active:scale-[0.99]"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Go to Wallet &amp; Cash Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ITEM 5: APP SETTINGS (Housing the Developer Sandbox and standard toggles!) */}
        <div className="w-full">
          <button
            onClick={() => toggleMenu('SETTINGS')}
            className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'SETTINGS' ? 'bg-slate-900/15' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80">
                <Sliders className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-xs font-bold text-slate-200">App Settings / Sandbox</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'SETTINGS' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'SETTINGS' && (
            <div className="px-5 pb-5 pt-1 space-y-4 bg-[#090b1c] text-xs font-bold font-sans border-t border-slate-900/60 animate-[fadeIn_0.15s_ease-out]">
              
              {/* Sound settings element */}
              <div className="space-y-3 pt-3">
                <h5 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Device Customization</h5>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Sound Notifications</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-11 h-6 rounded-full transition-all relative ${soundEnabled ? 'bg-orange-500' : 'bg-slate-800'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-md flex items-center justify-center ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}>
                      {soundEnabled ? <Volume2 className="w-2.5 h-2.5 text-orange-500" /> : <VolumeX className="w-2.5 h-2.5 text-slate-500" />}
                    </span>
                  </button>
                </div>

                {soundEnabled && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Beep Volume</span>
                      <span>{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(Number(e.target.value))}
                      className="w-full accent-orange-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Developer simulator speed control element */}
              <div className="space-y-3 border-t border-slate-900/60 pt-4">
                <h5 className="text-[10px] text-[#f05523] font-black uppercase tracking-wider">Simulated Transit Engine Settings</h5>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-200">Movement Transit Speed</span>
                    <span className="text-[#f05523] font-mono">{simulationSpeed}X Fast</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                    className="w-full accent-[#f05523] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>1X (Standard)</span>
                    <span>6X (Realistic)</span>
                    <span>12X (Speedy)</span>
                  </div>
                </div>

                {/* Sandbox Match and Balance utilities triggers */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={onMatchOrder}
                    className="py-2.5 bg-[#f05523]/10 hover:bg-[#f05523]/20 active:scale-[0.98] border border-[#f05523]/25 rounded-xl text-[10px] font-black text-[#f05523] text-center transition-all cursor-pointer leading-tight"
                  >
                    DISPATCH ORDER
                  </button>
                  <button
                    onClick={() => onInjectCash?.(100.00)}
                    className="py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] border border-emerald-500/25 rounded-xl text-[10px] font-black text-emerald-400 text-center transition-all cursor-pointer leading-tight"
                  >
                    +$100 DEV CHEAT
                  </button>
                </div>

                <button
                  onClick={onReset}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-900 hover:text-rose-400 text-slate-550 text-slate-500 border border-slate-900 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>HARD FACTORY RESET</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* ITEM 6: HELP & SUPPORT */}
        {onNavigateToSupport && (
          <div className="w-full">
            <button
              onClick={onNavigateToSupport}
              className="w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80">
                  <HelpCircle className="w-4 h-4 text-[#f05523]" />
                </div>
                <span className="text-xs font-bold text-slate-200">Help &amp; Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        )}

      </div>

      {/* LOGOUT BUTTON FULL-WIDTH ROW (matching photograph style perfectly!) */}
      <div className="pt-3">
        <button
          onClick={onBack}
          className="w-full py-4.5 bg-[#0b0c1e] hover:bg-[#11122a] border border-slate-900 text-[#f05523] rounded-[24px] text-sm font-black tracking-tight text-center transition-all hover:border-[#f05523]/20 active:scale-[0.99] cursor-pointer shadow-lg shadow-black/10"
        >
          Logout
        </button>
      </div>

    </div>
  );
}
