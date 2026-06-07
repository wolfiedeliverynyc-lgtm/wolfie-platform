'use client';

import { useEffect, useRef } from 'react';

export default function DriverLanding() {
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroShadowRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;

        // hero parallax
        if (heroBgRef.current) {
          heroBgRef.current.style.transform = `translateY(${sy * 0.45}px)`;
        }
        
        // hero shadow reveal
        if (heroShadowRef.current) {
          // As we scroll down, opacity goes from 0 to 1
          const opacity = Math.min(sy / 500, 1);
          heroShadowRef.current.style.opacity = opacity.toString();
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

    // SCROLL REVEAL (other sections)
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) (e.target as HTMLElement).classList.add('vis');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -64px 0px' });

    document.querySelectorAll('.sr').forEach((el) => io.observe(el));

    // GOLD CURSOR TRAIL
    let mx = 0, my = 0, cx = 0, cy = 0;
    const trail = document.createElement('div');
    trail.style.cssText = 'position:fixed;top:0;left:0;width:6px;height:6px;border-radius:50%;background:rgba(255,150,0,0.5);pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:opacity 0.3s;box-shadow: 0 0 10px rgba(255,150,0,0.8);';
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
    <div className="driver-page">
      {/* NAV */}
      <nav id="nav" ref={navRef}>
        <div className="nav-logo">
          <span className="wm">WOLFIE</span>
          <span className="sub">For Drivers</span>
        </div>
        <ul className="nav-links">
          <li><a href="#earnings">Earnings</a></li>
          <li><a href="#compare">Compare</a></li>
          <li><a href="#how">How it works</a></li>
        </ul>
        <a href="#cta" className="nav-cta">Apply to Drive</a>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
        <div className="driver-hero-bg" id="heroBg" ref={heroBgRef}></div>
        {/* Dynamic shadow reveal */}
        <div className="driver-hero-shadow" ref={heroShadowRef}></div>
        <div className="hero-vignette"></div>
        <div className="hero-content" style={{ textAlign: 'left', margin: '0', padding: '0 8vw', maxWidth: '1000px', paddingTop: '10vh' }}>
          <div className="hero-eyebrow" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem', letterSpacing: '0.4em', color: 'var(--amber-bright)' }}>JOIN THE PACK</div>
          
          <h1 className="hero-title" style={{ fontSize: 'clamp(48px, 7vw, 92px)', lineHeight: 1.05, marginBottom: '2rem' }}>
            Earn More.<br />
            Keep 100% of Your Tips.<br />
            <em style={{ fontStyle: 'normal', color: 'var(--amber-bright)' }}>Drive on Your Schedule.</em>
          </h1>
          
          <p className="hero-sub" style={{ fontSize: '20px', maxWidth: '600px', margin: '0 0 1rem 0', fontWeight: 300, color: 'var(--cream)' }}>
            $4 base + $0.80/km + $0.12/min wait time.<br />
            Daily payouts. No algorithm games.
          </p>

          <div className="hero-actions mt-12" style={{ justifyContent: 'flex-start' }}>
            <a href="#cta" className="btn-amber" style={{ padding: '1rem 2.5rem', fontSize: '14px', letterSpacing: '0.1em' }}>Start Earning with Wolfie</a>
          </div>
        </div>
      </section>

      {/* NUMBERS GRID */}
      <section className="section" id="earnings" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
        <div className="tag sr">The Payout</div>
        <h2 className="sec-title sr d1" style={{ fontSize: 'clamp(48px, 6vw, 72px)' }}>Transparent Pay.<br />No Surprises.</h2>
        
        <div className="driver-numbers-grid mt-16">
          <div className="driver-num-card sr d1">
            <div className="num-val">$4.00</div>
            <div className="num-label">Base pay per delivery</div>
          </div>
          <div className="driver-num-card sr d2">
            <div className="num-val">$0.80</div>
            <div className="num-label">Per kilometer</div>
          </div>
          <div className="driver-num-card sr d3">
            <div className="num-val">$0.12</div>
            <div className="num-label">Per minute waiting</div>
          </div>
          <div className="driver-num-card sr d4">
            <div className="num-val">100%</div>
            <div className="num-label">Of your tips — always</div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="section pb-[3rem] border-b-0" id="compare">
        <div className="dual driver-dual">
          <div className="dual-card sr doordash-card">
            <div className="dual-card-tag">The Old Way</div>
            <h3 style={{ fontSize: '42px', color: 'var(--muted)' }}>DOORDASH</h3>
            <ul className="mlist mt-8 doordash-list">
              <li><span>Base pay</span><span className="mval">$2–3</span></li>
              <li><span>Tips</span><span className="mval">Yours</span></li>
              <li><span>Payout schedule</span><span className="mval">Weekly</span></li>
              <li><span>Algorithm control</span><span className="mval">High</span></li>
              <li style={{ borderBottom: 'none' }}><span>First month cost</span><span className="mval">—</span></li>
            </ul>
          </div>
          
          <div className="dual-card sr d1 wolfie-card">
            <div className="dual-card-tag" style={{ color: 'var(--amber-bright)' }}>The Wolfie Way</div>
            <h3 style={{ fontSize: '42px', color: 'var(--cream)' }}>WOLFIE</h3>
            <ul className="mlist mt-8 wolfie-list">
              <li className="sr d2"><span>Base pay</span><span className="mval">$4.00 <span className="check">✅</span></span></li>
              <li className="sr d3"><span>Tips</span><span className="mval">Yours <span className="check">✅</span></span></li>
              <li className="sr d4"><span>Payout schedule</span><span className="mval">Daily <span className="check">✅</span></span></li>
              <li className="sr d5"><span>Algorithm control</span><span className="mval">None <span className="check">✅</span></span></li>
              <li className="sr d6" style={{ borderBottom: 'none' }}><span>First month cost</span><span className="mval">FREE <span className="check">✅</span></span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (GLOWING TIMELINE) */}
      <section className="section" id="how" style={{ position: 'relative', overflow: 'hidden', paddingBottom: '12rem' }}>
        <div className="tag sr">Onboarding</div>
        <h2 className="sec-title sr d1">How it works</h2>
        
        {/* SVG Glowing Path Background */}
        <div className="timeline-svg-container">
          <svg className="timeline-svg" viewBox="0 0 1000 1200" preserveAspectRatio="none">
            <path 
              d="M100,50 C100,300 900,300 900,600 C900,900 100,900 100,1150" 
              fill="none" 
              stroke="url(#glowGradient)" 
              strokeWidth="4" 
              className="path-line"
            />
            <defs>
              <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,150,0,0.1)" />
                <stop offset="50%" stopColor="rgba(255,150,0,0.8)" />
                <stop offset="100%" stopColor="rgba(255,150,0,0.1)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="timeline-steps mt-24">
          <div className="t-step sr d1 t-left">
            <div className="t-dot"></div>
            <div className="t-content">
              <div className="t-num">Step 01</div>
              <h3>Apply in 5 minutes</h3>
            </div>
          </div>

          <div className="t-step sr d2 t-right">
            <div className="t-dot"></div>
            <div className="t-content">
              <div className="t-num">Step 02</div>
              <h3>Get approved</h3>
              <p>Quick background check process to keep the network safe.</p>
            </div>
          </div>

          <div className="t-step sr d3 t-left">
            <div className="t-dot"></div>
            <div className="t-content">
              <div className="t-num">Step 03</div>
              <h3>First month FREE</h3>
              <p>Keep everything you earn. After that, it's just a $30/month flat fee.</p>
            </div>
          </div>

          <div className="t-step sr d4 t-right">
            <div className="t-dot"></div>
            <div className="t-content">
              <div className="t-num">Step 04</div>
              <h3>Start delivering</h3>
              <p>Hit the streets in Williamsburg and start making real money.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-wrap" id="cta">
        <div className="tag sr">Ready?</div>
        <h2 className="sec-title sr d1" style={{ fontSize: 'clamp(48px, 6vw, 72px)' }}>APPLY TO DRIVE —<br />FIRST MONTH FREE</h2>
        
        <p className="cta-sub sr d2 mt-8">
          Brooklyn-based · Flexible hours · Daily cash
        </p>

        <div className="hero-actions sr d3 mt-12">
          <a href="https://driver.wolfie.com/register" className="btn-amber" style={{ padding: '1rem 3rem', fontSize: '14px' }} target="_blank" rel="noopener noreferrer">Submit Application</a>
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
