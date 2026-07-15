import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus } from 'lucide-react';
import { useRestaurantStore } from '../../store/useRestaurantStore';
import { useCartStore } from '../../store/useCartStore';

export default function UpsellSuggestions() {
  const menuItems = useRestaurantStore(state => state.menuItems);
  const cartItems = useCartStore(state => state.cartItems);
  const addToCart = useCartStore(state => state.addToCart);

  // Simple "AI" Upsell Engine logic
  const recommendations = useMemo(() => {
    if (cartItems.length === 0) return [];

    const hasBurger = cartItems.some(i => i.category === 'Burgers');
    const hasDrink = cartItems.some(i => i.category === 'Drinks');
    const hasSide = cartItems.some(i => i.category === 'Sides');

    let recCategories = [];
    if (hasBurger && !hasDrink) recCategories.push('Drinks');
    if (hasBurger && !hasSide) recCategories.push('Sides');
    if (hasSide && !hasBurger) recCategories.push('Burgers');

    // Default to popular sides/drinks if no specific logic triggers
    if (recCategories.length === 0) {
      recCategories = ['Sides', 'Drinks'];
    }

    // Grab 3 items matching the recommended categories
    let recs = menuItems.filter(item => 
      recCategories.includes(item.category) && 
      !cartItems.some(ci => ci.productId === item.id)
    );

    return recs.slice(0, 3);
  }, [cartItems, menuItems]);

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-8 mb-6">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-4 gold-text uppercase tracking-wider">
        <Sparkles size={16} /> Complete your meal
      </h3>
      
      <div className="flex gap-4 overflow-x-auto pb-4 checkout-scroll snap-x">
        <AnimatePresence>
          {recommendations.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="min-w-[200px] max-w-[220px] snap-start glass-panel p-4 flex flex-col justify-between"
            >
              <div>
                <div className="w-full h-24 bg-white/5 rounded-2xl mb-3 flex items-center justify-center text-5xl">
                  {item.image && item.image.length < 5 ? item.image : (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-2xl" />
                  )}
                </div>
                <h4 className="font-bold text-sm leading-tight text-white line-clamp-2 mb-1">{item.name}</h4>
                <p className="text-xs font-bold text-amber-500">${item.price.toFixed(2)}</p>
              </div>

              <button 
                onClick={() => addToCart({
                  productId: item.id,
                  name: item.name,
                  basePrice: item.price,
                  image: item.image,
                  category: item.category,
                  quantity: 1
                })}
                className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add to Order
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
