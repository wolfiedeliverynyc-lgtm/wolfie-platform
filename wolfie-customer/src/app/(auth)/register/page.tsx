'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthCarousel from '@/components/auth/AuthCarousel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MAPBOX_TOKEN } from '@/lib/constants';
import { logger } from '@/utils/logger';

export default function RegisterPage() {
  const router = useRouter();
  const { register, sendOtp, verifyOtp } = useAuth();
  
  // Steps: 'register' | 'otp' | 'address'
  const [step, setStep] = useState<'register' | 'otp' | 'address'>('register');
  const [error, setError] = useState('');

  // Step 1: Register Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: OTP State
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);

  // Step 3: Address State
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [addressSearchInput, setAddressSearchInput] = useState('');
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressSaveLabel, setAddressSaveLabel] = useState('Home');

  // OTP resend timer
  useEffect(() => {
    if (step !== 'otp' || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  // GPS Address Helper
  const fetchGPSAddress = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsFetchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=address`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const firstFeature = data.features[0];
              const fullAddress = firstFeature.place_name.replace(', United States', '');
              setAddressSearchInput(fullAddress);
              setShowAddressSuggestions(false);
            } else {
              alert('No address found for these coordinates.');
            }
          } else {
            alert('Mapbox geocoding service failed.');
          }
        } catch (err) {
          logger.error('Failed to connect to geocoding service:', err);
          alert('Failed to connect to geocoding service.');
        } finally {
          setIsFetchingGPS(false);
        }
      },
      (error) => {
        setIsFetchingGPS(false);
        let msg = 'Failed to retrieve GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied by browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location position is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        alert(`${msg} Falling back to simulated Times Square address.`);
        setAddressSearchInput('123 Times Square, New York, NY 10036');
      }
    );
  };

  // Step 1 Submit: Register directly (Skip OTP)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !phone || !password) {
      setError('Please fill in all registration fields.');
      return;
    }

    try {
      // Complete Registration directly
      await register({
        email,
        password,
        full_name: fullName,
        phone,
        role: 'customer'
      });

      setStep('address');
    } catch (err: any) {
      let errMsg = err.response?.data?.error || err.message || 'Registration failed.';
      const details = err.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        const detailMsgs = details.map((d: any) => d.message).join(', ');
        errMsg = `${errMsg}: ${detailMsgs}`;
      }
      if (err.message === 'Network connection failed' || err.response?.status >= 500) {
        setError('Failed to connect to the server. Please check your internet connection.');
      } else {
        setError(errMsg);
      }
    }
  };

  // Step 3 Submit: Address Confirmation
  const handleConfirmAddress = async () => {
    if (!addressSearchInput.trim()) {
      alert('Please enter a delivery address.');
      return;
    }

    // Save location to local preferences (simulated, or sent to /auth/me in background)
    try {
      // Background save user preferences if profile exists
      // We will handle profile patch update using useAuth
      // Proceed to application dashboard
      router.push('/');
    } catch (err) {
      logger.error('Failed to save preferences:', err);
      router.push('/');
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left Side: Cover carousel */}
      <AuthCarousel />

      {/* Right Side: Authentication forms */}
      <div className="flex items-center justify-center bg-white p-8 lg:p-16">
        <div className="w-full max-w-[540px] flex flex-col justify-center text-left">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[12px] text-red-600 font-roboto text-[14px]">
              ⚠️ {error}
            </div>
          )}

          {step === 'register' && (
            <form onSubmit={handleRequestOtp} className="animate-fadeIn">
              <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Create Account</h2>
              <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Join Wolfie for premium New York delivery</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Simona Takahashi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="takahashi@wolfie.nyc"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 019-2831"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm mb-6"
              >
                Sign Up
              </button>

              <p className="text-center font-roboto text-[14px] text-[#A6A6A6]">
                Already have an account?{' '}
                <Link 
                  href="/login"
                  className="font-bold text-[#EF2A39] hover:underline focus:outline-none cursor-pointer"
                >
                  Sign In
                </Link>
              </p>
            </form>
          )}



          {step === 'address' && (
            <div className="animate-fadeIn select-none">
              <h2 className="font-poppins font-bold text-[32px] text-[#3C2F2F] mb-1">Set Location</h2>
              <p className="font-roboto text-[15px] text-[#A6A6A6] mb-8">Configure your Manhattan delivery coordinates</p>

              <div className="space-y-4 mb-6">
                <button 
                  type="button"
                  onClick={fetchGPSAddress}
                  className="w-full h-[54px] bg-red-50 hover:bg-red-100/70 border border-red-100 rounded-[16px] px-4 flex items-center justify-center gap-2 font-roboto font-bold text-[14.5px] text-[#EF2A39] cursor-pointer focus:outline-none transition-all active:scale-[0.99]"
                >
                  {isFetchingGPS ? (
                    <svg className="animate-spin h-5 w-5 text-[#EF2A39]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                    </svg>
                  )}
                  {isFetchingGPS ? 'Capturing Coordinates...' : 'Use Current GPS Location'}
                </button>

                <div className="relative">
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Search Address</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 123 Main St, NY"
                    value={addressSearchInput}
                    onChange={(e) => {
                      setAddressSearchInput(e.target.value);
                      setShowAddressSuggestions(e.target.value.length > 2);
                    }}
                    className="w-full h-[54px] border border-gray-200 rounded-[16px] px-4 font-roboto text-[14px] outline-none focus:border-[#EF2A39] transition-colors"
                  />
                  {showAddressSuggestions && (
                    <div className="absolute left-0 right-0 top-[85px] bg-white border border-gray-155 rounded-[16px] shadow-lg overflow-hidden z-20">
                      {['Times Square, Manhattan, NY', 'Madison Square Garden, NY', 'Central Park, New York, NY'].map((sug, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setAddressSearchInput(sug);
                            setShowAddressSuggestions(false);
                          }}
                          className="px-4 py-3 hover:bg-gray-50 font-roboto text-[13.5px] text-[#3C2F2F] cursor-pointer border-b border-gray-50 last:border-0"
                        >
                          📍 {sug}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-roboto font-bold text-[13px] text-[#3C2F2F] uppercase mb-2">Save Address As</label>
                  <div className="flex gap-2.5">
                    {['Home', 'Work', 'Gym', 'Other'].map((label) => (
                      <button 
                        key={label}
                        type="button"
                        onClick={() => setAddressSaveLabel(label)}
                        className={`flex-1 h-[44px] font-roboto font-bold text-[13px] rounded-[12px] border transition-all cursor-pointer focus:outline-none ${
                          addressSaveLabel === label 
                            ? 'bg-[#EF2A39] border-[#EF2A39] text-white shadow-sm' 
                            : 'bg-white border-gray-200 text-[#3C2F2F] hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleConfirmAddress}
                className="w-full h-[58px] bg-[#FFE100] hover:brightness-95 active:scale-98 text-[#3C2F2F] font-roboto font-bold text-[16px] rounded-[18px] transition-all cursor-pointer focus:outline-none shadow-sm"
              >
                Confirm Address & Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
