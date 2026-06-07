import { User, Settings, ShieldCheck, HelpCircle, FileText, ChevronRight, LogOut, Car } from 'lucide-react'
import { useDriverStore } from '../store/useDriverStore'
export default function AccountPage() {
  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] overflow-y-auto pb-24 text-white">
      <div className="pt-12 px-6 pb-6">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>

        {/* Profile Card */}
        <div className="bg-[#151515] rounded-2xl p-6 border border-[#222222] mb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center text-3xl overflow-hidden border-2 border-[#FF5A00]">
            👨🏽‍🦱
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Ahmed Hassan</h2>
            <p className="text-[#A3A3A3] text-sm">ahmed@wolfie.com</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-[#FF5A00]/20 text-[#FF5A00] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pro Driver</span>
              <span className="text-[#A3A3A3] text-[10px] flex items-center gap-1">⭐ 4.9 Rating</span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#A3A3A3] uppercase tracking-wider mb-2">Account</h3>
          
          <div className="bg-[#151515] rounded-xl border border-[#222222] overflow-hidden divide-y divide-[#222222]">
            <button className="w-full flex items-center justify-between p-4 active:bg-[#222222] transition-colors">
              <div className="flex items-center gap-3">
                <User size={20} className="text-[#FF5A00]" />
                <span className="font-medium">Personal Information</span>
              </div>
              <ChevronRight size={20} className="text-[#737373]" />
            </button>
            <button className="w-full flex items-center justify-between p-4 active:bg-[#222222] transition-colors">
              <div className="flex items-center gap-3">
                <Car size={20} className="text-[#FF5A00]" />
                <span className="font-medium">Vehicle Information</span>
              </div>
              <ChevronRight size={20} className="text-[#737373]" />
            </button>
            <button className="w-full flex items-center justify-between p-4 active:bg-[#222222] transition-colors">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-[#FF5A00]" />
                <span className="font-medium">Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                <ChevronRight size={20} className="text-[#737373]" />
              </div>
            </button>
          </div>

          <h3 className="text-sm font-bold text-[#A3A3A3] uppercase tracking-wider mb-2 mt-6">App Settings</h3>
          
          <div className="bg-[#151515] rounded-xl border border-[#222222] overflow-hidden divide-y divide-[#222222]">
            <button className="w-full flex items-center justify-between p-4 active:bg-[#222222] transition-colors">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-[#A3A3A3]" />
                <span className="font-medium">Navigation Settings</span>
              </div>
              <ChevronRight size={20} className="text-[#737373]" />
            </button>
            <button className="w-full flex items-center justify-between p-4 active:bg-[#222222] transition-colors">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-[#A3A3A3]" />
                <span className="font-medium">Privacy & Security</span>
              </div>
              <ChevronRight size={20} className="text-[#737373]" />
            </button>
            <button 
              onClick={() => useDriverStore.getState().setActiveTab('help')}
              className="w-full flex items-center justify-between p-4 active:bg-[#222222] transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={20} className="text-[#A3A3A3]" />
                <span className="font-medium">Help & Support</span>
              </div>
              <ChevronRight size={20} className="text-[#737373]" />
            </button>
          </div>

          <button className="w-full py-4 mt-6 bg-[#1A1A1A] border border-[#ef4444]/50 rounded-xl text-[#ef4444] font-bold flex justify-center items-center gap-2 active:scale-95 transition-transform">
            <LogOut size={20} /> Log Out
          </button>
          <p className="text-center text-[#737373] text-xs mt-4">Wolfie Driver v2.0.0</p>
        </div>
      </div>
    </div>
  )
}
