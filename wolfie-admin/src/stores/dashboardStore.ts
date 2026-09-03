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
  fetchSystemStatus: () => Promise<void>;
  metricsSummary: any | null;
  fetchMetricsSummary: () => Promise<void>;

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
  reviewKyc: (id: string, role: 'driver' | 'restaurant', status: 'approved' | 'rejected', rejectionReason?: string) => Promise<boolean>;

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
const MOCK_ORDERS: Order[] = [];
const MOCK_DRIVERS: Driver[] = [];
const MOCK_MERCHANTS: Merchant[] = [];
const MOCK_TICKETS: SupportTicket[] = [];
const MOCK_REFUNDS: RefundRequest[] = [];
const MOCK_FLAGS: FraudFlag[] = [];
const MOCK_AI_METRICS: WAPModelMetrics[] = [];
const MOCK_ALERTS: OperationalAlert[] = [];
const MOCK_ZONE_STATS: Array<{ zone: string; orders: number; pct: number }> = [];
const MOCK_ACTIVITY: ActivityItem[] = [];

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
  systemStatus: [],
  merchants: MOCK_MERCHANTS,
  metricsSummary: null,
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
        get().fetchMerchants(),
        get().fetchSystemStatus(),
        get().fetchMetricsSummary()
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
        : (data.orders || data.data);
      if (!rawList) {
        throw new Error("Invalid response format for orders");
      }

      const ordersList: Order[] = rawList.map((o: any) => ({
        ...o,
        zone: o.zone || null,
        amount: o.amount !== undefined ? o.amount : (o.total || 0),
        currency: o.currency || "DA"
      }));

      // Calculate zoneStats dynamically from real orders (only real matched/saved zones)
      const zones = ordersList.map(o => o.zone).filter((z): z is string => !!z);
      const zoneCounts: Record<string, number> = {};
      zones.forEach(z => {
        zoneCounts[z] = (zoneCounts[z] || 0) + 1;
      });
      const maxCount = Math.max(...Object.values(zoneCounts), 1);
      const zoneStatsList = Object.entries(zoneCounts).map(([zone, count]) => ({
        zone,
        orders: count,
        pct: Math.round((count / maxCount) * 100)
      })).sort((a, b) => b.orders - a.orders);

      set({ orders: ordersList, zoneStats: zoneStatsList, error: null });
    } catch (err: any) {
      console.error("API failed to fetch orders:", err);
      set({ error: err.message || "Failed to fetch orders" });
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
        lat?: number;
        lng?: number;
        kyc_status?: string;
        kyc_documents?: any;
      }

      const rawList = Array.isArray(data) 
        ? data 
        : (data.drivers || data.data);
      if (!rawList) {
        throw new Error("Invalid response format for drivers");
      }
      const driversList = rawList as RawDriverPayload[];
      
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
        lng: d.lng,
        kyc_status: d.kyc_status || 'not_started',
        kyc_documents: d.kyc_documents || {}
      }));
      set({ drivers: normalizedDrivers, error: null });
    } catch (err: any) {
      console.error("API failed to fetch drivers:", err);
      set({ error: err.message || "Failed to fetch drivers" });
    }
  },

  fetchTickets: async () => {
    try {
      const res = await api.get('/admin/support/tickets');
      const data = res.data;
      const list: SupportTicket[] = Array.isArray(data) 
        ? data 
        : (data.tickets || data.data);
      if (!list) {
        throw new Error("Invalid response format for support tickets");
      }
      set({ tickets: list, error: null });
    } catch (err: any) {
      console.error("API failed to fetch tickets:", err);
      set({ error: err.message || "Failed to fetch tickets" });
    }
  },

  fetchRefunds: async () => {
    try {
      const res = await api.get('/admin/refunds');
      const data = res.data;
      const list: RefundRequest[] = Array.isArray(data) 
        ? data 
        : (data.refunds || data.data);
      if (!list) {
        throw new Error("Invalid response format for refunds");
      }
      set({ refunds: list, error: null });
    } catch (err: any) {
      console.error("API failed to fetch refunds:", err);
      set({ error: err.message || "Failed to fetch refunds" });
    }
  },

  fetchFlags: async () => {
    try {
      const res = await api.get('/admin/fraud/flags');
      const data = res.data;
      const list: FraudFlag[] = Array.isArray(data) 
        ? data 
        : (data.flags || data.data);
      if (!list) {
        throw new Error("Invalid response format for fraud flags");
      }
      set({ flags: list, error: null });
    } catch (err: any) {
      console.error("API failed to fetch fraud flags:", err);
      set({ error: err.message || "Failed to fetch fraud flags" });
    }
  },

  fetchAiMetrics: async () => {
    try {
      const res = await api.get('/admin/ai/metrics');
      const data = res.data;
      const list: WAPModelMetrics[] = Array.isArray(data) 
        ? data 
        : (data.metrics || data.data);
      if (!list) {
        throw new Error("Invalid response format for AI metrics");
      }
      set({ aiMetrics: list, error: null });
    } catch (err: any) {
      console.error("API failed to fetch AI metrics:", err);
      set({ error: err.message || "Failed to fetch AI metrics" });
    }
  },

  fetchSystemStatus: async () => {
    try {
      const res = await api.get('/health');
      const data = res.data;
      const dbStatus = data.database?.status === 'ok';
      const redisStatus = data.redis?.status === 'ok';
      const systemStatusList: SystemStatusItem[] = [
        { label: "Backend API", value: "Healthy", up: true },
        { label: "Database Connection", value: dbStatus ? "Healthy" : "Degraded", up: dbStatus },
        { label: "Redis Cache Service", value: redisStatus ? "Healthy" : "Disabled/Degraded", up: redisStatus },
      ];
      set({ systemStatus: systemStatusList });
    } catch (err) {
      set({
        systemStatus: [
          { label: "Backend API", value: "Offline", up: false },
          { label: "Database Connection", value: "Offline", up: false },
          { label: "Redis Cache Service", value: "Offline", up: false },
        ]
      });
    }
  },

  fetchMetricsSummary: async () => {
    try {
      const res = await api.get('/admin/metrics-summary');
      set({ metricsSummary: res.data });
    } catch (err) {
      console.error("Failed to fetch metrics summary:", err);
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
          d.id === driverId ? { ...d, status: 'available', kyc_status: 'approved' } : d
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

  reviewKyc: async (id, role, status, rejectionReason) => {
    try {
      if (role === 'restaurant') {
        await api.post(`/restaurants/kyc/decision`, {
          restaurant_id: id,
          decision: status,
          reason: rejectionReason || ""
        });
      } else {
        await api.post(`/drivers/kyc/review`, {
          driver_id: id,
          status,
          rejection_reason: rejectionReason || ""
        });
      }

      // Re-fetch from server so the decision persists on page refresh
      if (role === 'driver') {
        await get().fetchDrivers?.();
      } else {
        await get().fetchMerchants();
      }

      get().addActivity({
        text: `Updated ${role} ${id} KYC status to ${status}`,
        color: status === 'approved' ? "var(--status-green)" : "var(--status-red)"
      });
      return true;
    } catch (err) {
      console.warn("Backend API KYC review warning, applying local optimistic state update:", err);
      // Fallback: update local store optimistically so admin UI completes update
      if (role === 'driver') {
        set((state) => ({
          drivers: state.drivers.map((d) => 
            d.id === id ? { ...d, kyc_status: status } : d
          )
        }));
      } else {
        set((state) => ({
          merchants: state.merchants.map((m) => 
            m.id === id ? { ...m, kyc_status: status } : m
          )
        }));
      }
      get().addActivity({
        text: `Updated ${role} ${id} KYC status to ${status} (Local)`,
        color: status === 'approved' ? "var(--status-green)" : "var(--status-red)"
      });
      return true;
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
      const res = await api.get('/admin/restaurants');
      const data = res.data;
      const rawList = Array.isArray(data) ? data : (data.restaurants || data.data);
      if (!rawList) {
        throw new Error("Invalid response format for merchants");
      }
      const mapped: Merchant[] = rawList.map((r: any) => ({
        id: r.id,
        name: r.restaurant_name || r.full_name || "Merchant",
        email: r.email || "",
        phone: r.phone || r.phone_number || "",
        address: r.address || "",
        bio: r.bio || r.chef_bio || "",
        story: r.story || "",
        logo_image: r.logo_image || r.chef_image || "",
        category: r.category || "General",
        rating: r.rating || 5.0,
        commissionPct: r.commission_rate ? Math.round(r.commission_rate * 100) : 18,
        status: r.is_active ? (r.is_open ? 'active' : 'paused') : 'suspended',
        zone: r.address || (r.delivery_zones && r.delivery_zones[0]) || "",
        operational_status: r.busy_mode ? 'busy' : (r.is_open ? 'open' : 'paused'),
        kyc_status: r.kyc_status || 'not_started',
        kyc_documents: r.kyc_documents || {},
        expected_daily_orders: r.expected_daily_orders || null,
        cuisine: r.cuisine || r.category || "",
      }));
      set({ merchants: mapped, error: null });
    } catch (err: any) {
      console.error("API failed to fetch merchants:", err);
      set({ error: err.message || "Failed to fetch merchants" });
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
    const driver = get().drivers.find(d => d.id === driverId);
    const currentlyActive = driver ? driver.status !== 'offline' : true;
    newStatus = currentlyActive ? 'offline' : 'available';

    set((state) => ({
      drivers: state.drivers.map((d) =>
        d.id === driverId ? { ...d, status: newStatus } : d
      )
    }));

    try {
      await api.patch(`/admin/users/${driverId}/activate`, { is_active: !currentlyActive });
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
        m.id === merchantId ? { ...m, operational_status: status, status: status === 'open' ? 'active' : 'paused' } : m
      )
    }));

    try {
      if (status === 'open') {
        await api.patch(`/admin/users/${merchantId}/activate`, { is_active: true });
      } else {
        await api.patch(`/admin/restaurants/${merchantId}/suspend`, { reason: `Status set to ${status}` });
      }
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
