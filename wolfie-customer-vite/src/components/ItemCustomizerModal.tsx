/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, MenuItemCustomization } from '../types';
import { X, Check, ShoppingBag, Sparkles, ArrowLeft, Heart, Plus, ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react';

interface ItemCustomizerModalProps {
  item: MenuItem;
  menuItems?: MenuItem[]; // List of items in restaurant menu for sliding
  restaurantId: string;
  restaurantName?: string;
  onClose: () => void;
  onConfirm: (item: MenuItem, customization: MenuItemCustomization, quantity: number) => void;
  initialQuantity?: number;
  onCheckout?: () => void;
  rating?: number;
  deliveryTimeMin?: number;
}

export default function ItemCustomizerModal({
  item,
  menuItems = [item],
  restaurantId,
  restaurantName = 'Pizza Heaven',
  onClose,
  onConfirm,
  initialQuantity = 1,
  onCheckout,
  rating = 4.8,
  deliveryTimeMin = 20,
}: ItemCustomizerModalProps) {
  // Navigation sliding index state (for dish carousel)
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = menuItems.findIndex((i) => i.id === item.id);
    return idx !== -1 ? idx : 0;
  });
  
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right (dish navigation)
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isFavorited, setIsFavorited] = useState(false);
  const [spiceLevel, setSpiceLevel] = useState('Medium');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [activeStep, setActiveStep] = useState(0); 
  const [stepDirection, setStepDirection] = useState(0); 
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'size' | 'sides' | 'addons' | 'drinks'>('addons');
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Reset carousel index when category changes
  useEffect(() => {
    setCarouselIndex(0);
  }, [activeCategory]);

  // Side Drawer & Popover interactive states corresponding to mockup
  const [showAllergens, setShowAllergens] = useState(false);
  const [showConfigSummary, setShowConfigSummary] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [showNextStepOptions, setShowNextStepOptions] = useState(false);

  // Active item based on switching
  const activeItem = useMemo(() => {
    return menuItems[currentIndex] || item;
  }, [menuItems, currentIndex, item]);

  // Intent parsing for custom food options
  const isBurger = useMemo(() => {
    const term = (activeItem.name + ' ' + activeItem.description + ' ' + activeItem.category).toLowerCase();
    return term.includes('burger') || term.includes('hamburger') || term.includes('cheeseburger');
  }, [activeItem]);

  const isPizza = useMemo(() => {
    const term = (activeItem.name + ' ' + activeItem.description + ' ' + activeItem.category).toLowerCase();
    return term.includes('pizza') || term.includes('margherita') || term.includes('pepperoni') || term.includes('flame-fired') || term.includes('focaccia');
  }, [activeItem]);

  // Options configuration based on food domain for the activeItem
  const options = useMemo(() => {
    const defaultDrinks = [
      { key: 'coke', name: 'Classic Coca-Cola', price: 2.25, volume: '330 ml', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=150&h=150&q=80' },
      { key: 'sprite', name: 'Zesty Lime Sprite', price: 2.25, volume: '330 ml', img: 'https://images.unsplash.com/photo-1625772290748-390b1dfa5280?auto=format&fit=crop&w=150&h=150&q=80' },
      { key: 'fanta', name: 'Orange Fanta Soda', price: 2.25, volume: '330 ml', img: 'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=150&h=150&q=80' },
      { key: 'iced_tea', name: 'Peach Iced Tea', price: 2.50, volume: '400 ml', img: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=150&h=150&q=80' },
      { key: 'sparkling_water', name: 'San Pellegrino Sparkling', price: 3.00, volume: '500 ml', img: 'https://images.unsplash.com/photo-1608885898957-a599fb1b4686?auto=format&fit=crop&w=150&h=150&q=80' },
    ];

    if (isBurger) {
      return {
        sizes: [
          { key: 'single', name: 'Single Portion', detail: '1 Patty', price: 0 },
          { key: 'double', name: 'Double Portion', detail: '2 Patties', price: 3.50 },
          { key: 'triple', name: 'Triple Portion', detail: '3 Patties', price: 6.00 },
        ],
        sides: [
          { key: 'none', name: 'None', price: 0 },
          { key: 'fries', name: 'Golden Sea-Salt Fries', price: 0 },
          { key: 'sweet_fries', name: 'Sweet Potato Fries', price: 1.55 },
          { key: 'onion_rings', name: 'Crispy Onion Rings', price: 2.00 },
          { key: 'salad', name: 'Mini Arugula Salad', price: 1.00 },
        ],
        addons: [
          { key: 'cheese', name: 'Extra Cheese', price: 1.50 },
          { key: 'pepperoni', name: 'Pepperoni Slice', price: 1.50 },
          { key: 'jalapenos', name: 'Jalapeños', price: 0.75 },
          { key: 'bacon', name: 'Bacon Rings', price: 1.50 },
        ],
        drinks: defaultDrinks,
      };
    } else if (isPizza) {
      return {
        sizes: [
          { key: 'personal', name: 'Small Sized Portion', detail: '6 inch Personal', price: 0 },
          { key: 'medium', name: 'Chef Luxe Medium Portion', detail: '9 inch Standard', price: 4.00 },
          { key: 'large', name: 'Chef Luxe Large Portion', detail: '12 inch Family', price: 7.50 },
        ],
        sides: [
          { key: 'none', name: 'None', price: 0 },
          { key: 'crust_thin', name: 'Classic Traditional Recipe', price: 0 },
          { key: 'crust_stuffed', name: 'Garlic Stuffed Crust Crust', price: 3.50 },
          { key: 'crust_thick', name: 'Golden Pan Recipe Crust', price: 2.00 },
          { key: 'crust_gf', name: 'Gluten-Free Flour Crust', price: 2.50 },
        ],
        addons: [
          { key: 'cheese', name: 'Extra Cheese', price: 1.50 },
          { key: 'pepperoni', name: 'Pepperoni', price: 1.50 },
          { key: 'pease', name: 'Small Pease', price: 0.75 },
          { key: 'corn', name: 'Sweet Corn', price: 0.75 },
          { key: 'cucumber', name: 'Sliced Cucumber', price: 0.75 },
          { key: 'jalapenos', name: 'Jalapeños', price: 0.75 },
          { key: 'bacon', name: 'Bacon', price: 1.50 },
        ],
        drinks: defaultDrinks,
      };
    } else {
      return {
        sizes: [
          { key: 'normal', name: 'Standard Sized Portion', detail: 'Classic Portion', price: 0 },
          { key: 'premium_size', name: 'Chef Luxe Large Portion', detail: 'Premium Gourmet', price: 3.00 },
        ],
        sides: [
          { key: 'none', name: 'None', price: 0 },
          { key: 'regular_prep', name: 'Classic Traditional Recipe', price: 0 },
          { key: 'spicy_prep', name: 'Spicy Fire Chilli Injection', price: 1.00 },
          { key: 'mild_prep', name: 'Extra Creamy Mild Emulsion', price: 0.50 },
        ],
        addons: [
          { key: 'cheese', name: 'Extra Cheese', price: 1.50 },
          { key: 'pepperoni', name: 'Pepperoni', price: 1.50 },
          { key: 'pease', name: 'Small Pease', price: 0.75 },
          { key: 'corn', name: 'Sweet Corn', price: 0.75 },
          { key: 'cucumber', name: 'Sliced Cucumber', price: 0.75 },
          { key: 'jalapenos', name: 'Jalapeños', price: 0.75 },
          { key: 'bacon', name: 'Bacon Slice', price: 1.50 },
        ],
        drinks: defaultDrinks,
      };
    }
  }, [isBurger, isPizza]);

  // Selected Option states (tied dynamically to current activeItem)
  const [selectedSize, setSelectedSize] = useState(options.sizes[0]);
  const [selectedSide, setSelectedSide] = useState(options.sides[0]);
  const [selectedAddons, setSelectedAddons] = useState<typeof options.addons>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<any[]>([]);

  // Toggle addons
  const handleToggleAddon = (addon: any) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.key === addon.key);
      if (exists) {
        return prev.filter((a) => a.key !== addon.key);
      } else {
        return [...prev, addon];
      }
    });
  };

  // Addon Image mapper
  const getAddonImage = (addonName: string) => {
    const name = addonName.toLowerCase();
    if (name.includes('cheese') || name.includes('mozzarella')) {
      return 'https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('pepperoni')) {
      return 'https://images.unsplash.com/photo-1628114093221-a3d8547da31d?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('pease') || name.includes('peas')) {
      return 'https://images.unsplash.com/photo-1592394533824-9440e5d68530?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('corn')) {
      return 'https://images.unsplash.com/photo-1551754626-7dd7b263621f?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('cucumber')) {
      return 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('jalapen') || name.includes('serrano')) {
      return 'https://images.unsplash.com/photo-1588252303782-cb80119cb6aa?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('bacon') || name.includes('bacon slice')) {
      return 'https://images.unsplash.com/photo-1606852120035-055ec6b0dfa5?auto=format&fit=crop&w=150&h=150&q=80';
    }
    return 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=150&h=150&q=80';
  };

  const getSideImage = (sideName: string) => {
    const name = sideName.toLowerCase();
    if (name.includes('fries') || name.includes('sweet_fries')) {
      return 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('onion_rings')) {
      return 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('salad')) {
      return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('garlic') || name.includes('stuffed')) {
      return 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('pan recipe') || name.includes('thick')) {
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('gluten-free') || name.includes('flour')) {
      return 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (name.includes('spicy') || name.includes('chilli')) {
      return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=150&h=150&q=80';
    }
    return 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=150&h=150&q=80';
  };

  const getSizeImage = (sizeKey: string) => {
    if (sizeKey === 'personal' || sizeKey === 'single' || sizeKey === 'normal') {
      return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&h=150&q=80';
    }
    if (sizeKey === 'medium' || sizeKey === 'double') {
      return 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=150&h=150&q=80';
    }
    return 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=150&h=150&q=80';
  };

  const getAddonDetailText = (addonName: string, price: number) => {
    const name = addonName.toLowerCase();
    if (name.includes('cheese') || name.includes('mozzarella')) {
      return '80 g - $1.50';
    }
    if (name.includes('pepperoni')) {
      return '65 g - $1.50';
    }
    if (name.includes('pease') || name.includes('peas')) {
      return '90 g - $0.75';
    }
    if (name.includes('corn')) {
      return '70 g - $0.75';
    }
    if (name.includes('cucumber')) {
      return '60 g - $0.75';
    }
    if (name.includes('jalapen') || name.includes('serrano')) {
      return '30 g - $0.75';
    }
    if (name.includes('bacon')) {
      return '45 g - $1.50';
    }
    return `60 g - $${price.toFixed(2)}`;
  };

  const handleToggleDrink = (drink: any) => {
    setSelectedDrinks((prev) => {
      const exists = prev.some((d) => d.key === drink.key);
      if (exists) {
        return prev.filter((d) => d.key !== drink.key);
      } else {
        return [...prev, drink];
      }
    });
  };

  const activeItemsList = useMemo(() => {
    if (activeCategory === 'addons') {
      return options.addons.map(add => ({
        key: add.key,
        name: add.name,
        price: add.price,
        detail: getAddonDetailText(add.name, add.price),
        img: getAddonImage(add.name),
        isSelected: selectedAddons.some(a => a.key === add.key),
        onToggle: () => handleToggleAddon(add)
      }));
    } else if (activeCategory === 'sides') {
      return options.sides.map(s => ({
        key: s.key,
        name: s.name,
        price: s.price,
        detail: s.key === 'none' ? 'No item selected' : (s.price === 0 ? 'Included' : `+$${s.price.toFixed(2)}`),
        img: getSideImage(s.name),
        isSelected: selectedSide?.key === s.key,
        onToggle: () => setSelectedSide(s)
      }));
    } else if (activeCategory === 'drinks') {
      return options.drinks.map(d => ({
        key: d.key,
        name: d.name,
        price: d.price,
        detail: `${d.volume} - $${d.price.toFixed(2)}`,
        img: d.img,
        isSelected: selectedDrinks.some(sd => sd.key === d.key),
        onToggle: () => handleToggleDrink(d)
      }));
    } else { // 'size'
      return options.sizes.map(s => ({
        key: s.key,
        name: s.name,
        price: s.price,
        detail: `${s.detail} - ${s.price === 0 ? 'Included' : `+$${s.price.toFixed(2)}`}`,
        img: getSizeImage(s.key),
        isSelected: selectedSize?.key === s.key,
        onToggle: () => setSelectedSize(s)
      }));
    }
  }, [activeCategory, options, selectedSize, selectedSide, selectedAddons, selectedDrinks]);

  // Reset local state selections whenever the activeItem changes
  useEffect(() => {
    setSelectedSize(options.sizes[0]);
    setSelectedSide(options.sides[0]);
    setSelectedAddons([]);
    setSelectedDrinks([]);
    setActiveCategory('addons');
    setActiveStep(0);
    setStepDirection(0);
    setIsCustomizing(false);
    setShowAllergens(false);
    setShowConfigSummary(false);
  }, [activeItem.id, options]);

  // Compute live prices
  const unitPrice = useMemo(() => {
    const addonsTotal = selectedAddons.reduce((sum, current) => sum + current.price, 0);
    const drinksTotal = selectedDrinks.reduce((sum, current) => sum + current.price, 0);
    return activeItem.price + (selectedSize?.price || 0) + (selectedSide?.price || 0) + addonsTotal + drinksTotal;
  }, [activeItem.price, selectedSize, selectedSide, selectedAddons, selectedDrinks]);

  const totalPrice = useMemo(() => {
    return unitPrice * quantity;
  }, [unitPrice, quantity]);

  // Check if user has chosen any toppings or side dishes
  const hasCustomized = useMemo(() => {
    const hasAddon = selectedAddons.length > 0;
    const hasSide = selectedSide && selectedSide.key !== 'none';
    const hasDrink = selectedDrinks.length > 0;
    return hasAddon || hasSide || hasDrink;
  }, [selectedAddons, selectedSide, selectedDrinks]);

  // Handle submit dispatch
  const handleAddSelectionToCart = () => {
    const customization: MenuItemCustomization = {
      size: { name: selectedSize?.name || 'Standard', price: selectedSize?.price || 0 },
      side: { name: selectedSide?.name || 'None', price: selectedSide?.price || 0 },
      addons: [
        ...selectedAddons.map((a) => ({ name: a.name, price: a.price })),
        ...selectedDrinks.map((d) => ({ name: `Drink: ${d.name}`, price: d.price }))
      ],
    };
    onConfirm(activeItem, customization, quantity);
    
    // Show premium 'Added to Cart' screen options (Keep Looking or Checkout)
    setShowNextStepOptions(true);
  };

  const dishSlideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      position: 'absolute' as const
    })
  };

  // Dynamic ingredient sourcing based on selection item
  const ingredients = useMemo(() => {
    const name = activeItem.name.toLowerCase();
    const cat = activeItem.category.toLowerCase();
    
    if (isPizza || name.includes('pizza') || cat.includes('pizza')) {
      return [
        { name: 'Pure Mozzarella Cheese', img: 'https://images.unsplash.com/photo-1582515073490-39981397c445?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'San Marzano Tomato sauce', img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Basil leaf', img: 'https://images.unsplash.com/photo-1620216613840-7ac3f29eb9ce?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Olive oil', img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=100&h=100&q=80' },
      ];
    } else if (isBurger || name.includes('burger') || name.includes('slider') || cat.includes('burger')) {
      return [
        { name: 'Gourmet Beef Patty', img: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Cheddar cheese Slice', img: 'https://images.unsplash.com/photo-1552763407-3a1d9ff13fda?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Crispy Lettuce leaf', img: 'https://images.unsplash.com/photo-1622262942427-692305615651?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Secret Sauce', img: 'https://images.unsplash.com/photo-1614332287897-cdc485fa562d?auto=format&fit=crop&w=100&h=100&q=80' },
      ];
    } else {
      return [
        { name: 'Olive oil', img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Gourmet Herbs', img: 'https://images.unsplash.com/photo-1608797178974-15b35a61d121?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Sea salt flakes', img: 'https://images.unsplash.com/photo-1613082446271-0ae12984144b?auto=format&fit=crop&w=100&h=100&q=80' },
        { name: 'Cracked pepper', img: 'https://images.unsplash.com/photo-1508888636734-1197607a8284?auto=format&fit=crop&w=100&h=100&q=80' },
      ];
    }
  }, [activeItem, isPizza, isBurger]);

  // Slide navigation handlers for changing actual dish
  const handlePrev = () => {
    if (menuItems.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? menuItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (menuItems.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev === menuItems.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation support for dishes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuItems, currentIndex]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-hidden" id="customizer-modal-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex flex-col h-[94vh] max-h-[850px] relative overflow-hidden text-left"
        id="item-customizer-card"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* 1. Static Header Layout */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 z-20 shrink-0 select-none">
          <button
            onClick={onClose}
            className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-slate-100"
            title="Back to menu selection"
            id="customizer-btn-back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-800 stroke-[2.5]" />
          </button>
          
          <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 bg-slate-50/70 border border-slate-100 px-4 py-2 rounded-full shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F15A24] inline-block animate-pulse shrink-0" />
            <span className="truncate max-w-[125px]">{restaurantName}</span>
          </div>

          <button
            onClick={() => setIsFavorited(!isFavorited)}
            className="p-3 bg-white hover:bg-slate-50 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-slate-100"
            title="Save to Chef Favorites list"
            id="customizer-btn-heart"
          >
            <Heart className={`w-5 h-5 transition-colors stroke-[2.5] ${isFavorited ? 'fill-red-500 text-red-500' : 'text-slate-800'}`} />
          </button>
        </div>

        {/* Dynamic sliding container containing detail items */}
        <div className="flex-1 relative overflow-hidden flex flex-col h-full min-h-0">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={activeItem.id}
              custom={direction}
              variants={dishSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 240, damping: 25 }}
              className="absolute inset-0 flex flex-col p-6 pt-2 pb-4 overflow-y-auto scrollbar-none justify-start items-center"
              id="active-card-slider-wrapper"
            >
              
              {/* Product Visual Identity Block */}
              <div className="w-full flex flex-col items-center shrink-0 relative select-none pb-4" id="dish-visuals-panel">
                
                {/* Visual Slide Navigator Buttons */}
                {menuItems.length > 1 && !isCustomizing && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="absolute left-1 top-[42%] -translate-y-1/2 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-md border border-slate-100 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
                      title="Previous Dish"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-700 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="absolute right-1 top-[42%] -translate-y-1/2 p-2.5 bg-white hover:bg-slate-50 rounded-full shadow-md border border-slate-100 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
                      title="Next Dish"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-700 stroke-[2.5]" />
                    </button>
                  </>
                )}

                {/* Circular image container with relative positioning for floating controls */}
                <div className="relative flex items-center justify-center select-none" id="visual-plate-container">
                  {/* Floating labels / buttons surrounding the plate (Only visible in overview mode!) */}
                  {!isCustomizing && (
                    <>
                      {/* Size descriptor text (like "large" in the top-left) */}
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-6 left-[10%] z-40 text-sm font-semibold tracking-wider text-slate-400 select-none capitalize"
                      >
                        {selectedSize?.name.split(' ')[0] || 'large'}
                      </motion.div>

                      {/* Left "G" (Gluten-free / Info) indicator button styled beautifully exactly like double-ring circle in screenshot */}
                      <motion.div
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute -left-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#FCFCFD] border border-slate-100 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] text-slate-400 font-semibold text-sm select-none"
                        style={{ outline: '1px solid #ECEFF2', outlineOffset: '-3.5px' }}
                        title="Gluten Free Option"
                      >
                        G
                      </motion.div>

                      {/* Right "Al" (Allergen info trigger) button styled beautifully in screenshot style */}
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                          setShowAllergens(prev => !prev);
                          setShowConfigSummary(false);
                        }}
                        className={`absolute -right-12 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] font-semibold text-sm transition-all active:scale-95 cursor-pointer ${
                          showAllergens 
                            ? 'bg-rose-50 border border-rose-200 text-rose-500' 
                            : 'bg-[#FCFCFD] border border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                        style={{ outline: '1px solid #ECEFF2', outlineOffset: '-3.5px' }}
                        title="Toggle Allergen Info"
                      >
                        Al
                      </motion.button>

                      {/* Premium vertical quantity pill container intersecting the bottom edge of the plate picture precisely as pictured */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-20 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_8px_25px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden z-40 select-none"
                        id="vertical-qty-pill"
                      >
                        {/* Upper portion: translucent glass background containing + */}
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.min(20, prev + 1))}
                          className="flex-1 w-full bg-white/25 hover:bg-white/45 active:bg-white/60 flex items-center justify-center text-slate-500 hover:text-[#F15A24] text-[15px] font-black transition-all cursor-pointer select-none"
                          title="Increase Item Quantity"
                        >
                          +
                        </button>
                        {/* Lower portion: solid white holding - */}
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          className="flex-1 w-full bg-white hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#F15A24] text-[15px] font-black border-t border-slate-150 transition-all cursor-pointer select-none disabled:opacity-45"
                          disabled={quantity <= 1}
                          title="Decrease Item Quantity"
                        >
                          -
                        </button>
                      </motion.div>
                    </>
                  )}

                  {/* Circular image matching mockup shadow structure with smooth scaling motion */}
                  <motion.div 
                    layout
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className={`rounded-full overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.08)] border-[5px] border-white relative select-none ${
                      isCustomizing ? 'w-36 h-36' : 'w-56 h-56 sm:w-64 sm:h-64 cursor-pointer hover:scale-[1.01] active:scale-99 transition-all duration-300'
                    }`}
                    onClick={() => {
                      if (!isCustomizing) {
                        setIsCustomizing(true);
                      }
                    }}
                    title={!isCustomizing ? "Click to Customize This Dish" : undefined}
                  >
                    <img
                      src={activeItem.image}
                      alt={activeItem.name}
                      className="w-full h-full object-cover scale-102"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </div>

              </div>

              {/* Step configurator slide wizard (Interactive child stage view) */}
              <div className="flex-1 w-full min-h-[300px] relative px-1 flex flex-col justify-between">
                <AnimatePresence initial={false} mode="wait">
                  {isCustomizing ? (
                    <motion.div
                      key="interactive-buttons-customizer"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="w-full h-full flex flex-col justify-between flex-1"
                    >
                      {/* Main elegant mockup card styled exact like the user's uploaded picture */}
                      <div className="flex-1 w-full bg-[#F5F5F7] border border-slate-200/50 rounded-[2.2rem] py-6 px-3.5 shadow-xs min-h-[310px] flex flex-col justify-between relative mt-1 overflow-visible">
                        
                        {/* Header metadata row */}
                        <div className="flex items-center justify-between px-3 select-none shrink-0">
                          <span className="text-xs sm:text-sm font-semibold text-slate-700 tracking-tight">
                            {activeCategory === 'addons' ? 'Add Toppings' :
                             activeCategory === 'sides' ? 'Add Sides' :
                             activeCategory === 'drinks' ? 'Add Drinks' :
                             'Select Size'}
                          </span>
                          
                          {/* Top right corner PLUS or close sign */}
                          <button
                            type="button"
                            onClick={() => setIsCustomizing(false)}
                            className="text-slate-700 hover:text-[#F15A24] text-lg font-bold flex items-center justify-center cursor-pointer p-1"
                            title="Close Customizer"
                          >
                            <span className="text-xl font-extrabold rotate-45 leading-none">+</span>
                          </button>
                        </div>

                        {/* Premium Coverflow Carousel mimicking the uploaded mockup with infinity scroll */}
                        <div className="flex-1 flex flex-col justify-center items-center py-1 w-full relative overflow-visible select-none">
                          {(() => {
                            const itemsLength = activeItemsList.length;
                            const getIndex = (offset: number) => {
                              if (itemsLength === 0) return 0;
                              return (carouselIndex + offset + itemsLength) % itemsLength;
                            };

                            const centerItem = activeItemsList[getIndex(0)];
                            const leftItem = itemsLength > 1 ? activeItemsList[getIndex(-1)] : null;
                            const rightItem = itemsLength > 2 ? activeItemsList[getIndex(1)] : null;

                            return (
                              <div className="w-full flex flex-col items-center overflow-visible">
                                <div className="relative w-full h-32 flex items-center justify-center select-none overflow-visible">
                                  {/* Left Item */}
                                  {leftItem && (
                                    <div
                                      onClick={() => setCarouselIndex(getIndex(-1))}
                                      className="absolute left-[8%] sm:left-[12%] opacity-35 hover:opacity-60 transition-all duration-300 transform -translate-x-6 scale-75 cursor-pointer pointer-events-auto filter blur-[0.6px] shrink-0"
                                    >
                                      <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-sm border border-slate-200/40">
                                        <img
                                          src={leftItem.img}
                                          alt={leftItem.name}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Center Item */}
                                  {centerItem && (
                                    <motion.div
                                      key={`${activeCategory}-${centerItem.key}`}
                                      initial={{ scale: 0.9, opacity: 0.8 }}
                                      animate={{ scale: 1.15, opacity: 1 }}
                                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                      className="relative z-20 flex items-center justify-center transform scale-115 shrink-0"
                                    >
                                      <div className="w-24 h-24 rounded-full overflow-hidden bg-white shadow-[0_8px_25px_rgba(0,0,0,0.08)] border-[3.5px] border-white flex items-center justify-center relative select-none">
                                        <img
                                          src={centerItem.img}
                                          alt={centerItem.name}
                                          className="w-full h-full object-cover scale-102"
                                          referrerPolicy="no-referrer"
                                        />
                                        
                                        {/* Glassmorphic button overlay in the middle of active item */}
                                        <div className="absolute inset-0 flex items-center justify-center select-none z-30">
                                          <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              centerItem.onToggle();
                                              // Dismiss customizer immediately on selection!
                                              setIsCustomizing(false);
                                            }}
                                            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md border transition-all cursor-pointer ${
                                              centerItem.isSelected
                                                ? 'bg-emerald-600 border-white text-white shadow-emerald-500/30'
                                                : 'bg-lime-600/75 border-white text-white hover:scale-105 shadow-lime-950/15'
                                            }`}
                                          >
                                            {centerItem.isSelected ? (
                                              <Check className="w-4 h-4 text-white stroke-[3.5]" />
                                            ) : (
                                              <span className="text-lg font-black leading-none">+</span>
                                            )}
                                          </motion.button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* Right Item */}
                                  {rightItem && (
                                    <div
                                      onClick={() => setCarouselIndex(getIndex(1))}
                                      className="absolute right-[8%] sm:right-[12%] opacity-35 hover:opacity-60 transition-all duration-300 transform translate-x-6 scale-75 cursor-pointer pointer-events-auto filter blur-[0.6px] shrink-0"
                                    >
                                      <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-sm border border-slate-200/40">
                                        <img
                                          src={rightItem.img}
                                          alt={rightItem.name}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Center item descriptions styled perfectly below visual circle */}
                                {centerItem && (
                                  <div className="text-center mt-3 select-none">
                                    <h4 className="text-[13px] sm:text-[14px] font-black text-slate-800 tracking-tight leading-tight">
                                      {centerItem.name}
                                    </h4>
                                    <span className="text-[10px] sm:text-[11px] text-zinc-400 font-bold leading-normal block mt-0.5">
                                      {centerItem.detail}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Config helper popovers block mapped to Al & Recipe */}
                        <div className="relative w-full shrink-0 select-none">
                          <AnimatePresence>
                            {showAllergens && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-14 left-2 right-2 z-50 bg-white border border-slate-150 rounded-2xl p-4 shadow-xl text-left font-sans"
                              >
                                <h3 className="text-xs font-black uppercase tracking-wider text-[#F15A24]">Allergens Details</h3>
                                <p className="text-[10px] text-zinc-500 font-medium mt-1 leading-relaxed">
                                  This recipe may contain trace elements of milk solids, wheat gluten, dairy proteins and yeast hulls. Please advise the cooking staff if you possess severe hyper-sensitivities.
                                </p>
                              </motion.div>
                            )}

                            {showConfigSummary && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-14 left-2 right-2 z-50 bg-white border border-slate-150 rounded-2xl p-4 shadow-xl text-left"
                              >
                                <h3 className="text-xs font-black uppercase tracking-wider text-[#F15A24] select-none font-sans">Recipe Configuration</h3>
                                <div className="mt-2.5 space-y-1.5 divide-y divide-slate-50">
                                  <div className="flex justify-between text-[11px] font-sans pb-1 shrink-0">
                                    <span className="text-slate-500 font-medium">Selected Size:</span>
                                    <span className="font-black text-slate-800">{selectedSize?.name || 'Standard'}</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] font-sans py-1 shrink-0">
                                    <span className="text-slate-500 font-medium">Side / crust:</span>
                                    <span className="font-black text-slate-800 text-right">{selectedSide?.name || 'None'}</span>
                                  </div>
                                  {selectedAddons.length > 0 && (
                                    <div className="text-[11px] font-sans py-1 shrink-0">
                                      <span className="text-slate-500 font-medium block">Selected Toppings:</span>
                                      <span className="font-black text-slate-800 text-[10px] mt-0.5 block leading-tight font-sans">
                                        {selectedAddons.map(a => a.name).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                  {selectedDrinks.length > 0 && (
                                    <div className="text-[11px] font-sans py-1 shrink-0">
                                      <span className="text-slate-500 font-medium block">Selected Drinks:</span>
                                      <span className="font-black text-slate-800 text-[10px] mt-0.5 block leading-tight font-sans font-medium">
                                        {selectedDrinks.map(d => d.name).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-[11px] font-sans pt-1.5 pb-0.5 border-t border-slate-100 shrink-0">
                                    <span className="text-[#F15A24] font-black">Configured pricing:</span>
                                    <span className="font-black text-[#F15A24] font-mono">${totalPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Bottom decorative/functional row mapping mockup with voice microphone & barcode badge details */}
                        <div className="flex items-center justify-between w-full px-2 mt-1 border-t border-slate-200/30 pt-2 shrink-0 select-none">
                          {/* Left: Pill Status button / allergen toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowAllergens(prev => !prev);
                              setShowConfigSummary(false);
                            }}
                            className={`w-9 h-9 rounded-full border shadow-xs flex items-center justify-center active:scale-95 transition-all text-[11px] font-sans font-black tracking-tight cursor-pointer ${
                              showAllergens
                                ? 'bg-rose-50 border-rose-200 text-rose-500'
                                : 'bg-white border-slate-150 text-slate-500 hover:text-[#F15A24]'
                            }`}
                            title="View allergens"
                          >
                            <span className="font-mono text-[9px] font-extrabold">322</span>
                          </button>

                          {/* Center indicator dots to category pagination */}
                          <div className="flex space-x-1.5 py-1">
                            {['size', 'sides', 'addons', 'drinks'].map((cat) => (
                              <div
                                key={cat}
                                onClick={() => {
                                  setActiveCategory(cat as any);
                                }}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                  activeCategory === cat ? 'bg-[#F15A24] w-3.5' : 'bg-slate-300 hover:bg-slate-400'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Right: Microphone icon button mapping mockup perfectly */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowConfigSummary(prev => !prev);
                              setShowAllergens(false);
                            }}
                            className={`w-9 h-9 rounded-full border shadow-xs flex items-center justify-center active:scale-95 transition-all text-xs font-sans font-black tracking-tight cursor-pointer ${
                              showConfigSummary
                                ? 'bg-orange-50 border-orange-200 text-[#F15A24]'
                                : 'bg-white border-slate-150 text-slate-500 hover:text-[#F15A24]'
                            }`}
                            title="Interactive voice assistant / recap"
                          >
                            🎤
                          </button>
                        </div>

                      </div>

                    </motion.div>
                  ) : (
                    <motion.div
                      key="overview-interactive-steps"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.28 }}
                      className="w-full h-full text-left flex flex-col justify-start space-y-5"
                    >
                      {/* Name and Price Header block */}
                      <div className="flex items-start justify-between px-1 select-none shrink-0 pt-1">
                        <div className="space-y-1 max-w-[70%]">
                          <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight leading-tight font-sans">
                            {activeItem.name}
                          </h2>
                          
                          {/* Rating stars & delivery time row */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            {/* Star Rating */}
                            <div className="flex items-center space-x-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < Math.floor(rating)
                                        ? 'text-[#F15A24] fill-[#F15A24]'
                                        : 'text-slate-200 fill-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 tracking-tight mt-0.5">
                                {rating.toFixed(1)}
                              </span>
                            </div>

                            {/* Divider dot */}
                            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />

                            {/* Preparation/Delivery Duration */}
                            <div className="flex items-center space-x-1 text-slate-500 font-semibold text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-slate-400 stroke-[2] shrink-0" />
                              <span>{deliveryTimeMin}—{deliveryTimeMin + 10} min delivery</span>
                            </div>
                          </div>
                        </div>

                        {/* Standard pricing tag */}
                        <div className="bg-orange-50/70 border border-orange-100/40 px-3.5 py-1.5 rounded-2xl flex items-center shrink-0">
                          <span className="font-mono text-base font-black text-[#F15A24]">
                            ${activeItem.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Food description / bio of item */}
                      <div className="px-1 shrink-0 select-none">
                        <p className="text-xs sm:text-[13px] text-zinc-500 font-medium leading-relaxed font-sans">
                          {activeItem.description}
                        </p>
                      </div>

                      {/* Fresh/Raw Ingredients Header and horizontal scrolling gallery */}
                      <div className="space-y-2.5 pt-1.5 shrink-0 select-none">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Fresh Ingredients
                          </h3>
                        </div>

                        {/* Scrolling list for gourmet fresh items */}
                        <div className="flex items-start space-x-3.5 sm:space-x-4 overflow-x-auto pb-1 px-1 scrollbar-none" id="ingredients-overview-scroll">
                          {ingredients.map((ing, idx) => (
                            <motion.div
                              key={ing.name}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.04 }}
                              className="flex flex-col items-center shrink-0 w-16"
                            >
                              <div className="w-13 h-13 bg-white rounded-full flex items-center justify-center border border-slate-100/80 hover:scale-105 transition-transform duration-300 shadow-xs">
                                <img
                                  src={ing.img}
                                  alt={ing.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <span className="text-[9.5px] font-semibold text-slate-500 text-center mt-1.5 leading-tight tracking-tight line-clamp-2">
                                {ing.name.split(' ').slice(0, 2).join(' ')}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Customize option checklist options */}
                      <div className="border-t border-slate-100 pt-4 px-1 shrink-0 select-none">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                          Customize order
                        </h3>
                        
                        {/* Rounded Add Toppings, Add Sides, Add Drinks options side by side */}
                        <div className="flex items-center justify-around gap-2 pb-2">
                          
                          {/* 1. Toppings Option Button */}
                          <div className="flex flex-col items-center text-center space-y-2 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCategory('addons');
                                setIsCustomizing(true);
                              }}
                              className={`w-12 h-12 rounded-full border border-slate-200/60 bg-white flex items-center justify-center shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all text-[#F15A24] cursor-pointer`}
                              title="Add toppings"
                            >
                              {selectedAddons.length > 0 ? (
                                <span className="text-emerald-500 font-extrabold text-base">✓</span>
                              ) : (
                                <span className="text-xl font-light text-slate-400 leading-none">+</span>
                              )}
                            </button>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Toppings</span>
                              <span className="text-[9px] font-bold text-slate-400 line-clamp-1 max-w-[85px] leading-tight">
                                {selectedAddons.length > 0 ? `${selectedAddons.length} added` : 'Standard'}
                              </span>
                            </div>
                          </div>

                          {/* 2. Sides Option Button */}
                          <div className="flex flex-col items-center text-center space-y-2 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCategory('sides');
                                setIsCustomizing(true);
                              }}
                              className={`w-12 h-12 rounded-full border border-slate-200/60 bg-white flex items-center justify-center shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all text-[#F15A24] cursor-pointer`}
                              title="Add sides"
                            >
                              {selectedSide && selectedSide.key !== 'none' ? (
                                <span className="text-emerald-500 font-extrabold text-base">✓</span>
                              ) : (
                                <span className="text-xl font-light text-slate-400 leading-none">+</span>
                              )}
                            </button>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Sides</span>
                              <span className="text-[9px] font-bold text-slate-400 line-clamp-1 max-w-[85px] leading-tight">
                                {selectedSide && selectedSide.key !== 'none' ? selectedSide.name : 'None'}
                              </span>
                            </div>
                          </div>

                          {/* 3. Drinks Option Button */}
                          <div className="flex flex-col items-center text-center space-y-2 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCategory('drinks');
                                setIsCustomizing(true);
                              }}
                              className={`w-12 h-12 rounded-full border border-slate-200/60 bg-white flex items-center justify-center shadow-xs hover:shadow-sm hover:scale-105 active:scale-95 transition-all text-[#F15A24] cursor-pointer`}
                              title="Add drinks"
                            >
                              {selectedDrinks.length > 0 ? (
                                <span className="text-emerald-500 font-extrabold text-base">✓</span>
                              ) : (
                                <span className="text-xl font-light text-slate-400 leading-none">+</span>
                              )}
                            </button>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Drinks</span>
                              <span className="text-[9px] font-bold text-slate-400 line-clamp-1 max-w-[85px] leading-tight">
                                {selectedDrinks.length > 0 ? `${selectedDrinks.length} added` : 'None'}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 3. Sticky Checkout controller footer layout (Unified Wizard Footer Controls) */}
        <div className="p-5 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3.5 flex-shrink-0 rounded-b-[2.5rem] z-30 relative shadow-[0_-5px_22px_rgba(0,0,0,0.015)] select-none">
          
          {/* Back button (Clicking 'Back' at step 0 rolls back to Overview Mode) */}
          {isCustomizing && (
            <button
              type="button"
              onClick={() => {
                setIsCustomizing(false);
              }}
              className="px-4.5 py-3.5 bg-white hover:bg-slate-100 text-slate-700 font-black text-xs uppercase rounded-xl border border-slate-150 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Back
            </button>
          )}

          {/* Main Action Submit Button */}
          {!isCustomizing ? (
            <button
              type="button"
              onClick={() => {
                if (hasCustomized) {
                  handleAddSelectionToCart();
                } else {
                  setIsCustomizing(true);
                }
              }}
              className="flex-1 flex items-center justify-between p-3.5 px-5 bg-[#F15A24] hover:bg-[#E04D1B] text-white font-black text-xs sm:text-sm uppercase rounded-xl shadow-lg transition-all active:scale-98 shadow-orange-500/10 cursor-pointer transform hover:-translate-y-0.5"
              id="start-customizing-btn-footer"
            >
              <div className="flex items-center space-x-1.5">
                {hasCustomized ? (
                  <ShoppingBag className="w-4 h-4 text-white stroke-[2.5]" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white uppercase" />
                )}
                <span className="tracking-tight uppercase font-sans">
                  {hasCustomized ? 'Add to Cart' : 'Customize & Buy'}
                </span>
              </div>
              <span className="font-mono text-xs tracking-wide font-black">
                ${totalPrice.toFixed(2)}
              </span>
            </button>
          ) : (
            <button
              onClick={handleAddSelectionToCart}
              className="flex-1 flex items-center justify-between p-3.5 px-5 bg-[#F15A24] hover:bg-[#E04D1B] shadow-orange-500/10 text-white font-black text-xs sm:text-sm uppercase rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer transform hover:-translate-y-0.5"
              id="confirm-customizer-btn-bottom"
            >
              <div className="flex items-center space-x-1.5 font-sans">
                <ShoppingBag className="w-4 h-4 text-white stroke-[2.5]" />
                <span className="tracking-tight uppercase">Add to cart</span>
              </div>
              <span className="font-mono text-xs tracking-wide font-black">
                ${totalPrice.toFixed(2)}
              </span>
            </button>
          )}
        </div>

        {/* Next Step Options Overlay Screen */}
        <AnimatePresence>
          {showNextStepOptions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 text-center"
              id="selection-next-steps-screen"
            >
              <div className="relative mb-6 select-none flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute w-24 h-24 rounded-full bg-emerald-50"
                />
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/35 z-10">
                  <span className="text-white text-2xl font-black">✓</span>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mb-1.5 font-sans">
                Added to Cart!
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-sm mb-6 leading-relaxed">
                <strong className="text-slate-800">{quantity}x {activeItem.name}</strong> was prepared and successfully placed in your selection.
              </p>

              {/* Config recap panel */}
              <div className="w-full max-w-sm bg-[#F5F5F7] border border-slate-200/50 rounded-2xl p-4 mb-6 text-left space-y-2 select-none">
                <div className="flex justify-between items-center border-b border-slate-200/40 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuration Summary</span>
                  <span className="text-xs font-mono font-black text-slate-700">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <div className="font-bold text-slate-700 flex justify-between">
                    <span>Portion Size:</span>
                    <span className="text-slate-500 capitalize">{selectedSize?.name.split(' ')[0] || 'Standard'}</span>
                  </div>
                  {selectedAddons.length > 0 && (
                    <div className="font-bold text-slate-700 flex justify-between">
                      <span>Chosen Toppings:</span>
                      <span className="text-slate-500 text-right line-clamp-1">{selectedAddons.map(a => a.name).join(', ')}</span>
                    </div>
                  )}
                  {selectedSide && selectedSide.key !== 'none' && (
                    <div className="font-bold text-slate-700 flex justify-between">
                      <span>Side Pick:</span>
                      <span className="text-slate-500">{selectedSide.name}</span>
                    </div>
                  )}
                  {selectedDrinks.length > 0 && (
                    <div className="font-bold text-slate-700 flex justify-between">
                      <span>Drinks choice:</span>
                      <span className="text-slate-500 text-right line-clamp-1">{selectedDrinks.map(d => d.name).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full max-w-xs flex flex-col space-y-2.5 select-none" id="action-buttons-container-next-steps">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onCheckout) {
                      onCheckout();
                    }
                  }}
                  className="w-full py-3.5 bg-[#F15A24] hover:bg-[#E04D1B] text-white font-black text-xs sm:text-sm uppercase rounded-xl shadow-md active:scale-98 transition-all duration-200 cursor-pointer flex items-center justify-center"
                >
                  Checkout
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs sm:text-sm uppercase rounded-xl border border-slate-205 active:scale-98 transition-all duration-200 cursor-pointer flex items-center justify-center"
                >
                  Keep Looking
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
