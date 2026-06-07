import React, { useEffect, useState, useRef } from 'react';
import { Play, Square, Navigation, Award, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { Order, LatLng } from '../types';
import { CITY_BOUNDS, ROADS, RESTAURANTS, CLIENT_LOCATIONS } from '../data';

interface MapSimulatorProps {
  activeOrder: Order | null;
  driverCoords: LatLng;
  simulationSpeed: number; // multiplier e.g. 1, 2, 5, 10
  onDriverCoordsUpdate: (coords: LatLng, currentSegmentDistanceLeft: number) => void;
  onAutoArrive: () => void; // Triggered when driver completes segment
}

export default function MapSimulator({
  activeOrder,
  driverCoords,
  simulationSpeed,
  onDriverCoordsUpdate,
  onAutoArrive,
}: MapSimulatorProps) {
  const [activePathPoints, setActivePathPoints] = useState<LatLng[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [segmentProgress, setSegmentProgress] = useState<number>(0); // 0 to 1 along the current line segment
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse destination based on active order state
  const getDestination = (): { coords: LatLng; name: string; type: 'STORE' | 'CUSTOMER' | null } => {
    if (!activeOrder) return { coords: { x: 400, y: 300 }, name: 'Idle', type: null };
    if (activeOrder.status === 'NAV_TO_STORE') {
      return { coords: activeOrder.storeCoords, name: activeOrder.storeName, type: 'STORE' };
    }
    if (activeOrder.status === 'NAV_TO_CUSTOMER') {
      return { coords: activeOrder.customerCoords, name: activeOrder.customerName, type: 'CUSTOMER' };
    }
    return { coords: { x: 400, y: 300 }, name: 'Idle', type: null };
  };

  const { coords: destinationCoords, name: destinationName, type: destinationType } = getDestination();

  // Route Planning: Plan routing whenever activeOrder or destination changes
  useEffect(() => {
    if (!activeOrder || (activeOrder.status !== 'NAV_TO_STORE' && activeOrder.status !== 'NAV_TO_CUSTOMER')) {
      setActivePathPoints([]);
      setCountdown(null);
      return;
    }

    // Manhattan path generation:
    // Move along horizontal first then vertical (or visa versa) to align cleanly with roads
    const start = { x: driverCoords.x, y: driverCoords.y };
    const end = { x: destinationCoords.x, y: destinationCoords.y };

    const points: LatLng[] = [];
    points.push(start);

    // Let's decide how we steer. If starting on an intersection or road, we can transition horizontally first, then vertically.
    // e.g. Point 1: (start.x, start.y) -> Point 2: (end.x, start.y) -> Point 3: (end.x, end.y)
    // We add turn-point only if it is a real turn
    if (start.x !== end.x && start.y !== end.y) {
      points.push({ x: end.x, y: start.y });
    }
    points.push(end);

    setActivePathPoints(points);
    setCurrentSegmentIndex(0);
    setSegmentProgress(0);
  }, [activeOrder?.id, activeOrder?.status]);

  // Ride Simulation Loop
  useEffect(() => {
    if (activePathPoints.length < 2) return;

    const tick = () => {
      if (countdown !== null) {
        return;
      }

      // Find the two endpoints of our current active segment
      const p1 = activePathPoints[currentSegmentIndex];
      const p2 = activePathPoints[currentSegmentIndex + 1];

      if (!p1 || !p2) {
        // Path complete!
        if (activeOrder?.status === 'NAV_TO_STORE') {
          setCountdown(30);
        } else {
          onAutoArrive();
        }
        return;
      }

      // Calculate total segment distance in coordinates
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Speed multiplier. Base move is 3.5 coordinates per tick (50ms)
      const baseDisplacement = 3.5;
      const step = (baseDisplacement * simulationSpeed) / distance;

      const next = segmentProgress + step;
      if (next >= 1.0) {
        // Go to next segment
        if (currentSegmentIndex + 2 < activePathPoints.length) {
          setCurrentSegmentIndex(currentSegmentIndex + 1);
          setSegmentProgress(0); // Reset segment progress
        } else {
          // End of entire path reached!
          onDriverCoordsUpdate(p2, 0);
          if (activeOrder?.status === 'NAV_TO_STORE') {
            setCountdown(30);
          } else {
            onAutoArrive();
          }
          setSegmentProgress(1.0);
        }
      } else {
        // Linear interpolation for driver coordinates
        const newX = p1.x + dx * next;
        const newY = p1.y + dy * next;
        
        // Estimate remaining distance to destination (total remaining coordinates)
        let remainingDistanceCoords = (1 - next) * distance;
        for (let i = currentSegmentIndex + 1; i < activePathPoints.length - 1; i++) {
          const pa = activePathPoints[i];
          const pb = activePathPoints[i + 1];
          remainingDistanceCoords += Math.sqrt(Math.pow(pb.x - pa.x, 2) + Math.pow(pb.y - pa.y, 2));
        }

        // Approx miles. 120 pixels/coordinates = roughly 1 mile
        const milesRemaining = parseFloat((remainingDistanceCoords / 120).toFixed(2));

        onDriverCoordsUpdate({ x: newX, y: newY }, milesRemaining);
        setSegmentProgress(next);
      }
    };

    // run loop at 50ms interval
    timerRef.current = setInterval(tick, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activePathPoints, currentSegmentIndex, segmentProgress, simulationSpeed, onAutoArrive, onDriverCoordsUpdate, countdown, activeOrder?.status]);

  // Countdown Timer Ticker for delayed automatic arrival
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      onAutoArrive();
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onAutoArrive]);

  // Calculate rotation angle of driver scooter based on current heading
  const getHeadingAngle = (): number => {
    if (activePathPoints.length < 2) return 0;
    const p1 = activePathPoints[currentSegmentIndex];
    const p2 = activePathPoints[currentSegmentIndex + 1];
    if (!p1 || !p2) return 0;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Rotate 0 is facing right (X axis increasing)
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const angle = getHeadingAngle();

  return (
    <div id="map-simulator-container" className="relative w-full h-[320px] md:h-full bg-[#0a0f1d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Map Subheader / Status Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 items-center justify-between pointer-events-none">
        <div className="flex items-center bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs shadow-lg text-slate-100 font-medium pointer-events-auto">
          {countdown !== null ? (
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
              <span>Arrived! Auto Check-in at store in <strong className="text-orange-400 font-mono font-black">{countdown}s</strong></span>
              <button
                onClick={() => {
                  onAutoArrive();
                  setCountdown(null);
                }}
                className="ml-2 px-2 py-0.5 bg-orange-600 hover:bg-orange-500 active:scale-95 text-[10px] text-white font-bold rounded-md cursor-pointer transition-all border border-orange-500/10"
              >
                Arrive Now
              </button>
            </div>
          ) : activeOrder ? (
            <>
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-orange-500 animate-pulse"></span>
              <span>
                En Route to <strong className="text-orange-400">{destinationName}</strong> ({simulationSpeed}x Sim Speed)
              </span>
            </>
          ) : (
            <>
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-emerald-500"></span>
              <span>Online & Ready • Waiting for Offers</span>
            </>
          )}
        </div>

        {activeOrder && (
          <div className="flex gap-2 items-center bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs shadow-lg text-slate-100 font-medium whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-yellow-400 mr-1 animate-pulse" />
            <span>Fast GPS Navigation</span>
          </div>
        )}
      </div>

      {/* Main Map SVG Canvas */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing select-none overflow-hidden">
        <svg
          viewBox={`0 0 ${CITY_BOUNDS.width} ${CITY_BOUNDS.height}`}
          className="w-full h-full object-cover transition-colors duration-500"
          style={{ backgroundImage: 'radial-gradient(circle, #0e1529 10%, #080c18 100%)' }}
        >
          {/* WATER BODY - Lake/River */}
          <path
            d="M 680,600 Q 720,400 750,200 T 800,0 L 800,600 Z"
            fill="#152844"
            fillOpacity="0.8"
            stroke="#1d385e"
            strokeWidth="2"
          />
          {/* River bridge indicators */}
          <line x1="700" y1="460" x2="770" y2="460" stroke="#485c7d" strokeWidth="8" strokeLinecap="round" />
          <line x1="720" y1="360" x2="790" y2="360" stroke="#485c7d" strokeWidth="8" strokeLinecap="round" />

          {/* PARKS / GREENERY */}
          <rect x="180" y="160" width="100" height="100" rx="12" fill="#0c2d20" fillOpacity="0.85" stroke="#104a32" strokeWidth="1" />
          <text x="215" y="215" fontSize="24" className="opacity-40 select-none pointer-events-none">🌳</text>
          
          <rect x="480" y="360" width="100" height="100" rx="12" fill="#0c2d20" fillOpacity="0.85" stroke="#104a32" strokeWidth="1" />
          <text x="515" y="415" fontSize="24" className="opacity-40 select-none pointer-events-none">🌳</text>

          <rect x="80" y="460" width="100" height="80" rx="12" fill="#0c2d20" fillOpacity="0.85" stroke="#104a32" strokeWidth="1" />
          <text x="115" y="505" fontSize="20" className="opacity-40 select-none pointer-events-none">🌲</text>

          {/* HOT ZONES - Glowing areas representing high Wolfie demand */}
          <circle cx="280" cy="160" r="90" fill="#ff5500" fillOpacity="0.06" stroke="#ff5500" strokeWidth="1.5" strokeDasharray="5,6" className="animate-pulse" />
          <text x="235" y="100" fill="#ff5500" fontSize="10" fontWeight="700" letterSpacing="0.05em" className="opacity-70 fill-orange-500 font-sans tracking-widest uppercase">🔥 HOT ZONE</text>

          <circle cx="680" cy="260" r="80" fill="#ff5500" fillOpacity="0.06" stroke="#ff5500" strokeWidth="1.5" strokeDasharray="5,6" />
          <text x="640" y="210" fill="#ff5500" fontSize="10" fontWeight="700" letterSpacing="0.05em" className="opacity-70 fill-orange-500 font-sans tracking-widest uppercase">🔥 HOT ZONE</text>

          {/* CITY GRID ROADS - Background Shadow/Casing for Depth */}
          {ROADS.horizontal.map((h, idx) => (
            <line key={`h-case-${idx}`} x1="0" y1={h.y} x2={CITY_BOUNDS.width} y2={h.y} stroke="#1b243b" strokeWidth="22" strokeLinecap="square" />
          ))}
          {ROADS.vertical.map((v, idx) => (
            <line key={`v-case-${idx}`} x1={v.x} y1="0" x2={v.x} y2={CITY_BOUNDS.height} stroke="#1b243b" strokeWidth="22" strokeLinecap="square" />
          ))}

          {/* CITY GRID ROADS - Inner asphalt asphalt asphalt */}
          {ROADS.horizontal.map((h, idx) => (
            <line key={`h-road-${idx}`} x1="0" y1={h.y} x2={CITY_BOUNDS.width} y2={h.y} stroke="#131a2b" strokeWidth="16" />
          ))}
          {ROADS.vertical.map((v, idx) => (
            <line key={`v-road-${idx}`} x1={v.x} y1="0" x2={v.x} y2={CITY_BOUNDS.height} stroke="#131a2b" strokeWidth="16" />
          ))}

          {/* STREET LANE DIVISION LINES (Dashed Yellow/White Centerlines) */}
          {ROADS.horizontal.map((h, idx) => (
            <line key={`h-line-${idx}`} x1="0" y1={h.y} x2={CITY_BOUNDS.width} y2={h.y} stroke="#594d22" strokeWidth="1.5" strokeDasharray="6,8" />
          ))}
          {ROADS.vertical.map((v, idx) => (
            <line key={`v-line-${idx}`} x1={v.x} y1="0" x2={v.x} y2={CITY_BOUNDS.height} stroke="#444d63" strokeWidth="1.2" strokeDasharray="6,8" />
          ))}

          {/* STREET NAME LABEL TEXTS */}
          <text x="30" y="52" fill="#4B5675" fontSize="9" fontWeight="600" className="font-sans select-none fill-slate-500 opacity-80 uppercase tracking-wider">{ROADS.horizontal[0].name}</text>
          <text x="30" y="152" fill="#4B5675" fontSize="9" fontWeight="600" className="font-sans select-none fill-slate-500 opacity-80 uppercase tracking-wider">{ROADS.horizontal[1].name}</text>
          <text x="30" y="252" fill="#4B5675" fontSize="9" fontWeight="600" className="font-sans select-none fill-slate-500 opacity-80 uppercase tracking-wider">{ROADS.horizontal[2].name}</text>
          <text x="30" y="352" fill="#4B5675" fontSize="9" fontWeight="600" className="font-sans select-none fill-slate-500 opacity-80 uppercase tracking-wider">{ROADS.horizontal[3].name}</text>
          <text x="30" y="452" fill="#4B5675" fontSize="9" fontWeight="600" className="font-sans select-none fill-slate-500 opacity-80 uppercase tracking-wider">{ROADS.horizontal[4].name}</text>

          {/* ACTIVE DISPATCH PATHWAY (Bright glowing dashed route overlay) */}
          {activePathPoints.length >= 2 && (
            <>
              {/* Thick outer path glow */}
              <polyline
                points={activePathPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#ff5500"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.3"
              />
              {/* Dynamic Inner pathway line */}
              <polyline
                points={activePathPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#ff7733"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8,6"
                className="animate-[dash_1s_linear_infinite]"
                style={{
                  strokeDashoffset: -currentSegmentIndex * 2,
                }}
              />
            </>
          )}

          {/* RESTAURANTS PIN MARKERS */}
          {RESTAURANTS.map((rest, idx) => {
            const isActivePoint = activeOrder && activeOrder.status === 'NAV_TO_STORE' && activeOrder.storeName === rest.name;
            return (
              <g key={`rest-pin-${idx}`} className="cursor-pointer transition-transform duration-200 hover:scale-110">
                {/* Glowing alert ring around active store pickup */}
                {isActivePoint && (
                  <circle
                    cx={rest.coords.x}
                    cy={rest.coords.y}
                    r="22"
                    fill="none"
                    stroke="#ff5500"
                    strokeWidth="2"
                    className="animate-ping"
                    style={{ animationDuration: '2s' }}
                  />
                )}
                <circle cx={rest.coords.x} cy={rest.coords.y} r="14" fill="#ff5500" stroke="#ffffff" strokeWidth="2.5" className="shadow-lg" />
                <text x={rest.coords.x} y={rest.coords.y + 4.5} textAnchor="middle" fontSize="13" className="select-none pointer-events-none">
                  {rest.logo}
                </text>
                {/* Shop Name floating tooltip */}
                <rect x={rest.coords.x - 45} y={rest.coords.y - 32} width="90" height="15" rx="4" fill="#0f172a" fillOpacity="0.9" stroke="#1e293b" strokeWidth="1" />
                <text x={rest.coords.x} y={rest.coords.y - 22} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#f8fafc" className="font-sans select-none">
                  {rest.name}
                </text>
              </g>
            );
          })}

          {/* ACTIVE DISPATCH DROP-OFF PIN (Home/Customer) */}
          {activeOrder && (
            <g key="delivery-destination" className="transition-transform duration-200 hover:scale-115">
              {/* Pulsing radius around destination customer location */}
              <circle
                cx={activeOrder.customerCoords.x}
                cy={activeOrder.customerCoords.y}
                r="24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                className="animate-ping"
                style={{ animationDuration: '1.5s' }}
              />
              <circle cx={activeOrder.customerCoords.x} cy={activeOrder.customerCoords.y} r="14" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" className="shadow-lg" />
              <text x={activeOrder.customerCoords.x} y={activeOrder.customerCoords.y + 4.5} textAnchor="middle" fontSize="13" className="select-none pointer-events-none">
                🏠
              </text>
              {/* Customer flag */}
              <rect x={activeOrder.customerCoords.x - 55} y={activeOrder.customerCoords.y - 33} width="110" height="16" rx="4" fill="#0f172a" fillOpacity="0.95" stroke="#10b981" strokeWidth="1" />
              <text x={activeOrder.customerCoords.x} y={activeOrder.customerCoords.y - 22} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#34d399" className="font-sans select-none uppercase tracking-wide">
                📍 {activeOrder.customerName.split(' ')[0]}'s House
              </text>
            </g>
          )}

          {/* IDLE CUSTOMER SITES LIGHT REPRESENTATION (Faded details to give life) */}
          {!activeOrder && CLIENT_LOCATIONS.map((loc, idx) => (
            <g key={`idle-house-${idx}`} className="opacity-40">
              <circle cx={loc.coords.x} cy={loc.coords.y} r="7" fill="#475569" stroke="#334155" strokeWidth="1.5" />
              <circle cx={loc.coords.x} cy={loc.coords.y} r="2" fill="#1e1b4b" />
            </g>
          ))}

          {/* DRIVER RIDER SCOOTER ICON */}
          <g
            transform={`translate(${driverCoords.x}, ${driverCoords.y}) rotate(${angle})`}
            className="transition-transform duration-75 ease-linear"
          >
            {/* Pulsing ring underneath the active driver */}
            <circle cx="0" cy="0" r="16" fill="rgba(255, 94, 26, 0.2)" className="animate-pulse" />
            
            {/* Scooter body - facing right (X axis increasing) */}
            {/* Orange scooter outline */}
            <ellipse cx="0" cy="0" rx="11" ry="8" fill="#ff5500" stroke="#ffffff" strokeWidth="1.8" className="shadow-xl" />
            
            {/* Driver helmet dot */}
            <circle cx="2" cy="0" r="4.2" fill="#1e293b" stroke="#ffffff" strokeWidth="1" />
            
            {/* Rear delivery bag representation */}
            <rect x="-9" y="-5" width="6.5" height="10" rx="1" fill="#0f172a" stroke="#fff" strokeWidth="1" />
            <text x="-6" y="2" fill="#fff" fontSize="5" fontWeight="bold" className="font-sans select-none opacity-80">W</text>

            {/* Front windshield handle representation */}
            <path d="M 7,-4 L 10,0 L 7,4" stroke="#e2e8f0" strokeWidth="1.8" fill="none" />
          </g>
        </svg>

        {/* Floating Legends */}
        <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md px-3 py-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1.5 shadow-xl text-slate-300">
          <p className="font-semibold text-slate-400 border-b border-slate-800 pb-1 mb-1.5 uppercase tracking-wider text-[9px]">Map Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 border border-white inline-block"></span>
            <span>Food Restaurants (Pickups)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white inline-block"></span>
            <span>Customer Location (Deliveries)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#0c2d20] border border-[#104a32] block text-[8px] text-center">🌳</span>
            <span>City Parks & Reserves</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-4 h-3 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-orange-500/10 border border-orange-500/20 animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            </div>
            <span className="text-orange-400 font-bold">High Demand Hot Zones</span>
          </div>
        </div>

        {/* Speed Dial HUD */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-2xl">
          <span className="text-[9px] font-bold text-slate-400 px-2 uppercase tracking-wide">Speed:</span>
          <div className="flex gap-0.5">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={`speed-btn-${s}`}
                id={`btn-speed-${s}`}
                onClick={() => {}} // Handle dynamically in parent, but let's see if we pass it, yes props has simulationSpeed
                className="hidden" // Handled properly by simulation control panel, but let's provide styled text overlay if we want
              />
            ))}
            <div className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[11px] font-mono font-black text-yellow-400">{simulationSpeed}X</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
