'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an analytics service or console
    console.error('[Global Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      <div className="max-w-[450px] space-y-6">
        {/* Animated Warning Icon */}
        <div className="w-20 h-20 bg-red-50 text-[#EF2A39] border border-red-100 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm animate-pulse">
          ⚠️
        </div>

        {/* Error Info */}
        <div className="space-y-2">
          <h1 className="font-poppins font-black text-2xl text-[#3C2F2F]">
            Something Went Wrong
          </h1>
          <p className="font-roboto text-sm text-[#A6A6A6] leading-relaxed">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
        </div>

        {/* Error Details Box (collapsible or discreet) */}
        {error.message && (
          <div className="bg-red-50/50 border border-red-100/50 rounded-2xl p-4 text-left max-h-[150px] overflow-y-auto">
            <span className="font-mono text-xs text-[#EF2A39] font-bold block mb-1">
              Error Digest
            </span>
            <code className="font-mono text-xs text-gray-600 block break-all">
              {error.message || 'Unknown runtime error'}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 px-6 py-3.5 bg-[#EF2A39] hover:bg-[#D61B29] text-white font-roboto font-bold text-sm rounded-[18px] transition-all cursor-pointer shadow-md active:scale-98"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="flex-1 px-6 py-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#3C2F2F] font-roboto font-bold text-sm rounded-[18px] transition-all cursor-pointer active:scale-98"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
