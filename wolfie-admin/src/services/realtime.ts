import { io, Socket } from 'socket.io-client';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://wolfie-backend-pt9u.onrender.com')
  .replace(/\/api\/v1\/?$/, '');

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE;

// Create a singleton socket instance.
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// Optional helper to manually connect/disconnect.
export const connectSocket = () => {
  if (!socket.connected) {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        socket.auth = { token };
        if (socket.io && socket.io.opts) {
          (socket.io.opts as any).query = { token };
        }
      }
    }
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
