import { io, Socket } from 'socket.io-client';

// Adjust the URL to point to your backend realtime endpoint.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

// Create a singleton socket instance.
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Optional helper to manually connect/disconnect.
export const connectSocket = () => {
  if (!socket.connected) {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        socket.auth = { token };
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
