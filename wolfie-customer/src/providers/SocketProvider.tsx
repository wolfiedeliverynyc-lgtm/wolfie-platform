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
    // Force disconnect previous instance to ensure fresh initialization with current token
    disconnectSocket();

    logger.info(`Connecting to Socket server (Authenticated: ${!!token})`);
    
    const socketInstance = connectSocket();

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


