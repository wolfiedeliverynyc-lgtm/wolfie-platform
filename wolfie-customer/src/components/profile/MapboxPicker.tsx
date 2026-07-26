'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MapboxPickerProps {
  onConfirm: (address: string, name: string) => void;
  onCancel: () => void;
}

const MAPBOX_TOKEN = 'pk.eyJ1Ijoid29sZmllZGVsaXZlcnkiLCJhIjoiY21vcjV2YW41MXlrYTJxcGhocWtqOGRhayJ9.bDuoURrNHs2QoZQcMBQhCQ';
const DEFAULT_COORDS: [number, number] = [-73.9855, 40.7580]; // Times Square, Manhattan

export default function MapboxPicker({ onConfirm, onCancel }: MapboxPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_COORDS);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState('Loading address...');
  const [selectedName, setSelectedName] = useState('Manhattan Location');

  // Load Mapbox GL JS and CSS from CDN dynamically if not present
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

  // Request browser location
  const requestLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setIsPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const newCoords: [number, number] = [longitude, latitude];
        setCoords(newCoords);
        setGpsLoading(false);
        if (mapRef.current) {
          mapRef.current.flyTo({ center: newCoords, zoom: 15 });
          if (markerRef.current) {
            markerRef.current.setLngLat(newCoords);
          }
        }
        reverseGeocode(longitude, latitude);
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setIsPermissionDenied(true);
          setGpsError('Location access was denied. Please allow location permissions in your browser.');
        } else {
          setGpsError('Could not retrieve your current location.');
        }
        // Even if denied, we stay on DEFAULT_COORDS but show permission warning
        reverseGeocode(coords[0], coords[1]);
      },
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapboxLoaded || !mapContainerRef.current) return;
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: coords,
      zoom: 14,
    });

    mapRef.current = map;

    // Create marker
    const marker = new mapboxgl.Marker({
      draggable: true,
      color: '#EF2A39',
    })
      .setLngLat(coords)
      .addTo(map);

    markerRef.current = marker;

    // Update coordinates on dragend
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setCoords([lngLat.lng, lngLat.lat]);
      reverseGeocode(lngLat.lng, lngLat.lat);
    });

    // Move marker and update coords on click
    map.on('click', (e: any) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      setCoords([lng, lat]);
      reverseGeocode(lng, lat);
    });

    return () => {
      map.remove();
    };
  }, [mapboxLoaded]);

  // Reverse Geocoding
  const reverseGeocode = async (lng: number, lat: number) => {
    setSelectedAddress('Fetching address...');
    setSelectedName('Locating...');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,neighborhood`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const mainFeature = data.features[0];
          const fullAddress = mainFeature.place_name.replace(', United States', '');
          const name = mainFeature.text || 'Dropped Pin';
          setSelectedAddress(fullAddress);
          setSelectedName(name);
        } else {
          setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setSelectedName('Dropped Pin');
        }
      } else {
        setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setSelectedName('Dropped Pin');
      }
    } catch (err) {
      console.error(err);
      setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSelectedName('Dropped Pin');
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-fadeIn">
      {/* Map Container Area */}
      <div className="w-full h-[320px] rounded-[24px] overflow-hidden border border-gray-150 relative bg-gray-50 flex items-center justify-center">
        {(!mapboxLoaded || gpsLoading) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#EF2A39] rounded-full animate-spin" />
            <span className="font-roboto font-bold text-[13.5px] text-[#3C2F2F]">
              {gpsLoading ? 'Locating your address...' : 'Loading map details...'}
            </span>
          </div>
        )}

        {/* Permission Denied Overlay */}
        {isPermissionDenied && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center select-none">
            <span className="text-[28px] mb-2">📍</span>
            <h4 className="font-poppins font-bold text-[16px] text-white">Location Permissions Required</h4>
            <p className="font-roboto text-[12px] text-gray-300 max-w-[280px] mt-1.5 mb-5 leading-relaxed">
              We need location access to center the map. Please change permissions in your browser address bar and try again.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={requestLocation}
                className="px-5 py-2.5 bg-[#FFE100] text-[#3C2F2F] rounded-xl text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Retry GPS Access
              </button>
              <button 
                onClick={() => setIsPermissionDenied(false)}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Pick Manually
              </button>
            </div>
          </div>
        )}

        {/* Mapbox Canvas */}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Selected Location Address Details */}
      <div className="bg-gray-50/70 border border-gray-100 rounded-[20px] p-4 flex gap-3.5 items-center select-none text-left">
        <div className="w-[42px] h-[42px] rounded-xl bg-[#EF2A39]/10 text-[#EF2A39] flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-poppins font-bold text-[14.5px] text-[#3C2F2F] block truncate">{selectedName}</span>
          <span className="font-roboto text-[12.5px] text-[#A6A6A6] block mt-0.5 leading-relaxed truncate">{selectedAddress}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        <button
          onClick={() => onConfirm(selectedAddress, selectedName)}
          disabled={selectedAddress === 'Fetching address...' || selectedAddress === 'Loading address...'}
          className="h-[50px] bg-[#FFE100] hover:brightness-95 active:scale-98 disabled:opacity-50 transition-all rounded-[16px] font-roboto font-bold text-[14.5px] text-[#3C2F2F] cursor-pointer shadow-sm flex items-center justify-center"
        >
          Confirm Location
        </button>
        <button
          onClick={onCancel}
          className="h-[50px] bg-white border border-gray-200 hover:bg-gray-50 active:scale-98 transition-all rounded-[16px] font-roboto font-bold text-[14.5px] text-gray-500 cursor-pointer flex items-center justify-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
