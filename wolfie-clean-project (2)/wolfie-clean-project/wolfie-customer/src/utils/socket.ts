import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

const SOCKET_URL = 'http://localhost:5000';

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
