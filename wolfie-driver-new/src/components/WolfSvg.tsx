import React from 'react';

interface WolfSvgProps {
  className?: string;
}

export default function WolfSvg({ className = 'w-32 h-32' }: WolfSvgProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer shield glow backdrop resembling premium sports gaming badge */}
      <path
        d="M100 10 L172 60 L148 150 L100 192 L52 150 L28 60 Z"
        fill="#ff5500"
        fillOpacity="0.08"
        stroke="#ff5500"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      
      {/* Left Ear */}
      <path d="M75 52 L36 8 L54 62 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
      <path d="M70 54 L46 22 L54 60 Z" fill="#ff5500" />

      {/* Right Ear */}
      <path d="M125 52 L164 8 L146 62 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
      <path d="M130 54 L154 22 L146 60 Z" fill="#ff5500" />

      {/* Main Head Base Cheeks */}
      <path d="M48 72 L100 40 L152 72 L172 112 L140 118 L100 138 L60 118 L28 112 Z" fill="#f1f5f9" stroke="#0f172a" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M52 76 L100 46 L148 76 L164 108 L138 112 L100 131 L62 112 L36 108 Z" fill="#ffffff" />

      {/* Wolf forehead tribal marking and third eye spot in orange */}
      <path d="M90 44 L110 44 L100 74 Z" fill="#ff5500" />
      <circle cx="100" cy="58" r="4" fill="#ffffff" />

      {/* Shadow plates around cheeks and eye socket */}
      <path d="M58 92 L86 94 L100 80 L114 94 L142 92 L124 112 L100 128 L76 112 Z" fill="#334155" />

      {/* Muzzle Snout and Jaw structures */}
      <path d="M78 108 L122 108 L100 138 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
      {/* Big dark Wolf Nose */}
      <path d="M88 122 L112 122 L100 134 Z" fill="#0f172a" />
      
      {/* Wolf Glow Eyes */}
      {/* Left Eye */}
      <path d="M60 81 L86 86 L71 89 Z" fill="#ff5500" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="73" cy="85" r="1.5" fill="#ffffff" />
      <path d="M58 79 L88 85" stroke="#ff5500" strokeWidth="3" strokeLinecap="round" />

      {/* Right Eye */}
      <path d="M140 81 L114 86 L129 89 Z" fill="#ff5500" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="127" cy="85" r="1.5" fill="#ffffff" />
      <path d="M142 79 L112 85" stroke="#ff5500" strokeWidth="3" strokeLinecap="round" />

      {/* Mouth Lower Cavity / Teeth */}
      <path d="M82 133 L100 158 L118 133 Z" fill="#020617" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Fangs representing a fierce hunter attitude */}
      <path d="M84 133 L88 139 L92 133 Z" fill="#ffffff" />
      <path d="M116 133 L112 139 L108 133 Z" fill="#ffffff" />
      {/* Red accent tongue */}
      <path d="M94 144 H106 V149 Q100 153 94 144 Z" fill="#ef4444" />

      {/* Stylized sharp whiskers lines */}
      <path d="M42 102 L26 107" stroke="#94a3b8" strokeWidth="2" />
      <path d="M45 110 L28 117" stroke="#94a3b8" strokeWidth="2" />
      <path d="M158 102 L174 107" stroke="#94a3b8" strokeWidth="2" />
      <path d="M155 110 L172 117" stroke="#94a3b8" strokeWidth="2" />
      
      {/* Bottom Chest Collar accent */}
      <path d="M68 152 L100 184 L132 152 L115 159 L100 154 L85 159 Z" fill="#ff5500" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
