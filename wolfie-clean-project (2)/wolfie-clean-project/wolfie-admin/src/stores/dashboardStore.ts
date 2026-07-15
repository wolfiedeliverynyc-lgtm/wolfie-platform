// src/stores/dashboardStore.ts
import { create } from 'zustand';
import { 
  Order, 
  Driver, 
  SupportTicket, 
  RefundRequest, 
  FraudFlag, 
  WAPModelMetrics, 
  OperationalAlert,
  Merchant
} from '@/types';
import api from '@/services/api';

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  color: string;
}

interface SystemStatusItem {
  label: string;
  value: string;
  up: boolean;
}

interface DashboardState {
  orders: Order[];
  drivers: Driver[];
  tickets: SupportTicket[];
  refunds: RefundRequest[];
  flags: FraudFlag[];
  aiMetrics: WAPModelMetrics[];
  alerts: OperationalAlert[];
  zoneStats: Array<{ zone: string; orders: number; pct: number }>;
  activityFeed: ActivityItem[];
  systemStatus: SystemStatusItem[];
  merchants: Merchant[];
  isLoading: boolean;
  error: string | null;

  // Fetch Actions
  fetchDashboardData: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchDrivers: () => Promise<void>;
  fetchTickets: () => Promise<void>;
  fetchRefunds: () => Promise<void>;
  fetchFlags: () => Promise<void>;
  fetchAiMetrics: () => Promise<void>;

  // Mutative Actions (API Calls + Local Store Updates)
  addOrder: (order: Order) => void;
  updateOrder: (order: Partial<Order> & { id: string }) => void;
  assignDriver: (orderId: string, driverId: string) => Promise<boolean>;
  cancelOrder: (orderId: string, reason: string) => Promise<boolean>;
  forceCompleteOrder: (orderId: string) => Promise<boolean>;
  requestRefund: (orderId: string, amount: number, reason: string) => Promise<boolean>;
  bulkAssignDrivers: (orderIds: string[], driverId: string) => Promise<boolean>;
  bulkRerouteOrders: (orderIds: string[], zone: string) => Promise<boolean>;
  bulkCancelOrders: (orderIds: string[], reason: string) => Promise<boolean>;
  bulkEscalateOrders: (orderIds: string[]) => Promise<boolean>;


  updateDriver: (driver: Partial<Driver> & { id: string }) => void;
  activateDriver: (driverId: string) => Promise<boolean>;

  resolveTicket: (ticketId: string, resolution: string) => Promise<boolean>;
  escalateTicket: (ticketId: string, reason: string) => Promise<boolean>;

  approveRefund: (refundId: string) => Promise<boolean>;
  denyRefund: (refundId: string, reason: string) => Promise<boolean>;

  resolveFraudFlag: (flagId: string, notes: string) => Promise<boolean>;

  retrainWapModel: () => Promise<boolean>;
  toggleWapFallback: (enable: boolean) => Promise<boolean>;

  // Fetch Merchants
  fetchMerchants: () => Promise<void>;

  // Dispatch & Ops Overrides
  rerouteDriver: (driverId: string, zone: string) => Promise<boolean>;
  suspendDriver: (driverId: string) => Promise<boolean>;
  setMerchantStatus: (merchantId: string, status: 'open' | 'paused' | 'busy' | 'delayed') => Promise<boolean>;
  toggleOrderPriority: (orderId: string) => Promise<boolean>;
  sendOperationalAlert: (targetId: string, message: string) => Promise<boolean>;
  triggerEmergencyEscalation: (orderId: string) => Promise<boolean>;

  // Alerts Actions
  addAlert: (alert: Omit<OperationalAlert, 'id' | 'created_at' | 'acknowledged'>) => void;
  acknowledgeAlert: (alertId: string) => void;

  // General Actions
  addActivity: (activity: Omit<ActivityItem, 'id' | 'time'>) => void;
  clearActivityFeed: () => void;
  setSystemStatus: (label: string, value: string, up: boolean) => void;
}

// ── Initial Mock Data Fallbacks ──────────────────────────────────
const MOCK_ORDERS: Order[] = [
  { id: "WLF-2941", customer_id: "c1", customer_name: "Amira Benali", merchant_id: "m1", merchant_name: "Pizza Bleu", driver_id: "d1", driver_name: "Karim Dris", amount: 2450, currency: "DA", status: "delivering", zone: "Algiers Centre", eta_minutes: 8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "WLF-2940", customer_id: "c2", customer_name: "Youssef Ait", merchant_id: "m2", merchant_name: "Burgers Co", driver_id: "d2", driver_name: "Samir Meziane", amount: 1200, currency: "DA", status: "preparing", zone: "El Biar", eta_minutes: 14, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "WLF-2939", customer_id: "c3", customer_name: "Fatima Zahra", merchant_id: "m3", merchant_name: "Sushi House", driver_id: undefined, driver_name: "Unassigned", amount: 3800, currency: "DA", status: "pending", zone: "Hussein Dey", eta_minutes: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "WLF-2938", customer_id: "c4", customer_name: "Mehdi Oussama", merchant_id: "m4", merchant_name: "Tacos Grill", driver_id: "d3", driver_name: "Riad Khelil", amount: 980, currency: "DA", status: "completed", zone: "Bab Ezzouar", eta_minutes: undefined, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "WLF-2937", customer_id: "c5", customer_name: "Nadia Cherif", merchant_id: "m5", merchant_name: "Crepe Box", driver_id: "d4", driver_name: "Amine Tahir", amount: 4100, currency: "DA", status: "completed", zone: "Kouba", eta_minutes: undefined, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "WLF-2936", customer_id: "c6", customer_name: "Idir Hamid", merchant_id: "m6", merchant_name: "Salad Bar", driver_id: undefined, driver_name: "Unassigned", amount: 560, currency: "DA", status: "cancelled", zone: "Ain Taya", eta_minutes: undefined, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const MOCK_DRIVERS: Driver[] = [
  { id: "d1", name: "Karim Dris", phone: "+213550123456", zone: "Algiers Centre", status: "delivering", rating: 4.9, completed_trips: 154, current_order_id: "WLF-2941" },
  { id: "d2", name: "Samir Meziane", phone: "+213550123457", zone: "El Biar", status: "preparing", rating: 4.7, completed_trips: 98, current_order_id: "WLF-2940" },
  { id: "d3", name: "Riad Khelil", phone: "+213550123458", zone: "Bab Ezzouar", status: "available", rating: 4.8, completed_trips: 212, current_order_id: undefined },
  { id: "d4", name: "Amine Tahir", phone: "+213550123459", zone: "Kouba", status: "available", rating: 4.6, completed_trips: 84, current_order_id: undefined },
  { id: "d5", name: "Omar Belaib", phone: "+213550123460", zone: "Ain Taya", status: "offline", rating: 4.5, completed_trips: 120, current_order_id: undefined },
];

const MOCK_MERCHANTS: Merchant[] = [
  { id: "m1", name: "Pizza Bleu", category: "Italian", rating: 4.8, commissionPct: 18, status: "active", zone: "Algiers Centre", operational_status: "open", prep_delay_minutes: 0, kitchen_delay: false },
  { id: "m2", name: "Burgers Co", category: "Fast Food", rating: 4.5, commissionPct: 15, status: "active", zone: "El Biar", operational_status: "open", prep_delay_minutes: 5, kitchen_delay: false },
  { id: "m3", name: "Sushi House", category: "Japanese", rating: 4.9, commissionPct: 20, status: "active", zone: "Hussein Dey", operational_status: "busy", prep_delay_minutes: 12, kitchen_delay: true },
  { id: "m4", name: "Tacos Grill", category: "Mexican", rating: 4.2, commissionPct: 12, status: "active", zone: "Bab Ezzouar", operational_status: "open", prep_delay_minutes: 0, kitchen_delay: false },
  { id: "m5", name: "Crepe Box", category: "Dessert", rating: 4.6, commissionPct: 15, status: "paused", zone: "Kouba", operational_status: "paused", prep_delay_minutes: 0, kitchen_delay: false },
  { id: "m6", name: "Salad Bar", category: "Healthy", rating: 4.4, commissionPct: 15, status: "suspended", zone: "Ain Taya", operational_status: "delayed", prep_delay_minutes: 20, kitchen_delay: true },
];

const MOCK_TICKETS: SupportTicket[] = [
  { id: "t1", user_id: "c1", customer_name: "Amira Benali", order_id: "WLF-2941", category: "Late Delivery", priority: "medium", status: "open", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ai_summary: "Customer complains about delayed delivery of Pizza Bleu order." },
  { id: "t2", user_id: "c3", customer_name: "Fatima Zahra", order_id: "WLF-2939", category: "Missing Items", priority: "high", status: "open", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ai_summary: "Sushi box is missing ginger and chopsticks." },
  { id: "t3", user_id: "c4", customer_name: "Mehdi Oussama", order_id: "WLF-2938", category: "Payment Issue", priority: "low", status: "resolved", resolution: "Stripe transaction verified.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const MOCK_REFUNDS: RefundRequest[] = [
  { id: "r1", order_id: "WLF-2936", user_id: "c6", customer_name: "Idir Hamid", refund_type: "full", amount_requested: 560, recommended_amount: 560, fraud_score: 0.12, status: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "r2", order_id: "WLF-2937", user_id: "c5", customer_name: "Nadia Cherif", refund_type: "partial", amount_requested: 1500, recommended_amount: 1000, fraud_score: 0.45, status: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const MOCK_FLAGS: FraudFlag[] = [
  { id: "f1", user_id: "c2", customer_name: "Youssef Ait", risk_type: "Card Velocity", severity: "high", notes: "Multiple failed payment attempts in 5 minutes.", status: "open", created_at: new Date().toISOString() },
  { id: "f2", user_id: "d5", customer_name: "Omar Belaib", risk_type: "GPS Spoofing", severity: "medium", notes: "Driver location pinged outside of operational range.", status: "open", created_at: new Date().toISOString() }
];

const MOCK_AI_METRICS: WAPModelMetrics[] = [
  { id: "m1", restaurant_id: "m1", restaurant_name: "Pizza Bleu", mae: 2.4, rmse: 3.1, mape: 9.8, r2_score: 0.88, training_samples: 1200, model_version: "wap-v2.1", trained_at: new Date().toISOString() },
  { id: "m2", restaurant_id: "m2", restaurant_name: "Burgers Co", mae: 3.2, rmse: 4.0, mape: 12.1, r2_score: 0.81, training_samples: 850, model_version: "wap-v2.1", trained_at: new Date().toISOString() }
];

const MOCK_ALERTS: OperationalAlert[] = [
  { id: "a1", type: "driver_shortage", severity: "high", message: "High demand in El Biar, only 1 driver available.", acknowledged: false, created_at: new Date().toISOString() },
  { id: "a2", type: "wap_prediction_drift", severity: "medium", message: "WAP Model drift detected for Pizza Bleu (MAE > 4.5)", acknowledged: false, created_at: new Date().toISOString() }
];

const MOCK_ZONE_STATS = [
  { zone: "Algiers Centre", orders: 38, pct: 90 },
  { zone: "El Biar",        orders: 24, pct: 57 },
  { zone: "Bab Ezzouar",    orders: 19, pct: 45 },
  { zone: "Hussein Dey",    orders: 15, pct: 36 },
  { zone: "Kouba",          orders: 11, pct: 26 },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", text: "Order #WLF-2941 picked up by Karim D.",   time: "1 min ago",  color: "var(--accent)" },
  { id: "a2", text: "New order in Hussein Dey — unassigned",    time: "2 min ago",  color: "var(--status-amber)" },
  { id: "a3", text: "Karim D. delivered #WLF-2935 ✓",          time: "6 min ago",  color: "var(--status-green)" },
  { id: "a4", text: "Merchant 'Pizza Bleu' paused menu",        time: "11 min ago", color: "var(--status-red)" },
  { id: "a5", text: "Riad K. went online in Bab Ezzouar",       time: "14 min ago", color: "var(--status-green)" },
  { id: "a6", text: "Order #WLF-2936 cancelled by customer",    time: "18 min ago", color: "var(--status-red)" },
];

const MOCK_SYSTEM_STATUS: SystemStatusItem[] = [
  { label: "Order Service",       value: "Healthy",  up: true  },
  { label: "Driver Tracking",      value: "Healthy",  up: true  },
  { label: "Payment Gateway",      value: "Healthy",  up: true  },
  { label: "Notification Service", value: "Degraded", up: false },
  { label: "Merchant API",         value: "Healthy",  up: true  },
  { label: "Analytics Pipeline",   value: "Healthy",  up: true  },
];

export const useDashboardStore = create<DashboardState>((set, get) => ({
  orders: MOCK_ORDERS,
  drivers: MOCK_DRIVERS,
  tickets: MOCK_TICKETS,
  refunds: MOCK_REFUNDS,
  flags: MOCK_FLAGS,
  aiMetrics: MOCK_AI_METRICS,
  alerts: MOCK_ALERTS,
  zoneStats: MOCK_ZONE_STATS,
  activityFeed: MOCK_ACTIVITY,
  systemStatus: MOCK_SYSTEM_STATUS,
  merchants: MOCK_MERCHANTS,
  isLoading: false,
  error: null,

  // ── Fetch Operations ────────────────────────────────────────────
  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.allSettled([
        get().fetchOrders(),
        get().fetchDrivers(),
        get().fetchTickets(),
        get().fetchRefunds(),
        get().fetchFlags(),
        get().fetchAiMetrics(),
        get().fetchMerchants()
      ]);
      set({ isLoading: false });
    } catch (err: unknown) {
      console.warn("Error running dashboard refresh:", err);
      set({ isLoading: false });
    }
  },

  fetchOrders: async () => {
    try {
      const res = await api.get('/admin/orders');
      const data = res.data;
      const rawList = Array.isArray(data) 
        ? data 
        : (data.orders || data.data || MOCK_ORDERS);
      const ordersList: Order[] = rawList.map((o: any) => ({
        ...o,
        amount: o.amount !== undefined ? o.amount : (o.total || 0),
        currency: o.currency || "DA"
      }));
      set({ orders: ordersList });
    } catch (err) {
      console.warn("API fallback to mock orders:", err);
    }
  },

  fetchDrivers: async () => {
    try {
      const res = await api.get('/admin/drivers');
      const data = res.data;
      
      interface RawDriverPayload {
        id: string;
        name?: string;
        full_name?: string;
        phone?: string;
        zone?: string;
        status?: 'available' | 'preparing' | 'delivering' | 'offline';
        is_available?: boolean;
        rating?: number;
        completed_trips?: number;
        total_deliveries?: number;
        current_order_id?: string;
      }

      const driversList = (Array.isArray(data) 
        ? data 
        : (data.drivers || data.data || MOCK_DRIVERS)) as RawDriverPayload[];
      
      // Map backend fields if needed
      const normalizedDrivers = driversList.map((d: RawDriverPayload) => ({
        id: d.id,
        name: d.full_name || d.name || "Driver Name",
        phone: d.phone || "",
        zone: d.zone || "Algiers Centre",
        status: d.is_available ? (d.status || "available") : "offline",
        rating: d.rating || 5.0,
        completed_trips: d.total_deliveries || d.completed_trips || 0,
        current_order_id: d.current_order_id || undefined,
        lat: d.lat,
        lng: d.lng
      }));
      set({ drivers: normalizedDrivers });
    } catch (err) {
      console.warn("API fallback to mock drivers:", err);
    }
  },

  fetchTickets: async () => {
    try {
      const res = await api.get('/admin/support/tickets');
      const data = res.data;
      const list: SupportTicket[] = Array.isArray(data) 
        ? data 
        : (data.tickets || data.data || MOCK_TICKETS);
      set({ tickets: list });
    } catch (err) {
      console.warn("API fallback to mock tickets:", err);
    }
  },

  fetchRefunds: async () => {
    try {
      const res = await api.get('/admin/refunds');
      const data = res.data;
      const list: RefundRequest[] = Array.isArray(data) 
        ? data 
        : (data.refunds || data.data || MOCK_REFUNDS);
      set({ refunds: list });
    } catch (err) {
      console.warn("API fallback to mock refunds:", err);
    }
  },

  fetchFlags: async () => {
    try {
      const res = await api.get('/admin/fraud/flags');
      const data = res.data;
      const list: FraudFlag[] = Array.isArray(data) 
        ? data 
        : (data.flags || data.data || MOCK_FLAGS);
      set({ flags: list });
    } catch (err) {
      console.warn("API fallback to mock flags:", err);
    }
  },

  fetchAiMetrics: async () => {
    try {
      const res = await api.get('/admin/ai/metrics');
      const data = res.data;
      const list: WAPModelMetrics[] = Array.isArray(data) 
        ? data 
        : (data.metrics || data.data || MOCK_AI_METRICS);
      set({ aiMetrics: list });
    } catch (err) {
      console.warn("API fallback to mock AI metrics:", err);
    }
  },

  // ── Mutative Actions ────────────────────────────────────────────
  addOrder: (order) => {
    set((state) => ({
      orders: [order, ...state.orders].slice(0, 100)
    }));
  },

  updateOrder: (updatedOrder) => {
    set((state) => ({
      orders: state.orders.map((o) => 
        o.id === updatedOrder.id 
          ? { ...o, ...updatedOrder, updated_at: new Date().toISOString() } 
          : o
      )
    }));
  },

  assignDriver: async (orderId, driverId) => {
    // Optimistic UI update
    const previousOrders = get().orders;
    const selectedDriver = get().drivers.find(d => d.id === driverId);
    
    set((state) => ({
      orders: state.orders.map(o => 
        o.id === orderId 
          ? { ...o, driver_id: driverId, driver_name: selectedDriver?.name || "Driver", status: "preparing" } 
          : o
      )
    }));

    try {
      await api.post(`/admin/orders/${orderId}/reassign`, { driver_id: driverId });
      get().addActivity({
        text: `Assigned Driver ${selectedDriver?.name || driverId} to Order #${orderId}`,
        color: "var(--status-green)"
      });
      return true;
    } catch (err) {
      console.error("Failed to assign driver:", err);
      // Revert optimistic update
      set({ orders: previousOrders });
      return false;
    }
  },

  cancelOrder: async (orderId, reason) => {
    const previousOrders = get().orders;
    set((state) => ({
      orders: state.orders.map(o => 
        o.id === orderId ? { ...o, status: 'cancelled' } : o
      )
    }));

    try {
      await api.post(`/admin/orders/${orderId}/cancel`, { reason });
      get().addActivity({
        text: `Cancelled Order #${orderId} - Reason: ${reason}`,
        color: "var(--status-red)"
      });
      return true;
    } catch (err) {
      console.error("Failed to cancel order:", err);
      set({ orders: previousOrders });
      return false;
    }
  },

  forceCompleteOrder: async (orderId) => {
    const previousOrders = get().orders;
    set((state) => ({
      orders: state.orders.map(o => 
        o.id === orderId ? { ...o, status: 'completed' } : o
      )
    }));

    try {
      await api.post(`/admin/orders/${orderId}/force-complete`);
      get().addActivity({
        text: `Force Completed Order #${orderId}`,
        color: "var(--status-green)"
      });
      return true;
    } catch (err) {
      console.error("Failed to force complete order:", err);
      set({ orders: previousOrders });
      return false;
    }
  },

  requestRefund: async (orderId, amount, reason) => {
    try {
      await api.post(`/admin/orders/${orderId}/refund`, { amount, reason });
      const order = get().orders.find(o => o.id === orderId);
      const newRefund: RefundRequest = {
        id: `ref-${Math.random().toString(36).substring(2, 9)}`,
        order_id: orderId,
        user_id: order?.customer_id || "unknown",
        customer_name: order?.customer_name || "Customer",
        refund_type: "full",
        amount_requested: amount,
        recommended_amount: amount,
        fraud_score: 0.1,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((state) => ({
        refunds: [newRefund, ...state.refunds]
      }));
      get().addActivity({
        text: `Refund Requested for Order #${orderId} - Amount: $${amount}`,
        color: "var(--status-amber)"
      });
      return true;
    } catch (err) {
      console.error("Failed to request refund:", err);
      return false;
    }
  },

  bulkAssignDrivers: async (orderIds, driverId) => {
    const previousOrders = get().orders;
    const selectedDriver = get().drivers.find(d => d.id === driverId);
    
    set((state) => ({
      orders: state.orders.map(o => 
        orderIds.includes(o.id) 
          ? { ...o, driver_id: driverId, driver_name: selectedDriver?.name || "Driver", status: "preparing" } 
          : o
      )
    }));

    try {
      await api.post(`/admin/orders/bulk-assign`, { order_ids: orderIds, driver_id: driverId });
      get().addActivity({
        text: `Bulk Assigned Driver ${selectedDriver?.name || driverId} to ${orderIds.length} orders`,
        color: "var(--status-green)"
      });
      return true;
    } catch (err) {
      console.error("Failed bulk driver assignment:", err);
      set({ orders: previousOrders });
      return false;
    }
  },

  bulkRerouteOrders: async (orderIds, zone) => {
    const previousOrders = get().orders;
    set((state) => ({
      orders: state.orders.map(o => 
        orderIds.includes(o.id) ? { ...o, zone } : o
      )
    }));

    try {
      await api.post(`/admin/orders/bulk-reroute`, { order_ids: orderIds, zone });
      get().addActivity({
        text: `Bulk Rerouted ${orderIds.length} orders to ${zone}`,
        color: "var(--accent)"
      });
      return true;
    } catch (err) {
      console.error("Failed bulk reroute:", err);
      set({ orders: previousOrders });
      return false;
    }
  },

  bulkCancelOrders: async (orderIds, reason) => {
    const previousOrders = get().orders;
    set((state) => ({
      orders: state.orders.map(o => 
        orderIds.includes(o.id) ? { ...o, status: 'cancelled' } : o
      )
    }));

    try {
      await api.post(`/admin/orders/bulk-cancel`, { order_ids: orderIds, reason });
      get().addActivity({
        text: `Bulk Cancelled ${orderIds.length} orders - Reason: ${reason}`,
        color: "var(--status-red)"
      });
      return true;
    } catch (err) {
      console.error("Failed bulk cancellation:", err);
      set({ orders: previousOrders });
      return false;
    }
  },

  bulkEscalateOrders: async (orderIds) => {
    try {
      await api.post(`/admin/orders/bulk-escalate`, { order_ids: orderIds });
      orderIds.forEach(id => {
        get().addAlert({
          type: "wap_prediction_drift",
          severity: "high",
          message: `Emergency SLA Escalation triggered for Order #${id}`
        });
      });
      get().addActivity({
        text: `Bulk Escalated ${orderIds.length} SLA breach alerts`,
        color: "var(--status-red)"
      });
      return true;
    } catch (err) {
      console.error("Failed bulk escalation:", err);
      return false;
    }
  },

  updateDriver: (updatedDriver) => {
    set((state) => ({
      drivers: state.drivers.map((d) => 
        d.id === updatedDriver.id ? { ...d, ...updatedDriver } : d
      )
    }));
  },

  activateDriver: async (driverId) => {
    try {
      await api.patch(`/admin/drivers/${driverId}/approve`);
      set((state) => ({
        drivers: state.drivers.map((d) => 
          d.id === driverId ? { ...d, status: 'available' } : d
        )
      }));
      get().addActivity({
        text: `Activated Driver ${driverId}`,
        color: "var(--status-green)"
      });
      return true;
    } catch (err) {
      console.error("Failed to activate driver:", err);
      return false;
    }
  },

  resolveTicket: async (ticketId, resolution) => {
    try {
      await api.post(`/admin/support/tickets/${ticketId}/resolve`, { resolution });
      set((state) => ({
        tickets: state.tickets.map((t) => 
          t.id === ticketId ? { ...t, status: 'resolved', resolution } : t
        )
      }));
      get().addActivity({
        text: `Resolved Ticket #${ticketId}`,
        color: "var(--status-green)"
      });
      return true;
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
      return false;
    }
  },

  escalateTicket: async (ticketId, reason) => {
    try {
      await api.post(`/admin/support/tickets/${ticketId}/escalate`, { reason });
      set((state) => ({
        tickets: state.tickets.map((t) => 
          t.id === ticketId ? { ...t, status: 'escalated', priority: 'high' } : t
        )
      }));
      get().addActivity({
        text: `Escalated Ticket #${ticketId} - Reason: ${reason}`,
        color: "var(--status-amber)"
      });
      return true;
    } catch (err) {
      console.error("Failed to escalate ticket:", err);
      return false;
    }
  },

  approveRefund: async (refundId) => {
    try {
      await api.post(`/admin/refunds/${refundId}/approve`);
      set((state) => ({
        refunds: state.refunds.map((r) => 
          r.id === refundId ? { ...r, status: 'approved' } : r
        )
      }));
      get().addActivity({
        text: `Approved Refund Request #${refundId}`,
        color: "var(--status-green)"
      });
      return true;
    } catch (err) {
      console.error("Failed to approve refund:", err);
      return false;
    }
  },

  denyRefund: async (refundId, reason) => {
    try {
      await api.post(`/admin/refunds/${refundId}/deny`, { reason });
      set((state) => ({
        refunds: state.refunds.map((r) => 
          r.id === refundId ? { ...r, status: 'denied' } : r
        )
      }));
      get().addActivity({
        text: `Denied Refund Request #${refundId} - Reason: ${reason}`,
        color: "var(--status-red)"
      });
      return true;
    } catch (err) {
      console.error("Failed to deny refund:", err);
      return false;
    }
  },

  resolveFraudFlag: async (flagId, notes) => {
    try {
      await api.post(`/admin/fraud/flags/${flagId}/resolve`, { notes });
      set((state) => ({
        flags: state.flags.map((f) => 
          f.id === flagId ? { ...f, status: 'resolved', notes: (f.notes || '') + `\nResolution: ${notes}` } : f
        )
      }));
      get().addActivity({
        text: `Resolved Fraud Flag #${flagId}`,
        color: "var(--status-green)"
      });
      return true;
    } catch (err) {
      console.error("Failed to resolve fraud flag:", err);
      return false;
    }
  },

  retrainWapModel: async () => {
    try {
      await api.post('/admin/ai/retrain');
      get().addActivity({
        text: `Queued WAP AI Model retraining job`,
        color: "var(--accent)"
      });
      return true;
    } catch (err) {
      console.error("Failed to retrain WAP models:", err);
      return false;
    }
  },

  toggleWapFallback: async (enable) => {
    try {
      await api.post('/admin/ai/fallback', { enable });
      get().addActivity({
        text: `Toggled WAP Fallback mode to: ${enable ? 'ENABLED' : 'DISABLED'}`,
        color: "var(--accent)"
      });
      return true;
    } catch (err) {
      console.error("Failed to toggle WAP fallback:", err);
      return false;
    }
  },

  fetchMerchants: async () => {
    try {
      const res = await api.get('/admin/merchants');
      const data = res.data;
      const list: Merchant[] = Array.isArray(data) ? data : (data.merchants || data.data || MOCK_MERCHANTS);
      set({ merchants: list });
    } catch (err) {
      console.warn("API fallback to mock merchants:", err);
      if (get().merchants.length === 0) {
        set({ merchants: MOCK_MERCHANTS });
      }
    }
  },

  rerouteDriver: async (driverId, zone) => {
    const coords: Record<string, [number, number]> = {
      "Algiers Centre": [36.7525, 3.0588],
      "El Biar":        [36.7692, 3.0333],
      "Bab Ezzouar":    [36.7262, 3.1825],
      "Hussein Dey":    [36.7447, 3.0931],
      "Kouba":          [36.7275, 3.0861],
      "Ain Taya":       [36.7936, 3.2422]
    };
    const base = coords[zone] || coords["Algiers Centre"];
    const seed = driverId.charCodeAt(0) + driverId.charCodeAt(driverId.length - 1);
    const lat = base[0] + (Math.sin(seed) * 0.01);
    const lng = base[1] + (Math.cos(seed) * 0.01);

    set((state) => ({
      drivers: state.drivers.map((d) =>
        d.id === driverId ? { ...d, zone, lat, lng } : d
      )
    }));

    try {
      await api.post(`/admin/drivers/${driverId}/reroute`, { zone });
      get().addActivity({
        text: `Rerouted Driver ${driverId} to ${zone}`,
        color: "var(--accent)"
      });
      return true;
    } catch (err) {
      console.warn("API fallback: Rerouted driver locally:", err);
      get().addActivity({
        text: `Rerouted Driver ${driverId} to ${zone} (Local)`,
        color: "var(--accent)"
      });
      return true;
    }
  },

  suspendDriver: async (driverId) => {
    let newStatus: 'available' | 'offline' = 'offline';
    set((state) => ({
      drivers: state.drivers.map((d) => {
        if (d.id === driverId) {
          newStatus = d.status === 'offline' ? 'available' : 'offline';
          return { ...d, status: newStatus };
        }
        return d;
      })
    }));

    try {
      await api.post(`/admin/drivers/${driverId}/suspend`);
      get().addActivity({
        text: `Toggled suspension for Driver ${driverId} to status [${newStatus}]`,
        color: "var(--status-red)"
      });
      return true;
    } catch (err) {
      console.warn("API fallback: Suspended driver locally:", err);
      get().addActivity({
        text: `Toggled suspension for Driver ${driverId} (Local)`,
        color: "var(--status-red)"
      });
      return true;
    }
  },

  setMerchantStatus: async (merchantId, status) => {
    set((state) => ({
      merchants: state.merchants.map((m) =>
        m.id === merchantId ? { ...m, operational_status: status } : m
      )
    }));

    try {
      await api.patch(`/admin/merchants/${merchantId}/status`, { status });
      get().addActivity({
        text: `Updated Merchant ${merchantId} status to [${status}]`,
        color: "var(--accent)"
      });
      return true;
    } catch (err) {
      console.warn("API fallback: Updated merchant status locally:", err);
      get().addActivity({
        text: `Updated Merchant status to [${status}] (Local)`,
        color: "var(--accent)"
      });
      return true;
    }
  },

  toggleOrderPriority: async (orderId) => {
    let priorityVal = false;
    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id === orderId) {
          priorityVal = !o.priority;
          return { ...o, priority: priorityVal };
        }
        return o;
      })
    }));

    try {
      await api.post(`/admin/orders/${orderId}/priority`, { priority: priorityVal });
      get().addActivity({
        text: `Toggled Order #${orderId} priority to [${priorityVal}]`,
        color: "var(--status-amber)"
      });
      return true;
    } catch (err) {
      console.warn("API fallback: Toggled order priority locally:", err);
      return true;
    }
  },

  sendOperationalAlert: async (targetId, message) => {
    get().addAlert({
      type: 'sla_violation',
      severity: 'high',
      message: `Operational Alert to #${targetId}: ${message}`,
      metadata: { targetId, message }
    });
    get().addActivity({
      text: `Sent Alert to #${targetId}: "${message}"`,
      color: "var(--status-red)"
    });
    return true;
  },

  triggerEmergencyEscalation: async (orderId) => {
    get().addAlert({
      type: 'sla_violation',
      severity: 'critical',
      message: `EMERGENCY ESCALATION: Order #${orderId} has critical SLA failure`,
      metadata: { orderId }
    });
    get().addActivity({
      text: `Triggered EMERGENCY ESCALATION for Order #${orderId}`,
      color: "var(--status-red)"
    });
    return true;
  },

  // ── Alerts Actions ──────────────────────────────────────────────
  addAlert: (alert) => {
    const newAlert: OperationalAlert = {
      ...alert,
      id: `alert-${Math.random().toString(36).substring(7)}`,
      created_at: new Date().toISOString(),
      acknowledged: false
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts].slice(0, 50)
    }));
  },

  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      )
    }));
  },

  // ── General Utilities ───────────────────────────────────────────
  addActivity: (activity) => {
    const newItem: ActivityItem = {
      id: Math.random().toString(36).substring(7),
      text: activity.text,
      color: activity.color,
      time: 'Just now',
    };
    set((state) => ({
      activityFeed: [newItem, ...state.activityFeed].slice(0, 50),
    }));
  },

  clearActivityFeed: () => set({ activityFeed: [] }),

  setSystemStatus: (label, value, up) => {
    set((state) => ({
      systemStatus: state.systemStatus.map((s) => 
        s.label === label ? { ...s, value, up } : s
      )
    }));
  },
}));

export default useDashboardStore;
