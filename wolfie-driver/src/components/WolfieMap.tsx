import { useRef, useEffect, useState, useCallback } from 'react'
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Navigation, Bike, Clock } from 'lucide-react'
import { useDriverStore } from '../store/useDriverStore'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ'

interface WolfieMapProps {
  pickupCoords?: [number, number]
  dropoffCoords?: [number, number]
  isNavigating?: boolean
  showHotspots?: boolean
  showETA?: boolean
  compact?: boolean
  onAutoArrive?: () => void
}

export default function WolfieMap({
  pickupCoords,
  dropoffCoords,
  isNavigating = false,
  showHotspots = true,
  showETA = true,
  compact = false,
  onAutoArrive,
}: WolfieMapProps) {
  const mapRef = useRef<any>(null)
  const { currentLocation, driverHeading, hotspots, routeGeoJSON, setRouteGeoJSON, activeOrders } = useDriverStore()
  const [eta, setEta] = useState<number | null>(null)
  const [routeDistance, setRouteDistance] = useState<number | null>(null)
  const driverCoords: [number, number] = [currentLocation[1], currentLocation[0]] // [lng, lat] for mapbox

  // Fetch route from Mapbox Directions API
  const fetchRoute = useCallback(async (start: [number, number], end: [number, number]) => {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        setRouteGeoJSON({
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        })
        setEta(Math.round(route.duration / 60))
        setRouteDistance(parseFloat((route.distance / 1000).toFixed(1)))
      }
    } catch (err) {
      console.warn('[WolfieMap] Route fetch failed:', err)
    }
  }, [setRouteGeoJSON])

  // Fetch route when pickup/dropoff changes
  useEffect(() => {
    const target = isNavigating
      ? dropoffCoords
      : pickupCoords

    if (target && currentLocation) {
      const driverLngLat: [number, number] = [currentLocation[1], currentLocation[0]]
      fetchRoute(driverLngLat, [target[1], target[0]])
    }
  }, [pickupCoords, dropoffCoords, isNavigating, fetchRoute])

  // Fit bounds when showing both pickup and dropoff
  useEffect(() => {
    if (mapRef.current && pickupCoords && dropoffCoords && !isNavigating) {
      const allLngs = [currentLocation[1], pickupCoords[1], dropoffCoords[1]]
      const allLats = [currentLocation[0], pickupCoords[0], dropoffCoords[0]]
      mapRef.current.fitBounds(
        [
          [Math.min(...allLngs) - 0.005, Math.min(...allLats) - 0.005],
          [Math.max(...allLngs) + 0.005, Math.max(...allLats) + 0.005],
        ],
        { padding: 60, duration: 1000 }
      )
    }
  }, [pickupCoords, dropoffCoords, isNavigating, currentLocation])

  // 3D navigation follow mode
  useEffect(() => {
    if (mapRef.current && isNavigating && currentLocation) {
      mapRef.current.flyTo({
        center: [currentLocation[1], currentLocation[0]],
        zoom: 16.5,
        pitch: 55,
        bearing: driverHeading,
        duration: 1200,
        essential: true,
      })
    }
  }, [currentLocation, isNavigating, driverHeading])

  // Auto-arrive detection
  useEffect(() => {
    if (!onAutoArrive || !currentLocation) return
    const target = isNavigating ? dropoffCoords : pickupCoords
    if (!target) return

    const dist = Math.sqrt(
      Math.pow(currentLocation[0] - target[0], 2) +
      Math.pow(currentLocation[1] - target[1], 2)
    )
    // ~50 meters threshold
    if (dist < 0.0005) {
      onAutoArrive()
    }
  }, [currentLocation, pickupCoords, dropoffCoords, isNavigating, onAutoArrive])

  // Hotspot GeoJSON for rendering circles
  const hotspotGeoJSON = {
    type: 'FeatureCollection' as const,
    features: (hotspots || []).map((h) => ({
      type: 'Feature' as const,
      properties: {
        intensity: h.intensity,
        label: h.label,
        surge: h.surgeMultiplier,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [h.coords[1], h.coords[0]],
      },
    })),
  }

  return (
    <div className={`relative w-full ${compact ? 'h-36' : 'h-full min-h-[280px]'} rounded-2xl overflow-hidden border border-slate-850`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: currentLocation[1] || -73.957,
          latitude: currentLocation[0] || 40.718,
          zoom: 14,
          pitch: 0,
        }}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={true} showZoom={!compact} />

        {/* Route Line */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-casing"
              type="line"
              paint={{
                'line-color': '#1a1a2e',
                'line-width': 10,
                'line-opacity': 0.6,
              }}
            />
            <Layer
              id="route-main"
              type="line"
              paint={{
                'line-color': '#ff5500',
                'line-width': 5,
                'line-opacity': 0.9,
              }}
            />
          </Source>
        )}

        {/* Hotspot Circles */}
        {showHotspots && hotspots && hotspots.length > 0 && (
          <Source id="hotspots" type="geojson" data={hotspotGeoJSON}>
            <Layer
              id="hotspot-circles"
              type="circle"
              paint={{
                'circle-radius': 40,
                'circle-color': '#ff5500',
                'circle-opacity': 0.12,
                'circle-stroke-color': '#ff5500',
                'circle-stroke-width': 1.5,
                'circle-stroke-opacity': 0.3,
              }}
            />
          </Source>
        )}

        {/* Restaurant/Pickup Marker */}
        {pickupCoords && (
          <Marker longitude={pickupCoords[1]} latitude={pickupCoords[0]} anchor="bottom">
            <div className="flex flex-col items-center animate-bounce-in">
              <div className="w-9 h-9 bg-[#ff5500] rounded-xl border-[3px] border-white shadow-lg shadow-orange-500/30 flex items-center justify-center text-white">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="w-2 h-2 bg-[#ff5500] rounded-full mt-0.5 shadow-sm" />
            </div>
          </Marker>
        )}

        {/* Customer/Dropoff Marker */}
        {dropoffCoords && (
          <Marker longitude={dropoffCoords[1]} latitude={dropoffCoords[0]} anchor="bottom">
            <div className="flex flex-col items-center animate-bounce-in" style={{ animationDelay: '0.15s' }}>
              <div className="w-9 h-9 bg-emerald-500 rounded-xl border-[3px] border-white shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-0.5 shadow-sm" />
            </div>
          </Marker>
        )}

        {/* Driver Marker */}
        {currentLocation && (
          <Marker longitude={currentLocation[1]} latitude={currentLocation[0]} anchor="center">
            <div className="relative">
              {/* Pulse ring */}
              <div className="absolute inset-[-8px] rounded-full bg-[#ff5500]/15 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-[-4px] rounded-full bg-[#ff5500]/25" />
              <div
                className="w-10 h-10 bg-[#0b0c1e] rounded-full border-[3px] border-[#ff5500] shadow-xl shadow-orange-500/40 flex items-center justify-center text-xl relative z-10"
                style={{ transform: `rotate(${driverHeading}deg)` }}
              >
                🛵
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* ETA / Distance HUD Overlay */}
      {showETA && eta !== null && (
        <div className="absolute top-3 left-3 z-10 bg-[#0b0c1e]/90 backdrop-blur-md border border-slate-850 rounded-2xl px-3.5 py-2 flex items-center gap-3 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#ff5500]" />
            <span className="text-xs font-extrabold text-slate-100 font-mono">{eta} min</span>
          </div>
          {routeDistance && (
            <>
              <div className="w-px h-4 bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-extrabold text-slate-100 font-mono">{routeDistance} km</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Speed indicator */}
      {isNavigating && (
        <div className="absolute bottom-3 left-3 z-10 bg-[#0b0c1e]/90 backdrop-blur-md border border-slate-850 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <Bike className="w-3.5 h-3.5 text-[#ff5500]" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Navigating</span>
        </div>
      )}
    </div>
  )
}
