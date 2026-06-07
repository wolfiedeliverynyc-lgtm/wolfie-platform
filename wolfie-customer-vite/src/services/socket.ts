import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: {
      token
    },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
