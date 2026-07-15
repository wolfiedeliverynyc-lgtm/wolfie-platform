import { useEffect } from 'react';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import { MenuItem } from '../types';

interface Props {
  item: MenuItem;
  restaurantName: string;
  onViewCart: () => void;
  onDismiss: () => void;
}

export default function QuickAddToast({ item, restaurantName, onViewCart, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="fixed z-[90] left-4 right-4 glass rounded-2xl px-4 py-3 flex items-center gap-3 slide-up shadow-2xl max-w-lg mx-auto"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
    >
      {/* Dish thumbnail */}
      <img
        src={item.image}
        alt={item.name}
        className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
      />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
          <p className="text-white font-semibold text-sm truncate">{item.name}</p>
        </div>
        <p className="text-white/50 text-xs mt-0.5">{restaurantName}</p>
      </div>

      {/* View cart */}
      <button
        id="toast-view-cart-btn"
        onClick={onViewCart}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-order text-white text-xs font-bold flex-shrink-0"
      >
        <ShoppingBag size={12} />
        View Cart
      </button>
    </div>
  );
}
