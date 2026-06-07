import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDriverStore } from '../store/useDriverStore'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const { setNetworkStatus, isOnline, currentState, updateOrderStatus, currentLocation, queueAction } = useDriverStore()

  useEffect(() => {
    // We only connect if the driver toggles Online
    if (!isOnline) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    if (!socketRef.current) {
      // Direct connection to the backend telemetry server
      const socket = io('http://localhost:5000', {
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
      })

      socket.on('connect', () => {
        console.log('Telemetry feed connected')
        setNetworkStatus('online')
      })

      socket.on('disconnect', () => {
        console.log('Telemetry feed offline')
        setNetworkStatus('offline')
      })

      socket.on('order_status_update', (data: any) => {
        if (data && data.order_id && data.status) {
          updateOrderStatus(data.order_id, data.status)
        }
      })

      socketRef.current = socket
    }

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [isOnline, setNetworkStatus, updateOrderStatus])

  // Periodic heartbeat / location push
  useEffect(() => {
    if (!isOnline || !socketRef.current || !currentLocation) return

    const interval = setInterval(() => {
      // For active tracking, emit driver_location_update
      socketRef.current?.emit('driver_location_update', {
        driver_id: 'drv_001', // TODO: dynamic from auth
        lat: currentLocation[0],
        lng: currentLocation[1],
        // if actively assigned/delivering, pass order_id
        // order_id: activeOrders[0]?.id
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [isOnline, currentLocation])

  // Function to simulate backend fallback in case of no socket
  const simulateDispatch = (mockPayload: any) => {
    console.log('Simulation dispatch triggered')
    // Handled in components
  }

  return {
    socket: socketRef.current,
    simulateDispatch
  }
}
