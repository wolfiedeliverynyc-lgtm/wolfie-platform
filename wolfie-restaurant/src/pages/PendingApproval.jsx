import React from 'react';
import { Clock, ArrowLeft, ShieldCheck, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../api';

const PendingApproval = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col justify-between p-6 sm:p-10 font-['Poppins',sans-serif] relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FFE100]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FFE100]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header / Brand */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto z-10">
        <div className="flex items-center gap-3">
          <img src="/icon-192x192.png" alt="Wolfie Logo" className="w-9 h-9 object-contain" />
          <span className="text-lg font-black tracking-tight text-white">
            Wolfie <span className="text-[#FFE100]">OS</span>
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
        >
          <ArrowLeft size={14} /> Log Out
        </button>
      </div>

      {/* Center Review Card */}
      <div className="w-full max-w-lg mx-auto my-auto z-10">
        <div className="bg-[#0c0c0c] border border-white/10 rounded-[28px] p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center space-y-6">
          
          {/* Animated Status Icon */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#FFE100]/10 animate-ping opacity-75" />
            <div className="relative w-20 h-20 rounded-full bg-[#FFE100]/15 border border-[#FFE100]/30 flex items-center justify-center text-[#FFE100]">
              <Clock size={36} className="animate-pulse" />
            </div>
          </div>

          {/* Title & Badge */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE100]/10 border border-[#FFE100]/20 text-[#FFE100] text-[10px] font-black uppercase tracking-[0.15em]">
              <ShieldCheck size={12} /> Compliance Review In Progress
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Application Under Review
            </h1>
          </div>

          {/* Explanation Text */}
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
            Thank you for registering with <strong className="text-white">Wolfie Partner Network</strong>. Our compliance team is verifying your KYC documents, banking setup, and restaurant profile details.
          </p>

          {/* Review Milestones Checklist */}
          <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-neutral-300 font-medium">
                <CheckCircle2 size={15} className="text-[#FFE100]" /> Basic Profile & Password
              </span>
              <span className="text-[10px] font-bold text-[#FFE100] uppercase">Complete</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-neutral-300 font-medium">
                <Clock size={15} className="text-[#FFE100]" /> KYC & Health Permits
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Under Review</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-neutral-300 font-medium">
                <Clock size={15} className="text-[#FFE100]" /> Menu & Direct Dispatch Setup
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Pending Approval</span>
            </div>
          </div>

          {/* Email Notice */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 font-medium">
            <Mail size={14} className="text-neutral-400" />
            <span>You will receive an email confirmation once activated (1–2 business days).</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-black tracking-wider uppercase bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw size={14} /> Refresh Status
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-black tracking-wider uppercase bg-[#FFE100] text-black hover:bg-[#FFE100]/90 transition-all cursor-pointer font-bold"
            >
              Return to Login
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-[10px] text-neutral-600 font-medium z-10">
        SECURED WITH 256-BIT ENCRYPTION • WOLFIE DELIVERY NYC © 2026
      </div>
    </div>
  );
};

export default PendingApproval;
