'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { logger } from '@/utils/logger';
import { getAuthToken } from '@/utils/api';
import { connectSocket, disconnectSocket } from '@/utils/socket';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Poll for token changes to update socket auth dynamically
  useEffect(() => {
    setToken(getAuthToken());

    const interval = setInterval(() => {
      const currentToken = getAuthToken();
      if (currentToken !== token) {
        setToken(currentToken);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const socketInstance = connectSocket();

    // Update socket auth token dynamically and reconnect only if the token actually changed
    const currentSocketToken = (socketInstance.auth as any)?.token;
    const targetToken = token || undefined;

    if (currentSocketToken !== targetToken) {
      logger.info(`Updating socket token & reconnecting (Authenticated: ${!!token})`);
      (socketInstance.auth as any).token = targetToken;
      if (socketInstance.connected) {
        socketInstance.disconnect().connect();
      } else {
        socketInstance.connect();
      }
    } else if (!socketInstance.connected) {
      logger.info('Socket not connected, connecting...');
      socketInstance.connect();
    }

    setIsConnected(socketInstance.connected);

    const onConnect = () => {
      logger.info('Socket connected:', socketInstance.id);
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      logger.warn('Socket disconnected:', reason);
      setIsConnected(false);
    };

    const onConnectError = (err: any) => {
      logger.error('Socket connection error:', err);
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);

    setSocket(socketInstance);

    return () => {
      logger.info('Cleaning up socket event listeners...');
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onConnectError);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};


