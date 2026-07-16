import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { restaurantAuth, setToken } from '../api';
import AuthCarousel from '../components/AuthCarousel';

const RestaurantAuth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-['Poppins',sans-serif]">Partner Login</h1>
              <p className="text-[13px] uppercase tracking-[0.15em] text-[#94a3b8] font-['Poppins',sans-serif]">Access your restaurant dashboard</p>
            </div>

            {/* Form Card */}
            <div className="bg-[#080808] rounded-[24px] p-8 space-y-6 relative overflow-hidden">
              {/* Top glow line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE100]/20 to-transparent" />
              
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
                    <a href="#" className="text-[11px] text-[#FFE100] hover:underline font-bold uppercase tracking-[0.1em] font-['Poppins',sans-serif]">Forgot?</a>
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

              <div className="text-center text-[12px] text-[#94a3b8] pt-4 border-t border-white/5 font-['Poppins',sans-serif]">
                Not a partner yet? <Link to="/register" className="text-[#FFE100] hover:underline font-bold ml-1">Apply Now</Link>
              </div>
            </div>

            {/* Bottom security note */}
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#94a3b8]/40 text-center font-['Poppins',sans-serif]">
              Secured with 256-bit encryption · Wolfie Inc. © 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantAuth;
