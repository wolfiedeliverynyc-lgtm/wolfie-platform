import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';

export default function CartItemCard({ item }) {
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeFromCart = useCartStore(state => state.removeFromCart);

  // Calculate this item's specific total including modifiers
  let unitTotal = item.basePrice;
  const modifierList = [];
  
  if (item.selectedModifiers) {
    Object.values(item.selectedModifiers).forEach(modOptions => {
      modOptions.forEach(opt => {
        unitTotal += opt.price || 0;
        modifierList.push({ name: opt.name, price: opt.price });
      });
    });
  }

  if (item.removedIngredients) {
    item.removedIngredients.forEach(ing => {
      modifierList.push({ name: `No ${ing.name}`, price: 0, removed: true });
    });
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 rounded-[2.5rem] glass-panel relative overflow-hidden group"
    >
      <div className="flex justify-between items-start gap-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <h4 className="font-extrabold text-sm truncate">{item.name}</h4>
            <span className="font-bold text-amber-500">${(unitTotal * item.quantity).toFixed(2)}</span>
          </div>

          {/* Modifiers Visualization */}
          {modifierList.length > 0 && (
            <ul className="mt-2 space-y-1">
              {modifierList.map((mod, idx) => (
                <li key={idx} className={`text-xs flex justify-between items-center ${mod.removed ? 'text-red-400 line-through opacity-70' : 'text-neutral-400'}`}>
                  <span>{mod.removed ? '' : '+ '}{mod.name}</span>
                  {mod.price > 0 && <span className="text-[10px] text-amber-600/70">+${mod.price.toFixed(2)}</span>}
                </li>
              ))}
            </ul>
          )}

          {/* Quantity Controls */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-2 py-1">
              <button 
                onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
              <button 
                onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <Plus size={12} />
              </button>
            </div>
            
            <button 
              onClick={() => removeFromCart(item.cartItemId)}
              className="text-xs text-neutral-500 hover:text-red-500 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>

        {/* Thumbnail */}
        {item.image && (
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
            {item.image.length < 5 ? (
              <span className="text-4xl">{item.image}</span>
            ) : (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
