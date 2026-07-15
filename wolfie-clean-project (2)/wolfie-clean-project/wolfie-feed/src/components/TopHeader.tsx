import { ShoppingBag, Search, Heart } from 'lucide-react';

interface Props {
  cartCount: number;
  onCartOpen: () => void;
  onSearchOpen: () => void;
  activeView: string;
  notifCount: number;
}

export default function TopHeader({ cartCount, onCartOpen, onSearchOpen, activeView, notifCount }: Props) {
  const title: Record<string, string> = {
    feed: '',
    search: 'Search',
    cart: 'My Cart',
    profile: 'Profile',
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          {activeView === 'feed' ? (
            <span className="font-cursive text-2xl gradient-brand-text tracking-wide select-none">
              Wolfie Feed
            </span>
          ) : (
            <span className="text-white font-bold text-lg">{title[activeView]}</span>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            id="header-search-btn"
            onClick={onSearchOpen}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors active:scale-90"
            aria-label="Search"
          >
            <Search size={22} className="text-white" />
          </button>

          {/* Notifications */}
          <button
            id="header-notifications-btn"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors active:scale-90 relative"
            aria-label="Notifications"
          >
            <Heart size={22} className="text-white" />
            {notifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full gradient-brand" />
            )}
          </button>

          {/* Cart */}
          <button
            id="header-cart-btn"
            onClick={onCartOpen}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/8 transition-colors active:scale-90 relative"
            aria-label="Cart"
          >
            <ShoppingBag size={22} className="text-white" />
            {cartCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full gradient-brand text-white text-[10px] font-bold flex items-center justify-center px-1 badge-pulse"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
