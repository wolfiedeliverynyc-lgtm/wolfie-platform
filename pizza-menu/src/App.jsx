import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Menu, ChevronLeft, ChevronRight, Globe, Sandwich, CircleDashed, CupSoda, Settings } from 'lucide-react';
import './App.css';

const pizzas = [
  {
    id: 1,
    name: 'Classic<br/>Pepperoni Pizza.',
    subtitle: 'Best Pizza in Town.',
    description: 'Our signature pizza is a mouth-watering masterpiece with premium mozzarella, spicy pepperoni, fresh basil, and our secret tomato sauce on a hand-tossed crust.',
    price: 18,
    image: 'https://pngimg.com/uploads/pizza/pizza_PNG44071.png',
    size: 'Medium',
    toppings: ['Pepperoni', 'Mozzarella', 'Basil'],
    extras: ['Extra Cheese']
  },
  {
    id: 2,
    name: 'BBQ<br/>Chicken Pizza.',
    subtitle: 'Best Pizza in Town.',
    description: 'Our signature pizza with smoky BBQ sauce, tender grilled chicken, red onions, and fresh cilantro on a hand-tossed crust.',
    price: 20,
    image: 'https://pngimg.com/uploads/pizza/pizza_PNG44077.png',
    size: 'Large',
    toppings: ['Chicken', 'BBQ Sauce', 'Red Onions', 'Cilantro'],
    extras: ['Garlic Bread']
  }
];

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [activeMenu, setActiveMenu] = useState('pizza');
  const [showDetails, setShowDetails] = useState(false);

  const currentPizza = pizzas[currentIndex];

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % pizzas.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + pizzas.length) % pizzas.length);
  };

  // Auto hide cart details after a short delay
  React.useEffect(() => {
    if (showDetails) {
      const timer = setTimeout(() => setShowDetails(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showDetails]);
  const onDragEnd = (e, { offset, velocity }) => {
    const swipe = offset.x;
    if (swipe < -50) {
      handleNext();
    } else if (swipe > 50) {
      handlePrev();
    }
  };

  const textVariants = {
    initial: (dir) => ({ y: 50, opacity: 0 }),
    animate: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: (dir) => ({ y: -50, opacity: 0, transition: { duration: 0.3 } })
  };

  const pizzaVariants = {
    initial: (dir) => ({ x: dir * 200, rotate: dir * 90, opacity: 0 }),
    animate: { x: 0, rotate: 0, opacity: 1, transition: { duration: 0.8, type: 'spring', bounce: 0.4 } },
    exit: (dir) => ({ x: -dir * 200, rotate: -dir * 90, opacity: 0, transition: { duration: 0.6 } })
  };

  return (
    <div className="app-container">
      {/* Side Navbar */}
      <aside className="sidebar">
        <div className={`sidebar-icon ${activeMenu === 'search' ? 'active' : ''}`} onClick={() => setActiveMenu('search')}><Search size={24} /></div>
        <div className={`sidebar-icon ${activeMenu === 'pizza' ? 'active' : ''}`} onClick={() => setActiveMenu('pizza')}><Globe size={24} /></div>
        <div className={`sidebar-icon ${activeMenu === 'burger' ? 'active' : ''}`} onClick={() => setActiveMenu('burger')}><Sandwich size={24} /></div>
        <div className={`sidebar-icon ${activeMenu === 'donut' ? 'active' : ''}`} onClick={() => setActiveMenu('donut')}><CircleDashed size={24} /></div>
        <div className={`sidebar-icon ${activeMenu === 'drink' ? 'active' : ''}`} onClick={() => setActiveMenu('drink')}><CupSoda size={24} /></div>
        <div className={`sidebar-icon ${activeMenu === 'settings' ? 'active' : ''}`} onClick={() => setActiveMenu('settings')}><Settings size={24} /></div>
      </aside>

      <nav className="navbar">
        <div className="nav-left">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>
          </svg>
          <span>Pizza & Slices</span>
        </div>
        <div className="nav-right">
          <ShoppingCart className="nav-icon" size={22} />
          <Search className="nav-icon" size={22} />
          <Menu className="nav-icon" size={26} />
        </div>
      </nav>

      <main className="main-content">
        <div className="pizza-section">
          {/* Static Plate */}
          <div className="plate"></div>

          <div className="pizza-image-container">
            <div className="combo-deal">Combo<br/>Deal</div>
            <div className="price-tag">${currentPizza.price}</div>

            <AnimatePresence custom={direction} mode="wait">
              <motion.img
                key={currentPizza.id}
                src={currentPizza.image}
                alt={currentPizza.name}
                className="pizza-image"
                custom={direction}
                variants={pizzaVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={onDragEnd}
                whileTap={{ cursor: "grabbing" }}
                style={{ cursor: "grab" }}
              />
            </AnimatePresence>
          </div>
        </div>

        <div className="text-section">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentPizza.id}
              custom={direction}
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <span className="subtitle">{currentPizza.subtitle}</span>
              <h1 className="title" dangerouslySetInnerHTML={{ __html: currentPizza.name }}></h1>
              <p className="description">{currentPizza.description}</p>
              <button className="add-to-cart" onClick={() => setShowDetails(true)}>Add to Cart</button>
            </motion.div>
          </AnimatePresence>
          {/* Cart Details */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                className="cart-details"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: -30, opacity: 1, transition: { type: 'spring', stiffness: 120 } }}
                exit={{ y: 60, opacity: 0, transition: { duration: 0.2 } }}
              >
                <p><strong>Size:</strong> {currentPizza.size}</p>
                <p><strong>Toppings:</strong> {currentPizza.toppings.join(', ')}</p>
                <p><strong>Extras:</strong> {currentPizza.extras.join(', ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="bottom-controls">
        <div className="arrows">
          <button className="arrow-btn" onClick={handlePrev}><ChevronLeft size={20} /></button>
          <button className="arrow-btn" onClick={handleNext}><ChevronRight size={20} /></button>
        </div>

        <div className="pagination">
          <span>01</span>
          <div className="pagination-line"></div>
          <span className="pagination-active">0{currentIndex + 9}</span>
          <div className="pagination-line"></div>
          <span>30</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
