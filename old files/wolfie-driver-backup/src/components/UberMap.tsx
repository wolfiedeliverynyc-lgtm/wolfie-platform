import { useRef, useEffect } from 'react'
import Map, { Source, Layer, Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

interface UberMapProps {
  pickupCoords?: [number, number]
  dropoffCoords?: [number, number]
  driverCoords?: [number, number]
  routeGeoJSON?: any
  isNavigating?: boolean
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZHVtbXl0b2tlbiIsImEiOiJjbHN1eWVrM2owMG0zMmttaHdkbXh5Z2w5In0.xyz'

export default function UberMap({ pickupCoords, dropoffCoords, driverCoords, routeGeoJSON, isNavigating }: UberMapProps) {
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (mapRef.current && pickupCoords && dropoffCoords && !isNavigating) {
      // Zoom to fit pickup and dropoff when an order is offered
      const bounds = [
        [Math.min(pickupCoords[0], dropoffCoords[0]), Math.min(pickupCoords[1], dropoffCoords[1])],
        [Math.max(pickupCoords[0], dropoffCoords[0]), Math.max(pickupCoords[1], dropoffCoords[1])]
      ]
      mapRef.current.fitBounds(bounds, { padding: 100, duration: 1000 })
    }
  }, [pickupCoords, dropoffCoords, isNavigating])

  useEffect(() => {
    if (mapRef.current && driverCoords && isNavigating) {
      // 3D Navigation mode: Camera follows driver
      mapRef.current.flyTo({
        center: driverCoords,
        zoom: 17,
        pitch: 60,
        duration: 1000,
        essential: true
      })
    }
  }, [driverCoords, isNavigating])

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        longitude: driverCoords?.[0] || -73.9866,
        latitude: driverCoords?.[1] || 40.7128,
        zoom: 14,
        pitch: 0
      }}
      mapStyle="mapbox://styles/mapbox/navigation-night-v1"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Route Line */}
      {routeGeoJSON && (
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer
            id="route-layer"
            type="line"
            paint={{
              'line-color': '#FF5A00',
              'line-width': 5,
              'line-opacity': 0.8
            }}
          />
        </Source>
      )}

      {/* Pickup Marker */}
      {pickupCoords && (
        <Marker longitude={pickupCoords[0]} latitude={pickupCoords[1]} anchor="bottom">
          <div className="w-8 h-8 bg-[#FF5A00] rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold">
            P
          </div>
        </Marker>
      )}

      {/* Dropoff Marker */}
      {dropoffCoords && (
        <Marker longitude={dropoffCoords[0]} latitude={dropoffCoords[1]} anchor="bottom">
          <div className="w-8 h-8 bg-[#3b82f6] rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold">
            D
          </div>
        </Marker>
      )}

      {/* Driver Marker */}
      {driverCoords && (
        <Marker longitude={driverCoords[0]} latitude={driverCoords[1]} anchor="center">
          <div className="w-10 h-10 bg-white rounded-full border-4 border-[#333333] shadow-xl flex items-center justify-center text-2xl animate-hotspot">
            🛵
          </div>
        </Marker>
      )}
    </Map>
  )
}
