import { useState, useEffect } from 'react'
import { useDriverStore } from '../store/useDriverStore'
import { MapPin, Navigation, Map as MapIcon, Phone, MessageCircle, CheckCircle, Navigation as NavIcon, ChevronRight, ArrowRight } from 'lucide-react'
import UberMap from '../components/UberMap'
import IncomingOrderNotification from '../components/IncomingOrderNotification'
import { motion, AnimatePresence } from 'framer-motion'

type DeliveryState = 'idle' | 'navigating_pickup' | 'arrived' | 'picked_up' | 'navigating_dropoff' | 'delivered'

export default function Home() {
  const { isOnline, setOnline } = useDriverStore()
  
  // Simulation states
  const [showIncoming, setShowIncoming] = useState(false)
  const [deliveryState, setDeliveryState] = useState<DeliveryState>('idle')
  const [currentOrder, setCurrentOrder] = useState<any>(null)

  const simulateOrder = () => {
    setCurrentOrder({
      id: '#WF-2024-0587',
      pay: 8.75,
      basePay: 6.00,
      distancePay: 1.75,
      tip: 1.00,
      restaurantName: 'Pizza Palace',
      restaurantAddress: '150 W 33rd St, NY 10001',
      customerName: 'John Smith',
      customerAddress: '125 W 34th St, NY 10001',
      items: '2 items',
      pickupCoords: [-73.988, 40.748],
      dropoffCoords: [-73.992, 40.752],
      driverCoords: [-73.985, 40.745]
    })
    setShowIncoming(true)
  }

  const handleAccept = () => {
    setShowIncoming(false)
    setDeliveryState('navigating_pickup')
  }

  const [realRoute, setRealRoute] = useState<any>(null)

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoiZHVtbXl0b2tlbiIsImEiOiJjbHN1eWVrM2owMG0zMmttaHdkbXh5Z2w5In0.xyz'

  // Fetch real route from Mapbox Directions API
  const fetchRealRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
      )
      const json = await query.json()
      const data = json.routes[0]
      const route = data.geometry
      setRealRoute({
        type: 'Feature',
        properties: {},
        geometry: route
      })
    } catch (err) {
      console.error('Error fetching real route:', err)
    }
  }

  // Trigger route fetch when state changes
  useEffect(() => {
    if (!currentOrder) return

    if (showIncoming) {
      fetchRealRoute(currentOrder.pickupCoords, currentOrder.dropoffCoords)
    } else if (deliveryState === 'navigating_pickup' || deliveryState === 'arrived') {
      fetchRealRoute(currentOrder.driverCoords, currentOrder.pickupCoords)
    } else if (deliveryState === 'navigating_dropoff' || deliveryState === 'picked_up') {
      fetchRealRoute(currentOrder.pickupCoords, currentOrder.dropoffCoords)
    }
  }, [showIncoming, deliveryState, currentOrder])

  if (!isOnline) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#0A0A0A] p-6 text-center">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-32 h-32 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,90,0,0.15)] border border-[#FF5A00]/20">
            <span className="text-4xl">🐺</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-wide uppercase">Wolfie <span className="text-[#FF5A00]">Driver</span></h1>
          <p className="text-[#A0A0A0] text-lg">Deliver fast. Earn more.</p>
        </div>
        
        <div className="w-full max-w-sm mb-8 relative bg-[#1A1A1A] rounded-full h-16 border border-[#333333] flex items-center px-2 overflow-hidden group">
          <button 
            onClick={() => setOnline(true)}
            className="w-full h-full absolute inset-0 flex items-center justify-center text-[#FF5A00] font-bold text-lg tracking-wider"
          >
            Go Online
          </button>
        </div>
      </div>
    )
  }

  // Active Map View (When an order is being offered or navigating)
  if (showIncoming || deliveryState !== 'idle') {
    const isNavigating = deliveryState === 'navigating_pickup' || deliveryState === 'navigating_dropoff'
    
    return (
      <div className="relative w-full h-full bg-[#0A0A0A] overflow-hidden">
        {showIncoming && (
          <IncomingOrderNotification 
            order={currentOrder}
            onAccept={handleAccept}
            onDecline={() => { setShowIncoming(false); setDeliveryState('idle') }}
          />
        )}
        
        <div className="absolute inset-0 z-0">
          <UberMap 
            pickupCoords={currentOrder?.pickupCoords}
            dropoffCoords={currentOrder?.dropoffCoords}
            driverCoords={currentOrder?.driverCoords}
            routeGeoJSON={realRoute}
            isNavigating={isNavigating}
          />
        </div>

        {/* Top Floating Banner */}
        {isNavigating && (
          <div className="absolute top-4 left-4 right-4 z-10 bg-[#151515]/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-[#333333] flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF5A00] text-white p-2 rounded-lg">
                <Navigation size={20} className="transform rotate-45" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">
                  {deliveryState === 'navigating_pickup' ? 'Heading to Pickup' : 'Heading to Customer'}
                </h2>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Bottom Sheet */}
        <AnimatePresence>
          {deliveryState !== 'idle' && !showIncoming && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-20 bg-[#151515] rounded-t-3xl border-t border-[#333333] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-[#333333] rounded-full mx-auto my-3"></div>
              
              <div className="p-5 pt-2">
                {/* STATE 1: Navigating to Pickup */}
                {deliveryState === 'navigating_pickup' && (
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-[#FF5A00]/20 rounded-full flex items-center justify-center text-[#FF5A00]">
                        <MapPin size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">{currentOrder.restaurantName}</h3>
                        <p className="text-[#A3A3A3] text-sm">{currentOrder.restaurantAddress}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mb-6">
                      <div className="flex-1">
                        <p className="text-white font-bold text-xl">1.2 km</p>
                        <p className="text-[#A3A3A3] text-sm">5 min away</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 py-3 bg-[#222222] rounded-xl text-white font-bold flex justify-center items-center gap-2">
                        <Phone size={18} /> Call Store
                      </button>
                      <button 
                        onClick={() => setDeliveryState('arrived')}
                        className="flex-[2] py-3 bg-[#FF5A00] rounded-xl text-white font-bold flex justify-center items-center gap-2"
                      >
                        <NavIcon size={18} /> Arrived
                      </button>
                    </div>
                  </>
                )}

                {/* STATE 2: Arrived at Restaurant */}
                {deliveryState === 'arrived' && (
                  <>
                    <div className="flex items-center gap-2 text-[#28A745] font-bold mb-4">
                      <CheckCircle size={20} /> Arrived at Restaurant
                    </div>
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#222222] mb-6">
                      <p className="text-[#737373] text-xs uppercase mb-2">Order Information</p>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#A3A3A3]">Order ID</span>
                        <span className="text-white font-mono">{currentOrder.id}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[#A3A3A3]">Customer</span>
                        <span className="text-white">{currentOrder.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A3A3A3]">Items</span>
                        <span className="text-white">{currentOrder.items}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setDeliveryState('picked_up')}
                      className="w-full py-4 bg-[#28A745] rounded-xl text-white font-bold text-lg mb-2"
                    >
                      Confirm Arrival
                    </button>
                    <p className="text-center text-[#A3A3A3] text-xs">Waiting for order? <span className="text-[#FF5A00]">Tell us</span></p>
                  </>
                )}

                {/* STATE 3: Order Picked Up */}
                {deliveryState === 'picked_up' && (
                  <div className="text-center py-4">
                    <div className="w-20 h-20 bg-[#28A745]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#28A745]">
                      <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Order Picked Up!</h2>
                    <p className="text-[#A3A3A3] mb-6">Now deliver to the customer</p>
                    <button 
                      onClick={() => setDeliveryState('navigating_dropoff')}
                      className="w-full py-4 bg-[#FF5A00] rounded-xl text-white font-bold text-lg"
                    >
                      Start Delivery
                    </button>
                  </div>
                )}

                {/* STATE 4: Navigating to Dropoff */}
                {deliveryState === 'navigating_dropoff' && (
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-[#3b82f6]/20 rounded-full flex items-center justify-center text-[#3b82f6]">
                        <MapPin size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg">{currentOrder.customerName}</h3>
                        <p className="text-[#A3A3A3] text-sm">{currentOrder.customerAddress}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mb-6">
                      <div className="flex-1">
                        <p className="text-white font-bold text-xl">2.9 km</p>
                        <p className="text-[#A3A3A3] text-sm">8 min away</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-xl">10:24 AM</p>
                        <p className="text-[#A3A3A3] text-sm">Estimated Arrival</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 py-3 bg-[#222222] rounded-xl text-white font-bold flex justify-center items-center gap-2">
                        <MessageCircle size={18} /> Chat
                      </button>
                      <button 
                        onClick={() => setDeliveryState('delivered')}
                        className="flex-[2] py-3 bg-[#FF5A00] rounded-xl text-white font-bold flex justify-center items-center gap-2"
                      >
                        <CheckCircle size={18} /> Complete Dropoff
                      </button>
                    </div>
                  </>
                )}

                {/* STATE 5: Delivered Success */}
                {deliveryState === 'delivered' && (
                  <div className="text-center py-2">
                    <div className="w-16 h-16 bg-[#28A745] rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-[0_0_30px_rgba(40,167,69,0.5)]">
                      <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">Awesome! 🎉</h2>
                    <p className="text-[#A3A3A3] text-sm mb-6">Order has been delivered</p>
                    
                    <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#222222] mb-6 text-left">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-white font-bold">You Earned</span>
                        <span className="text-[#28A745] font-bold text-xl">${currentOrder.pay.toFixed(2)}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#A3A3A3]">Base Pay</span>
                          <span className="text-white">${currentOrder.basePay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A3A3A3]">Distance Pay</span>
                          <span className="text-white">${currentOrder.distancePay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A3A3A3]">Tip</span>
                          <span className="text-[#28A745]">+${currentOrder.tip.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setDeliveryState('idle')}
                      className="w-full py-4 bg-[#FF5A00] rounded-xl text-white font-bold text-lg flex justify-center items-center gap-2"
                    >
                      Complete <ArrowRight size={20} />
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Standard Online Dashboard
  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] overflow-y-auto">
      <div className="pt-12 pb-4 px-6 flex justify-between items-center">
        <button onClick={simulateOrder} className="p-2 bg-[#1A1A1A] rounded-full text-[#FF5A00]"><MapIcon size={20} /></button>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <div className="w-2 h-2 rounded-full bg-[#28A745] animate-pulse"></div>
          <span className="text-[#28A745]">You're Online</span>
        </div>
        <div className="p-2 text-white"></div>
      </div>

      <div className="px-6 pb-20">
        <div className="bg-[#151515] rounded-2xl p-6 border border-[#222222] mb-6 shadow-xl">
          <p className="text-[#A3A3A3] text-sm mb-1">Today's Earnings</p>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-4xl font-bold text-white">$128.45</h2>
            <div className="text-xs font-bold text-[#28A745] bg-[#28A745]/20 px-2 py-1 rounded">▲ 14%</div>
          </div>
          <p className="text-[#737373] text-sm mb-6">4 Orders Completed</p>
          
          <div className="flex gap-4">
            <div className="flex-1 bg-[#1A1A1A] rounded-xl p-3 text-center border border-[#222222]">
              <p className="text-[#A3A3A3] text-[10px] uppercase tracking-wider mb-1">Online</p>
              <p className="text-white font-bold">4h 32m</p>
            </div>
            <div className="flex-1 bg-[#1A1A1A] rounded-xl p-3 text-center border border-[#222222]">
              <p className="text-[#A3A3A3] text-[10px] uppercase tracking-wider mb-1">Active</p>
              <p className="text-white font-bold">3h 12m</p>
            </div>
            <div className="flex-1 bg-[#1A1A1A] rounded-xl p-3 text-center border border-[#222222]">
              <p className="text-[#A3A3A3] text-[10px] uppercase tracking-wider mb-1">Accept</p>
              <p className="text-white font-bold">92%</p>
            </div>
          </div>
        </div>

        <button 
          onClick={simulateOrder}
          className="w-full py-4 mb-4 bg-[#1A1A1A] border border-[#FF5A00] rounded-xl text-[#FF5A00] font-bold flex justify-center items-center"
        >
          Simulate Incoming Order
        </button>

        <button 
          onClick={() => setOnline(false)}
          className="w-full py-4 bg-[#151515] border border-[#333333] rounded-xl text-white font-bold flex justify-center items-center"
        >
          Switch to Offline
        </button>
      </div>
    </div>
  )
}
