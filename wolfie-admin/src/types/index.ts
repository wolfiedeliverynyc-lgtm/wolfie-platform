// src/types/index.ts

export type AdminType = 
  | 'super_admin' 
  | 'operations_admin' 
  | 'finance_admin' 
  | 'support_admin' 
  | 'fraud_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  admin_type?: AdminType;
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  rating: number;
  commissionPct: number;
  status: 'active' | 'paused' | 'suspended';
  zone: string;
  operational_status?: 'open' | 'paused' | 'busy' | 'delayed';
  prep_delay_minutes?: number;
  kitchen_delay?: boolean;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  merchant_id: string;
  merchant_name: string;
  driver_id?: string;
  driver_name?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  zone: string;
  eta_minutes?: number;
  fraud_score?: number;
  priority?: boolean;
  timeline?: Array<{ status: string; timestamp: string }>;
  created_at: string;
  updated_at: string;
  items?: Array<{ name: string; price: number; quantity: number }>;
  subtotal?: number;
  delivery_fee?: number;
  service_fee?: number;
  total?: number;
  pickup_address?: string;
  delivery_address?: string;
  merchant_address?: string;
  payment_method?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  zone: string;
  status: 'available' | 'preparing' | 'delivering' | 'offline';
  rating: number;
  completed_trips: number;
  current_order_id?: string;
  active_order_ids?: string[];
  lat?: number;
  lng?: number;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  customer_name?: string;
  order_id?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  assigned_to?: string;
  ai_summary?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

export interface RefundRequest {
  id: string;
  order_id: string;
  user_id: string;
  customer_name?: string;
  refund_type: string;
  amount_requested: number;
  recommended_amount?: number;
  fraud_score?: number;
  evidence_data?: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied' | 'approved_partial';
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FraudFlag {
  id: string;
  user_id: string;
  customer_name?: string;
  risk_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  evidence?: Record<string, unknown>;
  status: 'open' | 'resolved' | 'ignored';
  created_at: string;
}

export interface WAPModelMetrics {
  id: string;
  restaurant_id?: string;
  restaurant_name?: string;
  mae: number;
  rmse: number;
  mape: number;
  r2_score: number;
  training_samples: number;
  feature_importance?: string; // JSON string
  model_version: string;
  trained_at: string;
}

export interface OperationalAlert {
  id: string;
  type: 'dispatch_overload' | 'driver_shortage' | 'high_cancellation_rate' | 'restaurant_offline' | 'fraud_detection' | 'payment_failures' | 'sla_violation' | 'wap_prediction_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  acknowledged: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

