import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import DriverAuthPage from './pages/DriverAuthPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import { useDriverStore } from './store/useDriverStore';
import './index.css';

const AuthGate = () => {
  const { kycStatus, setKycStatus } = useDriverStore();

  if (kycStatus === 'not_started' || kycStatus === 'rejected') {
    return <DriverAuthPage />;
  }

  if (kycStatus === 'pending') {
    return <DocumentUploadPage onComplete={() => setKycStatus('approved')} />;
  }

  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
