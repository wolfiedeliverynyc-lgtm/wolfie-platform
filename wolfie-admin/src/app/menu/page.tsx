"use client";

import { useEffect, useState, useRef } from "react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: "beef" | "chicken" | "veggie" | "sides" | "drinks";
  image: string;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "alpha-wolf",
    name: "ALPHA WOLF",
    price: 14.99,
    description: "Double beef, cheddar, bacon, caramelized onions, wolf sauce.",
    category: "beef",
    image: "/wolfie_premium_burger.png",
    badge: "BEST SELLER",
  },
  {
    id: "fire-clan",
    name: "FIRE CLAN",
    price: 13.49,
    description: "Spicy beef, pepper jack, jalapeños, crispy onions, fire sauce.",
    category: "beef",
    image: "/wolfie_premium_burger.png",
    badge: "SPICY",
  },
  {
    id: "lone-wolf",
    name: "LONE WOLF",
    price: 13.99,
    description: "Grilled chicken, swiss, lettuce, tomato, garlic aioli.",
    category: "chicken",
    image: "/wolfie_premium_burger.png",
  },
  {
    id: "forest-guardian",
    name: "FOREST GUARDIAN",
    price: 12.99,
    description: "Plant-based patty, cheddar, pickled onions, smoked mayo.",
    category: "veggie",
    image: "/wolfie_premium_burger.png",
  },
  // Sides
  {
    id: "fries",
    name: "GOLDEN FRIES",
    price: 3.49,
    description: "Hand-cut, double fried, seasoned with sea salt.",
    category: "sides",
    image: "/wolfie_fries.png",
  },
  {
    id: "onion-rings",
    name: "WOLF ONION RINGS",
    price: 4.49,
    description: "Thick-cut onion rings, craft beer batter, spicy wolf dip.",
    category: "sides",
    image: "/wolfie_fries.png",
  },
  {
    id: "wings",
    name: "SMOKED WINGS",
    price: 7.99,
    description: "Fire grilled wings tossed in honey fire glaze.",
    category: "sides",
    image: "/wolfie_fries.png",
  },
  // Drinks
  {
    id: "cola",
    name: "CRAFT COLA",
    price: 2.49,
    description: "Artisanal recipe with real cane sugar and spices.",
    category: "drinks",
    image: "/wolfie_drink.png",
  },
  {
    id: "soda",
    name: "WILD CITRUS SODA",
    price: 2.49,
    description: "Sparkling water infused with fresh lemon, lime, and mint.",
    category: "drinks",
    image: "/wolfie_drink.png",
  },
];

const ADDONS = [
  { id: "patty", name: "Extra Patty", price: 3.0 },
  { id: "cheese", name: "Extra Cheese", price: 1.0 },
  { id: "bacon", name: "Bacon", price: 1.5 },
  { id: "egg", name: "Fried Egg", price: 1.5 },
];

export default function MenuPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all-burgers");
  const [selectedBurgerFilter, setSelectedBurgerFilter] = useState<"all" | "beef" | "chicken" | "veggie">("all");
  const [selectedBurgerId, setSelectedBurgerId] = useState("alpha-wolf");
  const [burgerQty, setBurgerQty] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({
    patty: false,
    cheese: false,
    bacon: false,
    egg: false,
  });
  
  // Cross-sell Pack Selection
  const [packFriesSelected, setPackFriesSelected] = useState(false);
  const [packDrinkSelected, setPackDrinkSelected] = useState(false);
  
  // Cart State
  const [cartCount, setCartCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References for sections to implement scrollspy and smooth scrolling
  const heroRef = useRef<HTMLDivElement>(null);
  const menuConsoleRef = useRef<HTMLDivElement>(null);
  const sidesRef = useRef<HTMLDivElement>(null);
  const drinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Determine active section based on viewport
      const menuConsoleTop = menuConsoleRef.current?.offsetTop || 0;
      const sidesTop = sidesRef.current?.offsetTop || 0;
      const drinksTop = drinksRef.current?.offsetTop || 0;
      const scrollPos = window.scrollY + 250; // offset for sticky bar height

      if (scrollPos >= drinksTop) {
        setActiveCategory("drinks");
      } else if (scrollPos >= sidesTop) {
        setActiveCategory("sides");
      } else {
        // Find which burger category is active
        setActiveCategory("all-burgers");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const offset = ref.current.offsetTop - 120;
      window.scrollTo({
        top: offset,
        behavior: "smooth",
      });
    }
  };

  const handleBurgerFilterChange = (filter: "all" | "beef" | "chicken" | "veggie") => {
    setSelectedBurgerFilter(filter);
    
    // Auto-select first burger in the filtered list
    const filtered = MENU_ITEMS.filter(
      (item) =>
        (item.category === "beef" || item.category === "chicken" || item.category === "veggie") &&
        (filter === "all" || item.category === filter)
    );
    if (filtered.length > 0) {
      setSelectedBurgerId(filtered[0].id);
      // Reset addons & qty for clean transitions
      setBurgerQty(1);
      setSelectedAddons({ patty: false, cheese: false, bacon: false, egg: false });
    }
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) => ({ ...prev, [addonId]: !prev[addonId] }));
  };

  const selectedBurger = MENU_ITEMS.find((b) => b.id === selectedBurgerId) || MENU_ITEMS[0];

  // Calculate Prices
  const addonTotal = ADDONS.reduce((sum, addon) => {
    return sum + (selectedAddons[addon.id] ? addon.price : 0);
  }, 0);
  
  const singleBurgerPriceWithAddons = selectedBurger.price + addonTotal;
  const burgerSectionTotal = singleBurgerPriceWithAddons * burgerQty;

  const packFriesPrice = 3.49;
  const packDrinkPrice = 2.49;
  const totalWithPack =
    burgerSectionTotal +
    (packFriesSelected ? packFriesPrice : 0) +
    (packDrinkSelected ? packDrinkPrice : 0);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = () => {
    setCartCount((c) => c + burgerQty);
    triggerToast(`${burgerQty}x ${selectedBurger.name} added to cart!`);
  };

  const handleAddPack = () => {
    let itemsAdded = burgerQty;
    if (packFriesSelected) itemsAdded += 1;
    if (packDrinkSelected) itemsAdded += 1;
    setCartCount((c) => c + itemsAdded);
    triggerToast(`Burger Pack added to hunt!`);
  };

  return (
    <div className="smooth-scroll selection:bg-[#c9a84c] selection:text-black">
      {/* Smoke overlay container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="menu-smoke-layer menu-smoke-layer-1"></div>
        <div className="menu-smoke-layer menu-smoke-layer-2"></div>
      </div>

      {/* Sparks flying from bottom */}
      <div className="absolute bottom-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="menu-spark"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `spark-rise ${6 + Math.random() * 6}s infinite linear`,
              animationDelay: `${Math.random() * 8}s`,
              transform: `scale(${0.3 + Math.random()})`,
            }}
          />
        ))}
      </div>

      {/* Cart Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-[#c9a84c] text-black px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-[#dfc88a] font-semibold animate-bounce">
          <span className="text-xl">🐺</span>
          <div>{toastMessage}</div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 w-full z-40 transition-all duration-300 border-b border-white/5 bg-[#0b0b0c]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex flex-col cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="text-xl font-bold tracking-widest text-[#f5f0e8] leading-none">WOLFIE</div>
            <div className="text-[10px] tracking-[0.3em] text-[#c9a84c] mt-0.5">BURGERS</div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-[0.2em] text-[#f5f0e8]">
            <a href="#" className="hover:text-[#c9a84c] transition-colors">OUR STORY</a>
            <button onClick={() => scrollTo(menuConsoleRef)} className="hover:text-[#c9a84c] transition-colors">MENU</button>
            <a href="#" className="hover:text-[#c9a84c] transition-colors">LOCATIONS</a>
            <a href="#" className="hover:text-[#c9a84c] transition-colors">CONTACT</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Cart Icon */}
            <div className="relative cursor-pointer p-2 hover:scale-105 transition-transform" onClick={() => triggerToast("Cart viewing is disabled in mockup.")}>
              <span className="text-lg">🛒</span>
              {cartCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-[#c9a84c] text-black text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0b0b0c]">
                  {cartCount}
                </div>
              )}
            </div>

            <button onClick={() => scrollTo(menuConsoleRef)} className="px-5 py-2 text-xs font-semibold border border-[#c9a84c] text-[#c9a84c] rounded-full hover:bg-[#c9a84c] hover:text-black transition-all">
              ORDER NOW
            </button>
          </div>
        </div>
      </header>

      {/* Parallax Hero Section */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center pt-16 overflow-hidden bg-gradient-to-b from-[#0b0b0c] via-[#0e0e10] to-[#0b0b0c]">
        {/* Parallax layers */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none transition-transform"
          style={{
            transform: `translateY(${scrollY * 0.15}px)`,
            backgroundImage: "url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1200')",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 w-full">
          <div className="flex flex-col text-left">
            <h1
              className="text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] text-[#f5f0e8]"
              style={{ transform: `translateY(${scrollY * -0.08}px)` }}
            >
              ORDER <br />
              <span className="text-[#c9a84c] menu-title-glow font-extrabold">THE HUNT</span>
            </h1>
            <p className="text-lg md:text-xl text-[#a3a3a3] mt-6 tracking-wide max-w-md">
              Handcrafted burgers. Bold flavors. Delivered hot.
            </p>
            <div className="mt-8 flex gap-4">
              <button onClick={() => scrollTo(menuConsoleRef)} className="btn-menu-gold px-8 py-3.5 rounded-full text-sm font-semibold shadow-lg shadow-black/50">
                EXPLORE MENU
              </button>
              <a href="#why-wolfie" className="px-8 py-3.5 border border-white/10 hover:border-white/30 text-white rounded-full text-sm font-semibold transition-all">
                OUR PROMISE
              </a>
            </div>
          </div>

          <div
            className="flex items-center justify-center relative w-full h-[320px] md:h-[480px] transition-transform duration-75"
            style={{ transform: `translateY(${scrollY * 0.12}px) scale(${1 - scrollY * 0.0003})` }}
          >
            {/* Dark background fire glow */}
            <div className="absolute w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-gradient-to-r from-red-900/40 via-amber-800/40 to-transparent rounded-full filter blur-[60px] animate-pulse"></div>
            
            <img
              src="/wolfie_takeout_bag.png"
              alt="Wolfie Takeout Bag"
              className="w-auto h-[260px] md:h-[400px] object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.8)] filter brightness-95"
            />
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-10" onClick={() => scrollTo(menuConsoleRef)}>
          <span className="text-xs tracking-[0.3em] text-[#a3a3a3] uppercase">Scroll to Hunt</span>
          <div className="w-6 h-10 border border-white/20 rounded-full p-1 flex justify-center">
            <div className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* Category Selection Bar (Sticky) */}
      <div className="sticky top-[64px] z-30 bg-[#0b0b0c]/90 backdrop-blur-md border-y border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[11px] font-bold tracking-[0.25em] text-[#a3a3a3] uppercase">
            CHOOSE YOUR WEAPON
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1 md:gap-4">
            <button
              onClick={() => {
                scrollTo(menuConsoleRef);
                setActiveCategory("all-burgers");
              }}
              className={`px-4 py-2 text-xs font-semibold tracking-widest rounded-full transition-all border ${
                activeCategory === "all-burgers"
                  ? "bg-[#c9a84c]/10 border-[#c9a84c] text-[#c9a84c]"
                  : "border-transparent text-[#a3a3a3] hover:text-[#f5f0e8]"
              }`}
            >
              🍔 BURGERS
            </button>
            <button
              onClick={() => {
                scrollTo(sidesRef);
                setActiveCategory("sides");
              }}
              className={`px-4 py-2 text-xs font-semibold tracking-widest rounded-full transition-all border ${
                activeCategory === "sides"
                  ? "bg-[#c9a84c]/10 border-[#c9a84c] text-[#c9a84c]"
                  : "border-transparent text-[#a3a3a3] hover:text-[#f5f0e8]"
              }`}
            >
              🍟 SIDES
            </button>
            <button
              onClick={() => {
                scrollTo(drinksRef);
                setActiveCategory("drinks");
              }}
              className={`px-4 py-2 text-xs font-semibold tracking-widest rounded-full transition-all border ${
                activeCategory === "drinks"
                  ? "bg-[#c9a84c]/10 border-[#c9a84c] text-[#c9a84c]"
                  : "border-transparent text-[#a3a3a3] hover:text-[#f5f0e8]"
              }`}
            >
              🥤 DRINKS
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10 flex flex-col gap-24">
        
        {/* Section 1: Burgers Console (Split View) */}
        <section ref={menuConsoleRef} className="scroll-mt-36">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#f5f0e8]">BURGERS</h2>
              <p className="text-sm text-[#a3a3a3] mt-2">Pick your signature wolf burger and modify your hunt.</p>
            </div>
            
            {/* Sub-filtering for Burgers */}
            <div className="flex gap-2 bg-[#121214] p-1 rounded-full border border-white/5 self-start">
              {(["all", "beef", "chicken", "veggie"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleBurgerFilterChange(filter)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-all ${
                    selectedBurgerFilter === filter
                      ? "bg-[#c9a84c] text-black"
                      : "text-[#a3a3a3] hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Burgers List */}
            <div className="lg:col-span-5 flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 menu-scrollbar">
              {MENU_ITEMS.filter(
                (item) =>
                  (item.category === "beef" || item.category === "chicken" || item.category === "veggie") &&
                  (selectedBurgerFilter === "all" || item.category === selectedBurgerFilter)
              ).map((burger) => (
                <div
                  key={burger.id}
                  onClick={() => {
                    setSelectedBurgerId(burger.id);
                    setBurgerQty(1);
                    setSelectedAddons({ patty: false, cheese: false, bacon: false, egg: false });
                  }}
                  className={`menu-glass-card p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer relative overflow-hidden ${
                    selectedBurgerId === burger.id ? "active" : ""
                  }`}
                >
                  {burger.badge && (
                    <div className="absolute top-0 right-0 bg-[#c9a84c] text-black text-[9px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      {burger.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <img
                      src={burger.image}
                      alt={burger.name}
                      className="w-16 h-16 object-cover rounded-xl border border-white/5"
                    />
                    <div>
                      <h3 className="text-lg font-bold tracking-wide text-white">{burger.name}</h3>
                      <p className="text-xs text-[#a3a3a3] line-clamp-2 mt-1">{burger.description}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[#c9a84c] font-bold text-lg">${burger.price.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Sticky Detail Showcase */}
            <div className="lg:col-span-7 sticky top-[160px] menu-glass-card rounded-3xl overflow-hidden border border-white/10 flex flex-col">
              
              {/* Product Background Image */}
              <div className="relative h-[240px] md:h-[300px] bg-neutral-900 flex items-center justify-center overflow-hidden">
                {/* Smoky amber glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-black/40 to-transparent z-10"></div>
                <div className="absolute w-[200px] h-[200px] bg-[#c9a84c]/20 filter blur-[40px] z-0"></div>
                
                <img
                  src={selectedBurger.image}
                  alt={selectedBurger.name}
                  className="w-auto h-[200px] md:h-[260px] object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] filter brightness-95"
                />
              </div>

              {/* Product Details Panel */}
              <div className="p-6 md:p-8 flex flex-col bg-[#0e0e10]/95 z-10 border-t border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {selectedBurger.badge && (
                      <span className="text-[10px] font-bold text-[#c9a84c] tracking-[0.2em] uppercase">
                        {selectedBurger.badge}
                      </span>
                    )}
                    <h2 className="text-3xl font-extrabold text-[#f5f0e8] mt-1">{selectedBurger.name}</h2>
                    <div className="text-[#c9a84c] text-2xl font-bold mt-2">
                      ${singleBurgerPriceWithAddons.toFixed(2)}
                    </div>
                  </div>

                  {/* Quantity Adjuster */}
                  <div className="flex items-center bg-[#18181b] border border-white/5 rounded-xl p-1">
                    <button
                      onClick={() => setBurgerQty((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a3a3a3] hover:text-white transition-all hover:bg-white/5 text-lg"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-[#f5f0e8]">{burgerQty}</span>
                    <button
                      onClick={() => setBurgerQty((q) => q + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a3a3a3] hover:text-white transition-all hover:bg-white/5 text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                <p className="text-sm text-[#a3a3a3] mt-4 leading-relaxed max-w-xl">
                  {selectedBurger.description}
                </p>

                {/* Add-ons Modifiers */}
                <div className="mt-6 border-t border-white/5 pt-6">
                  <h3 className="text-xs font-bold tracking-[0.2em] text-[#a3a3a3] uppercase mb-4">
                    ADD-ONS
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {ADDONS.map((addon) => (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                          selectedAddons[addon.id]
                            ? "bg-[#c9a84c]/5 border-[#c9a84c] text-white"
                            : "bg-[#18181b]/50 border-white/5 text-[#a3a3a3] hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedAddons[addon.id]}
                            onChange={() => toggleAddon(addon.id)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            selectedAddons[addon.id]
                              ? "bg-[#c9a84c] border-[#c9a84c] text-black"
                              : "border-white/20"
                          }`}>
                            {selectedAddons[addon.id] && <span className="text-[10px]">✓</span>}
                          </div>
                          <span className="text-xs font-medium">{addon.name}</span>
                        </div>
                        <span className="text-xs text-[#c9a84c] font-semibold">
                          +${addon.price.toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="mt-8 flex gap-4">
                  <button onClick={handleAddToCart} className="btn-menu-gold flex-1 py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    <span>ADD TO CART</span>
                    <span className="opacity-50">|</span>
                    <span>${burgerSectionTotal.toFixed(2)}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Cross-Sell Section: Make It A Pack */}
        <section className="menu-glass-card rounded-3xl p-6 md:p-10 border border-[#c9a84c]/20 relative overflow-hidden bg-gradient-to-r from-[#0e0e10] to-[#121214]">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none font-extrabold tracking-tighter">PACK</div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold text-[#c9a84c] tracking-[0.3em] uppercase">Special Combo</span>
              <h2 className="text-4xl font-extrabold text-[#f5f0e8] mt-2">MAKE IT A PACK</h2>
              <p className="text-sm text-[#a3a3a3] mt-2 max-w-md leading-relaxed">
                Complete your hunt. Add golden fries and a refreshing craft soda to your burger order and save on the pack.
              </p>
            </div>

            {/* Fries Option */}
            <div className="lg:col-span-2 flex flex-col items-center text-center bg-[#0b0b0c]/60 p-4 rounded-2xl border border-white/5">
              <img src="/wolfie_fries.png" alt="Fries" className="w-20 h-20 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
              <h3 className="text-sm font-bold text-white mt-3">GOLDEN FRIES</h3>
              <div className="text-xs text-[#c9a84c] font-semibold mt-1">+${packFriesPrice.toFixed(2)}</div>
              <button
                onClick={() => setPackFriesSelected(!packFriesSelected)}
                className={`mt-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border ${
                  packFriesSelected
                    ? "bg-[#c9a84c] border-[#c9a84c] text-black hover:scale-105"
                    : "border-white/20 text-[#a3a3a3] hover:border-white/40 hover:text-white"
                }`}
              >
                {packFriesSelected ? "✓" : "+"}
              </button>
            </div>

            {/* Drink Option */}
            <div className="lg:col-span-2 flex flex-col items-center text-center bg-[#0b0b0c]/60 p-4 rounded-2xl border border-white/5">
              <img src="/wolfie_drink.png" alt="Drink" className="w-20 h-20 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
              <h3 className="text-sm font-bold text-white mt-3">CRAFT COLA</h3>
              <div className="text-xs text-[#c9a84c] font-semibold mt-1">+${packDrinkPrice.toFixed(2)}</div>
              <button
                onClick={() => setPackDrinkSelected(!packDrinkSelected)}
                className={`mt-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all border ${
                  packDrinkSelected
                    ? "bg-[#c9a84c] border-[#c9a84c] text-black hover:scale-105"
                    : "border-white/20 text-[#a3a3a3] hover:border-white/40 hover:text-white"
                }`}
              >
                {packDrinkSelected ? "✓" : "+"}
              </button>
            </div>

            {/* Summary Price Panel */}
            <div className="lg:col-span-3 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-8">
              <div className="text-xs text-[#a3a3a3] tracking-widest font-bold">TOTAL PRICE</div>
              <div className="text-4xl font-extrabold text-[#f5f0e8] mt-2">
                ${totalWithPack.toFixed(2)}
              </div>
              <button
                onClick={handleAddPack}
                className="btn-menu-gold mt-6 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 w-full"
              >
                <span>ADD PACK</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Sides Grid */}
        <section ref={sidesRef} className="scroll-mt-36">
          <div className="mb-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#f5f0e8]">SIDES</h2>
            <p className="text-sm text-[#a3a3a3] mt-2">Crunchy and smoke-grilled snacks to complete your meal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MENU_ITEMS.filter((item) => item.category === "sides").map((side) => (
              <div key={side.id} className="menu-glass-card p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden border border-white/5 hover:border-[#c9a84c]/20 bg-[#0e0e10]/80">
                <div className="absolute top-4 right-4 text-[#c9a84c] font-bold text-xl">${side.price.toFixed(2)}</div>
                
                <div className="flex items-center justify-center h-32 mb-6">
                  <img src={side.image} alt={side.name} className="w-24 h-24 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]" />
                </div>

                <div className="flex flex-col">
                  <h3 className="text-lg font-bold tracking-wide text-white">{side.name}</h3>
                  <p className="text-xs text-[#a3a3a3] mt-2 leading-relaxed min-h-[32px]">{side.description}</p>
                  
                  <button
                    onClick={() => {
                      setCartCount((c) => c + 1);
                      triggerToast(`1x ${side.name} added to cart!`);
                    }}
                    className="mt-6 border border-white/10 hover:border-[#c9a84c] text-white hover:text-black hover:bg-[#c9a84c] py-2 rounded-xl text-xs font-semibold tracking-wider transition-all"
                  >
                    ADD TO HUNT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Drinks Grid */}
        <section ref={drinksRef} className="scroll-mt-36">
          <div className="mb-10">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#f5f0e8]">DRINKS</h2>
            <p className="text-sm text-[#a3a3a3] mt-2">Artisanal craft sodas and stouts, served ice cold.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MENU_ITEMS.filter((item) => item.category === "drinks").map((drink) => (
              <div key={drink.id} className="menu-glass-card p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden border border-white/5 hover:border-[#c9a84c]/20 bg-[#0e0e10]/80">
                <div className="absolute top-4 right-4 text-[#c9a84c] font-bold text-xl">${drink.price.toFixed(2)}</div>
                
                <div className="flex items-center justify-center h-32 mb-6">
                  <img src={drink.image} alt={drink.name} className="w-24 h-24 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]" />
                </div>

                <div className="flex flex-col">
                  <h3 className="text-lg font-bold tracking-wide text-white">{drink.name}</h3>
                  <p className="text-xs text-[#a3a3a3] mt-2 leading-relaxed min-h-[32px]">{drink.description}</p>
                  
                  <button
                    onClick={() => {
                      setCartCount((c) => c + 1);
                      triggerToast(`1x ${drink.name} added to cart!`);
                    }}
                    className="mt-6 border border-white/10 hover:border-[#c9a84c] text-white hover:text-black hover:bg-[#c9a84c] py-2 rounded-xl text-xs font-semibold tracking-wider transition-all"
                  >
                    ADD TO HUNT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Wolfie Brands Value Section */}
        <section id="why-wolfie" className="py-12 border-t border-white/5 scroll-mt-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-bold text-[#c9a84c] tracking-[0.3em] uppercase">Why Wolfie?</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#f5f0e8] mt-2">WE OWN THE HUNT</h2>
            <p className="text-sm text-[#a3a3a3] mt-2 leading-relaxed">
              We don't follow trends. We set the standard. Here is why Wolfie Burgers remains the pack leader.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="menu-glass-card p-8 rounded-3xl text-center relative overflow-hidden bg-[#0e0e10]/60">
              <div className="text-4xl mb-4">🥩</div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">100% BEEF</h3>
              <p className="text-xs text-[#a3a3a3] mt-3 leading-relaxed">
                No filler. No shortcuts. Just premium beef ground fresh daily and seasoned to perfection.
              </p>
            </div>

            <div className="menu-glass-card p-8 rounded-3xl text-center relative overflow-hidden bg-[#0e0e10]/60">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">FIRE GRILLED</h3>
              <p className="text-xs text-[#a3a3a3] mt-3 leading-relaxed">
                Smoked to perfection on open wood flames to capture that authentic smoky charcoal flavor.
              </p>
            </div>

            <div className="menu-glass-card p-8 rounded-3xl text-center relative overflow-hidden bg-[#0e0e10]/60">
              <div className="text-4xl mb-4">🌿</div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">QUALITY INGREDIENTS</h3>
              <p className="text-xs text-[#a3a3a3] mt-3 leading-relaxed">
                Hand-selected fresh local produce, custom baked brioche buns, and house-blended secret sauces.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* Brand Footer */}
      <footer className="border-t border-white/5 bg-[#050506] py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐺</span>
              <div>
                <div className="text-2xl font-bold tracking-widest text-white leading-none">WOLFIE</div>
                <div className="text-[10px] tracking-[0.3em] text-[#c9a84c] mt-0.5">BURGERS</div>
              </div>
            </div>
            <p className="text-[11px] text-[#a3a3a3] mt-4 tracking-widest uppercase">
              FEED THE WOLF. JOIN THE PACK.
            </p>
          </div>

          <div className="text-center md:text-right">
            <p className="text-xs text-[#a3a3a3]">&copy; {new Date().getFullYear()} WOLFIE BURGERS. ALL RIGHTS RESERVED.</p>
            <div className="flex justify-center md:justify-end gap-6 text-sm text-[#a3a3a3] mt-4 uppercase tracking-[0.2em] font-semibold">
              <a href="#" className="hover:text-[#c9a84c] transition-colors">Instagram</a>
              <a href="#" className="hover:text-[#c9a84c] transition-colors">Facebook</a>
              <a href="#" className="hover:text-[#c9a84c] transition-colors">TikTok</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
