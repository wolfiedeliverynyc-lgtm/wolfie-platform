import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://wolfie-backend-pt9u.onrender.com';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket) return socket;

  const token = getAuthToken();
  console.log(`[Socket.IO] Initializing connection to ${SOCKET_URL} (Authenticated: ${!!token})`);
  
  socket = io(SOCKET_URL, {
    auth: {
      token: token || undefined,
    },
    transports: ['websocket'],
    autoConnect: false,
  });

  socket.on('connect', () => {
    console.log('[Socket.IO Connected to Wolfie Server]');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO Disconnected]:', reason);
  });

  socket.connect();
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket.IO] Disconnecting and cleaning up instance');
    socket.disconnect();
    socket = null;
  }
};

