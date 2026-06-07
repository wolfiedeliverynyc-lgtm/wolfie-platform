import { create } from 'zustand'

export type DeliveryState = 'idle' | 'navigating_pickup' | 'arrived' | 'picked_up' | 'navigating_dropoff' | 'delivered'

interface DriverState {
  isOnline: boolean
  setOnline: (status: boolean) => void
  activeTab: 'home' | 'earnings' | 'orders' | 'account'
  setActiveTab: (tab: 'home' | 'earnings' | 'orders' | 'account') => void
  deliveryState: DeliveryState
  setDeliveryState: (state: DeliveryState) => void
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  setOnline: (status) => set({ isOnline: status }),
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
  deliveryState: 'idle',
  setDeliveryState: (state) => set({ deliveryState: state })
}))
