'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MAPBOX_TOKEN } from '@/lib/constants';

interface TrackingMapProps {
  driverCoords: number[];
  restaurantCoords: number[];
  clientCoords: number[];
  routeCoordinates: number[][];
}

export default function TrackingMap({
  driverCoords,
  restaurantCoords,
  clientCoords,
  routeCoordinates,
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  // Dynamic asset loading
  useEffect(() => {
    if ((window as any).mapboxgl) {
      setMapboxLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => {
      setMapboxLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Map initialization
  useEffect(() => {
    if (!mapboxLoaded || !mapContainerRef.current) return;

    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [
        (restaurantCoords[0] + clientCoords[0]) / 2,
        (restaurantCoords[1] + clientCoords[1]) / 2
      ],
      zoom: 14.5,
      pitch: 35,
      bearing: -17.6
    });

    mapRef.current = map;

    map.on('load', () => {
      // Add Route Source and Layer
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      map.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#EF2A39',
          'line-width': 6,
          'line-dasharray': [1.5, 1.5]
        }
      });

      // Add Restaurant Marker
      const restEl = document.createElement('div');
      restEl.className = 'w-9 h-9 bg-[#EF2A39] border-2 border-white rounded-full shadow-lg flex items-center justify-center';
      restEl.innerHTML = '<span style="font-size: 16px;">🍔</span>';
      new mapboxgl.Marker(restEl)
        .setLngLat(restaurantCoords)
        .addTo(map);

      // Add Client Destination Marker
      const clientEl = document.createElement('div');
      clientEl.className = 'w-9 h-9 bg-black border-2 border-white rounded-full shadow-lg flex items-center justify-center';
      clientEl.innerHTML = '<span style="font-size: 16px;">🏠</span>';
      new mapboxgl.Marker(clientEl)
        .setLngLat(clientCoords)
        .addTo(map);

      // Add Driver Live Marker
      const driverEl = document.createElement('div');
      driverEl.className = 'w-10 h-10 bg-[#FFE100] border-2 border-white rounded-full shadow-lg flex items-center justify-center animate-pulse';
      driverEl.innerHTML = '<span style="font-size: 18px;">🛵</span>';

      const driverMarker = new mapboxgl.Marker(driverEl)
        .setLngLat(driverCoords)
        .addTo(map);

      driverMarkerRef.current = driverMarker;
    });

    return () => {
      map.remove();
    };
  }, [mapboxLoaded]);

  // Update Driver Marker Coordinates dynamically when driverCoords changes
  useEffect(() => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat(driverCoords);
    }
  }, [driverCoords]);

  return (
    <div className="w-full h-full min-h-[50vh] relative">
      <div ref={mapContainerRef} className="w-full h-full min-h-[50vh]" />
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-xs border border-gray-100 px-4 py-2.5 rounded-2xl shadow-sm font-roboto font-bold text-[12.5px] text-[#3C2F2F] pointer-events-none select-none z-10 flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
        <span>GPS Seeding Live Feed</span>
      </div>
    </div>
  );
}
