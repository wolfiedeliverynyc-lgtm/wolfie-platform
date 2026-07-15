import { Home, Search, ShoppingBag, User } from 'lucide-react';

type View = 'feed' | 'search' | 'cart' | 'profile';

interface Props {
  active: View;
  onChange: (view: View) => void;
  cartCount: number;
}

const TABS: { id: View; icon: typeof Home; label: string }[] = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'search', icon: Search, label: 'Explore' },
  { id: 'cart', icon: ShoppingBag, label: 'Cart' },
  { id: 'profile', icon: User, label: 'Profile' },
];

export default function BottomNav({ active, onChange, cartCount }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/8 max-w-lg mx-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 h-14">
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              id={`nav-${id}`}
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-1 flex-1 py-2 active:scale-90 transition-transform relative"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  size={24}
                  className={`transition-colors duration-200 ${isActive ? 'text-[#FF6B00]' : 'text-white/50'}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {id === 'cart' && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full gradient-brand text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-[#FF6B00]' : 'text-white/40'}`}>
                {label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF6B00]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
