import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, Store, FileText, Building, Upload } from 'lucide-react';
import { onboardingApi, setToken } from '../api';
import AuthCarousel from '../components/AuthCarousel';

const RestaurantRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Controlled Form States
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bankName, setBankName] = useState('Wolfie Bank');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  // Menu Operations States
  const [menuManagementType, setMenuManagementType] = useState('Upload PDF / Images');
  const [menuFile, setMenuFile] = useState(null);
  const [estimatedMenuItems, setEstimatedMenuItems] = useState('1-15');

  const steps = [
    { num: 1, title: 'Basic Info', icon: <Store size={16} /> },
    { num: 2, title: 'Menu Setup', icon: <FileText size={16} /> },
    { num: 3, title: 'Bank Details', icon: <Building size={16} /> },
  ];

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (!termsAccepted) {
        alert("Please accept the Terms of Service and Privacy Policy to complete registration.");
        return;
      }
      setIsLoading(true);
      setError('');
      try {
        // Step 1: Create Account
        const regData = await onboardingApi.register({
          email,
          password,
          full_name: accountHolderName || restaurantName + ' Owner',
          phone,
          restaurant_name: restaurantName,
          cuisine_type: cuisineType,
          address,
          menu_management_type: menuManagementType,
          estimated_menu_items: estimatedMenuItems,
          menu_file_name: menuFile ? menuFile.name : null
        });
        
        // Save access token
        setToken(regData.access_token);
        
        // Step 2: Accept Terms
        await onboardingApi.acceptLegal({
          accepted_terms: true,
          accepted_privacy: true,
          accepted_wap_ai_terms: true
        });
        
        // Step 3: Activate WAP AI plan
        await onboardingApi.activateWap({
          plan: 'pro'
        });
        
        // Step 4: Setup Payout details
        await onboardingApi.setupPayout({
          bank_name: bankName,
          account_last4: accountNumber.slice(-4),
          routing_number: routingNumber,
          account_number: accountNumber
        });

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
        setError(err.message || 'Registration failed. Please check your inputs.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  // Input class shared across all fields
  const inputClass = "w-full h-[52px] bg-[#121212] border-none focus:ring-1 focus:ring-[#FFE100] rounded-xl px-4 text-white text-[14px] outline-none transition-all placeholder-[#94a3b8]/40 font-['Poppins',sans-serif]";
  const labelClass = "text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.15em] block mb-2 font-['Poppins',sans-serif]";

  return (
    <div className="min-h-screen w-full bg-[#000000] text-white font-['Poppins',sans-serif] flex overflow-y-auto selection:bg-[#FFE100] selection:text-black">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Hero Panel (Rotating Carousel) */}
        <AuthCarousel />

        {/* Right Side: Registration Form */}
        <div className="flex items-center justify-center p-8 lg:p-16 overflow-y-auto bg-[#000000]">
          <div className="w-full max-w-[520px] space-y-8 text-left">

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-2">
              <span className="text-2xl">🐺</span>
              <span className="font-extrabold text-xl text-white tracking-tight font-['Poppins',sans-serif]">Wolfie <span className="text-[#FFE100]">OS</span></span>
            </div>

            {/* Back + Header */}
            <div>
              <button 
                onClick={() => navigate('/login')} 
                className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#94a3b8] hover:text-[#FFE100] transition-colors mb-6 cursor-pointer bg-transparent border-0 font-['Poppins',sans-serif]"
              >
                <ArrowLeft size={14} /> Back to Login
              </button>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-['Poppins',sans-serif]">Partner Registration</h1>
              <p className="text-[13px] uppercase tracking-[0.15em] text-[#94a3b8] font-['Poppins',sans-serif]">Join Wolfie and keep more of your profits</p>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-center relative py-2">
              {/* Background track */}
              <div className="absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-white/5 -translate-y-1/2" />
              {/* Active track */}
              <div 
                className="absolute top-1/2 left-[10%] h-[2px] bg-[#FFE100] -translate-y-1/2 transition-all duration-500"
                style={{ width: `${((step - 1) / 2) * 80}%` }}
              />
              
              {steps.map((s) => (
                <div key={s.num} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    step >= s.num 
                      ? 'bg-[#FFE100] text-black shadow-[0_0_20px_rgba(255,225,0,0.3)]' 
                      : 'bg-[#121212] text-[#94a3b8]'
                  }`}>
                    {step > s.num ? <CheckCircle size={18} /> : s.icon}
                  </div>
                  <span className={`text-[10px] font-black tracking-[0.15em] uppercase transition-colors duration-300 font-['Poppins',sans-serif] ${
                    step >= s.num ? 'text-white' : 'text-[#94a3b8]/50'
                  }`}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Form Card */}
            <div className="bg-[#080808] rounded-[24px] p-8 space-y-6 relative overflow-hidden">
              {/* Top glow line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE100]/20 to-transparent" />
              
              {error && (
                <div className="bg-[#EF2A39]/10 border border-[#EF2A39]/20 text-[#EF2A39] text-[13px] px-4 py-3 rounded-xl font-bold font-poppins">
                  {error}
                </div>
              )}

              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-5">
                  <h3 className="text-[14px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2 font-['Poppins',sans-serif]">
                    <Store size={14} /> Restaurant Details
                  </h3>
                  <div>
                    <label className={labelClass}>Restaurant Name</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="e.g. Abu Ali's Kitchen" 
                      value={restaurantName}
                      onChange={e => setRestaurantName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Cuisine Type</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        placeholder="e.g. Mediterranean" 
                        value={cuisineType}
                        onChange={e => setCuisineType(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input 
                        type="tel" 
                        className={inputClass} 
                        placeholder="(555) 123-4567" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="123 Main St, City, State, ZIP" 
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Owner Email</label>
                      <input 
                        type="email" 
                        className={inputClass} 
                        placeholder="owner@kitchen.com" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Password</label>
                      <input 
                        type="password" 
                        className={inputClass} 
                        placeholder="••••••••" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Menu Setup */}
              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="text-[14px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2 font-['Poppins',sans-serif]">
                    <FileText size={14} /> Menu Operations
                  </h3>
                  <div>
                    <label className={labelClass}>How do you manage your menu?</label>
                    <div className="relative">
                      <select 
                        value={menuManagementType}
                        onChange={e => setMenuManagementType(e.target.value)}
                        className={`${inputClass} appearance-none cursor-pointer pr-10`}
                      >
                        <option className="bg-[#080808] text-white" value="Upload PDF / Images">Upload PDF / Images</option>
                        <option className="bg-[#080808] text-white" value="Link to existing POS">Link to existing POS</option>
                        <option className="bg-[#080808] text-white" value="Build manually">Build manually</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#94a3b8]/50 text-xs">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Upload Menu (Optional)</label>
                    <input
                      type="file"
                      id="menu-file-picker"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setMenuFile({
                            name: file.name,
                            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
                          });
                        }
                      }}
                    />
                    <div
                      onClick={() => document.getElementById('menu-file-picker').click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          setMenuFile({
                            name: file.name,
                            size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
                          });
                        }
                      }}
                      className="border-2 border-dashed border-white/10 hover:border-[#FFE100]/40 rounded-2xl p-10 text-center text-[#94a3b8] transition-all cursor-pointer flex flex-col items-center gap-3 group animate-all duration-300"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-[#FFE100]/10 flex items-center justify-center text-[#FFE100] group-hover:shadow-[0_0_20px_rgba(255,225,0,0.2)] transition-all">
                        <Upload size={24} />
                      </div>
                      <p className="text-[12px] uppercase tracking-[0.1em] font-bold font-['Poppins',sans-serif]">Drag and drop or click to upload</p>
                      <p className="text-[11px] text-[#94a3b8]/50 font-['Poppins',sans-serif]">PDF, JPG, PNG — Max 10MB</p>
                    </div>
                    {menuFile && (
                      <div className="mt-3 flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl animate-fadeIn">
                        <div className="flex items-center gap-2 text-xs">
                          <FileText size={16} className="text-[#FFE100]" />
                          <span className="text-white font-bold truncate max-w-[200px]">{menuFile.name}</span>
                          <span className="text-[#94a3b8] text-[10px]">({menuFile.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFile(null);
                          }}
                          className="text-red-500 hover:text-red-400 font-bold text-[11px] uppercase tracking-wider bg-transparent border-none cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Estimated Menu Items</label>
                    <div className="flex gap-3">
                      {['1-15', '16-40', '40+'].map(range => {
                        const isSelected = estimatedMenuItems === range;
                        return (
                          <button
                            key={range}
                            type="button"
                            onClick={() => setEstimatedMenuItems(range)}
                            className={`flex-1 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.1em] border transition-all cursor-pointer font-['Poppins',sans-serif] ${
                              isSelected
                                ? 'bg-[#FFE100] text-black border-[#FFE100] shadow-[0_0_15px_rgba(255,225,0,0.2)]'
                                : 'bg-transparent text-[#94a3b8] border-white/10 hover:border-[#FFE100] hover:text-[#FFE100]'
                            }`}
                          >
                            {range}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Bank Details */}
              {step === 3 && (
                <div className="space-y-5">
                  <h3 className="text-[14px] uppercase tracking-[0.2em] text-[#FFE100] font-bold flex items-center gap-2 font-['Poppins',sans-serif]">
                    <Building size={14} /> Payout Information
                  </h3>
                  <div>
                    <label className={labelClass}>Account Holder Name</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      placeholder="Full Name or Business Entity" 
                      value={accountHolderName}
                      onChange={e => setAccountHolderName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Routing Number</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        placeholder="9 digits" 
                        value={routingNumber}
                        onChange={e => setRoutingNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Account Number</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        placeholder="Account Number" 
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Commission info box */}
                  <div className="bg-[#FFE100]/5 rounded-2xl p-5 border border-[#FFE100]/10">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#FFE100] font-bold mb-2 font-['Poppins',sans-serif]">Commission Structure</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed font-['Poppins',sans-serif]">
                      12% – 18% based on monthly order volume. Payouts processed weekly via Stripe Connect.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="restaurant-terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 cursor-pointer accent-[#FFE100] w-4 h-4 rounded"
                    />
                    <label htmlFor="restaurant-terms" className="text-[11px] text-[#94a3b8] leading-relaxed cursor-pointer select-none font-['Poppins',sans-serif]">
                      By completing registration, you agree to the <Link to="/legal" className="text-[#FFE100] hover:underline font-bold">Terms of Service</Link> and <Link to="/legal" className="text-[#FFE100] hover:underline font-bold">Privacy Policy</Link>. 
                      You acknowledge Wolfie's commission structure (12% to 18% based on order volume).
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={handleBack}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-bold tracking-[0.15em] uppercase transition-all bg-[#121212] text-[#94a3b8] hover:text-white border-none cursor-pointer font-['Poppins',sans-serif] ${
                    step === 1 ? 'opacity-0 pointer-events-none' : ''
                  }`}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                
                <button 
                  type="button" 
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl text-[12px] font-black tracking-[0.15em] uppercase transition-all bg-[#FFE100] hover:shadow-[0_0_25px_rgba(255,225,0,0.3)] active:scale-[0.98] text-black border-none cursor-pointer font-['Poppins',sans-serif]"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      {step === 3 ? 'Complete Registration' : 'Continue'}
                      {step !== 3 && <ArrowRight size={14} />}
                    </>
                  )}
                </button>
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

export default RestaurantRegister;
