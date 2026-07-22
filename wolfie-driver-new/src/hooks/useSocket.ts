import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDriverStore } from '../store/useDriverStore'

// Haversine formula to calculate distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const lastSentCoordsRef = useRef<[number, number] | null>(null)
  const lastSentTimeRef = useRef<number>(0)
  const { setNetworkStatus, isOnline, updateOrderStatus, currentLocation, queueAction, updateWallet, token } = useDriverStore()

  useEffect(() => {
    if (!isOnline) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    if (!socketRef.current) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const socket = io(socketUrl, {
        transports: ['websocket'],
        auth: { token },
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 15
      })

      socket.on('connect', () => {
        console.log('[Wolfie] Telemetry feed connected')
        setNetworkStatus('online')
      })

      socket.on('disconnect', () => {
        console.log('[Wolfie] Telemetry feed offline')
        setNetworkStatus('offline')
      })

      socket.io.on('reconnect', () => {
        console.log('[Wolfie] Telemetry feed reconnected')
        setNetworkStatus('online')
      })

      socket.on('connect_error', (error: any) => {
        console.warn('[Wolfie] Socket connection error:', error)
        setNetworkStatus('offline')
      })

      socket.on('order_status_update', (data: any) => {
        if (data && data.order_id && data.status) {
          updateOrderStatus(data.order_id, data.status)
        }
      })

      socket.on('wallet_update', (data: any) => {
        if (data) {
          updateWallet(data)
        }
      })

      socket.on('new_order', (data: any) => {
        if (data) {
          const store = useDriverStore.getState()
          if (store.lifecycleState === 'available' || store.lifecycleState === 'online') {
            store.setPendingOffer({
              order: data,
              expiresAt: Date.now() + 30000,
            })
            store.setLifecycleState('offer_received')
          }
        }
      })

      socket.on('hotspot_update', (data: any) => {
        if (data && Array.isArray(data)) {
          useDriverStore.getState().setHotspots(data)
        }
      })

      socketRef.current = socket
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [isOnline, setNetworkStatus, updateOrderStatus, updateWallet])

  // Periodic heartbeat / location push
  useEffect(() => {
    if (!isOnline || !socketRef.current || !currentLocation) return

    const interval = setInterval(() => {
      const store = useDriverStore.getState()
      const lat = currentLocation[0]
      const lng = currentLocation[1]
      const now = Date.now()

      let shouldSend = false

      if (!lastSentCoordsRef.current) {
        // Send initial coordinates
        shouldSend = true
      } else {
        const [lastLat, lastLng] = lastSentCoordsRef.current
        const distance = getDistanceMeters(lastLat, lastLng, lat, lng)
        const timeElapsed = now - lastSentTimeRef.current

        // Send if moved > 10 meters OR if 30 seconds have passed (heartbeat)
        if (distance >= 10 || timeElapsed >= 30000) {
          shouldSend = true
        }
      }

      if (shouldSend) {
        socketRef.current?.emit('driver_location_update', {
          driver_id: store.driverProfile?.email || 'drv_001',
          lat,
          lng,
          state: store.lifecycleState,
          order_id: store.activeOrders[0]?.id,
        })
        lastSentCoordsRef.current = [lat, lng]
        lastSentTimeRef.current = now
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isOnline, currentLocation])

  return {
    socket: socketRef.current,
    emit: (event: string, data: any) => socketRef.current?.emit(event, data),
  }
}
