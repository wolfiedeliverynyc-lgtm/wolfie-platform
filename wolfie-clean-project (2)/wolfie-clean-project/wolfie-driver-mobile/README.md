# 🐺 Wolfie Driver - Native Mobile App (React Native & Expo)

This directory contains the React Native + Expo implementation of the Wolfie Driver app. Currently, it functions as a high-fidelity UI mockup shell.

---

## 🛠️ Configuration & Environment Setup

To keep tokens secure and avoid credential leakage during App Store / Google Play builds, Mapbox tokens and API URLs should be loaded from environment variables rather than being hardcoded in code assets.

### 1. Mapbox Tokens
Expo dynamically loads environment variables prefixed with `EXPO_PUBLIC_` into the application bundle at build time:
1. Create a `.env` file in this directory:
   ```env
   EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
   EXPO_PUBLIC_API_URL=https://api.wolfie.delivery
   ```
2. The app will automatically load `process.env.EXPO_PUBLIC_MAPBOX_TOKEN` inside `HomeScreen.tsx`.

> [!WARNING]
> **Mapbox Download Token**: In `app.json`, the download token `"RNMapboxMapsDownloadToken"` is used by the compiler to pull native Mapbox binaries. In production, this must be set to your private Mapbox **Secret Download Token** (`sk.eyJ1...`) with downloads scope enabled.

---

## 🔗 Connecting to the Backend API & WebSockets

To transition this UI shell into a live, functioning app connected to the Wolfie Telemetry Backend:

### 1. Install Network Libraries
Install standard networking and WebSocket clients:
```bash
npm install axios socket.io-client
```

### 2. Implement API Client & Authentication
Create `src/services/api.ts` to coordinate HTTP requests (mirroring `wolfie-customer-vite`):
```typescript
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
});

export const setAuthHeader = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};
```

### 3. Wire Up Zustand Store & WebSockets
Update `src/store/useDriverStore.ts` to coordinate live telemetry. Connect to the Flask backend's Socket.IO server:
```typescript
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const connectDriverSocket = (token: string, driverId: string) => {
  const socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('Telemetry connected');
  });

  // Listen to new orders assigned by smart matching engine
  socket.on('new_order', (order) => {
    // Show modal, play offers chirp, etc.
  });

  // Periodic heartbeat tracking loop (every 5 seconds)
  setInterval(() => {
    if (socket.connected) {
      socket.emit('driver_location_update', {
        driver_id: driverId,
        lat: currentLatitude,
        lng: currentLongitude,
        state: 'available',
      });
    }
  }, 5000);
};
```
