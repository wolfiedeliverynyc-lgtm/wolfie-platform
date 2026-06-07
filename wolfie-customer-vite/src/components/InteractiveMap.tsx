/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Bike, Compass, ZoomIn, ZoomOut, Maximize2, ShieldCheck, Dot } from 'lucide-react';
import { Restaurant, Address, OrderStatus } from '../types';

interface InteractiveMapProps {
  restaurant: Restaurant;
  address: Address;
  status: OrderStatus;
}

export default function InteractiveMap({ restaurant, address, status }: InteractiveMapProps) {
  // Map dimensions and viewport controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Core coordinates inside SVG viewbox (0,0) to (800, 600)
  // Define coordinate points based on the restaurant id to give unique maps
  const getCoordinates = () => {
    switch (restaurant.id) {
      case 'rest_1': // Orchard St
        return {
          rest: { x: 180, y: 440, label: restaurant.name },
          user: { x: 620, y: 160, label: address.label },
          path: [
            { x: 180, y: 440 }, // Restaurant
            { x: 180, y: 320 }, // Corner of Grand & Orchard
            { x: 380, y: 320 }, // Grand & Bowery
            { x: 380, y: 160 }, // Bowery & Houston
            { x: 620, y: 160 }, // Houston & User Home
          ],
        };
      case 'rest_2': // West Broadway
        return {
          rest: { x: 150, y: 150, label: restaurant.name },
          user: { x: 650, y: 420, label: address.label },
          path: [
            { x: 150, y: 150 }, // Restaurant
            { x: 320, y: 150 }, // Broadway & Prince
            { x: 320, y: 300 }, // Broadway & Grand
            { x: 500, y: 300 }, // Lafayette & Grand
            { x: 500, y: 420 }, // Lafayette & Canal
            { x: 650, y: 420 }, // User Home
          ],
        };
      case 'rest_3': // Prince St
        return {
          rest: { x: 250, y: 220, label: restaurant.name },
          user: { x: 580, y: 380, label: address.label },
          path: [
            { x: 250, y: 220 },
            { x: 420, y: 220 },
            { x: 420, y: 380 },
            { x: 580, y: 380 },
          ],
        };
      case 'rest_4': // Lafayette St
      default:
        return {
          rest: { x: 120, y: 380, label: restaurant.name },
          user: { x: 680, y: 220, label: address.label },
          path: [
            { x: 120, y: 380 },
            { x: 300, y: 380 },
            { x: 300, y: 220 },
            { x: 680, y: 220 },
          ],
        };
    }
  };

  const mapConfig = getCoordinates();
  const pathPoints = mapConfig.path;

  // Track rider's current progress coordinate
  const [riderPos, setRiderPos] = useState(pathPoints[0]);
  const [pathPercent, setPathPercent] = useState(0);

  // Calculate moving position based on status
  useEffect(() => {
    let targetPercent = 0;
    switch (status) {
      case 'placed':
        targetPercent = 0;
        break;
      case 'preparing':
        targetPercent = 0.05;
        break;
      case 'cooking':
        targetPercent = 0.15;
        break;
      case 'riding':
        targetPercent = 0.55; // halfway along
        break;
      case 'arriving':
        targetPercent = 0.88; // almost there
        break;
      case 'delivered':
        targetPercent = 1.0; // completed
        break;
    }

    // Smoothly animate current path percent
    let current = pathPercent;
    const interval = setInterval(() => {
      const diff = targetPercent - current;
      if (Math.abs(diff) < 0.005) {
        current = targetPercent;
        setPathPercent(targetPercent);
        clearInterval(interval);
      } else {
        current += diff * 0.12;
        setPathPercent(current);
      }

      // Calculate the active (x,y) along the multi-point path line
      if (pathPoints.length < 2) return;
      const totalSegments = pathPoints.length - 1;
      const positionScaled = current * totalSegments;
      const segmentIdx = Math.min(Math.floor(positionScaled), totalSegments - 1);
      const segmentPercent = positionScaled - segmentIdx;

      const p1 = pathPoints[segmentIdx];
      const p2 = pathPoints[segmentIdx + 1];

      if (p1 && p2) {
        setRiderPos({
          x: p1.x + (p2.x - p1.x) * segmentPercent,
          y: p1.y + (p2.y - p1.y) * segmentPercent,
        });
      }
    }, 45);

    return () => clearInterval(interval);
  }, [status, restaurant.id]);

  // Handle zooming and panning mouse gestures
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y,
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Convert points array to SVG path string
  const getPathDStr = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  };

  // Split path into traversed vs remaining
  const traversedPoints = () => {
    const totalSegments = pathPoints.length - 1;
    const positionScaled = pathPercent * totalSegments;
    const segmentIdx = Math.min(Math.floor(positionScaled), totalSegments - 1);
    
    const pts = pathPoints.slice(0, segmentIdx + 1);
    pts.push(riderPos);
    return pts;
  };

  return (
    <div className="relative w-full h-full bg-slate-50 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 flex flex-col justify-between" id="tracking-map-container">
      {/* Upper Status Banner overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200/50 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-550/10 rounded-lg text-emerald-600 border border-emerald-500/20">
            <Bike className="w-5 h-5 animate-pulse animate-duration-1000" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest flex items-center">
              Active Courier Route
              <Dot className="w-4 h-4 text-emerald-600 animate-ping inline-block -ml-1" />
            </div>
            <div className="text-sm font-medium text-slate-800 flex items-center space-x-1">
              <span>Marcus is </span>
              <span className="text-emerald-700 font-semibold px-1 rounded bg-emerald-50 text-xs uppercase ml-1">
                {status === 'placed' && 'Preparing'}
                {status === 'preparing' && 'Awaiting details'}
                {status === 'cooking' && 'Waiting at restaurant'}
                {status === 'riding' && 'En Route'}
                {status === 'arriving' && 'Arriving Now!'}
                {status === 'delivered' && 'Dispatched / Arrived'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Estimated Transit Time</div>
            <div className="text-sm font-semibold text-slate-800">
              {status === 'delivered' ? 'Completed' : `~${Math.max(2, Math.round(restaurant.deliveryTimeMin * (1 - pathPercent)))} mins`}
            </div>
          </div>
          <div className="p-1 px-2.5 bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-emerald-600 flex items-center space-x-1.5 shadow-sm rounded-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted GPS</span>
          </div>
        </div>
      </div>

      {/* Floating Controls at sidebar */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
        <button
          onClick={() => setZoom(prev => Math.min(prev + 0.2, 2.4))}
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-950 rounded-lg border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Zoom In"
          id="map-zoom-in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.6))}
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-950 rounded-lg border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Zoom Out"
          id="map-zoom-out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={resetView}
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-950 rounded-lg border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Reset Center"
          id="map-center-view"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Interactive Map Vector Layer */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className={`w-full h-full relative cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ userSelect: 'none' }}
      >
        <div
          className="w-full h-full transition-transform duration-75 ease-out origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            viewBox="0 0 800 600"
            className="w-full h-full"
            style={{ minWidth: '800px', minHeight: '600px' }}
          >
            {/* Background Map Styling / Streets Grid */}
            <rect width="800" height="600" fill="#f8fafc" />
            
            {/* Distant street mesh decorations */}
            <g stroke="#e2e8f0" strokeWidth="1.2" opacity="0.4" strokeDasharray="3,3">
              <line x1="100" y1="0" x2="100" y2="600" />
              <line x1="300" y1="0" x2="300" y2="600" />
              <line x1="500" y1="0" x2="500" y2="600" />
              <line x1="700" y1="0" x2="700" y2="600" />
              <line x1="0" y1="100" x2="800" y2="100" />
              <line x1="0" y1="300" x2="800" y2="300" />
              <line x1="0" y1="500" x2="800" y2="500" />
            </g>

            {/* Structured major city streets */}
            <g stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="1">
              {/* Grand Avenue */}
              <line x1="50" y1="320" x2="750" y2="320" />
              {/* Broadway Lane */}
              <line x1="320" y1="50" x2="320" y2="550" />
              {/* Houston Street */}
              <line x1="50" y1="160" x2="750" y2="160" />
              {/* Orchard Boulevard */}
              <line x1="180" y1="50" x2="180" y2="555" />
              {/* Lafayette Lane */}
              <line x1="500" y1="50" x2="500" y2="550" />
              {/* Canal Access Road */}
              <line x1="50" y1="420" x2="750" y2="420" />
            </g>

            {/* Accent inner paths for realistic depth */}
            <g stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
              <line x1="100" y1="220" x2="700" y2="220" />
              <line x1="100" y1="480" x2="700" y2="480" />
              <line x1="420" y1="100" x2="420" y2="500" />
            </g>

            {/* Street Names Labels */}
            <g fill="#94a3b8" fontSize="10" fontFamily="sans-serif" letterSpacing="0.1em" opacity="0.8">
              <text x="330" y="80" transform="rotate(90 330 80)">BROADWAY ST</text>
              <text x="190" y="520" transform="rotate(90 190 520)">ORCHARD RD</text>
              <text x="510" y="90" transform="rotate(90 510 90)">LAFAYETTE LN</text>
              <text x="600" y="150">E HOUSTON ST</text>
              <text x="60" y="310">GRAND AVENUE</text>
              <text x="600" y="415">CANAL BLVD</text>
            </g>

            {/* Complete Routing Track behind the rider */}
            <path
              d={getPathDStr(pathPoints)}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* active route glowing pulse line */}
            <path
              d={getPathDStr(traversedPoints())}
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1 1"
              opacity="0.85"
            />

            <path
              d={getPathDStr(traversedPoints())}
              fill="none"
              stroke="#34d399"
              strokeWidth="5"
              className="stroke-emerald-400"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />

            {/* RESTAURANT PIN AND EMBLEM */}
            <g transform={`translate(${mapConfig.rest.x}, ${mapConfig.rest.y})`}>
              <circle r="22" fill="#ef4444" fillOpacity="0.15" className="animate-ping animate-duration-3000" />
              <circle r="14" fill="#ef4444" fillOpacity="0.3" />
              <circle r="8" fill="#ef4444" />
              <foreignObject x="-24" y="-55" width="48" height="48">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-red-500 text-white p-1.5 rounded-full border border-red-400 shadow-md">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </foreignObject>
              <text x="0" y="18" fill="#ef4444" fontSize="11" fontWeight="bold" textAnchor="middle" filter="drop-shadow(0px 1px 1px rgba(255,255,255,0.8))">
                {restaurant.name.split(' ')[0]}
              </text>
            </g>

            {/* USER HOME PIN AND EMBLEM */}
            <g transform={`translate(${mapConfig.user.x}, ${mapConfig.user.y})`}>
              <circle r="22" fill="#10b981" fillOpacity="0.15" className="animate-ping animate-duration-3000" />
              <circle r="14" fill="#10b981" fillOpacity="0.3" />
              <circle r="8" fill="#10b981" />
              <foreignObject x="-24" y="-55" width="48" height="48">
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-emerald-500 text-white p-1.5 rounded-full border border-emerald-400 shadow-md">
                    <Navigation className="w-4 h-4 rotate-45" />
                  </div>
                </div>
              </foreignObject>
              <text x="0" y="18" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle" filter="drop-shadow(0px 1px 1px rgba(255,255,255,0.8))">
                Delivery Site
              </text>
            </g>

            {/* RIDER MOVING AVATAR / ICON */}
            {status !== 'placed' && (
              <g transform={`translate(${riderPos.x}, ${riderPos.y})`}>
                <circle r="28" fill="#3b82f6" fillOpacity="0.1" className="animate-ping" />
                <circle r="17" fill="#2563eb" fillOpacity="0.25" />
                <rect x="-14" y="-14" width="28" height="28" rx="14" fill="#2563eb" className="stroke-white stroke-2 shadow-xl" />
                <foreignObject x="-14" y="-14" width="28" height="28">
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <Bike className="w-4 h-4" />
                  </div>
                </foreignObject>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Footer statistics info */}
      <div className="bg-white border-t border-slate-200/80 p-4 rounded-b-2xl grid grid-cols-3 gap-2 text-center text-slate-700 z-10">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Route</div>
          <div className="text-sm font-semibold flex items-center justify-center text-slate-800 mt-0.5">
            <Compass className="w-3.5 h-3.5 text-blue-500 mr-1" />
            <span>1.4 miles</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Rider Speed</div>
          <div className="text-sm font-semibold flex items-center justify-center text-slate-800 mt-0.5">
            <Bike className="w-3.5 h-3.5 text-emerald-600 mr-1" />
            <span>{status === 'riding' ? '14 mph' : status === 'arriving' ? '4 mph' : '0 mph'}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Current Node</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5 font-mono truncate px-1">
            {status === 'delivered' ? 'ARRIVED' : `WP-${Math.min(pathPoints.length, Math.max(1, Math.round(pathPercent * pathPoints.length)))}`}
          </div>
        </div>
      </div>
    </div>
  );
}
