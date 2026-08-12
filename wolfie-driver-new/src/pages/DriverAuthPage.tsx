import React, { useState } from 'react'
import { useDriverStore } from '../store/useDriverStore'
import {
  Shield, Check, User, Mail, Phone, Lock, Eye, EyeOff,
  Bike, Car, Compass, FileText, ArrowRight, ArrowLeft, Upload, Smartphone, Zap
} from 'lucide-react'
import { API_BASE } from '../lib/api'

const onboardingSlides = [
  {
    image: './driver_onboarding_cover.png',
    title: 'Maximize Your Ride\'s Earning Potential',
    desc: 'Join NYC\'s fastest delivery network. Wolfie offers dynamic order dispatching, priority hotspots, and instant Zelle cashouts. Deliver on your terms, earn premium rates.'
  },
  {
    image: './onboarding_radar_ny.png',
    title: 'Advanced Radar Dispatching',
    desc: 'Get priority matching with nearby orders. Our smart routing algorithms calculate the fastest pathways to keep you moving and earning.'
  },
  {
    image: './onboarding_bklyn.jpg',
    title: 'Brooklyn to Manhattan Coverage',
    desc: 'Explore high-demand areas with visual heatmaps. Drive in coordinates with active surge multipliers and premium rates during peak hours.'
  }
];

export default function DriverAuthPage() {
  const { theme, setOnline, setDriverProfile, setKycStatus, setOnboarded, setToken } = useDriverStore()
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login')
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [registering, setRegistering] = useState(false)

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'reset' | 'success'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotTimer, setForgotTimer] = useState(600);
  const [forgotResendTimer, setForgotResendTimer] = useState(0);

  React.useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (activeTab === 'forgot' && forgotStep === 'otp') {
      timerInterval = setInterval(() => {
        setForgotTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setForgotResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [activeTab, forgotStep]);

  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/driver/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');
      setForgotStep('otp');
      setForgotTimer(600);
      setForgotResendTimer(60);
      setTimeout(() => document.getElementById('forgot-otp-0')?.focus(), 100);
    } catch (err: any) {
      setForgotError(err.message || 'Error occurred.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
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
      const res = await fetch(`${API_BASE}/auth/driver/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired verification code.');
      setForgotStep('reset');
    } catch (err: any) {
      setForgotError(err.message || 'Error occurred.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
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
      const res = await fetch(`${API_BASE}/auth/driver/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp.join(''), new_password: forgotNewPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
      setForgotStep('success');
    } catch (err: any) {
      setForgotError(err.message || 'Error occurred.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    if (forgotResendTimer > 0) return;
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/driver/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code.');
      setForgotTimer(600);
      setForgotResendTimer(60);
      setForgotOtp(['', '', '', '', '', '']);
      setTimeout(() => document.getElementById('forgot-otp-0')?.focus(), 100);
    } catch (err: any) {
      setForgotError(err.message || 'Error occurred.');
    } finally {
      setForgotLoading(false);
    }
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % onboardingSlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])
  
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loginError, setLoginError] = useState('')
  
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'Motorcycle',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleColor: '',
    profilePhoto: ''
  })
  
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [otpCodes, setOtpCodes] = useState(['', '', '', '', '', ''])
  const [otpSent, setOtpSent] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(60)
  const [otpError, setOtpError] = useState('')
  const [otpVerifying, setOtpVerifying] = useState(false)

  const registerDriverOnBackend = async () => {
    setRegistering(true);
    try {
      const apiUrl = API_BASE;
      // 1. Try to register on backend
      const regRes = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password,
          role: 'driver',
          full_name: formData.name,
          phone: formData.phone,
          vehicle_type: formData.vehicleType,
          vehicle_plate: formData.vehiclePlate,
          vehicle_model: formData.vehicleModel,
          profile_photo: formData.profilePhoto
        })
      });
      
      const regData = await regRes.json();
      if (!regRes.ok) {
        let errMsg = regData.error || 'Failed to register account.';
        if (regData.details && Array.isArray(regData.details) && regData.details.length > 0) {
          const detailMsgs = regData.details.map((d: any) => d.message).join(', ');
          errMsg = `${errMsg}: ${detailMsgs}`;
        }
        throw new Error(errMsg);
      }
      
      // 2. Log in to get the JWT token
      const logRes = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          password: formData.password
        })
      });
      
      const logData = await logRes.json();
      if (!logRes.ok) {
        throw new Error(logData.error || 'Registration succeeded, but failed to log in.');
      }
      
      document.cookie = `wolfie_auth_token=${logData.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
      setToken(logData.access_token);
      setStep(5); // Go directly to Step 5, skipping Step 4 (OTP)
    } catch (err: any) {
      alert(err.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    try {
      setLoginError('')
      const apiUrl = API_BASE;
      
      const identity = loginPhone.trim();
      const isEmail = identity.includes('@');
      
      // Map the seeded test driver phone number to its email for login
      const cleanPhone = identity.replace(/\D/g, '');
      const testDriverPhone = '+1 (555) 019-4444'.replace(/\D/g, '');
      
      let loginEmail = identity;
      if (!isEmail) {
        if (cleanPhone === testDriverPhone || cleanPhone === '5550194444' || cleanPhone === '0194444') {
          loginEmail = 'driver_demo@wolfie.delivery';
        } else {
          loginEmail = `${cleanPhone || 'driver'}@test.com`;
        }
      }

      // Try logging in to the backend first
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.toLowerCase(),
          password: loginPass
        })
      });
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      // Login succeeded
      setDriverProfile({
        name: data.full_name || 'Driver',
        email: loginEmail,
        phone: data.phone || identity || '+1-XXX-XXX-XXXX',
        vehicleType: data.vehicle_type || 'Vehicle',
        vehiclePlate: data.vehicle_plate || 'TBD',
        vehicleModel: data.vehicle_model || 'Not specified',
        profilePhoto: data.profile_photo || '/assets/default_driver_avatar.png'
      });
      document.cookie = `wolfie_auth_token=${data.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
      setToken(data.access_token);
      
      const userKycStatus = data.kyc_status || 'not_started';
      setKycStatus(userKycStatus);
      setOnboarded(userKycStatus === 'approved');
      setOnline(userKycStatus === 'approved');
    } catch (err: any) {
      setLoginError(err.message)
    }
  }

  const triggerMockOtp = () => {
    setOtpSent(true)
    setOtpCountdown(60)
    setOtpError('')
    console.log('MOCK OTP CODE:', formData.phone, 'CODE IS: 888888')
    const interval = setInterval(() => {
      setOtpCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return
    const newCodes = [...otpCodes]
    newCodes[idx] = val.slice(-1)
    setOtpCodes(newCodes)
    setOtpError('')
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !otpCodes[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus()
    }
  }

  const handleOtpVerify = async () => {
    const code = otpCodes.join('')
    if (code.length < 6) return
    setOtpVerifying(true)
    setTimeout(() => {
      setOtpVerifying(false)
      if (code === '888888') {
        setStep(5)
      } else {
        setOtpError('Invalid verification code. Hint: Use 888888')
        setOtpCodes(['', '', '', '', '', ''])
        document.getElementById('otp-0')?.focus()
      }
    }, 1500)
  }

  const handlePhotoUpload = () => {
    setPhotoLoading(true)
    setTimeout(() => {
      setPhotoPreview('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256')
      setFormData(prev => ({ ...prev, profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256' }))
      setPhotoLoading(false)
    }, 1200)
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.phone || !formData.password) { alert('Please fill out all profile fields.'); return }
      if (!termsAccepted) { alert('Please accept the Terms.'); return }
      setStep(2)
    } else if (step === 2) {
      if (formData.vehicleType !== 'Bicycle' && (!formData.vehiclePlate || !formData.vehicleModel)) { alert('Please provide vehicle details.'); return }
      setStep(3)
    } else if (step === 3) {
      if (!photoPreview) { alert('Please upload a photo.'); return }
      registerDriverOnBackend();
    }
  }

  const handlePrevStep = () => { if (step > 1) setStep(step - 1) }

  const completeOnboarding = () => {
    setDriverProfile({
      name: formData.name, email: formData.email, phone: formData.phone,
      vehicleType: formData.vehicleType, vehiclePlate: formData.vehiclePlate,
      vehicleModel: formData.vehicleModel, profilePhoto: formData.profilePhoto
    })
    setKycStatus('pending')
    setOnboarded(false)
    setOnline(true)
  }

  // Common input/label styles aligned with partner registers
  const inputClass = "w-full h-[52px] bg-input-bg border-none focus:ring-1 focus:ring-primary rounded-xl px-4 text-text-primary text-[14px] outline-none transition-all placeholder-text-secondary/40 font-sans"
  const labelClass = "text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] block mb-2 font-sans"

  return (
    <div className={`min-h-screen w-full bg-bg-app text-text-primary font-sans flex overflow-hidden selection:bg-primary selection:text-black ${theme === 'light' ? 'light-theme' : ''}`}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-2">
        
        {/* Left Side: Hero Panel with Carousel */}
        <div className="hidden lg:flex flex-col justify-end relative overflow-hidden h-full p-16 select-none">
          {/* Background image crossfade */}
          <div className="absolute inset-0 z-0">
            {onboardingSlides.map((slide, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  idx === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <img 
                  src={slide.image} 
                  alt={slide.title} 
                  className="w-full h-full object-cover transform scale-105" 
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent z-10" />
          </div>

          {/* Ambient glow */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary opacity-[0.04] blur-[120px] pointer-events-none z-10" />
          
          {/* Content overlay */}
          <div className="relative z-20 max-w-xl text-left h-[320px] flex flex-col justify-end">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <span className="text-3xl" role="img" aria-label="wolf">🐺</span>
              <div className="text-left">
                <span className="font-extrabold text-[24px] text-white tracking-tight block leading-none font-serif">Wolfie <span className="text-primary font-sans">COURIER</span></span>
                <span className="font-black text-[9px] text-primary tracking-[0.25em] uppercase mt-1 block">Fleet Portal</span>
              </div>
            </div>

            <div className="w-10 h-1 bg-primary mb-6 shadow-[0_0_10px_#FFE100] shrink-0" />

            {/* Fading text content */}
            <div className="relative flex-1 min-h-[140px]">
              {onboardingSlides.map((slide, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col justify-start ${
                    idx === currentSlide 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  <h2 className="text-white text-3xl font-extrabold tracking-tight mb-3 leading-tight">
                    {slide.title.includes('Potential') ? (
                      <>
                        Maximize Your Ride's <br/>
                        <span className="text-primary font-sans">Earning Potential</span>
                      </>
                    ) : (
                      slide.title
                    )}
                  </h2>
                  <p className="text-[#94a3b8] text-[13.5px] leading-relaxed">
                    {slide.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Slide Indicator Dots and Trust Badges */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2 shrink-0">
              <div className="flex gap-2">
                {onboardingSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlide ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-[#94a3b8] font-bold">
                  <Shield size={12} className="text-primary" /> Verified Fleet
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-[#94a3b8] font-bold">
                  <Zap size={12} className="text-primary" /> 100% Tips
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Registration & Login Forms */}
        <div className="flex items-center justify-center p-8 lg:p-16 overflow-y-auto bg-bg-app">
          <div className="w-full max-w-[480px] space-y-8 text-left">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="./wolf_logo.png" 
              alt="Wolfie Logo" 
              className={`h-7 object-contain ${theme === 'dark' ? 'invert' : ''}`} 
            />
            <span className="font-extrabold text-xl text-text-primary tracking-tight font-serif">Wolfie <span className="text-primary font-sans">COURIER</span></span>
          </div>

          {/* Back to Login button for onboarding stages */}
          {activeTab === 'register' && step > 1 && (
            <div>
              <button 
                onClick={handlePrevStep} 
                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-primary transition-colors mb-6 cursor-pointer bg-transparent border-0"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          )}

          {/* Header section */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary mb-2">
              {activeTab === 'login' 
                ? 'Courier Hub Login' 
                : activeTab === 'forgot' 
                  ? 'Recover Password' 
                  : 'Courier Application'}
            </h1>
            <p className="text-[13px] uppercase tracking-[0.15em] text-text-secondary">
              {activeTab === 'login' 
                ? 'Ecosystem dispatch & live maps' 
                : activeTab === 'forgot' 
                  ? 'Verify your courier credentials' 
                  : 'Sign up to deliver in Manhattan'}
            </p>
          </div>

          {/* Tab Selection */}
          {step < 4 && activeTab !== 'forgot' && (
            <div className="flex border-b border-bg-card-hover">
              <button 
                onClick={() => { setActiveTab('login'); setStep(1); }} 
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'login' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setActiveTab('register'); setStep(1); }} 
                className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'register' ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                Apply as Courier
              </button>
            </div>
          )}

          {/* Main Form container */}
          <div className="bg-bg-card rounded-[24px] p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            
            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                {loginError && (
                  <div className="p-3 text-xs bg-accent/10 border border-accent/20 text-accent rounded-xl text-center">
                    {loginError}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000" 
                      value={loginPhone} 
                      onChange={e => setLoginPhone(e.target.value)} 
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input 
                      type={showPass ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={loginPass} 
                      onChange={e => setLoginPass(e.target.value)} 
                      className={`${inputClass} pl-11 pr-12`}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPass(!showPass)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer bg-transparent border-0"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => {
                      setActiveTab('forgot');
                      setForgotStep('email');
                      setForgotError('');
                    }}
                    className="text-[11px] text-primary hover:underline font-bold uppercase tracking-[0.1em] cursor-pointer bg-transparent border-0"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-4.5 mt-2 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer border-none"
                >
                  ACCESS COURIER HUB
                </button>
              </form>
            ) : activeTab === 'forgot' ? (
              <div className="space-y-5">
                {forgotError && (
                  <div className="p-3 text-xs bg-accent/10 border border-accent/20 text-accent rounded-xl text-center">
                    {forgotError}
                  </div>
                )}

                {forgotStep === 'email' && (
                  <form onSubmit={handleForgotSendOtp} className="space-y-5">
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input 
                          type="email" 
                          placeholder="driver@example.com" 
                          value={forgotEmail} 
                          onChange={e => setForgotEmail(e.target.value)} 
                          className={`${inputClass} pl-11`}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={forgotLoading}
                      className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center justify-center disabled:opacity-50"
                    >
                      {forgotLoading ? 'SENDING CODE...' : 'SEND RECOVERY CODE'}
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setActiveTab('login')}
                      className="w-full py-4 bg-input-bg text-text-primary font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-bg-card-hover transition-all cursor-pointer border-none flex items-center justify-center"
                    >
                      BACK TO SIGN IN
                    </button>
                  </form>
                )}

                {forgotStep === 'otp' && (
                  <form onSubmit={handleForgotVerifyOtp} className="space-y-5">
                    <div className="text-center space-y-1">
                      <p className="text-xs text-text-secondary leading-normal">
                        We sent a code to your email. Expiring in: <strong className="text-primary">
                          {Math.floor(forgotTimer / 60)}:{(forgotTimer % 60).toString().padStart(2, '0')}
                        </strong>
                      </p>
                    </div>

                    <div className="flex justify-between gap-2.5">
                      {forgotOtp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`forgot-otp-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const newOtp = [...forgotOtp];
                            newOtp[idx] = val;
                            setForgotOtp(newOtp);
                            if (val && idx < 5) {
                              document.getElementById(`forgot-otp-${idx + 1}`)?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !forgotOtp[idx] && idx > 0) {
                              document.getElementById(`forgot-otp-${idx - 1}`)?.focus();
                            }
                          }}
                          disabled={forgotLoading}
                          className="w-12 h-12 bg-input-bg border-none text-center font-bold text-lg rounded-xl text-text-primary outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        />
                      ))}
                    </div>

                    <button 
                      type="submit" 
                      disabled={forgotLoading}
                      className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center justify-center disabled:opacity-50"
                    >
                      {forgotLoading ? 'VERIFYING...' : 'VERIFY CODE'}
                    </button>

                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setForgotStep('email')}
                        className="text-text-secondary hover:text-text-primary bg-transparent border-0 cursor-pointer"
                      >
                        CHANGE EMAIL
                      </button>

                      <button
                        type="button"
                        disabled={forgotResendTimer > 0 || forgotLoading}
                        onClick={handleForgotResendOtp}
                        className={`${
                          forgotResendTimer > 0 
                            ? 'text-text-secondary/50 cursor-not-allowed' 
                            : 'text-primary hover:underline cursor-pointer'
                        } bg-transparent border-0`}
                      >
                        {forgotResendTimer > 0 ? `RESEND IN ${forgotResendTimer}s` : 'RESEND CODE'}
                      </button>
                    </div>
                  </form>
                )}

                {forgotStep === 'reset' && (
                  <form onSubmit={handleForgotResetPassword} className="space-y-5">
                    <div>
                      <label className={labelClass}>New Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={forgotNewPass} 
                          onChange={e => setForgotNewPass(e.target.value)} 
                          className={`${inputClass} pl-11`}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Confirm New Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={forgotConfirmPass} 
                          onChange={e => setForgotConfirmPass(e.target.value)} 
                          className={`${inputClass} pl-11`}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={forgotLoading}
                      className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center justify-center disabled:opacity-50"
                    >
                      {forgotLoading ? 'SAVING...' : 'SAVE PASSWORD'}
                    </button>
                  </form>
                )}

                {forgotStep === 'success' && (
                  <div className="text-center py-4 space-y-5">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center text-primary text-2xl animate-bounce">
                      <Check size={28} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-text-primary uppercase tracking-wider">Password Reset!</h3>
                      <p className="text-xs text-text-secondary leading-normal max-w-[280px] mx-auto">
                        Your password was successfully updated. You can now sign in.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveTab('login');
                        setForgotStep('email');
                        setForgotEmail('');
                        setForgotOtp(['', '', '', '', '', '']);
                        setForgotNewPass('');
                        setForgotConfirmPass('');
                      }} 
                      className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl hover:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                    >
                      GO TO SIGN IN <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Step indicators inside form container */}
                {step < 4 && (
                  <div className="flex justify-between items-center gap-1.5 py-1 mb-2 border-b border-bg-card-hover/20">
                    {[1, 2, 3].map(num => (
                      <React.Fragment key={num}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          step === num 
                            ? 'bg-primary text-black ring-4 ring-primary/20' 
                            : step > num 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-input-bg text-text-secondary/50'
                        }`}>
                          {step > num ? <Check size={12} /> : num}
                        </div>
                        {num < 3 && (
                          <div className={`flex-1 h-0.5 rounded ${step > num ? 'bg-primary/50' : 'bg-input-bg'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Step 1: Courier Info */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase tracking-[0.15em] text-primary font-bold flex items-center gap-2">
                      <User size={14} /> Basic Details
                    </h3>
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input type="text" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`${inputClass} pl-11`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input type="email" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`${inputClass} pl-11`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input type="tel" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={`${inputClass} pl-11`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                        <input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={`${inputClass} pl-11`} />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 pt-2">
                      <input 
                        type="checkbox" 
                        id="driver-terms" 
                        checked={termsAccepted} 
                        onChange={e => setTermsAccepted(e.target.checked)} 
                        className="mt-1 accent-primary cursor-pointer w-4 h-4 rounded" 
                      />
                      <label htmlFor="driver-terms" className="text-[10px] text-text-secondary leading-relaxed cursor-pointer select-none">
                        I agree to the <span className="text-primary hover:underline font-bold">Terms of Service</span> & <span className="text-primary hover:underline font-bold">Privacy Policy</span>
                      </label>
                    </div>
                    <button onClick={handleNextStep} className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none mt-2">
                      CONTINUE <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* Step 2: Vehicle Selection */}
                {step === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase tracking-[0.15em] text-primary font-bold flex items-center gap-2">
                      <Bike size={14} /> Fleet Selection
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {['Bicycle', 'E-Bike', 'Motorcycle', 'Car'].map(type => {
                        const isSelected = formData.vehicleType === type
                        return (
                          <button 
                            key={type} 
                            onClick={() => setFormData({...formData, vehicleType: type})} 
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-primary/10 border-primary text-primary' 
                                : 'bg-input-bg border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            {type === 'Car' ? <Car size={22} /> : <Bike size={22} />}
                            <span className="text-xs font-bold">{type}</span>
                          </button>
                        )
                      })}
                    </div>
                    {formData.vehicleType !== 'Bicycle' && (
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className={labelClass}>License Plate</label>
                          <input type="text" placeholder="ABC-1234" value={formData.vehiclePlate} onChange={e => setFormData({...formData, vehiclePlate: e.target.value})} className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelClass}>Model</label>
                            <input type="text" placeholder="Vespa GTS 300" value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} className={inputClass} />
                          </div>
                          <div>
                            <label className={labelClass}>Color</label>
                            <input type="text" placeholder="Silver" value={formData.vehicleColor} onChange={e => setFormData({...formData, vehicleColor: e.target.value})} className={inputClass} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button onClick={handlePrevStep} className="flex-1 py-3.5 bg-input-bg text-text-primary font-bold uppercase text-xs tracking-wider rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none">
                        <ArrowLeft size={14} /> BACK
                      </button>
                      <button onClick={handleNextStep} className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none">
                        CONTINUE <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Avatar Setup */}
                {step === 3 && (
                  <div className="space-y-4 text-center">
                    <h3 className="text-xs uppercase tracking-[0.15em] text-primary font-bold flex items-center gap-2 text-left">
                      <Upload size={14} /> Avatar Setup
                    </h3>
                    <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border border-text-secondary bg-input-bg flex items-center justify-center">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={36} className="text-text-secondary" />
                      )}
                      {photoLoading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary max-w-[240px] mx-auto">
                      Upload a clear portrait photo for customer deliveries.
                    </p>
                    <button 
                      type="button" 
                      onClick={handlePhotoUpload} 
                      className="mx-auto px-5 py-2.5 rounded-lg border border-dashed border-text-secondary/50 hover:border-primary text-xs font-bold text-text-secondary hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer bg-transparent"
                    >
                      <Upload size={14} /> Upload Portrait
                    </button>
                    <div className="flex gap-3 pt-4">
                      <button onClick={handlePrevStep} className="flex-1 py-3.5 bg-input-bg text-text-primary font-bold uppercase text-xs tracking-wider rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none">
                        <ArrowLeft size={14} /> BACK
                      </button>
                      <button 
                        onClick={handleNextStep} 
                        disabled={!photoPreview || registering} 
                        className={`flex-1 py-3.5 font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 border-none ${
                          photoPreview && !registering
                            ? 'bg-primary text-black hover:bg-primary-hover active:scale-[0.98] cursor-pointer' 
                            : 'bg-input-bg/50 text-text-secondary/35 cursor-not-allowed'
                        }`}
                      >
                        {registering ? (
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <>
                            SUBMIT APPLICATION <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}



                {/* Step 5: Onboarding Completed */}
                {step === 5 && (
                  <div className="text-center py-6 space-y-5">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center text-primary text-2xl animate-bounce">
                      <Check size={28} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-text-primary uppercase tracking-wider">Application Received</h3>
                      <p className="text-xs text-text-secondary leading-normal max-w-[280px] mx-auto">
                        Profile created. Now upload your compliance credentials.
                      </p>
                    </div>
                    <button onClick={completeOnboarding} className="w-full py-4 bg-primary hover:bg-primary-hover text-black font-black uppercase text-xs tracking-wider rounded-xl hover:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none">
                      PROCEED TO DOCUMENTS <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Security Note */}
          <p className="text-[10px] uppercase tracking-[0.15em] text-text-secondary/40 text-center font-sans">
            Secured with 256-bit encryption · Wolfie Inc. © 2026
          </p>
        </div>
      </div>
    </div>
  </div>
  );
}
