import { useEffect } from 'react'
import { useDriverStore } from './store/useDriverStore'
import { useSocket } from './hooks/useSocket'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import OrdersPage from './pages/OrdersPage'
import EarningsPage from './pages/EarningsPage'
import AccountPage from './pages/AccountPage'
import DriverAuthPage from './pages/DriverAuthPage'
import DocumentUploadPage from './pages/DocumentUploadPage'
import HelpPage from './pages/HelpPage'

function TabContent() {
  const { activeTab } = useDriverStore()

  switch (activeTab) {
    case 'home':
    case 'map':
      return <Home />
    case 'orders':
      return <OrdersPage />
    case 'earnings':
      return <EarningsPage />
    case 'account':
      return <AccountPage />
    case 'help':
      return <HelpPage />
    default:
      return <Home />
  }
}

export default function App() {
  const { isOnline, setNetworkLatency, onboarded, kycStatus, driverProfile } = useDriverStore()
  useSocket()

  // Simulated latency jitter
  useEffect(() => {
    if (!isOnline) return
    const t = setInterval(() => {
      setNetworkLatency(Math.floor(20 + Math.random() * 60))
    }, 5000)
    return () => clearInterval(t)
  }, [isOnline, setNetworkLatency])

  if (!driverProfile) {
    return <DriverAuthPage />
  }

  if (!onboarded || kycStatus !== 'approved') {
    return <DocumentUploadPage onComplete={() => {
      useDriverStore.getState().setKycStatus('approved')
      useDriverStore.getState().setOnboarded(true)
    }} />
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0A0A0A] text-white">
      <div className="flex-1 relative overflow-hidden">
        <TabContent />
      </div>
      <BottomNav />
    </div>
  )
}
