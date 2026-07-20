import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Lock, Mail, ArrowLeft, Check } from 'lucide-react';
import { restaurantAuth, setToken } from '../api';
import AuthCarousel from '../components/AuthCarousel';

const RestaurantAuth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Recovery States
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'otp' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotTimer, setForgotTimer] = useState(600);
  const [forgotResendTimer, setForgotResendTimer] = useState(0);

  // OTP Timers
  React.useEffect(() => {
    let interval;
    if (view === 'otp') {
      interval = setInterval(() => {
        setForgotTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setForgotResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await restaurantAuth.login({ email, password });
      setToken(data.access_token);
      
      // Fetch onboarding status to check if it's completed
      try {
        const { onboardingApi } = await import('../api');
        const statusData = await onboardingApi.getStatus();
        if (statusData.onboarding_complete) {
          navigate('/dashboard');
        } else {
          // If onboarding is incomplete, route back to onboarding setup
          navigate('/dashboard'); // dashboard mounts onboarding view if incomplete in store
        }
      } catch {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      await restaurantAuth.forgotPassword(forgotEmail);
      setView('otp');
      setForgotTimer(600);
      setForgotResendTimer(60);
      setTimeout(() => document.getElementById('r-otp-0')?.focus(), 100);
    } catch (err) {
      setForgotError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    const code = forgotOtp.join('');
    if (code.length < 6) {
      setForgotError('Please enter the complete 6-digit code.');
      return;
    }
    if (forgotTimer === 0) {
      setForgotError('Verification code has expired. Please request a new one.');
      return;
    }
    setForgotLoading(true);
    try {
      await restaurantAuth.verifyOtp(forgotEmail, code);
      setView('reset');
    } catch (err) {
      setForgotError(err.message || 'Invalid or expired code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    if (forgotNewPass.length < 8) {
      setForgotError('Password must be at least 8 characters.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    try {
      await restaurantAuth.resetPassword(forgotEmail, forgotOtp.join(''), forgotNewPass);
      alert('Password reset successfully! Please sign in.');
      setView('login');
      setForgotEmail('');
      setForgotOtp(['', '', '', '', '', '']);
      setForgotNewPass('');
      setForgotConfirmPass('');
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (forgotResendTimer > 0) return;
    setForgotError('');
    setForgotLoading(true);
    try {
      await restaurantAuth.forgotPassword(forgotEmail);
      setForgotTimer(600);
      setForgotResendTimer(60);
      setForgotOtp(['', '', '', '', '', '']);
      setTimeout(() => document.getElementById('r-otp-0')?.focus(), 100);
    } catch (err) {
      setForgotError(err.message || 'Failed to resend code.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] text-white font-['Poppins',sans-serif] flex overflow-y-auto selection:bg-[#FFE100] selection:text-black">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Hero Panel (Rotating Carousel) */}
        <AuthCarousel />

        {/* Right Side: Login Form */}
        <div className="flex items-center justify-center p-8 lg:p-16 overflow-y-auto bg-[#000000]">
          <div className="w-full max-w-[480px] space-y-10 text-left">

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <span className="text-2xl">🐺</span>
              <span className="font-extrabold text-xl text-white tracking-tight font-['Poppins',sans-serif]">Wolfie <span className="text-[#FFE100]">OS</span></span>
            </div>

            {/* Header */}
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFE100]/10 flex items-center justify-center text-[#FFE100] mb-6">
                <Lock size={22} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-['Poppins',sans-serif]">
                {view === 'login' ? 'Partner Login' : 'Recover Password'}
              </h1>
              <p className="text-[13px] uppercase tracking-[0.15em] text-[#94a3b8] font-['Poppins',sans-serif]">
                {view === 'login' ? 'Access your restaurant dashboard' : 'Verify your partner credentials'}
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-[#080808] rounded-[24px] p-8 space-y-6 relative overflow-hidden">
              {/* Top glow line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE100]/20 to-transparent" />
              
              {view === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5">
                  {error && (
                    <div className="bg-[#EF2A39]/10 border border-[#EF2A39]/20 text-[#EF2A39] text-[13px] px-4 py-3 rounded-xl font-bold font-['Poppins',sans-serif]">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] block font-['Poppins',sans-serif]">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail size={16} className="absolute left-4 text-[#94a3b8]/50" />
                      <input 
                        type="email" 
                        className="w-full h-[52px] bg-[#121212] border-none focus:ring-1 focus:ring-[#FFE100] rounded-xl pl-12 pr-4 text-white text-[14px] outline-none transition-all placeholder-[#94a3b8]/40 font-['Poppins',sans-serif]" 
                        placeholder="manager@restaurant.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] block font-['Poppins',sans-serif]">Password</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setView('forgot');
                          setForgotError('');
                        }}
                        className="text-[11px] text-[#FFE100] hover:underline font-bold uppercase tracking-[0.1em] font-['Poppins',sans-serif] bg-transparent border-none cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <Lock size={16} className="absolute left-4 text-[#94a3b8]/50" />
                      <input 
                        type="password" 
                        className="w-full h-[52px] bg-[#121212] border-none focus:ring-1 focus:ring-[#FFE100] rounded-xl pl-12 pr-4 text-white text-[14px] outline-none transition-all placeholder-[#94a3b8]/40 font-['Poppins',sans-serif]" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-[52px] bg-[#FFE100] hover:shadow-[0_0_30px_rgba(255,225,0,0.3)] active:scale-[0.98] text-black font-black uppercase tracking-[0.15em] text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none mt-2 font-['Poppins',sans-serif]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        Sign In to Dashboard
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {view === 'forgot' && (
                <form onSubmit={handleForgotSendOtp} className="space-y-5">
                  {forgotError && (
                    <div className="bg-[#EF2A39]/10 border border-[#EF2A39]/20 text-[#EF2A39] text-[13px] px-4 py-3 rounded-xl font-bold font-['Poppins',sans-serif]">
                      {forgotError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] block font-['Poppins',sans-serif]">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail size={16} className="absolute left-4 text-[#94a3b8]/50" />
                      <input 
                        type="email" 
                        className="w-full h-[52px] bg-[#121212] border-none focus:ring-1 focus:ring-[#FFE100] rounded-xl pl-12 pr-4 text-white text-[14px] outline-none transition-all placeholder-[#94a3b8]/40 font-['Poppins',sans-serif]" 
                        placeholder="manager@restaurant.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={forgotLoading}
                    className="w-full h-[52px] bg-[#FFE100] hover:shadow-[0_0_30px_rgba(255,225,0,0.3)] active:scale-[0.98] text-black font-black uppercase tracking-[0.15em] text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none mt-2 font-['Poppins',sans-serif] disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        Send Recovery Code
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setView('login')}
                    className="w-full h-[52px] bg-[#121212] hover:bg-[#1e1e1e] text-white font-bold uppercase tracking-[0.15em] text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </button>
                </form>
              )}

              {view === 'otp' && (
                <form onSubmit={handleForgotVerifyOtp} className="space-y-5">
                  {forgotError && (
                    <div className="bg-[#EF2A39]/10 border border-[#EF2A39]/20 text-[#EF2A39] text-[13px] px-4 py-3 rounded-xl font-bold font-['Poppins',sans-serif]">
                      {forgotError}
                    </div>
                  )}

                  <div className="text-center space-y-1">
                    <p className="text-xs text-[#94a3b8]">
                      Verification code sent to email. Code expires in: <strong className="text-[#FFE100]">
                        {Math.floor(forgotTimer / 60)}:{(forgotTimer % 60).toString().padStart(2, '0')}
                      </strong>
                    </p>
                  </div>

                  <div className="flex justify-between gap-2.5">
                    {forgotOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`r-otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const newOtp = [...forgotOtp];
                          newOtp[idx] = val;
                          setForgotOtp(newOtp);
                          if (val && idx < 5) {
                            document.getElementById(`r-otp-${idx + 1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !forgotOtp[idx] && idx > 0) {
                            document.getElementById(`r-otp-${idx - 1}`)?.focus();
                          }
                        }}
                        disabled={forgotLoading}
                        className="w-12 h-12 bg-[#121212] border-none text-center font-bold text-lg rounded-xl text-white outline-none focus:ring-1 focus:ring-[#FFE100] disabled:opacity-50"
                      />
                    ))}
                  </div>

                  <button 
                    type="submit" 
                    disabled={forgotLoading}
                    className="w-full h-[52px] bg-[#FFE100] text-black font-black uppercase tracking-[0.15em] text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      'Verify Code'
                    )}
                  </button>

                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-[#94a3b8] hover:text-white bg-transparent border-none cursor-pointer"
                    >
                      Change Email
                    </button>

                    <button
                      type="button"
                      disabled={forgotResendTimer > 0 || forgotLoading}
                      onClick={handleForgotResendOtp}
                      className={`${
                        forgotResendTimer > 0 
                          ? 'text-[#94a3b8]/50 cursor-not-allowed' 
                          : 'text-[#FFE100] hover:underline cursor-pointer'
                      } bg-transparent border-none`}
                    >
                      {forgotResendTimer > 0 ? `Resend in ${forgotResendTimer}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}

              {view === 'reset' && (
                <form onSubmit={handleForgotResetPassword} className="space-y-5">
                  {forgotError && (
                    <div className="bg-[#EF2A39]/10 border border-[#EF2A39]/20 text-[#EF2A39] text-[13px] px-4 py-3 rounded-xl font-bold font-['Poppins',sans-serif]">
                      {forgotError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] block font-['Poppins',sans-serif]">New Password</label>
                    <div className="relative flex items-center">
                      <Lock size={16} className="absolute left-4 text-[#94a3b8]/50" />
                      <input 
                        type="password" 
                        className="w-full h-[52px] bg-[#121212] border-none focus:ring-1 focus:ring-[#FFE100] rounded-xl pl-12 pr-4 text-white text-[14px] outline-none transition-all placeholder-[#94a3b8]/40 font-['Poppins',sans-serif]" 
                        placeholder="••••••••"
                        value={forgotNewPass}
                        onChange={(e) => setForgotNewPass(e.target.value)}
                        required
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] block font-['Poppins',sans-serif]">Confirm New Password</label>
                    <div className="relative flex items-center">
                      <Lock size={16} className="absolute left-4 text-[#94a3b8]/50" />
                      <input 
                        type="password" 
                        className="w-full h-[52px] bg-[#121212] border-none focus:ring-1 focus:ring-[#FFE100] rounded-xl pl-12 pr-4 text-white text-[14px] outline-none transition-all placeholder-[#94a3b8]/40 font-['Poppins',sans-serif]" 
                        placeholder="••••••••"
                        value={forgotConfirmPass}
                        onChange={(e) => setForgotConfirmPass(e.target.value)}
                        required
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={forgotLoading}
                    className="w-full h-[52px] bg-[#FFE100] text-black font-black uppercase tracking-[0.15em] text-[13px] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      'Save Password'
                    )}
                  </button>
                </form>
              )}

              {view === 'login' && (
                <div className="text-center text-[12px] text-[#94a3b8] pt-4 border-t border-white/5 font-['Poppins',sans-serif]">
                  Not a partner yet? <Link to="/register" className="text-[#FFE100] hover:underline font-bold ml-1">Apply Now</Link>
                </div>
              )}
            </div>

            {/* Bottom security note */}
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#94a3b8]/40 text-center font-['Poppins',sans-serif]">
              Secured with 256-bit encryption · Wolfie Inc. © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantAuth;
