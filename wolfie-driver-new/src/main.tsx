import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import DriverAuthPage from './pages/DriverAuthPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import { useDriverStore } from './store/useDriverStore';
import { Sun, Moon } from 'lucide-react';
import './index.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/wolfie-backend-pt9u\.onrender\.com/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const AuthGate = () => {
  const { kycStatus, setKycStatus, theme, setTheme } = useDriverStore();

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (kycStatus === 'not_started' || kycStatus === 'rejected') {
    return <DriverAuthPage />;
  }

  if (kycStatus === 'pending') {
    return <DocumentUploadPage onComplete={() => setKycStatus('approved')} />;
  }

  return (
    <div className={`min-h-screen w-full flex flex-col md:flex-row items-center justify-center bg-zinc-950 p-0 md:p-6 transition-colors duration-300 font-sans ${theme === 'light' ? 'bg-zinc-100' : ''}`}>
      
      {/* Interactive Device frame Mockup */}
      <div className="relative w-full h-screen md:w-[412px] md:h-[844px] md:rounded-[44px] bg-bg-app text-text-primary md:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)] md:border-[10px] md:border-zinc-800 md:ring-4 md:ring-zinc-900/40 overflow-hidden flex flex-col justify-between transition-all duration-300">
        
        {/* Mobile Status Bar simulation */}
        <div className="hidden md:flex justify-between items-center px-6 pt-3.5 pb-2 bg-bg-app select-none text-[11px] font-bold text-text-primary z-50">
          <span>9:41</span>
          {/* Notch / Dynamic Island */}
          <div className="w-[110px] h-[22px] bg-zinc-900 rounded-full absolute left-1/2 -translate-x-1/2 top-2 z-50 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-850/40 mr-12"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/50"></div>
          </div>
          <div className="flex items-center gap-1.5 font-sans">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Inner page content container */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-bg-app">
          <App />
        </div>

        {/* Interactive iOS Home Indicator bar for Phone POV */}
        <div className="hidden md:flex justify-center items-center pb-2 bg-bg-app z-50">
          <div className="w-32 h-1 bg-text-primary/40 rounded-full"></div>
        </div>
      </div>

      {/* Floating Theme Control Panel on Desktop Side */}
      <div className="fixed top-6 right-6 z-50 hidden md:flex flex-col gap-3 bg-bg-card border border-slate-800/80 p-4 rounded-3xl shadow-xl transition-all duration-300">
        <h4 className="text-[10px] font-black text-text-secondary tracking-widest uppercase">Phone View Mode</h4>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-bg-app text-xs font-bold text-text-primary hover:bg-bg-card-hover hover:text-primary transition-all cursor-pointer border border-slate-800"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-accent" />
              <span>Switch to Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-primary" />
              <span>Switch to Light</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
