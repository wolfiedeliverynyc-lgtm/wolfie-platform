import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Power, Settings, Clock, Activity, Zap, Cpu, Bell, Grid, ChevronRight } from 'lucide-react';

const MANIMALIST_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Orbitron:wght@500;700;900&family=Space+Mono:wght@400;700&display=swap');

  .manimalist-wrapper {
    background-color: #1c1e24;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    margin: 0;
    padding: 0;
  }

  .manimalist-wrapper .hw-panel {
    background-color: #24262d;
    border-radius: 12px;
    box-shadow: 4px 4px 10px rgba(0,0,0,0.5), -2px -2px 8px rgba(255,255,255,0.03);
    border-top: 1px solid rgba(255,255,255,0.05);
    border-left: 1px solid rgba(255,255,255,0.05);
    border-right: 1px solid rgba(0,0,0,0.5);
    border-bottom: 1px solid rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }

  .manimalist-wrapper .hw-recessed {
    background-color: #16181d;
    border-radius: 8px;
    box-shadow: inset 4px 4px 10px rgba(0,0,0,0.6), inset -2px -2px 8px rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    border-right: 1px solid rgba(255,255,255,0.05);
  }

  .manimalist-wrapper .hw-switch-track {
    background-color: #111215;
    border-radius: 99px;
    box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
  }

  .manimalist-wrapper .hw-switch-knob {
    background: linear-gradient(145deg, #32353f, #2a2c34);
    border-radius: 99px;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.5), -1px -1px 2px rgba(255,255,255,0.1);
  }

  .manimalist-wrapper .hw-indicator {
    background-color: #ff5500;
    box-shadow: 0 0 15px rgba(255, 85, 0, 0.6);
    border-radius: 99px;
  }

  .manimalist-wrapper .fui-header {
    font-family: 'Orbitron', sans-serif;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .manimalist-wrapper .fui-data {
    font-family: 'Space Mono', monospace;
    letter-spacing: -0.02em;
  }

  .manimalist-wrapper .shadow-neon-orange {
    box-shadow: 0 0 15px rgba(255, 85, 0, 0.6);
  }
`;
// Energy Flow SVG Component to replicate the thick gradient pipes
const EnergyFlowPipes = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 400" preserveAspectRatio="none">
    <defs>
      <linearGradient id="pipeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ff5500" stopOpacity="1" />
        <stop offset="50%" stopColor="#ff5500" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#ff5500" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="pipeDim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3a3c46" stopOpacity="1" />
        <stop offset="100%" stopColor="#3a3c46" stopOpacity="0" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    {/* Path 1: Main AC */}
    <path d="M 180 200 C 300 200, 350 80, 500 80" fill="none" stroke="url(#pipeGlow)" strokeWidth="16" filter="url(#glow)" />
    {/* Path 2: Sec AC */}
    <path d="M 180 200 C 300 200, 350 160, 500 160" fill="none" stroke="url(#pipeDim)" strokeWidth="10" />
    {/* Path 3: USB-C */}
    <path d="M 180 200 C 300 200, 350 240, 500 240" fill="none" stroke="url(#pipeDim)" strokeWidth="10" />
    {/* Path 4: USB-C 2 */}
    <path d="M 180 200 C 300 200, 350 320, 500 320" fill="none" stroke="url(#pipeGlow)" strokeWidth="12" filter="url(#glow)" />
    {/* Path 5: USB-A */}
    <path d="M 180 200 C 300 200, 350 400, 500 400" fill="none" stroke="url(#pipeDim)" strokeWidth="10" />
  </svg>
);

// Charging Arc Gauge SVG
const ArcGauge = ({ percentage }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * (circumference / 2); // Half circle

  return (
    <div className="relative w-48 h-24 overflow-hidden mx-auto mt-6">
      <svg className="w-full h-full absolute bottom-0" viewBox="0 0 200 100" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff5500" />
            <stop offset="100%" stopColor="#ff7733" />
          </linearGradient>
          <filter id="gaugeShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.8" />
          </filter>
        </defs>
        
        {/* Track */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#2a2c34" strokeWidth="16" strokeLinecap="round" filter="url(#gaugeShadow)" />
        
        {/* Fill */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#arcGlow)" strokeWidth="16" strokeLinecap="round" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-2">
        <span className="text-wolfie-orange mb-1"><Zap size={16} fill="currentColor" /></span>
        <span className="fui-header text-4xl text-white tracking-tighter">{percentage}%</span>
      </div>
    </div>
  );
};

export default function MANIMALIST() {
  const [powerOn, setPowerOn] = useState(true);

  return (
    <div className="manimalist-wrapper min-h-screen p-6 flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: MANIMALIST_STYLES }} />
      
      {/* ── TOP NAVBAR ── */}
      <header className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 22L12 17L22 22L12 2Z" fill="#ff5500"/>
          </svg>
          <h1 className="fui-header text-xl tracking-widest text-white">WOLFIE-OS</h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-12 fui-header text-xs font-bold text-[#8b92a5] tracking-wider">
          <button className="text-white border-b-2 border-[#ff5500] pb-1">DASHBOARD</button>
          <button className="hover:text-white transition-colors">STATISTICS</button>
          <button className="hover:text-white transition-colors">SUPPORT</button>
          <button className="hover:text-white transition-colors">SETTINGS</button>
        </nav>

        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full hw-switch-knob flex items-center justify-center text-[#8b92a5] hover:text-white transition-colors">
            <Grid size={18} />
          </button>
          <button className="w-10 h-10 rounded-full hw-switch-knob flex items-center justify-center text-[#8b92a5] hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff5500] hw-indicator animate-pulse"></span>
          </button>
        </div>
      </header>


      {/* ── MAIN DASHBOARD GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
        
        {/* LEFT COLUMN (Energy Flow & Small Panels) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* ENERGY FLOW PANEL */}
          <div className="hw-panel h-[450px] p-8 flex flex-col relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')]">
            
            <div className="flex justify-between items-start z-10 relative">
              <h2 className="fui-header text-5xl leading-tight text-white/90 drop-shadow-md">ENERGY<br/>FLOW</h2>
              <button className="hw-switch-track px-4 py-2 flex items-center gap-2 text-xs font-bold text-[#8b92a5] border border-white/5">
                ADD PORT <span className="text-white">+</span>
              </button>
            </div>

            {/* The Gradient Pipes */}
            <EnergyFlowPipes />

            {/* Output Node (Left) */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 z-10 flex items-center">
              <div className="bg-gradient-to-r from-phoenix-panel to-[#ff5500] p-[2px] rounded-l-lg border-y border-l border-white/5 shadow-2xl">
                <div className="bg-[#16181d] px-6 py-4 flex flex-col items-start min-w-[140px]">
                  <span className="fui-header text-sm text-white tracking-widest">OUTPUT</span>
                  <span className="fui-data text-xs text-[#8b92a5] mt-1">38 KWH ⚡</span>
                </div>
              </div>
              <div className="w-12 h-14 bg-[#ff5500] rounded-r-lg hw-indicator flex items-center justify-center -ml-1 border-y border-r border-[#ff7733]">
                <Zap size={24} className="text-white" fill="white" />
              </div>
            </div>

            {/* Input Nodes (Right) */}
            <div className="absolute right-8 top-[60px] bottom-[60px] flex flex-col justify-between z-10">
              {[
                { label: 'Main AC', val: '30 KWH', active: true },
                { label: 'Sec AC', val: '0 KWH', active: false },
                { label: 'USB-C', val: '0 KWH', active: false },
                { label: 'USB-C', val: '8 KWH', active: true },
                { label: 'USB-A', val: '0 KWH', active: false },
              ].map((port, idx) => (
                <div key={idx} className="flex items-center gap-6 group cursor-pointer">
                  <div className="flex flex-col items-end">
                    <span className="fui-header text-xs text-[#8b92a5] group-hover:text-white transition-colors">{port.label}</span>
                    <span className={`fui-data text-[10px] ${port.active ? 'text-white font-bold' : 'text-[#8b92a5]/50'}`}>{port.val}</span>
                  </div>
                  <div className="w-1 h-8 bg-phoenix-borderLight rounded-full relative">
                    {port.active && <div className="absolute inset-0 bg-[#ff5500] shadow-neon-orange rounded-full"></div>}
                  </div>
                  {/* Physical Port Receptacle */}
                  <div className="hw-recessed w-14 h-8 rounded-full flex items-center justify-center p-1 border border-black/80">
                    <div className={`w-10 h-3 rounded-full shadow-inner ${port.active ? 'bg-[#ff5500]/80 shadow-neon-orange' : 'bg-black/80'}`}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Left Readouts */}
            <div className="absolute bottom-8 left-8 z-10 flex gap-12">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="fui-header text-4xl text-white">12</span>
                  <span className="fui-header text-xs text-[#8b92a5]">HR</span>
                </div>
                <span className="fui-header text-[10px] text-[#8b92a5] tracking-widest mt-1 block">BATTERY LIFE</span>
              </div>
              <div className="flex flex-col justify-end pb-1">
                <span className="fui-header text-[10px] text-[#8b92a5] tracking-widest mb-2">MEDIUM LOAD</span>
                <svg width="100" height="20" viewBox="0 0 100 20">
                  <path d="M0 10 Q 25 20, 50 10 T 100 10" fill="none" stroke="#3a3c46" strokeWidth="2" />
                  <path d="M20 12 Q 25 20, 50 10 T 80 8" fill="none" stroke="#ff5500" strokeWidth="2" filter="url(#glow)" />
                  <circle cx="50" cy="10" r="3" fill="#ff5500" className="animate-pulse" />
                </svg>
              </div>
            </div>
          </div>

          {/* BOTTOM PANELS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[250px]">
            
            {/* Details Panel */}
            <div className="hw-panel p-6 flex flex-col justify-between">
              <h3 className="fui-header text-lg text-white text-center tracking-widest">DETAILS</h3>
              <div className="grid grid-cols-2 gap-y-4 mt-4">
                {[
                  { label: 'Mode', val: 'X-BOOST', icon: <Zap size={12}/> },
                  { label: 'Time', val: '3H 15M', icon: <Clock size={12}/> },
                  { label: 'Frequency', val: '50 HZ', icon: <Activity size={12}/> },
                  { label: 'Temp', val: '30°C', icon: <Cpu size={12}/> },
                  { label: 'Ampere', val: '600A', icon: <Activity size={12}/> },
                  { label: 'Current', val: '10A', icon: <Settings size={12}/> },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-[10px] text-[#8b92a5]">{item.label}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="fui-data text-xs font-bold text-white">{item.val}</span>
                      <span className="text-white/30">{item.icon}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cable Flash Mode Panel */}
            <div className="hw-panel p-6 flex flex-col justify-between relative bg-[#1c1d22]">
               <div className="absolute top-6 left-6 z-10 flex flex-col">
                 <span className="fui-data text-xs text-white">Ω 15</span>
                 <span className="fui-data text-xs text-white mt-1">1 w</span>
               </div>
               
               {/* Abstract Skeuomorphic Cable Graphic */}
               <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none">
                 <svg width="200" height="200" viewBox="0 0 200 200">
                    <path d="M -50 250 L 80 120 L 120 80 L 250 -50" stroke="#111" strokeWidth="40" strokeLinecap="round"/>
                    <path d="M -50 250 L 80 120 L 120 80 L 250 -50" stroke="#222" strokeWidth="30" strokeLinecap="round"/>
                    <circle cx="100" cy="100" r="40" fill="none" stroke="#ff5500" strokeWidth="2" strokeDasharray="4 4" className="animate-[spin_10s_linear_infinite]" />
                    <circle cx="100" cy="100" r="30" fill="#111" stroke="#333" strokeWidth="4"/>
                    <circle cx="100" cy="100" r="20" fill="url(#pipeGlow)" filter="url(#glow)"/>
                 </svg>
               </div>

               <div className="mt-auto flex justify-between items-end z-10 w-full border-t border-white/5 pt-4">
                  <div className="flex flex-col">
                    <span className="fui-header text-[9px] text-[#8b92a5] mb-1">FLASH MODE</span>
                    <span className="fui-header text-sm text-white">CABEL</span>
                  </div>
                  {/* Skeuomorphic Toggle */}
                  <div className="hw-switch-track w-16 h-8 p-1 flex items-center cursor-pointer relative" onClick={() => setPowerOn(!powerOn)}>
                     <div className="absolute left-2 text-[9px] font-bold text-[#8b92a5]">ON</div>
                     <motion.div 
                       animate={{ x: powerOn ? 32 : 0 }} 
                       className={`w-7 h-6 rounded-full hw-switch-knob z-10 flex items-center justify-center border-y border-white/10 ${powerOn ? 'shadow-neon-orange' : ''}`}
                     >
                       {powerOn && <div className="w-2 h-1 bg-[#ff5500] hw-indicator shadow-neon-orange rounded-full"></div>}
                     </motion.div>
                  </div>
               </div>
            </div>

            {/* Chip Volt Display Panel */}
            <div className="hw-panel p-6 flex flex-col justify-between bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMzMzMiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMjIyIi8+PC9zdmc+')] relative">
               <div className="absolute inset-0 flex items-center justify-center opacity-60">
                 <svg width="100%" height="100%" viewBox="0 0 200 200">
                    <path d="M 40 80 L 70 80 M 40 100 L 70 100 M 40 120 L 70 120" stroke="#ff5500" strokeWidth="2" filter="url(#glow)" />
                    <path d="M 160 80 L 130 80 M 160 100 L 130 100 M 160 120 L 130 120" stroke="#ff5500" strokeWidth="2" filter="url(#glow)" />
                 </svg>
               </div>

               <div className="w-28 h-28 mx-auto hw-recessed border-2 border-black/80 flex flex-col items-center justify-center relative z-10 mt-2 shadow-[0_10px_20px_rgba(0,0,0,0.8)] bg-[#111]">
                 <span className="fui-data text-white text-lg font-bold">23.8</span>
                 <div className="w-full h-[1px] bg-white/10 my-2"></div>
                 <span className="fui-header text-sm text-[#8b92a5] tracking-widest">VOLT</span>
                 <span className="fui-header text-[8px] text-[#8b92a5]">DISPLAY</span>
               </div>

               <div className="mt-auto flex justify-between items-center z-10 w-full pt-4">
                  <span className="fui-data text-[10px] text-white">AC <span className="font-bold">23.8V</span> / DC <span className="font-bold">14V</span></span>
                  <button className="hw-switch-track px-3 py-1.5 rounded-full text-[10px] text-[#8b92a5] flex items-center gap-1 hover:text-white border border-white/5">
                    Details <ChevronRight size={10}/>
                  </button>
               </div>
            </div>

          </div>
        </div>


        {/* RIGHT COLUMN (Zeus Render & Charging Mode) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          <div className="hw-panel flex-1 flex flex-col relative overflow-hidden bg-[#18191d]">
            
            {/* The 3D Render Image (Using the one generated) */}
            <div className="h-[400px] w-full relative">
               <img 
                 src="/wolfie-x-render.png" 
                 alt="WOLFIE-X Render" 
                 className="absolute inset-0 w-full h-full object-cover object-center opacity-90 mix-blend-lighten"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#18191d]"></div>
               
               <div className="absolute top-8 left-0 right-0 flex flex-col items-center z-10">
                 <h2 className="fui-header text-4xl text-white tracking-widest drop-shadow-lg">WOLFIE-X</h2>
                 <span className="hw-switch-track px-4 py-1 mt-2 text-[10px] font-bold text-[#8b92a5] border border-white/5 shadow-inner rounded-full">
                   X-boost mode
                 </span>
               </div>
            </div>

            {/* Power Button Section */}
            <div className="flex justify-between items-center px-10 relative z-10 -mt-6">
               <span className="fui-header text-xs text-white tracking-widest">POWER</span>
               
               {/* Massive Skeuomorphic Power Dial */}
               <div className="w-24 h-24 rounded-full hw-recessed flex items-center justify-center p-2 border-2 border-black/80 relative">
                  {/* Ticks ring */}
                  <svg className="absolute inset-0 w-full h-full animate-[spin_20s_linear_infinite]" viewBox="0 0 100 100">
                    {Array.from({length: 36}).map((_, i) => (
                      <line key={i} x1="50" y1="4" x2="50" y2="10" stroke={i % 3 === 0 ? "#ff5500" : "#333"} strokeWidth="2" transform={`rotate(${i * 10} 50 50)`} />
                    ))}
                  </svg>
                  <button className="w-16 h-16 rounded-full hw-switch-knob flex items-center justify-center border-y border-white/10 hover:brightness-110 active:scale-95 transition-all z-10 shadow-[0_10px_20px_rgba(0,0,0,0.8)] relative">
                    <Power size={24} className="text-[#ff5500] drop-shadow-[0_0_10px_rgba(255,85,0,0.8)]" />
                  </button>
               </div>

               <div className="flex gap-2 fui-header text-xs">
                 <span className="text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">ON</span>
                 <span className="text-[#8b92a5]/50">OFF</span>
               </div>
            </div>

            {/* Divider */}
            <div className="w-4/5 mx-auto h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-8"></div>

            {/* Charging Mode Gauge */}
            <div className="px-8 pb-10 flex flex-col">
              <h3 className="fui-header text-lg text-white text-center tracking-widest">CHARGING MODE</h3>
              
              <ArcGauge percentage={74} />

              <div className="flex justify-between items-center mt-6 w-full px-4">
                <span className="fui-data text-[10px] text-[#8b92a5]">0%</span>
                <span className="fui-data text-[10px] text-[#8b92a5]">100%</span>
              </div>
              
              <div className="flex justify-between items-center mt-4 w-full border-t border-white/5 pt-4">
                <span className="fui-data text-[10px] text-[#8b92a5]">Power <span className="text-white font-bold">5A / 220V</span></span>
                <span className="fui-data text-[10px] text-[#8b92a5]">Input <span className="text-white font-bold">200 KWH</span></span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
