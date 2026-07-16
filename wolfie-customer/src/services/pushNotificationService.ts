// Push Notification Service for Wolfie PWA
// Handles subscription to Web Push notifications

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://wolfie-backend-pt9u.onrender.com';

export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Request permission and subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    // Check if service worker and push are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Service Worker or PushManager not supported');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied');
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.error('[Push] Service Worker not registered');
      return false;
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });

      // Send subscription to backend
      await sendSubscriptionToBackend(subscription);
    }

    console.log('[Push] Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('[Push] Error subscribing to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Notify backend to unsubscribe
      await sendUnsubscriptionToBackend(subscription.endpoint);
      // Unsubscribe locally
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    return false;
  }
}

/**
 * Check if user is already subscribed to push
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('[Push] Error checking subscription status:', error);
    return false;
  }
}

/**
 * Send push subscription to backend
 */
async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  const endpoint = `${API_BASE}/api/v1/notifications/subscribe`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscription: subscription.toJSON
        ? subscription.toJSON()
        : {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime,
            keys: subscription.keys,
          },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to subscribe on backend: ${response.statusText}`);
  }
}

/**
 * Notify backend to unsubscribe
 */
async function sendUnsubscriptionToBackend(endpoint: string): Promise<void> {
  const apiEndpoint = `${API_BASE}/api/v1/notifications/unsubscribe`;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    console.warn(`Failed to unsubscribe on backend: ${response.statusText}`);
  }
}

/**
 * Convert VAPID key from base64
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Show a test notification (for development)
 */
export async function showTestNotification(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return;
    }

    await registration.showNotification('Wolfie Test Notification', {
      badge: '/icon-192x192.png',
      icon: '/icon-192x192.png',
      body: 'This is a test notification from Wolfie.',
      tag: 'test-notification',
    });
  } catch (error) {
    console.error('[Push] Error showing test notification:', error);
  }
}
