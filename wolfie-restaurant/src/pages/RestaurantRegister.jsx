import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, Store, FileText, Building } from 'lucide-react';

const RestaurantRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const steps = [
    { num: 1, title: 'Basic Info', icon: <Store size={18} /> },
    { num: 2, title: 'Menu Setup', icon: <FileText size={18} /> },
    { num: 3, title: 'Bank Details', icon: <Building size={18} /> },
  ];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (!termsAccepted) {
        alert("Please accept the Terms of Service and Privacy Policy to complete registration.");
        return;
      }
      navigate('/pending-approval');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="auth-container" style={{ alignItems: 'flex-start', paddingTop: '5rem' }}>
      <div className="auth-card animate-fade-in" style={{ maxWidth: '600px' }}>
        <div className="auth-header" style={{ marginBottom: '2rem' }}>
          <h1 className="auth-title">Partner Registration</h1>
          <p className="auth-subtitle">Join Wolfie and keep more of your profits</p>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '24px', left: '0', right: '0', height: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', top: '24px', left: '0', width: `${((step - 1) / 2) * 100}%`, height: '2px', background: 'var(--accent-primary)', zIndex: 0, transition: 'width 0.3s ease' }}></div>
          
          {steps.map((s) => (
            <div key={s.num} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                background: step >= s.num ? 'var(--accent-primary)' : 'var(--bg-panel)',
                border: `2px solid ${step >= s.num ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: step >= s.num ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.3s ease'
              }}>
                {step > s.num ? <CheckCircle size={20} /> : s.icon}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step >= s.num ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          {step === 1 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Restaurant Details</h3>
              <div className="form-group">
                <label className="form-label">Restaurant Name</label>
                <input type="text" className="form-input" placeholder="e.g. Abu Ali's Kitchen" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Cuisine Type</label>
                  <input type="text" className="form-input" placeholder="e.g. Mediterranean" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" placeholder="(555) 123-4567" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-input" placeholder="123 Main St, City, State, ZIP" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Menu Operations</h3>
              <div className="form-group">
                <label className="form-label">How do you manage your menu?</label>
                <select className="form-input" style={{ appearance: 'none' }}>
                  <option>Upload PDF / Images</option>
                  <option>Link to existing POS</option>
                  <option>Build manually</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Upload Menu (Optional)</label>
                <div style={{ 
                  border: '2px dashed var(--border-color)', padding: '2rem', borderRadius: '8px',
                  textAlign: 'center', color: 'var(--text-secondary)', cursor: 'pointer'
                }}>
                  <FileText size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p>Drag and drop or click to upload</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Payout Information</h3>
              <div className="form-group">
                <label className="form-label">Account Holder Name</label>
                <input type="text" className="form-input" placeholder="Full Name or Business Entity" />
              </div>
              <div className="form-group">
                <label className="form-label">Routing Number</label>
                <input type="text" className="form-input" placeholder="9 digits" />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input type="text" className="form-input" placeholder="Account Number" />
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input 
                  type="checkbox" 
                  id="restaurant-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: '4px', cursor: 'pointer', accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                />
                <label htmlFor="restaurant-terms" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, cursor: 'pointer' }}>
                  By completing registration, you agree to the <a href="/#/legal" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Terms of Service</a> and <a href="/#/legal" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Privacy Policy</a>. 
                  You acknowledge Wolfie's commission structure (12% to 18% based on order volume). Payouts and 1099 tax forms are securely processed via Stripe Connect.
                </label>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleBack}
              style={{ opacity: step === 1 ? 0 : 1, pointerEvents: step === 1 ? 'none' : 'auto' }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button type="button" className="btn-primary" onClick={handleNext}>
              {step === 3 ? 'Complete Registration' : 'Continue'}
              {step !== 3 && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantRegister;
