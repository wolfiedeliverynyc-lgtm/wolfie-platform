import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'table' | 'line';
  rows?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'line',
  rows = 3,
  className = '',
}) => {
  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 h-32">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`border border-gray-200 rounded-lg bg-white overflow-hidden animate-pulse ${className}`}>
        <div className="bg-gray-50 border-b border-gray-200 h-10 flex items-center px-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/5"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Line variant
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${100 - i * 15}%` }}></div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
