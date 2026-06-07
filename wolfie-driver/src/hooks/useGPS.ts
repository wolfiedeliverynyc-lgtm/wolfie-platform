import { useEffect, useRef, useCallback } from 'react'
import { useDriverStore } from '../store/useDriverStore'

interface GPSOptions {
  onLocation?: (lat: number, lng: number, heading: number) => void
  batteryAware?: boolean
}

export function useGPS({ onLocation, batteryAware = true }: GPSOptions = {}) {
  const { setCurrentLocation, setDriverHeading, isOnline } = useDriverStore()
  const watchId = useRef<number | null>(null)
  const lastPosition = useRef<[number, number] | null>(null)
  const batteryLevel = useRef<number>(100)
  const simulationCleanup = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!batteryAware) return
    if ('getBattery' in navigator) {
      ;(navigator as any).getBattery().then((battery: any) => {
        batteryLevel.current = battery.level * 100
        battery.addEventListener('levelchange', () => {
          batteryLevel.current = battery.level * 100
        })
      })
    }
  }, [batteryAware])

  const smoothPosition = (newLat: number, newLng: number): [number, number] => {
    if (!lastPosition.current) return [newLat, newLng]
    const alpha = 0.7
    return [
      alpha * newLat + (1 - alpha) * lastPosition.current[0],
      alpha * newLng + (1 - alpha) * lastPosition.current[1],
    ]
  }

  const startSimulation = useCallback(() => {
    if (import.meta.env.VITE_ENABLE_DEV_SIMULATION !== 'true') return;
    const interval = setInterval(() => {
      const current = lastPosition.current || [40.718, -73.957]
      const dLat = (Math.random() - 0.5) * 0.0004
      const dLng = (Math.random() - 0.5) * 0.0004
      const newPos: [number, number] = [current[0] + dLat, current[1] + dLng]
      lastPosition.current = newPos
      setCurrentLocation(newPos)
      setDriverHeading(Math.atan2(dLng, dLat) * (180 / Math.PI))
    }, 3000)
    simulationCleanup.current = () => clearInterval(interval)
    return () => clearInterval(interval)
  }, [setCurrentLocation, setDriverHeading])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      if (import.meta.env.VITE_ENABLE_DEV_SIMULATION === 'true') {
        console.warn('GPS: geolocation not available, using simulation')
        startSimulation()
      } else {
        alert('GPS unavailable. Cannot go online.');
        useDriverStore.getState().setOnline(false);
      }
      return
    }

    const maxAge = batteryLevel.current < 20 ? 30000 : 10000

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const rawLat = position.coords.latitude
        const rawLng = position.coords.longitude
        const heading = position.coords.heading ?? 0
        const [smoothLat, smoothLng] = smoothPosition(rawLat, rawLng)

        lastPosition.current = [smoothLat, smoothLng]
        setCurrentLocation([smoothLat, smoothLng])
        setDriverHeading(heading)
        onLocation?.(smoothLat, smoothLng, heading)
      },
      (error) => {
        if (import.meta.env.VITE_ENABLE_DEV_SIMULATION === 'true') {
          console.warn('GPS error:', error.message, '- using simulation fallback')
          startSimulation()
        } else {
          alert('GPS unavailable. Cannot go online.');
          useDriverStore.getState().setOnline(false);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: maxAge,
        timeout: 15000,
      }
    )
  }, [onLocation, setCurrentLocation, setDriverHeading, startSimulation])

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    if (simulationCleanup.current) {
      simulationCleanup.current()
      simulationCleanup.current = null
    }
  }, [])

  useEffect(() => {
    if (!isOnline) return
    startTracking()
    return stopTracking
  }, [isOnline, startTracking, stopTracking])

  return { startTracking, stopTracking }
}
