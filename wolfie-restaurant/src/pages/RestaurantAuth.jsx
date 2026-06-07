import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';

const RestaurantAuth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate login
    navigate('/dashboard');
  };

  return (
    <div className="auth-container">
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <Lock size={24} />
            </div>
          </div>
          <h1 className="auth-title">Partner Login</h1>
          <p className="auth-subtitle">Access your restaurant dashboard</p>
        </div>

        <div className="glass-panel">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ paddingLeft: '2.8rem' }}
                  placeholder="manager@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <a href="#" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>Forgot?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ paddingLeft: '2.8rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Sign In to Dashboard
              <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Not a partner yet? <a href="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Apply Now</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantAuth;
