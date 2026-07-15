import React from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const navigate = useNavigate();
  return (
    <div className="auth-container" style={{ alignItems: 'center', justifyContent: 'center', height: '100vh', display: 'flex' }}>
      <div className="auth-card animate-fade-in" style={{ maxWidth: '500px', textAlign: 'center', padding: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,165,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'orange' }}>
            <Clock size={40} />
          </div>
        </div>
        <h1 className="auth-title" style={{ marginBottom: '1rem' }}>Account Under Review</h1>
        <p className="auth-subtitle" style={{ fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          Thank you for applying to join Wolfie! Our team is currently reviewing your registration details.
          This process usually takes 1-2 business days. We will notify you via email once your account is approved and ready to accept orders.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/login')} style={{ width: '100%', justifyContent: 'center' }}>
          <ArrowLeft size={18} style={{ marginRight: '8px' }} />
          Return to Login
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
