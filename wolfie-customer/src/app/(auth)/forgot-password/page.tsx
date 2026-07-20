'use client';

import React, { useState, useEffect, useRef } from 'react';
import AuthCarousel from '@/components/auth/AuthCarousel';
import Link from 'next/link';
import { apiRequest } from '@/utils/api';

type RecoveryStep = 'email' | 'otp' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<RecoveryStep>('email');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Timer states
  const [otpTimer, setOtpTimer] = useState(600); // 10 minutes limit
  const [resendTimer, setResendTimer] = useState(0); // 60 seconds resend cooldown
  const otpInputRefs = useRef<HTMLInputElement[]>([]);

  // OTP Countdown timer (10 mins) & Resend Cooldown (60s)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp') {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const res = await apiRequest('/auth/customer/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuth: true
    });
    setIsLoading(false);

    if (res.success) {
      setStep('otp');
      setOtpTimer(600);
      setResendTimer(60);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } else {
      setError(res.error || 'Failed to send recovery code. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setIsLoading(true);
    const res = await apiRequest('/auth/customer/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuth: true
    });
    setIsLoading(false);

    if (res.success) {
      setOtpTimer(600);
      setResendTimer(60);
      setOtp(Array(6).fill(''));
      otpInputRefs.current[0]?.focus();
    } else {
      setError(res.error || 'Failed to resend code.');
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    // Auto-focus next box
    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');

    if (code.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    if (otpTimer === 0) {
      setError('Code has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);
    const res = await apiRequest('/auth/customer/verify-reset-otp', {
      method: 'POST',
      body: { email, otp: code },
      skipAuth: true
    });
    setIsLoading(false);

    if (res.success) {
      setStep('reset');
    } else {
      setError(res.error || 'Invalid or expired code.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await apiRequest('/auth/customer/reset-password', {
      method: 'POST',
      body: { email, otp: otp.join(''), new_password: newPassword },
      skipAuth: true
    });
    setIsLoading(false);

    if (res.success) {
      setStep('success');
    } else {
      setError(res.error || 'Failed to reset password.');
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left Side: Onboarding Carousel */}
      <AuthCarousel />

      {/* Right Side: Reset Password form */}
      <div className="flex items-center justify-center bg-white p-8 lg:p-16">
        <div className="w-full max-w-[540px] flex flex-col justify-center text-left animate-fadeIn">
          {step !== 'success' && (
            <>
              <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Reset Password</h2>
              <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">
                {step === 'email' && "Enter your email and we'll send you a recovery code."}
                {step === 'otp' && "We've sent a 6-digit verification code to your email."}
                {step === 'reset' && "Set your new account credentials."}
              </p>
            </>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 font-roboto text-[14px] flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSendOtp}>
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
                {isLoading ? 'Sending Code...' : 'Send Recovery Code'}
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

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-4 text-center">Verification Code</label>
              
              <div className="flex justify-between gap-2.5 mb-8">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    ref={(el) => { if (el) otpInputRefs.current[idx] = el; }}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    disabled={isLoading}
                    className="w-12 h-14 md:w-16 md:h-16 border-2 border-gray-200 focus:border-[#EF2A39] text-center font-roboto font-bold text-[24px] rounded-[16px] outline-none transition-colors disabled:opacity-50"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between mb-8">
                <span className="font-roboto text-[14.5px] text-[#A6A6A6]">
                  Code expires in: <strong className="text-[#3C2F2F]">{formatTimer(otpTimer)}</strong>
                </span>
                
                <button
                  type="button"
                  disabled={resendTimer > 0 || isLoading}
                  onClick={handleResendOtp}
                  className={`font-roboto font-bold text-[14px] focus:outline-none ${
                    resendTimer > 0 || isLoading
                      ? 'text-[#A6A6A6] cursor-not-allowed'
                      : 'text-[#EF2A39] hover:underline cursor-pointer'
                  }`}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center disabled:opacity-50 mb-6"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full h-[58px] bg-white border border-gray-200 hover:bg-gray-50 text-[#3C2F2F] font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm mb-6"
              >
                Change Email
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Confirm New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? 'Saving Password...' : 'Save Password'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6 animate-scaleUp">
              <div className="w-[84px] h-[84px] bg-green-50 border border-green-200 rounded-full mx-auto flex items-center justify-center text-green-600 text-4xl animate-bounce">
                🎉
              </div>
              <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Password Changed!</h2>
              <p className="font-roboto text-[15.5px] text-green-700 bg-green-50 border border-green-100 rounded-[16px] p-4 leading-relaxed">
                Your password has been successfully reset. You can now sign in using your new credentials.
              </p>
              <Link
                href="/login"
                className="w-full h-[58px] bg-[#3C2F2F] text-white font-roboto font-bold text-[15px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-md flex items-center justify-center hover:bg-[#2A2020]"
              >
                Sign In Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
