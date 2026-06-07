import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDriverStore } from '../store/useDriverStore'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { setNetworkStatus, isOnline, updateOrderStatus, currentLocation, queueAction, updateWallet } = useDriverStore()

  useEffect(() => {
    if (!isOnline) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    if (!socketRef.current) {
      const socket = io('http://localhost:5000', {
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
      })

      socket.on('connect', () => {
        console.log('[Wolfie] Telemetry feed connected')
        setNetworkStatus('online')
      })

      socket.on('disconnect', () => {
        console.log('[Wolfie] Telemetry feed offline')
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
      socketRef.current?.emit('driver_location_update', {
        driver_id: store.driverProfile?.email || 'drv_001',
        lat: currentLocation[0],
        lng: currentLocation[1],
        state: store.lifecycleState,
        order_id: store.activeOrders[0]?.id,
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [isOnline, currentLocation])

  return {
    socket: socketRef.current,
    emit: (event: string, data: any) => socketRef.current?.emit(event, data),
  }
}
