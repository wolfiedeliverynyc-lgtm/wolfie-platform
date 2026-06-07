import React, { ReactNode } from 'react';

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-lg border bg-white shadow-sm ${className}`}> {children} </div>
);

export const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`p-4 border-b ${className}`}> {children} </div>
);

export const CardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}> {children} </h3>
);

export const CardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`p-4 ${className}`}> {children} </div>
);
