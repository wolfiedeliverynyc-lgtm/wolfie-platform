'use client';

import { useEffect, useRef } from 'react';

export default function Home() {
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
    <>
      {/* NAV */}
      <nav id="nav" ref={navRef}>
        <div className="nav-logo">
          <span className="wm">WOLFIE</span>
          <span className="sub">Delivery</span>
        </div>
        <ul className="nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#restaurants">Restaurants</a></li>
          <li><a href="#drivers">Drivers</a></li>
          <li><a href="https://app.wolfie.com" target="_blank" rel="noopener noreferrer">Order</a></li>
          <li><a href="https://app.wolfie.com/register" target="_blank" rel="noopener noreferrer">Register</a></li>
        </ul>
        <a href="https://wolfie-platform-sfog-bjdojzh9k-wolfiedeliverynyc-8378s-projects.vercel.app/register" className="nav-cta" target="_blank" rel="noopener noreferrer">Join Free</a>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" id="heroBg" ref={heroBgRef}></div>
        <div className="hero-vignette"></div>
        <div className="hero-content">
          <div className="hero-eyebrow">Brooklyn, New York</div>
          
          <p className="hero-sub">
            Lower commissions for restaurants.<br />
            Guaranteed pay for drivers.<br />
            A platform built on fairness, not extraction.
          </p>
          <div className="hero-actions">
            <a href="#restaurants" className="btn-gold">For restaurants</a>
            <a href="#drivers" className="btn-outline">Drive with Wolfie</a>
          </div>
        </div>
        <div className="hero-strip">
          <div className="strip-item">
            <span className="strip-num">10–18%</span>
            <span className="strip-label">Commission rate</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">$4+</span>
            <span className="strip-label">Driver base pay</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">0%</span>
            <span className="strip-label">Hidden fees</span>
          </div>
          <div className="strip-item">
            <span className="strip-num">BKLYN</span>
            <span className="strip-label">Williamsburg first</span>
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
          <div className="bag-tag">The delivery</div>
          <h2 className="bag-title">PACKED<br /><span>WITH CARE</span></h2>
          <div className="bag-divider"></div>
          <p className="bag-body">
            Every order sealed with the Wolfie mark.<br />
            From the kitchen to your door — nothing compromised,<br />
            nothing extracted. Just food, done right.
          </p>
          <div className="bag-stats">
            <div>
              <div className="bag-stat-n">24h</div>
              <div className="bag-stat-l">Restaurant onboarding</div>
            </div>
            <div>
              <div className="bag-stat-n">100%</div>
              <div className="bag-stat-l">Tips to drivers</div>
            </div>
            <div>
              <div className="bag-stat-n">$0</div>
              <div className="bag-stat-l">Setup cost</div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="tag sr">Process</div>
        <h2 className="sec-title sr d1">How Wolfie<br />works</h2>
        <p className="sec-body sr d2">Connecting Brooklyn restaurants directly with hungry customers — lean operation, honest math.</p>
        <div className="steps">
          <div className="step sr">
            <div className="step-n">01</div>
            <div className="step-body">
              <h3>Restaurant lists their menu</h3>
              <p>Onboard in under 24 hours. No setup fees, no lock-in contracts. Set your prices, hours, and delivery radius — we handle the rest.</p>
            </div>
          </div>
          <div className="step sr d1">
            <div className="step-n">02</div>
            <div className="step-body">
              <h3>Customer places an order</h3>
              <p>Cash on delivery or card. Real-time tracking. A clean, fast ordering experience designed for Williamsburg and surrounding neighborhoods.</p>
            </div>
          </div>
          <div className="step sr d2">
            <div className="step-n">03</div>
            <div className="step-body">
              <h3>Driver picks up and delivers</h3>
              <p>Matched automatically by proximity. Drivers see their full payout before accepting. Transparent pay, every single time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* RESTAURANTS & DRIVERS */}
      <section className="section pb-[3rem] border-b-0" id="restaurants">
        <div className="tag sr">The proposition</div>
        <h2 className="sec-title sr d1">Built for<br />both sides</h2>
        <p className="sec-body sr d2">Every decision flows from one principle: the people doing the work and taking the risk should keep more of what they earn.</p>
        <div className="dual">
          <div className="dual-card sr">
            <div className="dual-card-tag">For restaurants</div>
            <h3>KEEP MORE MARGIN</h3>
            <p>DoorDash and Uber Eats take 25-30% of every order. Wolfie charges 10-18%, tiered by order size. That is real money staying in Brooklyn kitchens.</p>
            <ul className="mlist">
              <li><span>Orders under $25</span><span className="mval">10%</span></li>
              <li><span>Orders $25 - $50</span><span className="mval">14%</span></li>
              <li><span>Orders over $50</span><span className="mval">18%</span></li>
              <li><span>Setup fee</span><span className="mval">$0</span></li>
              <li><span>Contract</span><span className="mval">None</span></li>
            </ul>
          </div>
          <div className="dual-card sr d1" id="drivers">
            <div className="dual-card-tag">For drivers</div>
            <h3>GUARANTEED BASE PAY</h3>
            <p>Know your minimum before you accept. Distance and time calculated upfront. No surge math, no guessing — just honest numbers every ride.</p>
            <ul className="mlist">
              <li><span>Base per order</span><span className="mval">$4.00</span></li>
              <li><span>Per kilometer</span><span className="mval">+ $0.80</span></li>
              <li><span>Per minute</span><span className="mval">+ $0.12</span></li>
              <li><span>Tips</span><span className="mval">100% to you</span></li>
              <li><span>Pay shown</span><span className="mval">Before accept</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="section pt-[5rem]">
        <div className="tag sr">Comparison</div>
        <h2 className="sec-title sr d1">Wolfie vs<br />the market</h2>
        <div className="ctable sr d2">
          <div className="ctable-head">
            <span>Platform</span><span>Commission</span><span>Driver base pay</span>
          </div>
          <div className="ctable-row">
            <span className="wn">Wolfie</span><span className="rate">10 - 18%</span><span className="rate">$4.00 guaranteed</span>
          </div>
          <div className="ctable-row">
            <span>DoorDash</span><span className="cross">25 - 30%</span><span style={{ color: 'var(--dim)' }}>Variable, opaque</span>
          </div>
          <div className="ctable-row">
            <span>Uber Eats</span><span className="cross">25 - 30%</span><span style={{ color: 'var(--dim)' }}>Variable, opaque</span>
          </div>
          <div className="ctable-row">
            <span>Grubhub</span><span className="cross">20 - 30%</span><span style={{ color: 'var(--dim)' }}>Variable, opaque</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-wrap" id="cta">
        <div className="tag sr">Early access</div>
        <h2 className="sec-title sr d1">Be first<br />in the pack</h2>
        <p className="cta-sub sr d2">Wolfie is launching in Williamsburg, Brooklyn. We are onboarding our first wave of restaurant partners and drivers. No fees during the pilot period.</p>
        <div className="hero-actions sr d3">
          <a href="https://wolfie-platform-sfog-bjdojzh9k-wolfiedeliverynyc-8378s-projects.vercel.app/register" className="btn-gold" target="_blank" rel="noopener noreferrer">Partner with Wolfie</a>
          <a href="https://driver.wolfie.com/register" className="btn-outline" target="_blank" rel="noopener noreferrer">Drive with Wolfie</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="f-logo">WOLFIE</div>
        <div className="f-note">Williamsburg, Brooklyn</div>
      </footer>
    </>
  );
}
// trigger reload
