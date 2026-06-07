'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Mic, 
  List, 
  Sparkles, 
  X, 
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { MenuItem, MenuItemCustomization } from '../../../lib/types';
import { useAuthStore } from '../../../stores/useAuthStore';

interface ItemCustomizerModalProps {
  item: MenuItem;
  menuItems?: MenuItem[];
  restaurantId: string;
  restaurantName?: string;
  onClose: () => void;
  onConfirm: (item: MenuItem, customization: MenuItemCustomization, quantity: number) => void;
  initialQuantity?: number;
  onCheckout?: () => void;
  rating?: number;
  deliveryTimeMin?: number;
}

// Helper to generate realistic ingredients list based on the item name
const getIngredients = (itemName: string) => {
  const name = itemName.toLowerCase();
  if (name.includes('ramen') || name.includes('tonkotsu') || name.includes('miso')) {
    return '18-hour slow-simmered rich pork bone broth, hand-pulled wheat noodles, flame-finished chashu pork belly, marinated organic soft-boiled egg, nori seaweed sheets, bamboo shoots, and house-made black garlic mayu oil.';
  }
  if (name.includes('gyoza')) {
    return 'Pan-seared dumplings stuffed with ground Berkshire pork, fresh garlic chives, shredded Napa cabbage, grated ginger, soy glaze, and cold-pressed sesame oil.';
  }
  if (name.includes('edamame')) {
    return 'Steamed organic green soybeans in pod, lightly tossed in coarse Maldon sea salt flakes and premium organic white truffle oil.';
  }
  if (name.includes('tagliolini') || name.includes('pasta')) {
    return 'House-rolled farm egg dough pasta, cultured French butter emulsion, aged Parmigiano-Reggiano, and freshly shaved black winter Umbrian truffles.';
  }
  if (name.includes('gnocchi')) {
    return 'Pillowy potato gnocchi, pan-caramelized wild porcini and chanterelle mushrooms, sweet sage butter sauce, and roasted hazelnut crumble.';
  }
  if (name.includes('caprese') || name.includes('burrata')) {
    return 'Local organic heirloom tomatoes, fresh creamy Burrata cheese, extra virgin olive oil, 12-year barrel-aged balsamic glaze, and hand-torn sweet basil leaves.';
  }
  if (name.includes('focaccia')) {
    return 'Warm house-baked wild yeast sourdough focaccia, fresh rosemary needles, coarse flaky sea salt, and cold-pressed olive oil.';
  }
  if (name.includes('tiramisu')) {
    return 'Espresso-soaked Italian ladyfingers, whipped sweet mascarpone cream, farm fresh egg yolks, cane sugar, and high-fat organic dark Belgian cacao dust.';
  }
  if (name.includes('burger') || name.includes('smash')) {
    return 'Double plancha-smashed certified Angus beef patties, melted sharp vintage cheddar cheese, caramelized onions, sweet house dill pickles, and secret savory Antigravity sauce on a toasted seeded brioche bun.';
  }
  if (name.includes('pizza') || name.includes('formaggi')) {
    return 'Blistered 48-hour fermented Neapolitan poolish sourdough base, San Marzano tomato spread, creamed fresh fior di latte, hot honey glaze, and organic sweet basil.';
  }
  return 'Crafted using fresh, organic seasonal ingredients, house-made stocks, and premium condiments selected by our head chef.';
};

export default function ItemCustomizerModal({
  item,
  menuItems = [item],
  restaurantId,
  restaurantName = 'Gourmet Kitchen',
  onClose,
  onConfirm,
  initialQuantity = 1,
  onCheckout,
  deliveryTimeMin = 25,
}: ItemCustomizerModalProps) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = menuItems.findIndex((i) => i.id === item.id);
    return idx !== -1 ? idx : 0;
  });

  const activeItem = useMemo(() => {
    return menuItems[currentIndex] || item;
  }, [menuItems, currentIndex, item]);

  // Read default address for header display
  const { addresses } = useAuthStore();
  const defaultAddressStr = useMemo(() => {
    const addr = addresses.find((a) => a.isDefault) || addresses[0];
    return addr ? `${addr.street}` : '124 West 22nd St, Apt 4B';
  }, [addresses]);

  // States
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isGourmet, setIsGourmet] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showToppingsDrawer, setShowToppingsDrawer] = useState(false);
  const [showDrinksDrawer, setShowDrinksDrawer] = useState(false);
  const [showItemSwitcher, setShowItemSwitcher] = useState(false);

  // Dynamic Options builder
  const options = useMemo(() => {
    const defaultDrinks = [
      { key: 'coke', name: 'Classic Coca-Cola', price: 2.25 },
      { key: 'sprite', name: 'Zesty Lime Sprite', price: 2.25 },
      { key: 'fanta', name: 'Orange Fanta Soda', price: 2.25 },
      { key: 'iced_tea', name: 'Peach Iced Tea', price: 2.50 },
    ];

    const isPizza = activeItem.name.toLowerCase().includes('pizza') || activeItem.category.toLowerCase().includes('pizza');
    const isBurger = activeItem.name.toLowerCase().includes('burger') || activeItem.category.toLowerCase().includes('burger');

    if (isPizza) {
      return {
        sizes: [
          { key: 'personal', name: 'Personal Sized Portion', detail: '6 inch', price: 0 },
          { key: 'medium', name: 'Standard Portion', detail: '9 inch', price: 4.00 },
          { key: 'large', name: 'Large Portion', detail: '12 inch', price: 7.50 },
        ],
        addons: [
          { key: 'cheese', name: 'Extra Cheese', price: 1.50 },
          { key: 'pepperoni', name: 'Pepperoni Slice', price: 1.50 },
          { key: 'jalapenos', name: 'Jalapeños🌶️', price: 0.75 },
          { key: 'bacon', name: 'Crispy Bacon', price: 1.50 },
        ],
        drinks: defaultDrinks,
      };
    } else if (isBurger) {
      return {
        sizes: [
          { key: 'single', name: 'Single Patty', detail: 'Regular', price: 0 },
          { key: 'double', name: 'Double Patty', detail: 'Hungry', price: 3.50 },
        ],
        addons: [
          { key: 'cheese', name: 'Melted Cheddar', price: 1.50 },
          { key: 'bacon', name: 'Smoked Bacon', price: 1.50 },
          { key: 'onion', name: 'Caramelized Onion', price: 1.00 },
          { key: 'jalapenos', name: 'Jalapeño Rings', price: 0.75 },
        ],
        drinks: defaultDrinks,
      };
    } else {
      return {
        sizes: [
          { key: 'normal', name: 'Standard Sized Portion', detail: 'Classic', price: 0 },
          { key: 'premium_size', name: 'Large Portion', detail: 'Chef Selection', price: 3.00 },
        ],
        addons: [
          { key: 'cheese', name: 'Grated Parmesan', price: 1.50 },
          { key: 'jalapenos', name: 'Mild Chili Seeds', price: 0.75 },
          { key: 'bacon', name: 'Bacon Shavings', price: 1.50 },
        ],
        drinks: defaultDrinks,
      };
    }
  }, [activeItem]);

  const [selectedSize, setSelectedSize] = useState(options.sizes[0]);
  const [selectedAddons, setSelectedAddons] = useState<typeof options.addons>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<typeof options.drinks>([]);

  // Reset customizer settings when item changes
  useEffect(() => {
    setSelectedSize(options.sizes[0]);
    setSelectedAddons([]);
    setSelectedDrinks([]);
    setIsGourmet(false);
    setIsAddedSuccess(false);
  }, [activeItem.id, options]);

  // Navigate left/right for items
  const handlePrev = () => {
    if (menuItems.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? menuItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (menuItems.length <= 1) return;
    setCurrentIndex((prev) => (prev === menuItems.length - 1 ? 0 : prev + 1));
  };

  // Size click toggle loop
  const handleCycleSize = () => {
    const currentIndex = options.sizes.findIndex(s => s.key === selectedSize.key);
    const nextIndex = (currentIndex + 1) % options.sizes.length;
    setSelectedSize(options.sizes[nextIndex]);
  };

  // Addons toggle
  const handleToggleAddon = (addon: typeof options.addons[0]) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.key === addon.key);
      return exists ? prev.filter((a) => a.key !== addon.key) : [...prev, addon];
    });
  };

  // Drinks toggle
  const handleToggleDrink = (drink: typeof options.drinks[0]) => {
    setSelectedDrinks((prev) => {
      const exists = prev.some((d) => d.key === drink.key);
      return exists ? prev.filter((d) => d.key !== drink.key) : [...prev, drink];
    });
  };

  // Voice AI simulation states
  const [voiceText, setVoiceText] = useState<string | null>(null);
  const [voiceStep, setVoiceStep] = useState<number>(0);

  const handleVoiceTrigger = () => {
    if (voiceStep > 0) return;
    setVoiceStep(1);
    setVoiceText("Listening...");
    
    // Simulate speech recognition
    setTimeout(() => {
      setVoiceText('"Add extra cheese and a Coke"');
      setVoiceStep(2);
      
      // Simulate checking items
      setTimeout(() => {
        // Toggle Extra Cheese
        const cheeseAddon = options.addons.find(a => a.name.toLowerCase().includes('cheese'));
        if (cheeseAddon) {
          setSelectedAddons(prev => {
            if (!prev.some(a => a.key === cheeseAddon.key)) return [...prev, cheeseAddon];
            return prev;
          });
        }
        
        // Toggle Coke
        const cokeDrink = options.drinks.find(d => d.name.toLowerCase().includes('coke'));
        if (cokeDrink) {
          setSelectedDrinks(prev => {
            if (!prev.some(d => d.key === cokeDrink.key)) return [...prev, cokeDrink];
            return prev;
          });
        }
        
        setVoiceText("Voice verified! Added extra cheese & classic Coke. 🍕🥤");
        setVoiceStep(3);
        
        // Reset text
        setTimeout(() => {
          setVoiceText(null);
          setVoiceStep(0);
        }, 3000);
      }, 1500);
    }, 1500);
  };

  // AI assistant recommendation states
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const handleAiRecommend = () => {
    if (aiMessage) {
      setAiMessage(null);
      return;
    }
    const recommendations = [
      "AI suggests pairing with a Peach Iced Tea for a perfect flavor contrast! 🍑🥤",
      "AI recommends adding Jalapeños for a subtle sweet-spicy kick! 🌶️✨",
      "AI suggests trying the Large Portion to maximize chef toppings! 🍕👑"
    ];
    const randomRec = recommendations[Math.floor(Math.random() * recommendations.length)];
    setAiMessage(randomRec);
  };

  const handleApplyAiRec = () => {
    if (aiMessage?.includes('Iced Tea')) {
      const teaDrink = options.drinks.find(d => d.name.toLowerCase().includes('tea'));
      if (teaDrink) {
        setSelectedDrinks(prev => {
          if (!prev.some(d => d.key === teaDrink.key)) return [...prev, teaDrink];
          return prev;
        });
      }
    } else if (aiMessage?.includes('Jalapeños')) {
      const jalAddon = options.addons.find(a => a.name.toLowerCase().includes('jalap'));
      if (jalAddon) {
        setSelectedAddons(prev => {
          if (!prev.some(a => a.key === jalAddon.key)) return [...prev, jalAddon];
          return prev;
        });
      }
    } else if (aiMessage?.includes('Large Portion')) {
      const largeSize = options.sizes.find(s => s.key === 'large' || s.key === 'premium_size');
      if (largeSize) {
        setSelectedSize(largeSize);
      }
    }
    setAiMessage("Applied recommendation! ✨");
    setTimeout(() => setAiMessage(null), 1500);
  };

  // Dynamic price calculation
  const unitPrice = useMemo(() => {
    const addonsTotal = selectedAddons.reduce((sum, current) => sum + current.price, 0);
    const drinksTotal = selectedDrinks.reduce((sum, current) => sum + current.price, 0);
    return activeItem.price + (selectedSize?.price || 0) + addonsTotal + drinksTotal;
  }, [activeItem.price, selectedSize, selectedAddons, selectedDrinks]);

  // Handoff to Cart
  const handleAddSelectionToCart = () => {
    const customization: MenuItemCustomization = {
      size: { name: selectedSize?.name || 'Standard', price: selectedSize?.price || 0 },
      side: { name: 'None', price: 0 },
      addons: [
        ...selectedAddons.map((a) => ({ name: a.name, price: a.price })),
        ...selectedDrinks.map((d) => ({ name: `Drink: ${d.name}`, price: d.price }))
      ],
    };
    // Update the cart state
    onConfirm(activeItem, customization, quantity);
    
    // Instead of immediately closing, transition to Success state!
    setIsAddedSuccess(true);
  };

  // Success state handler options
  const handleReorderClick = () => {
    setIsAddedSuccess(false); // Back to customization same item
  };

  const handleCheckMoreRestaurantsClick = () => {
    onClose();
    router.push('/');
  };

  const handleCheckoutClick = () => {
    onClose();
    if (onCheckout) {
      onCheckout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-hidden animate-fade-in" id="customizer-modal-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="w-full max-w-[400px] bg-white rounded-[2.5rem] shadow-2xl flex flex-col h-[90vh] max-h-[820px] relative overflow-hidden text-left border border-slate-100/40"
        id="item-customizer-card"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ==================== SCREEN 3: SUCCESS ACTION SELECTOR ==================== */}
        {isAddedSuccess && (
          <div className="flex-1 flex flex-col justify-center items-center p-8 space-y-8 select-none text-center h-full">
            <div className="space-y-4">
              {/* Pulsing check circle */}
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 relative shadow-sm">
                <span className="absolute inset-0 bg-emerald-100/40 rounded-full animate-ping" />
                <CheckCircle className="w-10 h-10 text-emerald-600 stroke-[2]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Added to Cart! 🎉</h2>
                <p className="text-xs text-slate-400 font-semibold max-w-[260px] mx-auto leading-relaxed">
                  Your customized gourmet selection was successfully added to your cart bundle.
                </p>
              </div>
            </div>

            {/* Success options button stack */}
            <div className="w-full space-y-3.5 pt-4">
              {/* Option 1: Re-order (IT TAKE HIM BACK TO SAME WINDOW ITEM) */}
              <button
                onClick={handleReorderClick}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 text-xs font-black uppercase tracking-wider rounded-2xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
                id="success-btn-reorder"
              >
                <Plus className="w-4 h-4 text-slate-800 stroke-[2.5]" />
                <span>Re-order / Customize More</span>
              </button>

              {/* Option 2: check more restaurant */}
              <button
                onClick={handleCheckMoreRestaurantsClick}
                className="w-full py-4 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-colors cursor-pointer flex items-center justify-center space-x-2"
                id="success-btn-explore"
              >
                <Compass className="w-4 h-4 text-slate-650" />
                <span>Check More Restaurants</span>
              </button>

              {/* Option 3: view cart and checkout */}
              <button
                onClick={handleCheckoutClick}
                className="w-full py-4 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
                id="success-btn-checkout"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>View Cart & Checkout</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 1: ITEM DETAIL VIEW ==================== */}
        {!isCustomizing && !isAddedSuccess && (
          <div className="flex-1 flex flex-col h-full overflow-hidden justify-between">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0 select-none border-b border-slate-50">
              <button
                onClick={onClose}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Close"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </button>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Item Details</h2>
              <button
                onClick={() => setIsFavorited(prev => !prev)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Favorite"
              >
                <Heart className={`w-4 h-4 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-700'}`} />
              </button>
            </div>

            {/* Scrollable Detail Body */}
            <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6 flex flex-col items-center">
              
              {/* Large central item image */}
              <div className="relative w-full flex items-center justify-center select-none py-2">
                {menuItems.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-2 z-20 p-2 bg-white/90 hover:bg-white rounded-full shadow-md border border-slate-100 transition-transform active:scale-90 cursor-pointer"
                      title="Previous item"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-800 stroke-[2.5]" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-2 z-20 p-2 bg-white/90 hover:bg-white rounded-full shadow-md border border-slate-100 transition-transform active:scale-90 cursor-pointer"
                      title="Next item"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-800 stroke-[2.5]" />
                    </button>
                  </>
                )}

                {/* Clickable Image -> triggers Customize view */}
                <div 
                  onClick={() => setIsCustomizing(true)}
                  className="w-56 h-56 rounded-[2rem] overflow-hidden shadow-md border-4 border-white relative cursor-pointer group hover:scale-[1.01] transition-transform duration-300"
                  title="Click to Customize"
                >
                  <img
                    src={activeItem.image}
                    alt={activeItem.name}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                    <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to Customize
                    </span>
                  </div>
                </div>
              </div>

              {/* Item stats */}
              <div className="w-full text-left space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {activeItem.name}
                  </h1>
                  <span className="text-lg font-mono font-black text-[#F15A24] shrink-0">
                    ${activeItem.price.toFixed(2)}
                  </span>
                </div>

                {/* "How far" - delivery stats */}
                <div className="flex flex-wrap gap-3.5 pt-1 text-slate-500 font-sans text-xs">
                  <div className="bg-slate-50 px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 font-bold border border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-[#F15A24]" />
                    <span>{deliveryTimeMin}—{deliveryTimeMin + 10} min delivery</span>
                  </div>
                  <div className="bg-slate-50 px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 font-bold border border-slate-100">
                    <Compass className="w-3.5 h-3.5 text-[#F15A24]" />
                    <span>Lower Manhattan</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400">Description</h4>
                  <p className="text-xs leading-relaxed text-slate-500 font-medium">
                    {activeItem.description}
                  </p>
                </div>

                {/* Ingredients section */}
                <div className="border-t border-slate-100 pt-4 space-y-2 text-left w-full">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400">Ingredients</h4>
                  <p className="text-xs leading-relaxed text-slate-500 font-sans font-medium">
                    {getIngredients(activeItem.name)}
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Primary Button */}
            <div className="p-6 border-t border-slate-50 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="w-full py-4.5 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Customize & Add to Cart</span>
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== SCREEN 2: CUSTOMIZE VIEW ==================== */}
        {isCustomizing && !isAddedSuccess && (
          <div className="flex-1 flex flex-col h-full overflow-hidden justify-between">
            
            {/* Header (Back goes to Detail view) */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0 select-none border-b border-slate-50">
              {/* Back Arrow goes to Detail screen */}
              <button
                onClick={() => setIsCustomizing(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                title="Back to description"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700 stroke-[2.5]" />
              </button>
              
              {/* Central Route Details */}
              <div className="flex-1 px-3 text-center overflow-hidden">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider truncate">
                  From {restaurantName}
                </span>
                <span className="text-[10px] font-extrabold text-slate-600 block truncate">
                  to {defaultAddressStr}
                </span>
              </div>

              {/* Right Action Icons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full transition-colors cursor-pointer flex items-center justify-center"
                  title="View Cart"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={handleAddSelectionToCart}
                  className="p-2.5 bg-[#F15A24] hover:bg-[#E04D1B] text-white rounded-full transition-colors cursor-pointer flex items-center justify-center"
                  title="Add to Cart"
                >
                  <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Scrollable Customizer Body */}
            <div className="flex-1 overflow-y-auto scrollbar-none p-6 space-y-6 flex flex-col items-center">
              
              {/* Typography Details */}
              <div className="text-center space-y-1 w-full select-none mt-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {quantity} x {activeItem.name}
                </h1>
                <span className="text-lg font-mono font-black text-[#F15A24] block mt-1.5">
                  ${(unitPrice * quantity).toFixed(2)}
                </span>
                
                {/* Clickable Size Badge */}
                <button
                  type="button"
                  onClick={handleCycleSize}
                  className="mt-1 px-3 py-1 bg-slate-50 hover:bg-orange-50 border border-slate-200/60 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-[#F15A24] transition-all cursor-pointer inline-flex items-center gap-1"
                  title="Click to cycle portion size"
                >
                  <span>Size:</span>
                  <span className="font-extrabold">{selectedSize?.name.split(' ')[0]}</span>
                </button>
              </div>

              {/* Circular Plate Visual */}
              <div className="relative w-full flex items-center justify-center select-none py-4" id="visual-plate-container">
                
                {/* Gourmet Ring glow */}
                <AnimatePresence>
                  {isGourmet && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1.05 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute w-60 h-60 rounded-full border-4 border-dashed border-[#E5C158] animate-spin animate-duration-10000 opacity-70 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Left Button: G (Gourmet Mode) */}
                <button
                  onClick={() => setIsGourmet(prev => !prev)}
                  className={`absolute left-[12%] z-15 w-11 h-11 rounded-full flex items-center justify-center shadow-md font-black text-xs transition-all active:scale-95 cursor-pointer border ${
                    isGourmet 
                      ? 'bg-amber-500 border-white text-white shadow-amber-300/40' 
                      : 'bg-white border-slate-100 text-slate-400 hover:text-slate-700'
                  }`}
                  title="Toggle Gourmet Visualizer mode"
                >
                  G
                </button>

                {/* Right Button: AI (AI recommendation) */}
                <button
                  onClick={handleAiRecommend}
                  className={`absolute right-[12%] z-15 w-11 h-11 rounded-full flex items-center justify-center shadow-md font-black text-xs transition-all active:scale-95 cursor-pointer border ${
                    aiMessage 
                      ? 'bg-[#F15A24] border-white text-white' 
                      : 'bg-white border-slate-100 text-slate-400 hover:text-slate-700'
                  }`}
                  title="Ask AI pairings recommendation"
                >
                  AI
                </button>

                {/* Plate image container */}
                <div className={`w-52 h-52 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-lg border-[6px] border-white relative z-10 transition-all duration-500 ${
                  isGourmet ? 'shadow-[0_0_30px_rgba(229,193,88,0.4)] border-[#E5C158]/30 scale-102' : ''
                }`}>
                  <img
                    src={activeItem.image}
                    alt={activeItem.name}
                    className="w-full h-full object-cover select-none"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Bottom floating white pill for quantity Adjuster */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-9 h-18 bg-white rounded-full shadow-lg border border-slate-100 flex flex-col items-center justify-between py-1.5 z-20">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.min(20, q + 1))}
                    className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-[#F15A24] font-black text-[15px] transition-colors cursor-pointer select-none"
                  >
                    +
                  </button>
                  <div className="w-4 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-[#F15A24] font-black text-[15px] transition-colors cursor-pointer select-none disabled:opacity-30"
                  >
                    -
                  </button>
                </div>

              </div>

              {/* AI message recommendation bubble */}
              <AnimatePresence>
                {aiMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={handleApplyAiRec}
                    className="w-full bg-[#FFF2ED] border border-orange-100/60 p-3 rounded-2xl text-[11px] text-[#F15A24] font-bold text-center cursor-pointer hover:bg-[#FFE5DB] transition-all relative z-10 shadow-xs"
                  >
                    {aiMessage}
                    <span className="block text-[8px] text-slate-400 mt-1 uppercase tracking-wider font-sans font-medium">(Click bubble to apply pairing)</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Voice recognition output text bubble */}
              <AnimatePresence>
                {voiceText && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full bg-slate-900 text-white border border-slate-800 p-3 rounded-2xl text-[11px] text-center font-bold relative z-10 shadow-md font-mono"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1 text-[9px] uppercase tracking-wider text-[#03DAC6] font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#03DAC6] animate-ping" />
                      <span>AI Voice Assistant</span>
                    </div>
                    <span>{voiceText}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Addons action triggers buttons */}
              <div className="w-full grid grid-cols-2 gap-4 pt-4 select-none">
                {/* Toppings trigger */}
                <button
                  onClick={() => setShowToppingsDrawer(true)}
                  className="flex flex-col items-center justify-center space-y-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full flex items-center justify-center shadow-xs transition-transform group-active:scale-95 relative">
                    <Plus className="w-5 h-5 text-slate-500 stroke-[2.2]" />
                    {selectedAddons.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#F15A24] text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                        {selectedAddons.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-500 group-hover:text-slate-800 transition-colors">
                    Add toppings
                  </span>
                </button>

                {/* Drinks trigger */}
                <button
                  onClick={() => setShowDrinksDrawer(true)}
                  className="flex flex-col items-center justify-center space-y-2 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full flex items-center justify-center shadow-xs transition-transform group-active:scale-95 relative">
                    <Plus className="w-5 h-5 text-slate-500 stroke-[2.2]" />
                    {selectedDrinks.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                        {selectedDrinks.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-500 group-hover:text-slate-800 transition-colors">
                    Add drinks
                  </span>
                </button>
              </div>

            </div>

            {/* Bottom Row controls and Add to Cart confirmation */}
            <div className="border-t border-slate-50 bg-white shrink-0">
              {/* Custom controls row */}
              <div className="flex items-center justify-between px-8 py-3.5 select-none bg-slate-50/50 border-b border-slate-100">
                <button
                  onClick={() => setShowItemSwitcher(true)}
                  className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-full transition-colors cursor-pointer flex items-center justify-center border border-slate-200/60 shadow-xs"
                  title="Switch item menu"
                >
                  <List className="w-4.5 h-4.5 text-slate-700" />
                </button>
                
                <button
                  onClick={handleVoiceTrigger}
                  className={`p-3 rounded-full transition-all cursor-pointer flex items-center justify-center border ${
                    voiceStep > 0 
                      ? 'bg-rose-500 border-rose-550 text-white animate-pulse' 
                      : 'bg-white border-slate-200/60 text-slate-700 shadow-xs hover:bg-slate-50'
                  }`}
                  title="Tap to voice configure toppings"
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Main checkout submit button */}
              <div className="p-6">
                <button
                  type="button"
                  onClick={handleAddSelectionToCart}
                  className="w-full py-4.5 bg-[#F15A24] hover:bg-[#E04D1B] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-between px-6 cursor-pointer"
                >
                  <span>Add to Selection Bundle</span>
                  <span className="font-mono font-black text-sm">${(unitPrice * quantity).toFixed(2)}</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ==================== SUB-DRAWERS OVERLAYS ==================== */}
        <AnimatePresence>
          {/* Toppings Selection Drawer */}
          {showToppingsDrawer && (
            <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowToppingsDrawer(false)}>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2.5rem] border-t border-slate-100 p-6 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col max-h-[70%] text-left select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-905 uppercase tracking-wide">Custom Toppings Addons</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Toggle multiple selections to garnish your dish</p>
                  </div>
                  <button
                    onClick={() => setShowToppingsDrawer(false)}
                    className="p-1.5 hover:bg-slate-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-none">
                  {options.addons.map((add) => {
                    const isSel = selectedAddons.some(a => a.key === add.key);
                    return (
                      <div
                        key={add.key}
                        onClick={() => handleToggleAddon(add)}
                        className={`p-3.5 rounded-2xl border transition-colors flex items-center justify-between cursor-pointer ${
                          isSel ? 'bg-orange-50/20 border-[#F15A24]/30' : 'bg-slate-5/50 border-slate-105 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-black text-slate-800 block">{add.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">+${add.price.toFixed(2)}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSel ? 'bg-[#F15A24] border-transparent text-white' : 'border-slate-300'
                        }`}>
                          {isSel && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {/* Drinks Selection Drawer */}
          {showDrinksDrawer && (
            <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowDrinksDrawer(false)}>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2.5rem] border-t border-slate-100/45 p-6 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col max-h-[70%] text-left select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-905 uppercase tracking-wide">Cold Drinks Selection</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Complement your order with chilled beverages</p>
                  </div>
                  <button
                    onClick={() => setShowDrinksDrawer(false)}
                    className="p-1.5 hover:bg-slate-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-none">
                  {options.drinks.map((drink) => {
                    const isSel = selectedDrinks.some(d => d.key === drink.key);
                    return (
                      <div
                        key={drink.key}
                        onClick={() => handleToggleDrink(drink)}
                        className={`p-3.5 rounded-2xl border transition-colors flex items-center justify-between cursor-pointer ${
                          isSel ? 'bg-emerald-50/20 border-emerald-500/30' : 'bg-slate-5/50 border-slate-105 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-black text-slate-800 block">{drink.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">+${drink.price.toFixed(2)}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSel ? 'bg-emerald-500 border-transparent text-white' : 'border-slate-300'
                        }`}>
                          {isSel && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {/* Quick Menu Item Switcher Panel */}
          {showItemSwitcher && (
            <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowItemSwitcher(false)}>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2.5rem] border-t border-slate-100 p-6 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col max-h-[70%] text-left select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-905 uppercase tracking-wide">Quick Dish Selector</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Tap any signature creation to configure it instead</p>
                  </div>
                  <button
                    onClick={() => setShowItemSwitcher(false)}
                    className="p-1.5 hover:bg-slate-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-none">
                  {menuItems.map((dish, idx) => (
                    <div
                      key={dish.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowItemSwitcher(false);
                      }}
                      className={`p-3 rounded-2xl border transition-colors flex items-center space-x-3 cursor-pointer ${
                        dish.id === activeItem.id ? 'bg-orange-50/20 border-[#F15A24]/30' : 'bg-slate-5/50 border-slate-105 hover:bg-slate-50'
                      }`}
                    >
                      <img src={dish.image} alt={dish.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black text-slate-800 block truncate">{dish.name}</span>
                        <span className="text-[10px] font-mono font-bold text-[#F15A24] block mt-0.5">${dish.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
export type { MenuItemCustomization } from '../../../lib/types';
export type { MenuItem } from '../../../lib/types';
