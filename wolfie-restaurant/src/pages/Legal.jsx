import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Legal = () => {
  const navigate = useNavigate();
  return (
    <div className="auth-container" style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', padding: '3rem' }}>
        <button className="btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={18} style={{ marginRight: '8px' }} />
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <Shield size={32} color="var(--accent-primary)" />
          <h1 className="auth-title" style={{ marginBottom: 0 }}>Legal & Policies</h1>
        </div>
        
        <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Terms of Service</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            By using the Wolfie Platform as a Restaurant Partner, you agree to comply with our standard operating procedures,
            maintain food safety standards, and fulfill orders in a timely manner.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Wolfie deducts a standard commission fee per order. Payouts are processed weekly.
          </p>
        </div>

        <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Privacy Policy</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            We collect and process personal and business information to facilitate food delivery services.
            Your restaurant data, menu items, and sales metrics are securely stored.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            We do not sell your business data to third parties. Customer data provided to you must only be used
            for order fulfillment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Legal;
