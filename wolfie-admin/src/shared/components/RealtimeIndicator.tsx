"use client";
import React from 'react';
import { useRealtime } from '@/hooks/useRealtime';

export const RealtimeIndicator: React.FC = () => {
  const { status } = useRealtime();

  const color = {
    connected: 'bg-green-500',
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-500',
  }[status];

  return (
    <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={`Socket ${status}`} />
  );
};

export default RealtimeIndicator;
