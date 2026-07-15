"use client";
import { useEffect, useState } from 'react';
import { socket, connectSocket, disconnectSocket } from '@/services/realtime';
import { useDashboardStore } from '@/stores/dashboardStore';

/**
 * Hook to expose the realtime socket connection status.
 * Returns one of: 'connected' | 'disconnected' | 'connecting'.
 */
export function useRealtime() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  useEffect(() => {
    // Start connecting when the hook is first used.
    connectSocket();

    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Bind Admin & Operations Events
    socket.on('driver_location', (data: { driver_id: string; lat: number; lng: number }) => {
      useDashboardStore.getState().updateDriver({
        id: data.driver_id,
        lat: data.lat,
        lng: data.lng,
      });
      useDashboardStore.getState().addActivity({
        text: `Driver #${data.driver_id.substring(0, 5)} updated GPS coordinates`,
        color: "var(--text-muted)"
      });
    });

    socket.on('order_status_update', (data: { order_id: string; status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled'; driver_id?: string; eta_minutes?: number }) => {
      useDashboardStore.getState().updateOrder({
        id: data.order_id,
        status: data.status,
        driver_id: data.driver_id,
        eta_minutes: data.eta_minutes,
      });
      useDashboardStore.getState().addActivity({
        text: `Order #${data.order_id.substring(0, 8)} transitioned to status [${data.status}]`,
        color: "var(--accent)"
      });
    });

    socket.on('driver_availability', (data: { driver_id: string; is_available: boolean }) => {
      useDashboardStore.getState().updateDriver({
        id: data.driver_id,
        status: data.is_available ? 'available' : 'offline',
      });
      useDashboardStore.getState().addActivity({
        text: `Driver #${data.driver_id.substring(0, 5)} is now ${data.is_available ? 'Online' : 'Offline'}`,
        color: data.is_available ? "var(--status-green)" : "var(--status-gray)"
      });
    });

    socket.on('admin_alert', (data: { 
      type: 'dispatch_overload' | 'driver_shortage' | 'high_cancellation_rate' | 'restaurant_offline' | 'fraud_detection' | 'payment_failures' | 'sla_violation' | 'wap_prediction_drift'; 
      data?: { severity?: 'low' | 'medium' | 'high' | 'critical'; message?: string; [key: string]: unknown }; 
      message?: string 
    }) => {
      useDashboardStore.getState().addAlert({
        type: data.type || 'dispatch_overload',
        severity: data.data?.severity || 'medium',
        message: data.message || data.data?.message || 'Operational alert triggered',
        metadata: data.data,
      });
    });

    socket.on('support_ticket_update', (data: { ticket_id: string; status: string }) => {
      useDashboardStore.getState().fetchTickets();
      useDashboardStore.getState().addActivity({
        text: `Support ticket #${data.ticket_id.substring(0, 5)} updated to [${data.status}]`,
        color: "var(--status-amber)"
      });
    });

    socket.on('fraud_flag_alert', (data: { user_id: string; risk_type: string }) => {
      useDashboardStore.getState().fetchFlags();
      useDashboardStore.getState().addAlert({
        type: 'fraud_detection',
        severity: 'high',
        message: `Fraud alert: Suspicious activity (${data.risk_type}) detected for user #${data.user_id.substring(0, 5)}`,
        metadata: data,
      });
    });

    socket.on('restaurant_delay_alert', (data: { restaurant_id: string; delay_min: number }) => {
      useDashboardStore.getState().addAlert({
        type: 'restaurant_offline',
        severity: 'medium',
        message: `Merchant Delay: Bottleneck detected at restaurant #${data.restaurant_id.substring(0, 5)} (+${data.delay_min} min delay)`,
        metadata: data,
      });
    });

    socket.on('payment_confirmed', (data: { order_id: string }) => {
      useDashboardStore.getState().updateOrder({
        id: data.order_id,
        status: 'preparing',
      });
      useDashboardStore.getState().addActivity({
        text: `Payment confirmed for order #${data.order_id.substring(0, 8)}`,
        color: "var(--status-green)"
      });
    });

    socket.on('payment_failed', (data: { order_id: string; reason?: string }) => {
      useDashboardStore.getState().addAlert({
        type: 'payment_failures',
        severity: 'high',
        message: `Payment failed for order #${data.order_id.substring(0, 8)}`,
        metadata: data,
      });
    });

    // Cleanup on unmount.
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('driver_location');
      socket.off('order_status_update');
      socket.off('driver_availability');
      socket.off('admin_alert');
      socket.off('support_ticket_update');
      socket.off('fraud_flag_alert');
      socket.off('restaurant_delay_alert');
      socket.off('payment_confirmed');
      socket.off('payment_failed');
      disconnectSocket();
    };
  }, []);

  return { status };
}

export default useRealtime;
