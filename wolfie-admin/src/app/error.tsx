'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Admin Global Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="max-w-[450px] space-y-6">
        {/* Glowing Warning Icon */}
        <div className="w-20 h-20 bg-red-950/40 text-red-500 border border-red-900/50 rounded-full flex items-center justify-center text-3xl mx-auto shadow-lg shadow-red-950/20 animate-pulse">
          
        </div>

        {/* Error Info */}
        <div className="space-y-2">
          <h1 className="font-poppins font-black text-2xl tracking-tight text-white uppercase">
            Admin System Failure
          </h1>
          <p className="font-roboto text-sm text-gray-400 leading-relaxed">
            An error occurred loading the dashboard panel. The core state has been protected.
          </p>
        </div>

        {/* Error Digest Box */}
        {error.message && (
          <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-4 text-left max-h-[150px] overflow-y-auto">
            <span className="font-mono text-xs text-red-400 font-bold block mb-1">
              Error Digest
            </span>
            <code className="font-mono text-xs text-gray-300 block break-all">
              {error.message || 'Unknown admin console crash'}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-roboto font-bold text-sm rounded-[18px] transition-all cursor-pointer shadow-md active:scale-98"
          >
            Re-init Operations
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="flex-1 px-6 py-3.5 bg-[#1F2937] hover:bg-[#374151] border border-gray-700 text-gray-300 font-roboto font-bold text-sm rounded-[18px] transition-all cursor-pointer active:scale-98"
          >
            Terminal Home
          </button>
        </div>
      </div>
    </div>
  );
}
