'use client';

import { useEffect, useRef } from 'react';

export default function RestaurantLanding() {
  const bagSectionRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const bagBgRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;

        // hero parallax — 0.45× rate
        if (heroBgRef.current) {
          heroBgRef.current.style.transform = `translateY(${sy * 0.45}px)`;
        }

        // bag parallax — relative to its own section
        if (bagSectionRef.current && bagBgRef.current) {
          const br = bagSectionRef.current.getBoundingClientRect();
          const bagProgress = -br.top; // px scrolled into the section
          bagBgRef.current.style.transform = `translateY(${bagProgress * 0.4}px)`;
        }

        // nav scroll state
        if (navRef.current) {
          if (sy > 60) {
            navRef.current.classList.add('scrolled');
          } else {
            navRef.current.classList.remove('scrolled');
          }
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // BAG SECTION: intersection trigger
    const bagObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (bagSectionRef.current) {
          if (e.isIntersecting) bagSectionRef.current.classList.add('in-view');
          else bagSectionRef.current.classList.remove('in-view');
        }
      });
    }, { threshold: 0.15 });

    if (bagSectionRef.current) {
      bagObserver.observe(bagSectionRef.current);
    }

    // SCROLL REVEAL (other sections)
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) (e.target as HTMLElement).classList.add('vis');
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

    document.querySelectorAll('.sr').forEach((el) => io.observe(el));

    // GOLD CURSOR TRAIL
    let mx = 0, my = 0, cx = 0, cy = 0;
    const trail = document.createElement('div');
    trail.style.cssText = 'position:fixed;top:0;left:0;width:6px;height:6px;border-radius:50%;background:rgba(200,150,74,0.5);pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:opacity 0.3s;';
    document.body.appendChild(trail);

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    document.addEventListener('mousemove', onMouseMove);

    let animationFrameId: number;
    const loop = () => {
      cx += (mx - cx) * 0.12;
      cy += (my - cy) * 0.12;
      trail.style.left = cx + 'px';
      trail.style.top = cy + 'px';
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    const onMouseLeave = () => trail.style.opacity = '0';
    const onMouseEnter = () => trail.style.opacity = '1';
    
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    return () => {
      window.removeEventListener('scroll', onScroll);
      bagObserver.disconnect();
      io.disconnect();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animationFrameId);
      if (trail.parentNode) {
        trail.parentNode.removeChild(trail);
      }
    };
  }, []);

  return (
    <div className="restaurant-page">
      {/* NAV */}
      <nav id="nav" ref={navRef}>
        <div className="nav-logo">
          <span className="wm">WOLFIE</span>
          <span className="sub">For Restaurants</span>
        </div>
        <ul className="nav-links">
          <li><a href="#arsenal">Services</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#benefits">Benefits</a></li>
          <li><a href="#savings">Savings</a></li>
        </ul>
        <a href="#cta" className="nav-cta">Apply Now</a>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
        <div className="restaurant-hero-bg" id="heroBg" ref={heroBgRef}></div>
        <div className="hero-vignette"></div>
        <div className="hero-content" style={{ textAlign: 'left', margin: '0', padding: '0 8vw', maxWidth: '900px' }}>
          <div className="hero-eyebrow" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem', letterSpacing: '0.4em' }}>FOUNDING PARTNER PROGRAM</div>
          
          <h1 className="hero-title" style={{ fontSize: 'clamp(42px, 6vw, 76px)', lineHeight: 1.05, marginBottom: '1.5rem' }}>
            STOP PAYING 30%.<br />
            <em style={{ fontStyle: 'normal', color: '#c9a84c' }}>KEEP YOUR CUSTOMERS.</em>
          </h1>
          
          <p className="hero-sub" style={{ fontSize: '18px', maxWidth: '500px', margin: '0 0 1rem 0', fontWeight: 300, color: '#f5f0e8' }}>
            Wolfie charges just 10–18% commission. Your customers stay yours.
          </p>

          <p className="hero-sub" style={{ fontSize: '12px', opacity: 0.6, maxWidth: '500px', margin: '0 0 2.5rem 0', lineHeight: 1.6 }}>
            Limited to the first 20 Williamsburg restaurants. Your data stays yours.<br/>
            Your brand stays yours. Built for independent Brooklyn restaurants.
          </p>

          <div className="hero-actions" style={{ justifyContent: 'flex-start' }}>
            <a href="#cta" className="btn-gold" style={{ padding: '0.8rem 2rem', fontSize: '13px', letterSpacing: '0.1em' }}>Join Wolfie Free</a>
            <a href="#how" className="btn-outline" style={{ padding: '0.8rem 2rem', fontSize: '13px', letterSpacing: '0.1em' }}>See How It Works</a>
          </div>
        </div>
        <div className="hero-strip">
          <div className="strip-item">
            <span className="strip-num">10–18%</span>
            <span className="strip-label">Commission rate</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">100%</span>
            <span className="strip-label">Customer Data</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">0%</span>
            <span className="strip-label">Hidden fees</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">DAILY</span>
            <span className="strip-label">Payouts</span>
          </div>
        </div>
      </section>

      {/* PARALLAX BAG SECTION */}
      <div className="bag-parallax" id="bagSection" ref={bagSectionRef}>
        <div className="bag-bg" id="bagBg" ref={bagBgRef}></div>
        <div className="bag-vignette"></div>
        <div className="bag-scanline"></div>
        <div className="bag-rule-top"></div>
        <div className="bag-rule-bottom"></div>

        <div className="bag-content">
          <div className="bag-tag">The Problem</div>
          <h2 className="bag-title" style={{ fontSize: 'clamp(56px, 8vw, 90px)' }}>DOES THIS SOUND<br /><span>FAMILIAR?</span></h2>
          <div className="bag-divider"></div>
          <div className="bag-body space-y-2">
            <p>❌ You lose $9–15 on every $50 order</p>
            <p>❌ DoorDash owns the customer relationship</p>
            <p>❌ You don't get customer data or loyalty</p>
            <p>❌ Fees keep increasing while margins shrink</p>
            <p>❌ You're competing against promoted chains</p>
          </div>
        </div>
      </div>

      {/* THE ARSENAL SECTION */}
      <section className="section pb-4" id="arsenal">
        <div className="tag sr">The Arsenal</div>
        <h2 className="sec-title sr d1" style={{ fontSize: 'clamp(48px, 6vw, 72px)' }}>
          Listen to me very closely.<br />
          <span style={{ color: 'var(--amber)', fontSize: 'clamp(32px, 4vw, 48px)', display: 'block', marginTop: '1rem', fontStyle: 'italic' }}>You are leaving thousands on the table.</span>
        </h2>
        
        <div className="arsenal-grid">
          {/* DASHBOARD */}
          <div className="arsenal-card sr d2">
            <div className="arsenal-image-ph">DASHBOARD IMAGE PLACEHOLDER</div>
            <div className="arsenal-text">
              <h3>THE EXECUTIVE DASHBOARD</h3>
              <p>You want to fly blind? Go ahead, let the delivery apps hide your own data from you. Or you can use our Dashboard. Live analytics, total customer visibility, instant payouts. We hand you the keys to the kingdom. You own the data. You own the customer. Period.</p>
            </div>
          </div>

          {/* WAP SERVICE */}
          <div className="arsenal-card sr d2">
            <div className="arsenal-image-ph">WAP SERVICE IMAGE PLACEHOLDER</div>
            <div className="arsenal-text">
              <h3>THE HIGH-CONVERTING WEB APP</h3>
              <p>We didn't build a clunky app; we built a frictionless conversion machine. Your customers scan, order, and pay in seconds. It's sleek, it's fast, and it keeps your brand front and center. While your competitors are begging for clicks, your customers are checking out.</p>
            </div>
          </div>

          {/* AI MENU */}
          <div className="arsenal-card sr d2">
            <div className="arsenal-image-ph">AI MENU IMAGE PLACEHOLDER</div>
            <div className="arsenal-text">
              <h3>THE RELENTLESS AI MENU</h3>
              <p>Imagine having the greatest salesman in the world, working 24/7, for free. Our AI Menu doesn't just list your food—it analyzes, it adapts, and it <em>upsells</em>. It knows exactly what your customer wants before they do. It pushes the high-margin items and squeezes every last drop of revenue out of every single order.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="tag sr">Process</div>
        <h2 className="sec-title sr d1">How Wolfie<br />works</h2>
        <div className="steps">
          <div className="step sr">
            <div className="step-n">01</div>
            <div className="step-body">
              <h3>JOIN FOR FREE</h3>
              <p>Create your restaurant profile in minutes. No setup fees. No contracts.</p>
            </div>
          </div>
          <div className="step sr d1">
            <div className="step-n">02</div>
            <div className="step-body">
              <h3>RECEIVE ORDERS</h3>
              <p>Customers order through Wolfie. Drivers handle pickup and delivery.</p>
            </div>
          </div>
          <div className="step sr d2">
            <div className="step-n">03</div>
            <div className="step-body">
              <h3>KEEP MORE OF YOUR REVENUE</h3>
              <p>Daily payouts. Live analytics. Full visibility into your business.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS & SAVINGS */}
      <section className="section pb-[3rem] border-b-0" id="benefits">
        <div className="tag sr">The Proposition</div>
        <h2 className="sec-title sr d1">Built for<br />Independent Brands</h2>
        <div className="dual">
          <div className="dual-card sr">
            <div className="dual-card-tag">Benefits</div>
            <h3 style={{ fontSize: '36px' }}>WHAT WOLFIE DOES DIFFERENT</h3>
            <ul className="mlist mt-6">
              <li className="sr d1"><span>Pricing</span><span className="mval">10–18% commission</span></li>
              <li className="sr d2"><span>Data</span><span className="mval">Your customer data</span></li>
              <li className="sr d3"><span>Payouts</span><span className="mval">Daily</span></li>
              <li className="sr d4"><span>Network</span><span className="mval">Real Brooklyn delivery</span></li>
              <li className="sr d5"><span>Tools</span><span className="mval">Full analytics dashboard</span></li>
              <li className="sr d6"><span>Trial</span><span className="mval">7-day free trial</span></li>
              <li className="sr d7"><span>Contract</span><span className="mval">None. Leave anytime.</span></li>
            </ul>
          </div>
          <div className="dual-card sr d1" id="savings">
            <div className="dual-card-tag">Savings</div>
            <h3 style={{ fontSize: '36px' }}>HOW MUCH COULD YOU SAVE?</h3>
            <p className="sr d2">For many independent restaurants, that's thousands of dollars kept every year. Average $50 Order:</p>
            <ul className="mlist mt-6">
              <li className="sr d3"><span>DoorDash Commission</span><span className="mval" style={{ color: 'var(--dim)', textDecoration: 'line-through' }}>$12–15</span></li>
              <li className="sr d4"><span>Wolfie Commission</span><span className="mval">$5–9</span></li>
              <li className="sr d5 mt-4 border-t-0 pt-4" style={{ borderTop: '1px solid var(--border)' }}><span>Estimated Monthly Savings</span><span className="mval" style={{ fontSize: '18px' }}>$400–1,000+</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-wrap" id="cta">
        <div className="tag sr">Early access</div>
        <h2 className="sec-title sr d1" style={{ fontSize: 'clamp(48px, 6vw, 72px)' }}>EARLY ACCESS FOR<br />WILLIAMSBURG</h2>
        <p className="cta-sub sr d2">
          We're onboarding a limited number of restaurants before launch. Be one of the first restaurants customers discover when Wolfie launches.<br/><br/>
          Your Customers. Your Revenue. Your Data.<br/>
          Join Wolfie before your competitors do.
        </p>
        <p className="sr d2" style={{ fontFamily: 'var(--font-dm-mono)', fontSize: '10px', color: 'var(--muted)', marginBottom: '2rem' }}>
          7-Day Free Trial · No Credit Card Required · Cancel Anytime
        </p>
        <div className="hero-actions sr d3">
          <a href="https://wolfie-platform-sfog-bjdojzh9k-wolfiedeliverynyc-8378s-projects.vercel.app/register" className="btn-gold" target="_blank" rel="noopener noreferrer">Join Wolfie Free</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="f-logo">WOLFIE</div>
        <div className="f-note">Williamsburg, Brooklyn</div>
      </footer>
    </div>
  );
}
