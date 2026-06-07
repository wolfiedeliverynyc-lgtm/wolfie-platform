import React, { useState } from 'react';
import { 
  ArrowLeft, Settings, User, FileCheck2, Car, Wallet, ChevronRight, Star, Phone, Mail, MapPin, ShieldCheck, Battery, Volume2, VolumeX, RotateCcw, CheckCircle, HelpCircle, Sliders
} from 'lucide-react';
import { useDriverStore } from '../store/useDriverStore';

interface ProfileDashProps {
  onBack?: () => void;
  playBeep?: (type: 'CLICK' | 'SUCCESS' | 'OFFER' | 'NAV') => void;
  onNavigateToWallet?: () => void;
  onNavigateToSupport?: () => void;
  simulationSpeed: number;
  setSimulationSpeed: (val: number) => void;
}

export default function ProfileDash({
  onBack,
  playBeep,
  onNavigateToWallet,
  onNavigateToSupport,
  simulationSpeed,
  setSimulationSpeed
}: ProfileDashProps) {
  const store = useDriverStore();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [soundVolume, setSoundVolume] = useState<number>(0.8);

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const renderAvatar = () => {
    return (
      <div className="relative w-22 h-22 rounded-full border-2 border-slate-700/60 bg-gradient-to-tr from-slate-900 to-slate-800 p-0.5 shadow-xl shrink-0 group overflow-hidden">
        {store.driverProfile?.profilePhoto ? (
          <img src={store.driverProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-full" />
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-full text-slate-400">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#0a0c20', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#1a1f42', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill="url(#grad)" />
            <circle cx="80" cy="20" r="15" fill="#f05523" opacity="0.15" />
            <path d="M 30,55 Q 50,45 70,55" fill="none" stroke="#0e101f" strokeWidth="8" strokeLinecap="round" />
            <path d="M 28,45 C 28,80 72,80 72,45 C 72,40 28,40 28,45 Z" fill="#111425" />
            <ellipse cx="50" cy="46" rx="20" ry="24" fill="#d08465" />
            <path d="M 29,42 C 29,66 71,66 71,42 C 64,52 36,52 29,42 Z" fill="#13172e"/>
            <path d="M 29,42 C 34,74 66,74 71,42 C 71,85 29,85 29,42 Z" fill="#1a1e3b" opacity="0.95" />
            <path d="M 28,34 C 34,16 66,16 72,34 C 75,25 65,18 50,20 C 35,18 25,25 28,34 Z" fill="#13172e" />
            <path d="M 44,56 Q 50,62 56,56" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 48,46 Q 50,51 52,46" fill="none" stroke="#b26d50" strokeWidth="2" strokeLinecap="round" />
            <circle cx="43" cy="38" r="3" fill="#1a1e3b" />
            <circle cx="57" cy="38" r="3" fill="#1a1e3b" />
            <path d="M 39,33 Q 43,31 47,33" fill="none" stroke="#13172e" strokeWidth="2.5" />
            <path d="M 53,33 Q 57,31 61,33" fill="none" stroke="#13172e" strokeWidth="2.5" />
            <path d="M 39,50 Q 50,46 61,50 Q 50,53 39,50" fill="#13172e" />
            <rect x="0" y="0" width="100" height="100" fill="none" stroke="#2c3258" strokeWidth="2" />
          </svg>
        )}
      </div>
    );
  };

  const handleMatchOrder = () => {
    // Moved to backend dispatch
  };

  const handleInjectCash = () => {
    store.addEarnings(100);
    if (playBeep) playBeep('SUCCESS');
  };

  return (
    <div id="profile-page-content" className="flex flex-col flex-1 h-full text-slate-100 font-sans animate-[fadeIn_0.3s_ease-out] space-y-4 pb-2">
      <div className="relative flex items-center justify-between pb-3 border-b border-slate-900">
        <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-100 hover:bg-slate-900 transition-all cursor-pointer shadow-md">
          <ArrowLeft className="w-5 h-5 text-slate-100 stroke-[2.5px]" />
        </button>
        <h2 className="text-base font-extrabold tracking-tight text-white font-sans">Profile</h2>
        <button onClick={() => toggleMenu('SETTINGS')} className={`w-10 h-10 rounded-2xl bg-[#0c0d1c] border border-slate-900 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shadow-md ${activeMenu === 'SETTINGS' ? 'border-orange-500/20 bg-orange-500/5 text-orange-500' : ''}`}>
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="flex items-center gap-4.5 py-2 px-1 relative overflow-hidden">
        {renderAvatar()}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-white tracking-tight">{store.driverProfile?.name || 'Driver Name'}</h3>
            <div className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{store.performance.customerRating.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1.5 font-sans">Member since Mar 2024</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#080916] border border-slate-900 rounded-[20px] py-4 px-3 text-center flex flex-col justify-center items-center shadow-md">
          <span className="text-lg font-black text-white font-sans">{Math.round(store.performance.completionRate)}%</span>
          <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">Completion</span>
        </div>
        <div className="bg-[#080916] border border-slate-900 rounded-[20px] py-4 px-3 text-center flex flex-col justify-center items-center shadow-md">
          <span className="text-lg font-black text-white font-sans">{Math.round(store.performance.acceptanceRate)}%</span>
          <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">Acceptance</span>
        </div>
        <div className="bg-[#080916] border border-slate-900 rounded-[20px] py-4 px-3 text-center flex flex-col justify-center items-center shadow-md">
          <span className="text-lg font-black text-white font-sans">{store.performance.customerRating.toFixed(1)}</span>
          <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-1 leading-none">Rating</span>
        </div>
      </div>

      <div className="bg-[#0b0c1e] border border-slate-900 rounded-[24px] divide-y divide-slate-900/60 overflow-hidden shadow-xl">
        <div className="w-full">
          <button onClick={() => toggleMenu('PERSONAL')} className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'PERSONAL' ? 'bg-slate-900/15' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80"><User className="w-4 h-4 text-slate-300" /></div>
              <span className="text-xs font-bold text-slate-200">Personal Information</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'PERSONAL' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'PERSONAL' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-900/60 pt-4">
                <div><span className="text-slate-500 text-[10px] uppercase block">Full Name</span><span className="text-slate-200 mt-1 block">{store.driverProfile?.name}</span></div>
                <div><span className="text-slate-500 text-[10px] uppercase block">Contact Number</span><span className="text-slate-200 mt-1 block flex items-center gap-1"><Phone className="w-3 h-3 text-[#f05523]" /><span>{store.driverProfile?.phone}</span></span></div>
                <div className="col-span-2"><span className="text-slate-500 text-[10px] uppercase block">Email Address</span><span className="text-slate-200 mt-1 block flex items-center gap-1 font-mono text-[11px]"><Mail className="w-3 h-3 text-[#f05523]" /><span>{store.driverProfile?.email}</span></span></div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full">
          <button onClick={() => toggleMenu('DOCS')} className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'DOCS' ? 'bg-slate-900/15' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80"><FileCheck2 className="w-4 h-4 text-slate-300" /></div>
              <span className="text-xs font-bold text-slate-200">Documents</span>
            </div>
            <div className="flex items-center gap-2">
              {store.kycStatus === 'approved' && <span className="text-[10px] font-black text-[#23a24d] bg-[#23a24d]/10 px-2 py-0.5 rounded-[6px] border border-[#23a24d]/20 uppercase">Verified</span>}
              <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'DOCS' ? 'rotate-90 text-orange-500' : ''}`} />
            </div>
          </button>
          {activeMenu === 'DOCS' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="space-y-3 border-t border-slate-900/60 pt-4">
                <div className="flex justify-between items-center bg-[#080916] p-3 rounded-xl border border-slate-900">
                  <div><span className="text-slate-200 block text-xs">UK/US Driving License</span><span className="text-slate-500 text-[10px] mt-0.5 block font-mono">DL-93821-ALI</span></div>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-450 text-emerald-400"><ShieldCheck className="w-4 h-4 fill-emerald-500/10 text-emerald-400" /> Verified</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full">
          <button onClick={() => toggleMenu('VEHICLE')} className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'VEHICLE' ? 'bg-slate-900/15' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80"><Car className="w-4 h-4 text-slate-300" /></div>
              <span className="text-xs font-bold text-slate-200">Vehicle Information</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'VEHICLE' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'VEHICLE' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-900/60 pt-4">
                <div><span className="text-slate-500 text-[10px] uppercase block">Vehicle Category</span><span className="text-slate-200 mt-1 block">{store.driverProfile?.vehicleType}</span></div>
                <div><span className="text-slate-500 text-[10px] uppercase block">Assigned Plate ID</span><span className="text-slate-200 mt-1 block font-mono">{store.driverProfile?.vehiclePlate || 'N/A'}</span></div>
                <div className="col-span-2"><span className="text-slate-500 text-[10px] uppercase block">Model</span><span className="text-slate-200 mt-1 block">{store.driverProfile?.vehicleModel || 'N/A'}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full">
          <button onClick={() => toggleMenu('BANK')} className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'BANK' ? 'bg-slate-900/15' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80"><Wallet className="w-4 h-4 text-slate-300" /></div>
              <span className="text-xs font-bold text-slate-200">Bank / Payout</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'BANK' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'BANK' && (
            <div className="px-5 pb-5 pt-1 space-y-3.5 bg-slate-950/30 text-xs font-bold font-sans animate-[fadeIn_0.15s_ease-out]">
              <div className="space-y-3 border-t border-slate-900/60 pt-4">
                <div className="flex justify-between items-center bg-[#080916] p-3 rounded-xl border border-slate-900">
                  <span className="text-slate-400 font-medium">Available Payout Balance</span>
                  <span className="font-mono text-emerald-400 font-black text-sm bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">${store.wallet.availableBalance.toFixed(2)}</span>
                </div>
                {onNavigateToWallet && (
                  <button onClick={onNavigateToWallet} className="w-full mt-2 py-3 bg-[#f05523]/10 hover:bg-[#f05523]/25 border border-[#f05523]/30 text-[#f05523] rounded-xl text-[11px] font-black uppercase tracking-wider text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/5 active:scale-[0.99]">
                    <Wallet className="w-4 h-4" /><span>Go to Wallet & Cash Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-full">
          <button onClick={() => toggleMenu('SETTINGS')} className={`w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer ${activeMenu === 'SETTINGS' ? 'bg-slate-900/15' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80"><Sliders className="w-4 h-4 text-slate-300" /></div>
              <span className="text-xs font-bold text-slate-200">App Settings / Sandbox</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${activeMenu === 'SETTINGS' ? 'rotate-90 text-orange-500' : ''}`} />
          </button>
          {activeMenu === 'SETTINGS' && (
            <div className="px-5 pb-5 pt-1 space-y-4 bg-[#090b1c] text-xs font-bold font-sans border-t border-slate-900/60 animate-[fadeIn_0.15s_ease-out]">
              <div className="space-y-3 pt-3">
                <h5 className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Device Customization</h5>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Sound Notifications</span>
                  <button onClick={() => store.setSoundEnabled(!store.soundEnabled)} className={`w-11 h-6 rounded-full transition-all relative ${store.soundEnabled ? 'bg-orange-500' : 'bg-slate-800'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-md flex items-center justify-center ${store.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}>
                      {store.soundEnabled ? <Volume2 className="w-2.5 h-2.5 text-orange-500" /> : <VolumeX className="w-2.5 h-2.5 text-slate-500" />}
                    </span>
                  </button>
                </div>
              </div>

              {import.meta.env.VITE_ENABLE_DEV_SIMULATION === 'true' && (
                <div className="space-y-3 border-t border-slate-900/60 pt-4">
                  <h5 className="text-[10px] text-[#f05523] font-black uppercase tracking-wider">Simulated Transit Engine Settings</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]"><span className="text-slate-200">Movement Transit Speed</span><span className="text-[#f05523] font-mono">{simulationSpeed}X Fast</span></div>
                    <input type="range" min="1" max="12" value={simulationSpeed} onChange={(e) => setSimulationSpeed(Number(e.target.value))} className="w-full accent-[#f05523] cursor-pointer" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button onClick={handleMatchOrder} className="py-2.5 bg-[#f05523]/10 hover:bg-[#f05523]/20 active:scale-[0.98] border border-[#f05523]/25 rounded-xl text-[10px] font-black text-[#f05523] text-center transition-all cursor-pointer leading-tight">DISPATCH ORDER</button>
                    <button onClick={handleInjectCash} className="py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] border border-emerald-500/25 rounded-xl text-[10px] font-black text-emerald-400 text-center transition-all cursor-pointer leading-tight">+$100 DEV CHEAT</button>
                  </div>
                  <button onClick={() => store.resetStore()} className="w-full py-2 bg-slate-950 hover:bg-slate-900 hover:text-rose-400 text-slate-550 text-slate-500 border border-slate-900 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2">
                    <RotateCcw className="w-3.5 h-3.5" /><span>HARD FACTORY RESET</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {onNavigateToSupport && (
          <div className="w-full">
            <button onClick={onNavigateToSupport} className="w-full flex items-center justify-between py-4.5 px-5 hover:bg-slate-900/25 transition-all text-left select-none cursor-pointer">
              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-900/80"><HelpCircle className="w-4 h-4 text-[#f05523]" /></div><span className="text-xs font-bold text-slate-200">Help & Support</span></div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        )}
      </div>

      <div className="pt-3">
        <button onClick={() => { store.setOnline(false); store.setLifecycleState('offline'); if(onBack) onBack(); }} className="w-full py-4.5 bg-[#0b0c1e] hover:bg-[#11122a] border border-slate-900 text-[#f05523] rounded-[24px] text-sm font-black tracking-tight text-center transition-all hover:border-[#f05523]/20 active:scale-[0.99] cursor-pointer shadow-lg shadow-black/10">
          Logout
        </button>
      </div>
    </div>
  );
}
