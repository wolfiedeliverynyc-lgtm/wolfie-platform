import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export function useRestaurantSocket(restaurantId, { onNewOrder, onOrderUpdate } = {}) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    if (!restaurantId) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setConnectionError(null)
      socket.emit('join_restaurant', { restaurant_id: restaurantId })
    })

    socket.on('disconnect', () => setIsConnected(false))
    socket.on('connect_error', (err) => setConnectionError(err.message))

    socket.on('incoming_order', (data) => {
      // Play sound alert
      try { new Audio('/sounds/new-order.mp3').play() } catch(e) {}
      onNewOrder?.(data)
    })

    socket.on('order_status_update', (data) => onOrderUpdate?.(data))

    return () => socket.disconnect()
  }, [restaurantId])

  const emitOrderAccept = useCallback((orderId) => {
    socketRef.current?.emit('order_accept', { order_id: orderId })
  }, [])

  const emitOrderReady = useCallback((orderId) => {
    socketRef.current?.emit('order_ready', { order_id: orderId })
  }, [])

  const emitOrderDelay = useCallback((orderId, minutes) => {
    socketRef.current?.emit('order_delay', { order_id: orderId, delay_minutes: minutes })
  }, [])

  return { isConnected, connectionError, emitOrderAccept, emitOrderReady, emitOrderDelay }
}
