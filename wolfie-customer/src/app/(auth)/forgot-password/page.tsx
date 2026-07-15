'use client';

import React, { useState } from 'react';
import AuthCarousel from '@/components/auth/AuthCarousel';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    // Simulate API request delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left Side: Onboarding Carousel */}
      <AuthCarousel />

      {/* Right Side: Reset Password form */}
      <div className="flex items-center justify-center bg-white p-8 lg:p-16">
        <div className="w-full max-w-[540px] flex flex-col justify-center text-left animate-fadeIn">
          <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Reset Password</h2>
          <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">
            {submitted 
              ? "We've sent a link to recover your account." 
              : "Enter your email and we'll send you a recovery link."}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 font-roboto text-[14px]">
              ⚠️ {error}
            </div>
          )}

          {submitted ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-[12px] text-green-700 font-roboto text-[14.5px]">
                🎉 An email with password reset instructions has been sent to <strong>{email}</strong> if it exists in our system.
              </div>
              <Link
                href="/login"
                className="w-full h-[58px] bg-[#3C2F2F] text-white font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-md flex items-center justify-center gap-2 hover:bg-[#2A2020]"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="takahashi@wolfie.nyc"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center disabled:opacity-50 mb-6"
              >
                {isLoading ? 'Sending Link...' : 'Send Recovery Link'}
              </button>

              <p className="text-center font-roboto text-[14px] text-[#A6A6A6]">
                Remember your password?{' '}
                <Link 
                  href="/login"
                  className="font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
                >
                  Sign In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
