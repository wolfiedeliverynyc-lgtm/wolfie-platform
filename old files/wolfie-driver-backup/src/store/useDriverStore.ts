import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DriverState =
  | 'offline'
  | 'online_available'
  | 'reserved_for_order'
  | 'heading_to_restaurant'
  | 'waiting_pickup'
  | 'picked_up'
  | 'delivering'
  | 'stacked_delivery'
  | 'paused'
  | 'emergency'
  | 'support_required'

export interface OrderItem {
  name: string
  quantity: number
  price?: number
}

export interface ActiveOrder {
  id: string
  orderNumber: string
  restaurantId: string
  restaurantName: string
  restaurantCoords: [number, number]
  restaurantAddress: string
  customerId: string
  customerName: string
  customerCoords: [number, number]
  customerAddress: string
  customerInstructions: string
  payout: number
  tip: number
  distanceKm: number
  estimatedMinutes: number
  items: OrderItem[]
  status: string
  etaMinutes: number
  acceptedAt: string | null
  priority: 'normal' | 'priority' | 'urgent'
  surgeMultiplier: number
  slaDeadline: string | null
}

export interface PendingOffer {
  order: ActiveOrder
  expiresAt: number
  declineReasons?: string[]
}

export interface Hotspot {
  id: string
  coords: [number, number]
  label: string
  intensity: number // 0-1
  surgeMultiplier: number
  predictedOrders: number
}

export interface IntelligenceAlert {
  id: string
  type: 'reposition' | 'surge' | 'sla_risk' | 'efficiency' | 'forecast'
  title: string
  message: string
  timestamp: string
  actionLabel?: string
  coords?: [number, number]
}

export interface CompletedTrip {
  id: string
  restaurantName: string
  payout: number
  tip: number
  distanceKm: number
  durationMin: number
  completedAt: string
}

interface DriverMetrics {
  rating: number
  acceptanceRate: number
  completionRate: number
  todayEarnings: number
  todayTips: number
  todayBonuses: number
  activeMinutes: number
  idleMinutes: number
  tripsCompleted: number
  currentStreak: number
  bestStreak: number
  hourlyRate: number
  utilizationPercent: number
  onlineSince: string | null
}

interface OutboxAction {
  id: string
  type: string
  payload: any
  timestamp: string
  retries: number
}

interface DriverStore {
  // Core State
  currentState: DriverState
  isOnline: boolean
  activeTab: string

  // Realtime Active Context
  activeOrders: ActiveOrder[]
  pendingOffer: PendingOffer | null
  currentLocation: [number, number]
  driverHeading: number

  // Operational Intelligence
  hotspots: Hotspot[]
  intelligenceAlerts: IntelligenceAlert[]
  nearbyDriverCount: number
  demandLevel: 'low' | 'moderate' | 'high' | 'surge'
  weatherCondition: 'clear' | 'rain' | 'snow' | 'wind'

  // History
  completedTrips: CompletedTrip[]

  // Metrics & Stats
  metrics: DriverMetrics

  // Offline & Safety
  batteryLevel: number
  networkStatus: 'online' | 'degraded' | 'offline'
  networkLatency: number
  gpsAccuracy: number
  outboxQueue: OutboxAction[]

  // Incident
  incidentOpen: boolean

  // KYC & Onboarding
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected'
  onboarded: boolean
  driverProfile: { name: string; email: string; phone: string; vehicleType: string; vehiclePlate?: string; vehicleModel?: string; profilePhoto?: string } | null

  // Actions
  setState: (state: DriverState) => void
  setOnline: (online: boolean) => void
  setActiveTab: (tab: string) => void
  setCurrentLocation: (loc: [number, number]) => void
  setDriverHeading: (heading: number) => void
  addActiveOrder: (order: ActiveOrder) => void
  removeActiveOrder: (orderId: string) => void
  updateOrderStatus: (orderId: string, status: string) => void
  setPendingOffer: (offer: PendingOffer | null) => void
  addCompletedTrip: (trip: CompletedTrip) => void
  addEarnings: (amount: number, tip: number) => void
  incrementTrips: () => void

  // Intelligence
  setHotspots: (hotspots: Hotspot[]) => void
  addIntelligenceAlert: (alert: IntelligenceAlert) => void
  dismissAlert: (id: string) => void
  setDemandLevel: (level: 'low' | 'moderate' | 'high' | 'surge') => void
  setWeather: (w: 'clear' | 'rain' | 'snow' | 'wind') => void

  // Incident & Outbox
  setIncidentOpen: (open: boolean) => void
  queueAction: (type: string, payload: any) => void
  clearOutbox: () => void

  setNetworkStatus: (status: 'online' | 'degraded' | 'offline') => void
  setNetworkLatency: (ms: number) => void
  setBatteryLevel: (level: number) => void
  setGpsAccuracy: (m: number) => void
  setKycStatus: (status: 'not_started' | 'pending' | 'approved' | 'rejected') => void
  setOnboarded: (onboarded: boolean) => void
  setDriverProfile: (profile: any) => void
}

// ─── Mock Data ───────────────────────────────────────────
const MOCK_HOTSPOTS: Hotspot[] = [
  { id: 'h1', coords: [40.7142, -73.9614], label: 'Williamsburg Core', intensity: 0.9, surgeMultiplier: 1.8, predictedOrders: 14 },
  { id: 'h2', coords: [40.7223, -73.9516], label: 'Greenpoint', intensity: 0.6, surgeMultiplier: 1.3, predictedOrders: 7 },
  { id: 'h3', coords: [40.7081, -73.9571], label: 'South Side', intensity: 0.75, surgeMultiplier: 1.5, predictedOrders: 9 },
  { id: 'h4', coords: [40.7185, -73.9565], label: 'Bedford Ave', intensity: 0.85, surgeMultiplier: 1.6, predictedOrders: 11 },
]

const MOCK_ALERTS: IntelligenceAlert[] = [
  { id: 'ia1', type: 'surge', title: 'Surge Active', message: 'Williamsburg Core 1.8x — high demand next 15 min', timestamp: new Date().toISOString(), coords: [40.7142, -73.9614] },
  { id: 'ia2', type: 'reposition', title: 'Reposition', message: 'Move to Bedford Ave for +40% order probability', timestamp: new Date().toISOString(), actionLabel: 'Navigate', coords: [40.7185, -73.9565] },
  { id: 'ia3', type: 'forecast', title: 'Lunch Rush', message: 'Peak demand predicted 12:00–13:30 in your zone', timestamp: new Date().toISOString() },
]

const MOCK_COMPLETED: CompletedTrip[] = [
  { id: 'ct1', restaurantName: 'Wolfie Burgers', payout: 8.50, tip: 3.00, distanceKm: 1.8, durationMin: 14, completedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'ct2', restaurantName: 'Sushi Palace', payout: 11.25, tip: 5.00, distanceKm: 3.2, durationMin: 22, completedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'ct3', restaurantName: 'Pizza Roma', payout: 6.75, tip: 2.50, distanceKm: 1.1, durationMin: 11, completedAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'ct4', restaurantName: 'Thai Express', payout: 9.00, tip: 4.00, distanceKm: 2.5, durationMin: 18, completedAt: new Date(Date.now() - 14400000).toISOString() },
]

export const useDriverStore = create<DriverStore>()(
  persist(
    (set) => ({
      currentState: 'offline',
      isOnline: false,
      activeTab: 'home',

      activeOrders: [],
      pendingOffer: null,
      currentLocation: [40.7180, -73.9570],
      driverHeading: 45,

      hotspots: MOCK_HOTSPOTS,
      intelligenceAlerts: MOCK_ALERTS,
      nearbyDriverCount: 8,
      demandLevel: 'high',
      weatherCondition: 'clear',

      completedTrips: MOCK_COMPLETED,

      metrics: {
        rating: 4.95,
        acceptanceRate: 94,
        completionRate: 99,
        todayEarnings: 35.50,
        todayTips: 14.50,
        todayBonuses: 5.00,
        activeMinutes: 142,
        idleMinutes: 38,
        tripsCompleted: 4,
        currentStreak: 4,
        bestStreak: 12,
        hourlyRate: 22.80,
        utilizationPercent: 79,
        onlineSince: null,
      },

      batteryLevel: 72,
      networkStatus: 'online',
      networkLatency: 34,
      gpsAccuracy: 4.2,
      outboxQueue: [],
      incidentOpen: false,

      // KYC & Onboarding Default State
      kycStatus: 'approved',
      onboarded: true,
      driverProfile: {
        name: 'Alex Rider',
        email: 'alex@wolfie.delivery',
        phone: '+1 (555) 019-2834',
        vehicleType: 'Motorcycle',
        vehiclePlate: 'NY-8849C',
        vehicleModel: 'Vespa GTS 300',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'
      },

      // ─── Actions ─────────────────────────────────
      setState: (state) => set({ currentState: state }),
      setOnline: (online) => set((s) => ({
        isOnline: online,
        currentState: online ? 'online_available' : 'offline',
        ...(online ? {
          metrics: {
            ...s.metrics,
            onlineSince: new Date().toISOString(),
          }
        } : {}),
      })),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      setDriverHeading: (heading) => set({ driverHeading: heading }),

      addActiveOrder: (order) => set((s) => ({ activeOrders: [...s.activeOrders, order] })),
      removeActiveOrder: (orderId) => set((s) => ({ activeOrders: s.activeOrders.filter(o => o.id !== orderId) })),
      updateOrderStatus: (orderId, status) => set((s) => ({
        activeOrders: s.activeOrders.map(o => o.id === orderId ? { ...o, status } : o)
      })),

      setPendingOffer: (offer) => set({ pendingOffer: offer }),

      addCompletedTrip: (trip) => set((s) => ({ completedTrips: [trip, ...s.completedTrips] })),
      addEarnings: (amount, tip) => set((s) => ({
        metrics: {
          ...s.metrics,
          todayEarnings: s.metrics.todayEarnings + amount,
          todayTips: s.metrics.todayTips + tip,
        }
      })),
      incrementTrips: () => set((s) => ({
        metrics: {
          ...s.metrics,
          tripsCompleted: s.metrics.tripsCompleted + 1,
          currentStreak: s.metrics.currentStreak + 1,
        }
      })),

      setHotspots: (hotspots) => set({ hotspots }),
      addIntelligenceAlert: (alert) => set((s) => ({ intelligenceAlerts: [alert, ...s.intelligenceAlerts].slice(0, 10) })),
      dismissAlert: (id) => set((s) => ({ intelligenceAlerts: s.intelligenceAlerts.filter(a => a.id !== id) })),
      setDemandLevel: (level) => set({ demandLevel: level }),
      setWeather: (w) => set({ weatherCondition: w }),

      setIncidentOpen: (open) => set({ incidentOpen: open }),
      queueAction: (type, payload) => set((s) => ({
        outboxQueue: [...s.outboxQueue, {
          id: Math.random().toString(36).substring(7),
          type, payload,
          timestamp: new Date().toISOString(),
          retries: 0,
        }]
      })),
      clearOutbox: () => set({ outboxQueue: [] }),

      setNetworkStatus: (status) => set({ networkStatus: status }),
      setNetworkLatency: (ms) => set({ networkLatency: ms }),
      setBatteryLevel: (level) => set({ batteryLevel: level }),
      setGpsAccuracy: (m) => set({ gpsAccuracy: m }),
      setKycStatus: (status) => set({ kycStatus: status }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setDriverProfile: (profile) => set({ driverProfile: profile }),
    }),
    {
      name: 'wolfie-driver-v2',
      partialize: (state) => ({
        outboxQueue: state.outboxQueue,
        completedTrips: state.completedTrips,
        kycStatus: state.kycStatus,
        onboarded: state.onboarded,
        driverProfile: state.driverProfile,
        isOnline: state.isOnline,
        currentState: state.currentState,
      })
    }
  )
)

// ─── Mock Order Generator ────────────────────────────────
const RESTAURANTS = [
  { name: 'Wolfie Burgers', coords: [40.7176, -73.9575] as [number, number], addr: '178 Bedford Ave' },
  { name: 'Sushi Palace', coords: [40.7210, -73.9545] as [number, number], addr: '89 N 6th St' },
  { name: 'Pizza Roma', coords: [40.7155, -73.9610] as [number, number], addr: '245 Havemeyer St' },
  { name: 'Thai Express', coords: [40.7200, -73.9490] as [number, number], addr: '62 Manhattan Ave' },
  { name: 'Taco Loco', coords: [40.7130, -73.9560] as [number, number], addr: '312 Grand St' },
]
const CUSTOMERS = [
  { name: 'Alex M.', coords: [40.7250, -73.9600] as [number, number], addr: '144 N 8th St, Apt 3B', instructions: 'Leave at door, ring bell twice' },
  { name: 'Jordan K.', coords: [40.7120, -73.9530] as [number, number], addr: '55 S 3rd St, Unit 5', instructions: 'Meet at lobby, buzzer #502' },
  { name: 'Sam W.', coords: [40.7190, -73.9480] as [number, number], addr: '201 Nassau Ave', instructions: 'Hand to customer, call on arrival' },
  { name: 'Riley P.', coords: [40.7165, -73.9640] as [number, number], addr: '88 Metropolitan Ave, 2F', instructions: 'Leave with doorman' },
]
const ITEMS_POOL = [
  { name: 'Alpha Wolf Burger', quantity: 1, price: 14.99 },
  { name: 'Spicy Ramen Bowl', quantity: 1, price: 16.50 },
  { name: 'Margherita Pizza', quantity: 2, price: 12.00 },
  { name: 'Pad Thai', quantity: 1, price: 13.75 },
  { name: 'California Roll x8', quantity: 1, price: 15.00 },
  { name: 'Chicken Tacos x3', quantity: 1, price: 11.50 },
]

export function generateMockOrder(): ActiveOrder {
  const rest = RESTAURANTS[Math.floor(Math.random() * RESTAURANTS.length)]
  const cust = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)]
  const items = [ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)]]
  const dist = (1 + Math.random() * 4).toFixed(1)
  const payout = 5 + Math.random() * 10
  const tip = 2 + Math.random() * 6
  const surge = Math.random() > 0.6 ? 1 + Math.random() * 0.8 : 1.0

  return {
    id: 'ord_' + Math.random().toString(36).substring(2, 8),
    orderNumber: '#' + Math.floor(10000 + Math.random() * 90000),
    restaurantId: 'r-' + Math.floor(Math.random() * 100),
    restaurantName: rest.name,
    restaurantCoords: rest.coords,
    restaurantAddress: rest.addr,
    customerId: 'c-' + Math.floor(Math.random() * 1000),
    customerName: cust.name,
    customerCoords: cust.coords,
    customerAddress: cust.addr,
    customerInstructions: cust.instructions,
    payout: Math.round(payout * 100) / 100,
    tip: Math.round(tip * 100) / 100,
    distanceKm: parseFloat(dist),
    estimatedMinutes: Math.floor(8 + Math.random() * 20),
    items,
    status: 'pending',
    etaMinutes: Math.floor(10 + Math.random() * 15),
    acceptedAt: null,
    priority: Math.random() > 0.8 ? 'priority' : Math.random() > 0.95 ? 'urgent' : 'normal',
    surgeMultiplier: Math.round(surge * 10) / 10,
    slaDeadline: new Date(Date.now() + (25 + Math.random() * 20) * 60000).toISOString(),
  }
}
