'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthCarousel from '@/components/auth/AuthCarousel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setError('');

    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;

    if (!targetEmail || !targetPassword) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      await login({ email: targetEmail, password: targetPassword });
      router.push('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Login failed. Please check your credentials.';
      setError(errMsg);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left Side: Onboarding Carousel */}
      <AuthCarousel />

      {/* Right Side: Authentication form */}
      <div className="flex items-center justify-center bg-white p-8 lg:p-16">
        <form onSubmit={(e) => handleSignIn(e)} className="w-full max-w-[540px] flex flex-col justify-center text-left animate-fadeIn">
          <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Welcome Back</h2>
          <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Sign in to search Manhattan's best kitchens</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 font-roboto text-[14px]">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Email or Phone</label>
              <input 
                type="text" 
                placeholder="e.g. takahashi@wolfie.nyc"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-8 text-left">
            <Link 
              href="/forgot-password"
              className="font-roboto font-bold text-[13.5px] text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="space-y-3.5">
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing In...' : 'Sign In'}
            </button>

            <button 
              type="button"
              disabled={isLoggingIn}
              onClick={() => handleSignIn(undefined, 'customer_demo@wolfie.delivery', 'password123')}
              className="w-full h-[58px] bg-[#3C2F2F] hover:bg-[#2A2020] text-white font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Bypass & Test App
            </button>
          </div>

          <p className="mt-8 text-center font-roboto text-[14px] text-[#A6A6A6]">
            Don't have an account?{' '}
            <Link 
              href="/register"
              className="font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
            >
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
