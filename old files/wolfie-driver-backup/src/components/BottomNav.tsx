import { Home, DollarSign, ListOrdered, User } from 'lucide-react'
import { useDriverStore } from '../store/useDriverStore'

export default function BottomNav() {
  const { activeTab, setActiveTab } = useDriverStore()

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'earnings', icon: DollarSign, label: 'Earnings' },
    { id: 'orders', icon: ListOrdered, label: 'Orders' },
    { id: 'account', icon: User, label: 'Profile' }
  ]

  return (
    <div className="h-[80px] bg-[#151515] border-t border-[#333333] flex justify-around items-center px-4 pb-2">
      {navItems.map((item) => {
        const isActive = activeTab === item.id || (item.id === 'home' && activeTab === 'map')
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${
              isActive ? 'text-[#FF5A00]' : 'text-[#737373]'
            }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF5A00]' : 'text-[#737373]'}`}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
