// This file handles service worker events for offline fallback
// Next.js PWA plugin will automatically register the service worker

// Notify app when going offline/online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Wolfie PWA] Back online');
    // Could dispatch an event to Redux/store to refetch critical data
  });

  window.addEventListener('offline', () => {
    console.log('[Wolfie PWA] Going offline');
    // Could dispatch an event to Redux/store to disable forms/inputs
  });
}
