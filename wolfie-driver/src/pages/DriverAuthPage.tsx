import React, { useState } from 'react'
import { useDriverStore } from '../store/useDriverStore'
import {
  Shield, Check, User, Mail, Phone, Lock, Eye, EyeOff,
  Bike, Car, Compass, FileText, ArrowRight, ArrowLeft, Upload, Smartphone
} from 'lucide-react'

export default function DriverAuthPage() {
  const { setOnline, setDriverProfile, setKycStatus, setOnboarded, setToken } = useDriverStore()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  
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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    try {
      setLoginError('')
      const email = `driver_${Math.floor(Math.random() * 100000)}@test.com`
      const res = await fetch('http://localhost:5000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: 'password123',
          role: 'driver',
          name: 'Test Driver',
          phone: loginPhone || '555-555-0000'
        })
      })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }
      
      setDriverProfile({
        name: 'Test Driver',
        email: email,
        phone: loginPhone || '555-555-0000',
        vehicleType: 'Motorcycle',
        vehiclePlate: 'NY-8849C',
        vehicleModel: 'Vespa GTS 300',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'
      })
      
      setToken(data.access_token)
      setKycStatus('approved')
      setOnboarded(true)
      setOnline(true)
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
      triggerMockOtp()
      setStep(4)
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

  return (
    <div className="flex flex-col min-h-screen justify-center px-6 py-10 bg-[#050611]">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 text-3xl animate-pulse bg-[#ff5500]/15 border border-[#ff5500]/30">
          🐺
        </div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-white">Wolfie Courier</h1>
        <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">Ecosystem Dispatch & Fleet</p>
      </div>

      <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-[#0b0c1e] border border-slate-850">
        {step < 4 && (
          <div className="flex border-b border-slate-850">
            <button onClick={() => { setActiveTab('login'); setStep(1); }} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'login' ? 'border-[#ff5500] text-[#ff5500] bg-slate-900/30' : 'border-transparent text-slate-500 hover:text-white'}`}>Sign In</button>
            <button onClick={() => { setActiveTab('register'); setStep(1); }} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'register' ? 'border-[#ff5500] text-[#ff5500] bg-slate-900/30' : 'border-transparent text-slate-500 hover:text-white'}`}>Apply as Courier</button>
          </div>
        )}

        <div className="p-6">
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{loginError}</div>}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="tel" placeholder="+1 (555) 000-0000" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <button type="submit" className="w-full py-3.5 mt-2 bg-[#ff5500] text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-[#ff6611] active:scale-[0.98] transition-all cursor-pointer">ACCESS COURIER HUB</button>
              <button 
                type="button" 
                onClick={() => handleLogin()}
                className="w-full py-3 mt-2 bg-slate-800 text-[#ff5500] font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-slate-700 transition-all cursor-pointer border border-[#ff5500]/20"
              >
                BYPASS LOGIN (TEST MODE)
              </button>
              <div className="text-center pt-2 text-[10px] text-slate-500">Demo: Use any credentials to sign in.</div>
            </form>
          ) : (
            <div className="space-y-5">
              {step < 4 && (
                <div className="flex justify-between items-center gap-1.5 mb-2">
                  {[1, 2, 3].map(num => (
                    <React.Fragment key={num}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step === num ? 'bg-[#ff5500] text-white ring-4 ring-[#ff5500]/20' : step > num ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500'}`}>{step > num ? <Check size={12} /> : num}</div>
                      {num < 3 && <div className={`flex-1 h-0.5 rounded ${step > num ? 'bg-emerald-500' : 'bg-slate-900'}`} />}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 1: Courier Info</h3>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</label><div className="relative"><User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" /></div></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</label><div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input type="email" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" /></div></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</label><div className="relative"><Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input type="tel" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" /></div></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label><div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" /></div></div>
                  <div className="flex items-start gap-2 pt-2"><input type="checkbox" id="driver-terms" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-1 accent-[#ff5500] cursor-pointer" /><label htmlFor="driver-terms" className="text-[10px] text-slate-400 leading-relaxed cursor-pointer">I agree to the <span className="text-[#ff5500]">Terms of Service</span> & <span className="text-[#ff5500]">Privacy Policy</span></label></div>
                  <button onClick={handleNextStep} className="w-full py-3.5 mt-2 bg-[#ff5500] text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-[#ff6611] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer">CONTINUE <ArrowRight size={14} /></button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Step 2: Fleet Selection</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['Bicycle', 'E-Bike', 'Motorcycle', 'Car'].map(type => {
                      const isSelected = formData.vehicleType === type
                      return (<button key={type} onClick={() => setFormData({...formData, vehicleType: type})} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${isSelected ? 'bg-[#ff5500]/15 border-[#ff5500] text-[#ff5500]' : 'bg-slate-950 border-slate-850 text-slate-400'}`}>{type === 'Car' ? <Car size={22} /> : <Bike size={22} />}<span className="text-xs font-bold">{type}</span></button>)
                    })}
                  </div>
                  {formData.vehicleType !== 'Bicycle' && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">License Plate</label><input type="text" placeholder="ABC-1234" value={formData.vehiclePlate} onChange={e => setFormData({...formData, vehiclePlate: e.target.value})} className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" /></div>
                      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model</label><input type="text" placeholder="Toyota Prius 2018" value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" /></div><div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</label><input type="text" placeholder="Silver" value={formData.vehicleColor} onChange={e => setFormData({...formData, vehicleColor: e.target.value})} className="w-full px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff5500] transition-all" /></div></div>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handlePrevStep} className="flex-1 py-3 bg-slate-950 border border-slate-850 text-white font-bold uppercase text-xs tracking-wider rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"><ArrowLeft size={14} /> BACK</button>
                    <button onClick={handleNextStep} className="flex-1 py-3 bg-[#ff5500] text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-[#ff6611] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer">CONTINUE <ArrowRight size={14} /></button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 text-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider text-left">Step 3: Avatar Setup</h3>
                  <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-slate-850 bg-slate-950 flex items-center justify-center">{photoPreview ? <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" /> : <User size={36} className="text-slate-600" />}{photoLoading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#ff5500] border-t-transparent rounded-full animate-spin" /></div>}</div>
                  <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">Upload a clear portrait photo for customer deliveries.</p>
                  <button type="button" onClick={handlePhotoUpload} className="mx-auto px-5 py-2.5 rounded-lg border border-dashed border-slate-700 hover:border-[#ff5500] text-xs font-bold text-slate-400 hover:text-[#ff5500] transition-all flex items-center gap-1.5 cursor-pointer"><Upload size={14} /> Upload Portrait</button>
                  <div className="flex gap-3 pt-4">
                    <button onClick={handlePrevStep} className="flex-1 py-3 bg-slate-950 border border-slate-850 text-white font-bold uppercase text-xs tracking-wider rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"><ArrowLeft size={14} /> BACK</button>
                    <button onClick={handleNextStep} disabled={!photoPreview} className={`flex-1 py-3 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${photoPreview ? 'bg-[#ff5500] text-white hover:bg-[#ff6611] active:scale-[0.98] cursor-pointer' : 'bg-slate-900 text-slate-500 cursor-not-allowed'}`}>SEND OTP <Smartphone size={14} /></button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1"><h3 className="text-sm font-bold text-white uppercase tracking-wider">Verify Phone</h3><p className="text-[11px] text-slate-400">OTP sent to <span className="text-[#ff5500] font-bold">{formData.phone}</span></p></div>
                  {otpError && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">{otpError}</div>}
                  <div className="flex justify-center gap-2.5 py-4">{otpCodes.map((val, idx) => <input key={idx} id={`otp-${idx}`} type="text" maxLength={1} value={val} onChange={e => handleOtpChange(e.target.value, idx)} onKeyDown={e => handleOtpKeyDown(e, idx)} className="w-11 h-13 bg-slate-950 border-2 border-slate-850 rounded-xl text-center text-lg font-bold text-white focus:outline-none focus:border-[#ff5500] transition-all" />)}</div>
                  <button onClick={handleOtpVerify} disabled={otpCodes.join('').length < 6 || otpVerifying} className={`w-full py-3.5 font-bold uppercase text-xs tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${otpCodes.join('').length === 6 && !otpVerifying ? 'bg-[#ff5500] text-white hover:bg-[#ff6611] active:scale-[0.98] cursor-pointer' : 'bg-slate-900 text-slate-500 cursor-not-allowed'}`}>{otpVerifying ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />VERIFYING...</> : 'VERIFY AND FINISH'}</button>
                  <div className="text-center pt-2"><button onClick={triggerMockOtp} disabled={otpCountdown > 0} className="bg-transparent border-0 text-xs font-bold text-[#ff5500] disabled:text-slate-500 cursor-pointer">{otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend Code'}</button></div>
                  <div className="text-center text-[10px] text-slate-500">Hint: Code is 888888</div>
                </div>
              )}

              {step === 5 && (
                <div className="text-center py-6 space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-500 text-2xl animate-bounce"><Check size={28} /></div>
                  <div className="space-y-1"><h3 className="text-base font-bold text-white uppercase tracking-wider">Application Received</h3><p className="text-xs text-slate-400 leading-normal max-w-[280px] mx-auto">Profile created. Now upload your compliance credentials.</p></div>
                  <button onClick={completeOnboarding} className="w-full py-3.5 bg-[#ff5500] text-white font-bold uppercase text-xs tracking-wider rounded-xl hover:bg-[#ff6611] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer">PROCEED TO DOCUMENTS <ArrowRight size={14} /></button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
