import React, { useState, useEffect } from 'react';
import { onboardingApi } from '../../api';
import { useRestaurantStore } from '../../store/useRestaurantStore';

export default function OnboardingIndex() {
  const [loading, setLoading] = useState(true);
  const { onboarding, setOnboarding, setActivePage } = useRestaurantStore();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await onboardingApi.getStatus();
      setOnboarding({
        status: data.onboarding_complete ? 'complete' : 'incomplete',
        completedSteps: data.completed_steps,
        totalSteps: data.total_steps,
        nextStep: data.next_step,
        aiPlan: data.ai_plan,
      });
      if (data.onboarding_complete) {
        setActivePage('dashboard');
      }
    } catch (err) {
      console.error('Failed to load onboarding status', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (!onboarding.nextStep) return null;
    
    switch (onboarding.nextStep.name) {
      case 'legal_acceptance':
        return <LegalAcceptance onComplete={fetchStatus} />;
      case 'wap_activation':
        return <WapAiActivation onComplete={fetchStatus} />;
      case 'payout_setup':
        return <PayoutSetup onComplete={fetchStatus} />;
      case 'complete':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-gray-500 mb-6">Your Wolfie merchant account is ready to go.</p>
            <button 
              onClick={() => setActivePage('dashboard')}
              className="bg-orange-600 text-white px-6 py-2 rounded-2xl font-medium hover:bg-orange-700 transition"
            >
              Go to Dashboard
            </button>
          </div>
        );
      default:
        return (
          <div className="text-center text-gray-500">
            Pending Step: {onboarding.nextStep.label}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Wolfie Onboarding</h2>
          <p className="mt-2 text-sm text-gray-600">
            Step {onboarding.completedSteps + 1} of {onboarding.totalSteps}: {onboarding.nextStep?.label}
          </p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-600 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${(onboarding.completedSteps / onboarding.totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

function LegalAcceptance({ onComplete }) {
  const [agreed, setAgreed] = useState({ terms: false, privacy: false, wapAi: false });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed.terms || !agreed.privacy) return;
    
    setSubmitting(true);
    try {
      await onboardingApi.acceptLegal({
        accepted_terms: true,
        accepted_privacy: true,
        accepted_wap_ai_terms: agreed.wapAi,
      });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const allAgreed = agreed.terms && agreed.privacy;

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Legal Agreements</h3>
      <div className="space-y-4">
        <label className="flex items-start">
          <div className="flex items-center h-5">
            <input type="checkbox" checked={agreed.terms} onChange={(e) => setAgreed(a => ({...a, terms: e.target.checked}))} className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 rounded" />
          </div>
          <div className="ml-3 text-sm">
            <span className="font-medium text-gray-700">Terms of Service</span>
            <p className="text-gray-500">I agree to the Wolfie Merchant Terms.</p>
          </div>
        </label>
        <label className="flex items-start">
          <div className="flex items-center h-5">
            <input type="checkbox" checked={agreed.privacy} onChange={(e) => setAgreed(a => ({...a, privacy: e.target.checked}))} className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 rounded" />
          </div>
          <div className="ml-3 text-sm">
            <span className="font-medium text-gray-700">Privacy Policy</span>
            <p className="text-gray-500">I agree to the Privacy Policy and data handling.</p>
          </div>
        </label>
        <label className="flex items-start">
          <div className="flex items-center h-5">
            <input type="checkbox" checked={agreed.wapAi} onChange={(e) => setAgreed(a => ({...a, wapAi: e.target.checked}))} className="focus:ring-orange-500 h-4 w-4 text-orange-600 border-gray-300 rounded" />
          </div>
          <div className="ml-3 text-sm">
            <span className="font-medium text-gray-700">WAP AI Addendum (Optional)</span>
            <p className="text-gray-500">I agree to the Wolfie AI Prediction terms.</p>
          </div>
        </label>
      </div>
      <div className="mt-8">
        <button type="submit" disabled={!allAgreed || submitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50">
          {submitting ? 'Saving...' : 'Accept & Continue'}
        </button>
      </div>
    </form>
  );
}

function WapAiActivation({ onComplete }) {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onboardingApi.activateWap({ plan: selectedPlan });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Activate WAP AI</h3>
      <p className="text-sm text-gray-500 mb-6">Choose your Wolfie AI Prediction tier.</p>
      
      <div className="space-y-4">
        <div onClick={() => setSelectedPlan('free')} className={`border rounded-2xl p-4 cursor-pointer transition-colors ${selectedPlan === 'free' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">Free Tier</span>
            <span className="text-gray-500">$0/mo</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Basic ETA predictions.</p>
        </div>
        <div onClick={() => setSelectedPlan('pro')} className={`border rounded-2xl p-4 cursor-pointer transition-colors ${selectedPlan === 'pro' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <span className="font-medium text-orange-900">Pro AI</span>
            <span className="text-gray-900 font-medium">$79/mo</span>
          </div>
          <p className="text-xs text-gray-700 mt-1">Advanced AI menu generation and analytics.</p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button type="button" onClick={() => onComplete()} disabled={submitting} className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          Skip
        </button>
        <button type="submit" disabled={submitting} className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700">
          {submitting ? 'Activating...' : 'Activate Plan'}
        </button>
      </div>
    </form>
  );
}

function PayoutSetup({ onComplete }) {
  const [formData, setFormData] = useState({ bank_name: '', account_last4: '', routing_number: '', account_number: '', payout_schedule: 'weekly' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onboardingApi.setupPayout(formData);
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Bank Account</h3>
      <p className="text-sm text-gray-500 mb-6">Where should we send your earnings?</p>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Bank Name</label>
        <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Routing Number</label>
        <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          value={formData.routing_number} onChange={e => setFormData({...formData, routing_number: e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Account Number</label>
        <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} />
        <input required type="hidden" value={formData.account_number.slice(-4)} />
      </div>
      
      <div className="mt-8">
        <button type="submit" onClick={() => setFormData({...formData, account_last4: formData.account_number.slice(-4)})} disabled={submitting || !formData.account_number} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700">
          {submitting ? 'Connecting...' : 'Connect Bank Account'}
        </button>
      </div>
    </form>
  );
}
