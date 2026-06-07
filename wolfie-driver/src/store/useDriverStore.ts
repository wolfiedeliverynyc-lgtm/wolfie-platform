import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DriverLifecycleState =
  | 'offline'
  | 'online'
  | 'available'
  | 'offer_received'
  | 'accepted'
  | 'arriving_restaurant'
  | 'at_restaurant'
  | 'picked_up'
  | 'arriving_customer'
  | 'delivered'
  | 'paused'

export interface OrderItem {
  name: string
  quantity: number
  price?: number
  id?: string
  checked?: boolean
}

export interface ActiveOrder {
  id: string
  orderNumber: string
  restaurantId?: string
  restaurantName: string
  restaurantCoords: [number, number]
  restaurantAddress: string
  customerId?: string
  customerName: string
  customerCoords: [number, number]
  customerAddress: string
  customerInstructions: string
  payout: number
  tip: number
  promoPay?: number
  distanceKm: number
  estimatedMinutes: number
  items: OrderItem[]
  status: string
  etaMinutes: number
  acceptedAt: string | null
  completedAt?: string
  priority: 'normal' | 'priority' | 'urgent'
  surgeMultiplier: number
  slaDeadline: string | null
  proofPhoto?: string
  offerExpiresAt?: number
}

export interface PendingOffer {
  order: ActiveOrder
  expiresAt: number
}

export interface Hotspot {
  id: string
  coords: [number, number]
  intensity: number
  label: string
  surgeMultiplier: number
}

export interface IntelligenceAlert {
  id: string
  type: 'surge' | 'weather' | 'traffic' | 'system'
  title: string
  message: string
  timestamp: string
}

export interface CompletedTrip {
  id: string
  date: string
  restaurantName: string
  payout: number
  tip: number
  distanceKm: number
  durationMin: number
}

export interface OutboxAction {
  id: string
  action: string
  payload: any
  timestamp: number
}

export interface WalletState {
  availableBalance: number
  pendingBalance: number
  completedPayouts: { id: string; amount: number; method: string; date: string; status: 'completed' | 'pending' | 'failed' }[]
  weeklyEarnings: { date: string; amount: number; deliveries: number }[]
  cashoutRequests: { id: string; amount: number; method: string; requestedAt: string; status: 'processing' | 'completed' | 'failed' }[]
}

export interface SupportTicket {
  id: string
  subject: string
  message: string
  level: 'ai_agent' | 'human_admin' | 'owner_review'
  status: 'open' | 'in_progress' | 'resolved' | 'escalated'
  createdAt: string
  responses: { from: string; message: string; timestamp: string }[]
}

export interface PerformanceMetrics {
  acceptanceRate: number
  completionRate: number
  onTimeDeliveries: number
  totalDeliveries: number
  customerRating: number
  totalRatings: number
  earningsPerHour: number
  activeHoursToday: number
  totalActiveHours: number
  totalDeliveryDistanceKm: number
  todayDeliveryDistanceKm: number
  currentStreak: number
  bestStreak: number
}

interface DriverProfile {
  name: string
  email: string
  phone: string
  vehicleType: string
  vehiclePlate?: string
  vehicleModel?: string
  profilePhoto?: string
}

interface DriverStore {
  lifecycleState: DriverLifecycleState
  isOnline: boolean
  activeTab: string
  activeOrders: ActiveOrder[]
  pendingOffer: PendingOffer | null
  currentLocation: [number, number]
  driverHeading: number
  hotspots: Hotspot[]
  intelligenceAlerts: IntelligenceAlert[]
  nearbyDriverCount: number
  demandLevel: 'low' | 'moderate' | 'high' | 'surge'
  weatherCondition: 'clear' | 'rain' | 'snow' | 'wind'
  completedTrips: CompletedTrip[]
  performance: PerformanceMetrics
  wallet: WalletState
  supportTickets: SupportTicket[]
  batteryLevel: number
  networkStatus: 'online' | 'degraded' | 'offline'
  networkLatency: number
  gpsAccuracy: number
  outboxQueue: OutboxAction[]
  incidentOpen: boolean
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected'
  onboarded: boolean
  driverProfile: DriverProfile | null
  routeGeoJSON: any
  soundEnabled: boolean
  token: string | null

  setToken: (token: string | null) => void

  setLifecycleState: (state: DriverLifecycleState) => void
  setOnline: (online: boolean) => void
  setActiveTab: (tab: string) => void
  setCurrentLocation: (loc: [number, number]) => void
  setDriverHeading: (heading: number) => void
  addActiveOrder: (order: ActiveOrder) => void
  removeActiveOrder: (id: string) => void
  updateOrderStatus: (id: string, status: string) => void
  setPendingOffer: (offer: PendingOffer | null) => void
  addCompletedTrip: (trip: CompletedTrip) => void
  addEarnings: (amount: number, tip?: number) => void
  incrementTrips: () => void
  setHotspots: (hotspots: Hotspot[]) => void
  addIntelligenceAlert: (alert: IntelligenceAlert) => void
  dismissAlert: (id: string) => void
  setDemandLevel: (level: 'low' | 'moderate' | 'high' | 'surge') => void
  setWeather: (weather: 'clear' | 'rain' | 'snow' | 'wind') => void
  setIncidentOpen: (open: boolean) => void
  queueAction: (action: string, payload: any) => void
  clearOutbox: () => void
  setNetworkStatus: (status: 'online' | 'degraded' | 'offline') => void
  setNetworkLatency: (ms: number) => void
  setBatteryLevel: (level: number) => void
  setGpsAccuracy: (accuracy: number) => void
  setKycStatus: (status: 'not_started' | 'pending' | 'approved' | 'rejected') => void
  setOnboarded: (onboarded: boolean) => void
  setDriverProfile: (profile: DriverProfile | null) => void
  setRouteGeoJSON: (geoJSON: any) => void
  setSoundEnabled: (enabled: boolean) => void
  updateWallet: (partial: Partial<WalletState>) => void
  addCashoutRequest: (amount: number, method: string) => void
  addSupportTicket: (ticket: SupportTicket) => void
  updateSupportTicket: (id: string, updates: Partial<SupportTicket>) => void
  updatePerformance: (partial: Partial<PerformanceMetrics>) => void
  resetStore: () => void
}

const initialWalletState: WalletState = {
  availableBalance: 35.50,
  pendingBalance: 14.50,
  completedPayouts: [
    { id: 'po1', amount: 245.00, method: 'Zelle', date: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'completed' },
    { id: 'po2', amount: 189.50, method: 'Direct Deposit', date: new Date(Date.now() - 14 * 86400000).toISOString(), status: 'completed' }
  ],
  weeklyEarnings: [
    { date: 'Mon', amount: 114.50, deliveries: 12 },
    { date: 'Tue', amount: 142.20, deliveries: 14 },
    { date: 'Wed', amount: 98.00, deliveries: 9 },
    { date: 'Thu', amount: 165.80, deliveries: 17 },
    { date: 'Fri', amount: 210.40, deliveries: 21 },
    { date: 'Sat', amount: 245.10, deliveries: 23 },
    { date: 'Sun', amount: 185.30, deliveries: 18 }
  ],
  cashoutRequests: []
}

const initialPerformanceState: PerformanceMetrics = {
  acceptanceRate: 94,
  completionRate: 99,
  onTimeDeliveries: 305,
  totalDeliveries: 312,
  customerRating: 4.95,
  totalRatings: 298,
  earningsPerHour: 22.80,
  activeHoursToday: 0,
  totalActiveHours: 847,
  totalDeliveryDistanceKm: 1245.6,
  todayDeliveryDistanceKm: 0,
  currentStreak: 4,
  bestStreak: 12
}

const defaultState = {
  lifecycleState: 'offline' as DriverLifecycleState,
  isOnline: false,
  activeTab: 'HOME',
  activeOrders: [],
  pendingOffer: null,
  currentLocation: [40.7180, -73.9570] as [number, number],
  driverHeading: 0,
  hotspots: [
    { id: 'h1', coords: [40.7160, -73.9590], intensity: 0.8, label: 'Williamsburg North', surgeMultiplier: 1.5 },
    { id: 'h2', coords: [40.7140, -73.9610], intensity: 0.6, label: 'Domino Park Area', surgeMultiplier: 1.2 },
    { id: 'h3', coords: [40.7200, -73.9530], intensity: 0.9, label: 'McCarren Park', surgeMultiplier: 1.8 },
    { id: 'h4', coords: [40.7120, -73.9550], intensity: 0.5, label: 'South Williamsburg', surgeMultiplier: 1.1 }
  ] as Hotspot[],
  intelligenceAlerts: [],
  token: null,
  nearbyDriverCount: 12,
  demandLevel: 'high' as const,
  weatherCondition: 'clear' as const,
  completedTrips: [],
  performance: initialPerformanceState,
  wallet: initialWalletState,
  supportTickets: [],
  batteryLevel: 100,
  networkStatus: 'online' as const,
  networkLatency: 45,
  gpsAccuracy: 5,
  outboxQueue: [],
  incidentOpen: false,
  kycStatus: 'not_started' as const,
  onboarded: false,
  driverProfile: null,
  routeGeoJSON: null,
  soundEnabled: true,
}

export const useDriverStore = create<DriverStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setToken: (token) => set({ token }),
      setLifecycleState: (state) => set({ lifecycleState: state }),
      setOnline: (online) => set({ isOnline: online, lifecycleState: online ? 'online' : 'offline' }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      setDriverHeading: (heading) => set({ driverHeading: heading }),
      addActiveOrder: (order) => set((state) => ({ activeOrders: [...state.activeOrders, order] })),
      removeActiveOrder: (id) => set((state) => ({ activeOrders: state.activeOrders.filter(o => o.id !== id) })),
      updateOrderStatus: (id, status) => set((state) => ({
        activeOrders: state.activeOrders.map(o => o.id === id ? { ...o, status } : o)
      })),
      setPendingOffer: (offer) => set({ pendingOffer: offer }),
      addCompletedTrip: (trip) => set((state) => ({ completedTrips: [trip, ...state.completedTrips] })),
      addEarnings: (amount, tip = 0) => set((state) => ({
        wallet: { ...state.wallet, availableBalance: state.wallet.availableBalance + amount + tip }
      })),
      incrementTrips: () => set((state) => ({
        performance: { ...state.performance, totalDeliveries: state.performance.totalDeliveries + 1 }
      })),
      setHotspots: (hotspots) => set({ hotspots }),
      addIntelligenceAlert: (alert) => set((state) => ({ intelligenceAlerts: [alert, ...state.intelligenceAlerts] })),
      dismissAlert: (id) => set((state) => ({ intelligenceAlerts: state.intelligenceAlerts.filter(a => a.id !== id) })),
      setDemandLevel: (level) => set({ demandLevel: level }),
      setWeather: (weather) => set({ weatherCondition: weather }),
      setIncidentOpen: (open) => set({ incidentOpen: open }),
      queueAction: (action, payload) => set((state) => ({
        outboxQueue: [...state.outboxQueue, { id: Math.random().toString(), action, payload, timestamp: Date.now() }]
      })),
      clearOutbox: () => set({ outboxQueue: [] }),
      setNetworkStatus: (status) => set({ networkStatus: status }),
      setNetworkLatency: (ms) => set({ networkLatency: ms }),
      setBatteryLevel: (level) => set({ batteryLevel: level }),
      setGpsAccuracy: (accuracy) => set({ gpsAccuracy: accuracy }),
      setKycStatus: (status) => set({ kycStatus: status }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setDriverProfile: (profile) => set({ driverProfile: profile }),
      setRouteGeoJSON: (geoJSON) => set({ routeGeoJSON: geoJSON }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      updateWallet: (partial) => set((state) => ({ wallet: { ...state.wallet, ...partial } })),
      addCashoutRequest: (amount, method) => set((state) => ({
        wallet: {
          ...state.wallet,
          availableBalance: state.wallet.availableBalance - amount,
          cashoutRequests: [
            { id: `cr_${Date.now()}`, amount, method, requestedAt: new Date().toISOString(), status: 'processing' },
            ...state.wallet.cashoutRequests
          ]
        }
      })),
      addSupportTicket: (ticket) => set((state) => ({ supportTickets: [ticket, ...state.supportTickets] })),
      updateSupportTicket: (id, updates) => set((state) => ({
        supportTickets: state.supportTickets.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      updatePerformance: (partial) => set((state) => ({ performance: { ...state.performance, ...partial } })),
      resetStore: () => set({ ...defaultState })
    }),
    {
      name: 'wolfie-driver-v3',
      partialize: (state) => ({
        outboxQueue: state.outboxQueue,
        completedTrips: state.completedTrips,
        kycStatus: state.kycStatus,
        onboarded: state.onboarded,
        driverProfile: state.driverProfile,
        isOnline: state.isOnline,
        lifecycleState: state.lifecycleState,
        wallet: state.wallet,
        performance: state.performance,
        supportTickets: state.supportTickets,
        soundEnabled: state.soundEnabled,
        token: state.token,
      })
    }
  )
)
