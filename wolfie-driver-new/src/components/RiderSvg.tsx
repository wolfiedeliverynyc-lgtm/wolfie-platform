import React from 'react';

interface RiderSvgProps {
  className?: string;
}

export default function RiderSvg({ className = 'w-64 h-64' }: RiderSvgProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background City Skyline with lit windows */}
      <g opacity="0.14" fill="#475569">
        {/* Buildings silhouettes */}
        <rect x="15" y="110" width="30" height="90" rx="2" />
        <rect x="50" y="80" width="35" height="120" rx="2" />
        <rect x="90" y="130" width="25" height="70" rx="1" />
        <rect x="120" y="95" width="40" height="105" rx="2" />
        <rect x="165" y="60" width="45" height="140" rx="3" />
        <rect x="215" y="115" width="30" height="85" rx="2" />
        <rect x="250" y="75" width="35" height="125" rx="2" />
        <rect x="290" y="120" width="25" height="80" rx="1" />
        
        {/* Window dots */}
        <g fill="#f59e0b">
          <circle cx="60" cy="95" r="1.5" />
          <circle cx="70" cy="95" r="1.5" />
          <circle cx="60" cy="115" r="1.5" />
          <circle cx="70" cy="115" r="1.5" />
          <circle cx="175" cy="80" r="1.5" />
          <circle cx="190" cy="80" r="1.5" />
          <circle cx="175" cy="100" r="1.5" />
          <circle cx="190" cy="100" r="1.5" />
          <circle cx="175" cy="120" r="1.5" />
          <circle cx="190" cy="120" r="1.5" />
          <circle cx="260" cy="95" r="1.5" />
          <circle cx="270" cy="95" r="1.5" />
          <circle cx="260" cy="115" r="1.5" />
          <circle cx="270" cy="115" r="1.5" />
        </g>
      </g>

      {/* Ground Line / Speed streaks */}
      <line x1="10" y1="200" x2="310" y2="200" stroke="#ff5500" strokeWidth="2.5" strokeOpacity="0.3" strokeDasharray="12 6" />
      <line x1="40" y1="206" x2="280" y2="206" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="6 12" />

      {/* Speed lines behind the bike */}
      <path d="M10 120 L50 120" stroke="#ff5500" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" strokeDasharray="30 15" />
      <path d="M5 145 L45 145" stroke="#ff5500" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" strokeDasharray="15 30" />
      <path d="M20 165 L60 165" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.3" strokeDasharray="20 20" />

      {/* --- RIDER SCOOTER --- */}
      {/* Front Wheel */}
      <circle cx="245" cy="180" r="20" fill="#0f172a" stroke="#475569" strokeWidth="5" />
      <circle cx="245" cy="180" r="11" fill="#1e293b" stroke="#ff5500" strokeWidth="2.5" />
      <circle cx="245" cy="180" r="4" fill="#f8fafc" />

      {/* Rear Wheel */}
      <circle cx="115" cy="180" r="20" fill="#0f172a" stroke="#475569" strokeWidth="5" />
      <circle cx="115" cy="180" r="11" fill="#1e293b" stroke="#ff5500" strokeWidth="2.5" />
      <circle cx="115" cy="180" r="4" fill="#f8fafc" />

      {/* Scooter Frame & Chassis (Vibrant orange parts and dark carbon panels) */}
      <path d="M115 180 L160 165 L210 165 L240 120 L245 110" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {/* Orange main body shield */}
      <path d="M185 165 L235 155 L245 115 L225 118 L200 135 H165 Z" fill="#ff5500" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Scooter Seat */}
      <path d="M140 135 C145 125 170 125 195 135 L190 148 H135 Z" fill="#111827" stroke="#0f172a" strokeWidth="1.5" />
      
      {/* Front Mudguard */}
      <path d="M230 155 C230 148 256 148 261 165" stroke="#ff5500" strokeWidth="4.5" strokeLinecap="round" />

      {/* Front Handlebars & Fork */}
      <line x1="245" x2="238" y1="110" y2="78" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
      {/* Handlebar Grip */}
      <path d="M232 78 H218" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      {/* Front LED Headlight */}
      <path d="M241 85 L252 87 L248 95 Z" fill="#fef08a" stroke="#0f172a" strokeWidth="1" />
      <polygon points="252,87 285,75 285,115 248,95" fill="url(#lightGlow)" opacity="0.2" />

      {/* --- TIMMY THE RIDER --- */}
      {/* Legs & Torso bending forward */}
      <path d="M185 135 L215 115 L228 145 H210" fill="none" stroke="#020617" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M185 135 L215 115 L228 145 H210" fill="none" stroke="#ff5500" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Rider Torso jacket */}
      <path d="M165 125 C162 105 185 85 205 85 C215 85 220 95 218 105 L200 135 Z" fill="#1e293b" stroke="#020617" strokeWidth="2.5" />
      {/* Orange shoulder strip */}
      <path d="M185 85 C195 85 202 88 208 95 L198 115 Z" fill="#ff5500" />

      {/* Arms reaching for handlebar */}
      <path d="M195 95 L222 82 H228" fill="none" stroke="#020617" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M195 95 L222 82 H228" fill="none" stroke="#ff5500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {/* Helmet (Orange and black motorcycle helmet with dark screen visor) */}
      <circle cx="205" cy="65" r="16" fill="#ff5500" stroke="#020617" strokeWidth="3" />
      {/* Helmet black decals */}
      <path d="M192 65 C192 58 200 52 208 52 V62 Z" fill="#1e293b" />
      {/* Visor */}
      <path d="M205 58 C215 58 221 66 219 75 C210 75 205 72 203 67 Z" fill="#020617" stroke="#ffffff" strokeWidth="1" />
      {/* Visor orange glare reflection */}
      <path d="M211 62 Q216 66 217 71" stroke="#ff5500" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* --- WOLFIE INSULATED FOOD BOX --- */}
      {/* Mounting rack */}
      <path d="M110 160 H140 V150 H110 Z" fill="#475569" stroke="#0f172a" strokeWidth="2.5" />
      {/* Insulated Box (Black back box with vertical orange stripe) */}
      <rect x="105" y="100" width="45" height="50" rx="4" fill="#111827" stroke="#020617" strokeWidth="3.5" />
      {/* Highlight/Side pockets */}
      <rect x="101" y="110" width="4" height="30" rx="1" fill="#ff5500" />
      {/* Big Vertical Orange stripe on side */}
      <rect x="122" y="100" width="10" height="50" fill="#ff5500" />
      
      {/* Little white Wolfie branding insignia on back of insulated bag */}
      <g transform="translate(112, 115) scale(0.1)" fill="#ffffff" stroke="#ff5500" strokeWidth="1">
        <path d="M100 10 L170 60 L145 150 L100 190 L55 150 L30 60 Z" fill="#ffffff" stroke="#ff5500" strokeWidth="2" />
        <path d="M75 50 L40 10 L55 60 Z" fill="#ff5500" />
        <path d="M125 50 L160 10 L145 60 Z" fill="#ff5500" />
        <path d="M50 70 L100 40 L150 70 L170 110 L100 135 L30 110 Z" fill="#020617" />
      </g>

      {/* Gradients */}
      <defs>
        <linearGradient id="lightGlow" x1="250" y1="88" x2="285" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
