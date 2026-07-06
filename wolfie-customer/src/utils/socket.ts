import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket) return socket;

  const token = getAuthToken();
  socket = io(SOCKET_URL, {
    auth: {
      token: token || undefined,
    },
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10, // Stop retrying after 10 failed attempts
    reconnectionDelay: 2000,  // Start with 2 seconds delay
    reconnectionDelayMax: 15000, // Cap at 15 seconds max delay
    randomizationFactor: 0.5, // Randomize to prevent server DDOS when recovering
  });

  socket.on('connect', () => {
    console.log('[Socket.IO Connected to Wolfie Server]');
  });

  socket.on('disconnect', () => {
    console.log('[Socket.IO Disconnected]');
  });

  socket.connect();
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
