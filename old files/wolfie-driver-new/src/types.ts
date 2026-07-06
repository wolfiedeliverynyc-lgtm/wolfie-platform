export interface LatLng {
  x: number; // grid position x (e.g. 0 - 800)
  y: number; // grid position y (e.g. 0 - 600)
  lat?: number; // simulated GPS latitude
  lng?: number; // simulated GPS longitude
}

export interface OrderItem {
  id: string;
  name: string;
  checked: boolean;
}

export type OrderStatus =
  | 'PENDING_OFFER'       // Offer shown to driver, waiting for accept
  | 'NAV_TO_STORE'        // Driver accepted, driving to restaurant
  | 'ARRIVED_AT_STORE'    // Driver is at restaurant, picking up/verifying items
  | 'NAV_TO_CUSTOMER'     // Driver has items, driving to customer house
  | 'ARRIVED_AT_CUSTOMER' // Driver is at customer, completing dropoff
  | 'DELIVERED'           // Done!
  | 'DECLINED';           // Cancelled/declined by driver

export interface Order {
  id: string;
  storeName: string;
  storeAddress: string;
  storeCoords: LatLng;
  customerName: string;
  customerAddress: string;
  customerCoords: LatLng;
  distance: number; // in miles
  estimatedTime: number; // in minutes
  basePay: number;
  tipPay: number;
  promoPay: number;
  totalPay: number;
  items: OrderItem[];
  instructions: string;
  status: OrderStatus;
  offerExpiresAt: number; // timestamp in MS or percentage remaining
  createdAt: string; // "14:24 PM" etc
  completedAt?: string;
  orderNumber: string;
  proofPhoto?: string; // base64 or placeholder
}

export interface DriverStats {
  rating: number; // e.g. 4.92
  acceptanceRate: number; // e.g. 92%
  completionRate: number; // e.g. 98%
  onTimeRate: number; // e.g. 95%
  lifetimeDeliveries: number;
}

export interface DailyEarning {
  date: string; // "Mon", "Tue", etc.
  amount: number;
  deliveries: number;
}

export interface EarningSummary {
  todayEarnings: number;
  todayDeliveries: number;
  todayTimeMinutes: number; // Active hours/minutes
  weeklyHistory: DailyEarning[];
  orderHistory: Order[];
}
