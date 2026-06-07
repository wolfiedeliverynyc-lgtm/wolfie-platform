'use client';

import { useRef, useState, useEffect } from 'react';
import { useScroll, useTransform, motion, useSpring, AnimatePresence } from 'framer-motion';
import ScrollyCanvas from '@/components/ScrollyCanvas';
import { productData } from '@/data/productData';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      const slidesLength = productData.sections?.[0]?.slides?.length ?? 1;
      setCurrentSlide((prev) => (prev + 1) % slidesLength);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100, damping: 30, restDelta: 0.001
  });

  // VERY SHARP "Slide-like" Color Transitions
  // 0.32 -> 0.33 instantly snaps from Black to Pure Strong Yellow
  // 0.65 -> 0.66 instantly snaps from Yellow to White
  const bgColor = useTransform(
    smoothProgress, 
    [0, 0.32, 0.33, 0.65, 0.66, 1], 
    ["#0a0a0a", "#0a0a0a", "#FFEA00", "#FFEA00", "#F5F0E8", "#F5F0E8"]
  );
  
  // Sharp Text Color Inversions
  const textColorPrimary = useTransform(
    smoothProgress, 
    [0, 0.32, 0.33, 1], 
    ["#F5F0E8", "#F5F0E8", "#0a0a0a", "#0a0a0a"]
  );
  const textColorSecondary = useTransform(
    smoothProgress, 
    [0, 0.32, 0.33, 1], 
    ["#a3a3a3", "#a3a3a3", "#333333", "#333333"]
  );
  const buttonBg = useTransform(
    smoothProgress, 
    [0, 0.32, 0.33, 1], 
    ["#FF6B00", "#FF6B00", "#0a0a0a", "#0a0a0a"]
  );
  const buttonText = useTransform(
    smoothProgress, 
    [0, 0.32, 0.33, 1], 
    ["#ffffff", "#ffffff", "#F5F0E8", "#F5F0E8"]
  );

  const phase1 = useTransform(smoothProgress, [0, 0.31, 0.33], [1, 1, 0]);
  const phase2 = useTransform(smoothProgress, [0.33, 0.35, 0.64, 0.66], [0, 1, 1, 0]);
  const phase3 = useTransform(smoothProgress, [0.66, 0.68, 1], [0, 1, 1]);

  const canvasProgress = useTransform(
    smoothProgress,
    [0, 0.33, 0.66, 1],
    [0, 0.395, 0.395, 1]
  );

  const canvasOpacity = useTransform(smoothProgress, [0.95, 1], [1, 0]);

  const scrollToSection = (progressTarget: number) => {
    if (containerRef.current) {
      const scrollableDistance = containerRef.current.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: scrollableDistance * progressTarget,
        behavior: 'smooth'
      });
    }
  };

  const slide = productData.sections?.[0]?.slides?.[currentSlide] || { title: '', subtitle: '', description: '', cta: '' };

  return (
    <motion.main style={{ backgroundColor: bgColor }} className="min-h-screen font-sans selection:bg-[#FF6B00] selection:text-white">
      
      <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 bg-transparent">
        <motion.div style={{ color: textColorPrimary }} className="text-3xl font-display font-bold tracking-tighter cursor-pointer" onClick={() => scrollToSection(0)}>
          WOLFIE.
        </motion.div>
        <motion.div style={{ color: textColorPrimary }} className="hidden md:flex items-center space-x-12 text-sm font-bold tracking-widest uppercase">
          <button onClick={() => scrollToSection(0)} className="hover:opacity-70 transition-opacity">Order Food</button>
          <button onClick={() => scrollToSection(0.5)} className="hover:opacity-70 transition-opacity">Restaurants</button>
          <button onClick={() => scrollToSection(0.85)} className="hover:opacity-70 transition-opacity">Drivers</button>
        </motion.div>
        <div className="flex items-center space-x-6">
          <motion.button style={{ backgroundColor: textColorPrimary, color: bgColor }} className="px-6 py-3 font-display font-bold text-sm hover:scale-105 transition-transform uppercase flex items-center rounded-none">
            ORDER NOW <span className="ml-2">→</span>
          </motion.button>
        </div>
      </nav>

      {/* Cinematic Scroll Hero */}
      <div ref={containerRef} className="relative h-[500vh] w-full">
        
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8888880a_1px,transparent_1px),linear-gradient(to_bottom,#8888880a_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        </div>

        <motion.div style={{ opacity: canvasOpacity }} className="sticky top-0 right-0 h-screen w-full lg:w-1/2 z-10 ml-auto flex items-center justify-center overflow-hidden">
          <ScrollyCanvas progress={canvasProgress} />
        </motion.div>

        <div className="sticky top-0 left-0 w-full h-screen z-20 pointer-events-none -mt-[100vh]">
          
          {/* Phase 1: Customers Auto-playing Slides */}
          <motion.div style={{ opacity: phase1 }} className="absolute top-0 left-0 w-full lg:w-1/2 h-screen flex flex-col justify-center px-10 lg:px-20 pt-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <h2 className="text-lg lg:text-xl font-bold text-[#FF6B00] mb-4 uppercase tracking-[0.2em] font-sans">
                  {slide.subtitle}
                </h2>
                <motion.h1 style={{ color: textColorPrimary }} className="text-6xl lg:text-8xl font-display font-bold tracking-tighter mb-8 leading-none">
                  {slide.title}
                </motion.h1>
                <motion.p style={{ color: textColorSecondary }} className="text-xl max-w-md mb-12 whitespace-pre-line leading-relaxed font-sans">
                  {slide.description}
                </motion.p>
                {slide.cta && (
                  <div className="pointer-events-auto">
                    <motion.button style={{ backgroundColor: buttonBg, color: buttonText }} className="px-8 py-4 font-display font-bold text-lg hover:scale-105 transition-transform uppercase">
                      {slide.cta}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            
            <div className="absolute bottom-20 left-10 lg:left-20 flex space-x-3">
              {(productData.sections?.[0]?.slides || []).map((_, idx) => (
                <div key={idx} className={`h-1 transition-all duration-500 ${currentSlide === idx ? 'w-8 bg-[#FF6B00]' : 'w-4 bg-neutral-600'}`}></div>
              ))}
            </div>
          </motion.div>

          {/* Phase 2: Restaurants (STRONG YELLOW BG) */}
          <motion.div style={{ opacity: phase2 }} className="absolute top-0 left-0 w-full lg:w-1/2 h-screen flex flex-col justify-center text-left px-10 lg:px-20 pt-16">
            <h2 className="text-lg lg:text-xl font-bold text-[#FF6B00] mb-4 uppercase tracking-[0.2em] font-sans mix-blend-multiply">
              {productData.sections?.[1]?.subtitle}
            </h2>
            <motion.h1 style={{ color: textColorPrimary }} className="text-6xl lg:text-8xl font-display font-bold tracking-tighter mb-8 leading-none">
              {productData.sections?.[1]?.title}
            </motion.h1>
            <motion.p style={{ color: textColorSecondary }} className="text-xl max-w-md mb-12 whitespace-pre-line leading-relaxed font-sans">
              {productData.sections?.[1]?.description}
            </motion.p>
            <div className="pointer-events-auto">
              <motion.button style={{ borderColor: textColorPrimary, color: textColorPrimary }} className="border-4 bg-transparent px-8 py-4 font-display font-bold text-lg hover:scale-105 transition-transform uppercase">
                {productData.sections?.[1]?.cta}
              </motion.button>
            </div>
          </motion.div>

          {/* Phase 3: Drivers (WHITE BG) */}
          <motion.div style={{ opacity: phase3 }} className="absolute top-0 left-0 w-full lg:w-1/2 h-screen flex flex-col justify-center text-left px-10 lg:px-20 pt-16">
            <h2 className="text-lg lg:text-xl font-bold text-[#FF6B00] mb-4 uppercase tracking-[0.2em] font-sans">
              {productData.sections?.[2]?.subtitle}
            </h2>
            <motion.h1 style={{ color: textColorPrimary }} className="text-6xl lg:text-8xl font-display font-bold tracking-tighter mb-8 leading-none">
              {productData.sections?.[2]?.title}
            </motion.h1>
            <motion.p style={{ color: textColorSecondary }} className="text-xl max-w-md mb-12 whitespace-pre-line leading-relaxed font-sans">
              {productData.sections?.[2]?.description}
            </motion.p>
            <div className="pointer-events-auto">
              <motion.button style={{ backgroundColor: textColorPrimary, color: bgColor }} className="px-8 py-4 font-display font-bold text-lg hover:scale-105 transition-transform uppercase">
                {productData.sections?.[2]?.cta}
              </motion.button>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Static Content Below the Fold - STAY WHITE (#F5F0E8) */}
      <div className="relative z-30 bg-[#F5F0E8] text-[#0a0a0a] pt-32 pb-32">
        
        {/* HOW THE GRID WORKS */}
        <section className="max-w-7xl mx-auto px-8 mb-40">
          <div className="mb-20 text-center md:text-left">
            <h3 className="text-sm font-bold text-[#FF6B00] tracking-[0.2em] uppercase mb-4 font-sans">Network Protocol</h3>
            <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter">HOW THE GRID WORKS</h2>
          </div>
          
          {/* Realistic Map Placeholder using an Unsplash image embedded in a floating glass card */}
          <div className="w-full relative h-[500px] mb-24 rounded-[40px] overflow-hidden shadow-2xl group cursor-pointer">
            <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200" 
              alt="Delivery Tracking Map" 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {/* Glass Overlay UI Mockup */}
            <div className="absolute bottom-8 left-8 right-8 lg:left-1/2 lg:-translate-x-1/2 lg:w-96 bg-white/70 backdrop-blur-2xl border border-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#FF6B00] flex items-center justify-center text-white text-xl shadow-lg">🛵</div>
                <div>
                  <div className="font-display font-bold text-lg">Alex is approaching</div>
                  <div className="text-sm font-sans text-neutral-600">2 mins away · Williamsburg</div>
                </div>
              </div>
              <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-[#FF6B00] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {productData.protocol.map((item, i) => (
              <div key={i} className="flex flex-col border-t border-neutral-300 pt-8">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-4xl">{item.icon}</span>
                  <span className="text-3xl font-display font-bold text-[#FF6B00]">{item.step}</span>
                </div>
                <h4 className="text-3xl font-display font-bold mb-4">{item.title}</h4>
                <p className="text-neutral-600 leading-relaxed font-sans text-lg">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WHY WOLFIE - GLASS CARDS */}
        <section className="max-w-7xl mx-auto px-8 mb-40">
          <div className="mb-20 text-center md:text-left">
            <h3 className="text-sm font-bold text-[#FF6B00] tracking-[0.2em] uppercase mb-4 font-sans">Why Wolfie</h3>
            <h2 className="text-5xl md:text-7xl font-display font-bold tracking-tighter">FAIR FOR EVERYONE.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {productData.whyWolfie.map((item, i) => (
              <div key={i} className="relative bg-white/60 backdrop-blur-2xl p-10 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[32px] hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)] transition-all duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl pointer-events-none">{item.icon}</div>
                <div className="text-5xl mb-8 relative z-10">{item.icon}</div>
                <h4 className="text-2xl font-display font-bold mb-4 uppercase relative z-10">{item.title}</h4>
                <p className="text-neutral-600 leading-relaxed text-lg font-sans relative z-10">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action Footer */}
        <footer className="max-w-7xl mx-auto px-8 pt-32 border-t border-neutral-300 flex flex-col md:flex-row justify-between items-end pb-24">
          <div className="mb-16 md:mb-0">
            <p className="text-xs font-bold text-[#FF6B00] tracking-[0.3em] uppercase mb-6 font-sans">Brooklyn · Williamsburg · Bed-Stuy</p>
            <h2 className="text-7xl md:text-9xl font-display font-bold mb-10 tracking-tighter leading-none">
              PLUG INTO<br/>THE GRID.
            </h2>
            <button className="bg-[#FF6B00] text-white px-10 py-5 font-display font-bold text-xl hover:bg-[#0a0a0a] transition-all uppercase rounded-full shadow-xl hover:shadow-2xl hover:scale-105 w-full md:w-auto">
              ORDER NOW →
            </button>
          </div>
          
          <div className="flex flex-col md:text-right w-full md:w-auto items-center md:items-end">
            <div className="text-5xl font-display font-bold tracking-tighter mb-10 cursor-pointer text-[#0a0a0a]" onClick={() => window.scrollTo(0, 0)}>WOLFIE.</div>
            <div className="flex flex-wrap justify-center md:justify-end gap-8 text-sm font-bold text-neutral-500 font-sans uppercase tracking-widest mb-4">
              <a href="#" className="hover:text-[#FF6B00] transition-colors">Restaurants</a>
              <a href="#" className="hover:text-[#FF6B00] transition-colors">Drivers</a>
              <a href="#" className="hover:text-[#FF6B00] transition-colors">About</a>
              <a href="#" className="hover:text-[#FF6B00] transition-colors">Support</a>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-6 text-xs text-neutral-500 font-sans uppercase tracking-widest">
              <a href="/legal?tab=terms-of-service" className="hover:text-[#FF6B00] transition-colors">Terms of Service</a>
              <a href="/legal?tab=privacy-policy" className="hover:text-[#FF6B00] transition-colors">Privacy Policy</a>
              <a href="/legal?tab=refund-cancellation-policy" className="hover:text-[#FF6B00] transition-colors">Refunds</a>
              <a href="/legal?tab=community-guidelines" className="hover:text-[#FF6B00] transition-colors">Rules & Laws</a>
            </div>
          </div>
        </footer>
      </div>

    </motion.main>
  );
}
