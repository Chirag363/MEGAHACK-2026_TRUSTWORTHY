'use client';

import { useRef, useState, useLayoutEffect, useCallback } from 'react';
import InsightIcon from './InsightIcon';

const ArrowUpRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const NAV_ITEMS = [
  {
    label: 'Home',
    bgColor: '#0D0716',
    links: [
      { label: 'Overview', href: '#home',     aria: 'Go to overview' },
      { label: 'Features', href: '#features', aria: 'Go to features' },
    ],
  },
  {
    label: 'About',
    bgColor: '#170D27',
    links: [
      { label: 'Our Mission',  href: '#about', aria: 'Our mission' },
      { label: 'How It Works', href: '#about', aria: 'How it works' },
    ],
  },
  {
    label: 'Contact',
    bgColor: '#271E37',
    links: [
      { label: 'Get In Touch', href: '#contact', aria: 'Contact us' },
      { label: 'LinkedIn',     href: '#',        aria: 'LinkedIn' },
      { label: 'Twitter / X',  href: '#',        aria: 'Twitter' },
    ],
  },
];

const TOP_H    = 62;
const DURATION = 380;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 640;

/* Desktop: 3 cards side by side at 180px each.
   Mobile: 3 cards stacked, each ~68px + gaps + padding */
const getOpenHeight = () => isMobile()
  ? TOP_H + 3 * 68 + 2 * 8 + 16   // 62 + 204 + 16 + 16 = 298
  : TOP_H + 188 + 8;               // 62 + 188 + 8 = 258

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const navRef   = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef   = useRef<number | null>(null);

  const animate = useCallback((toOpen: boolean) => {
    const nav = navRef.current;
    if (!nav) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const from = parseFloat(nav.style.height) || TOP_H;
    const to   = toOpen ? getOpenHeight() : TOP_H;
    const t0   = performance.now();

    const step = (now: number) => {
      const p  = Math.min((now - t0) / DURATION, 1);
      const ep = easeInOut(p);
      nav.style.height = `${from + (to - from) * ep}px`;

      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        const delay  = i * 0.06;
        const cp     = Math.max(0, Math.min(1, (ep - delay) / (1 - delay + 0.001)));
        const factor = toOpen ? cp : 1 - cp;
        card.style.opacity   = `${factor}`;
        card.style.transform = `translateY(${(1 - factor) * 14}px)`;
      });

      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    animate(next);
  };

  const closeMenu = () => { setOpen(false); animate(false); };

  useLayoutEffect(() => {
    if (navRef.current) navRef.current.style.height = `${TOP_H}px`;

    const onResize = () => {
      if (open && navRef.current) {
        navRef.current.style.height = `${getOpenHeight()}px`;
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  useLayoutEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 50) {
        setIsScrolled(true);
        // Squeeze again if scrolling actively while expanded or menu open
        if (Math.abs(currentScrollY - lastScrollY) > 20) {
          setIsExpanded(false);
          if (open) closeMenu();
        }
      } else {
        setIsScrolled(false);
        setIsExpanded(false);
      }
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [open]);

  const isSqueezed = isScrolled && !isExpanded && !open;

  const handleNavClick = (e: React.MouseEvent) => {
    if (isSqueezed) {
      e.preventDefault();
      setIsExpanded(true);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      display: 'flex', justifyContent: 'center',
      padding: '14px 16px',
      pointerEvents: 'none',
    }}>
      <nav
        ref={navRef}
        onClick={handleNavClick}
        style={{
          pointerEvents: 'all',
          width: '100%', 
          maxWidth: isSqueezed ? '70px' : '500px',
          height: `${TOP_H}px`,
          background: '#ffffff',
          borderRadius: '30px',
          overflow: 'hidden',
          boxShadow: isSqueezed 
            ? '0 10px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)' 
            : '0 4px 40px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08)',
          position: 'relative',
          cursor: isSqueezed ? 'pointer' : 'default',
          transition: 'max-width 1.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 1.5s ease',
        }}
      >
        {/* ── Top bar ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: `${TOP_H}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 10px',
          zIndex: 2, background: '#ffffff',
        }}>

          {/* Hamburger / X */}
          <button
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            aria-label={open ? 'Close menu' : 'Open menu'}
            style={{
              width: '40px', height: '40px',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '5px', padding: 0, flexShrink: 0,
              opacity: isSqueezed ? 0 : 1,
              pointerEvents: isSqueezed ? 'none' : 'auto',
              transform: isSqueezed ? 'scale(0.8) translateX(-10px)' : 'scale(1) translateX(0)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{
              display: 'block', width: '22px', height: '2px',
              background: '#111', borderRadius: '2px', transformOrigin: 'center',
              transition: 'transform 0.28s ease',
              transform: open ? 'translateY(3.5px) rotate(45deg)' : 'none',
            }} />
            <span style={{
              display: 'block', width: '22px', height: '2px',
              background: '#111', borderRadius: '2px', transformOrigin: 'center',
              transition: 'transform 0.28s ease',
              transform: open ? 'translateY(-3.5px) rotate(-45deg)' : 'none',
            }} />
          </button>

          {/* Logo — absolutely centered */}
          <a href="#home" 
            onClick={(e) => { if (isSqueezed) e.preventDefault(); }}
            style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none',
            justifyContent: 'center',
          }}>
            <div style={{ 
              flexShrink: 0, display: 'flex',
              animation: isSqueezed ? 'logoSqueezeAnim 6s infinite linear' : 'none',
              transition: 'transform 0.5s ease, filter 0.5s ease',
              borderRadius: '50%'
            }}>
              <InsightIcon size={34} />
            </div>
            {/* The Text scales and fades out when squeezed */}
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: '25px', color: '#111', letterSpacing: '-0.025em',
              whiteSpace: 'nowrap',
              opacity: isSqueezed ? 0 : 1,
              transform: isSqueezed ? 'scale(0.5) translateX(-10px)' : 'scale(1) translateX(0)',
              transformOrigin: 'left center',
              width: isSqueezed ? 0 : '140px',
              visibility: isSqueezed ? 'hidden' : 'visible',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'inline-block',
            }}>
              Insight<span style={{ color: '#666' }}>Forge</span>
            </span>
          </a>

          {/* Get Started — hidden on very small screens */}
          <div className="nav-cta-wrapper" style={{
            opacity: isSqueezed ? 0 : 1,
            pointerEvents: isSqueezed ? 'none' : 'auto',
            transform: isSqueezed ? 'scale(0.8) translateX(10px)' : 'scale(1) translateX(0)',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <a
              href="#contact"
              className="nav-cta"
              onClick={(e) => { if (isSqueezed) { e.preventDefault(); e.stopPropagation(); } else { e.stopPropagation(); setIsExpanded(false); } }}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '9px 18px', background: '#111', color: '#fff',
                borderRadius: '10px', textDecoration: 'none',
                fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px',
                flexShrink: 0, transition: 'background 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#333')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#111')}
            >
              Get Started
            </a>
          </div>
        </div>

        {/* ── Cards panel ── */}
        <div
          aria-hidden={!open}
          style={{
            position: 'absolute',
            top: `${TOP_H}px`, bottom: '8px', left: '8px', right: '8px',
            display: 'flex',
            gap: '8px',
          }}
          className="nav-cards-panel"
        >
          {NAV_ITEMS.map((item, idx) => (
            <div
              key={item.label}
              ref={(el) => { cardsRef.current[idx] = el; }}
              style={{
                flex: '1 1 0',
                background: item.bgColor,
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                opacity: 0,
                transform: 'translateY(14px)',
                pointerEvents: open ? 'all' : 'none',
                minWidth: 0,
              }}
            >
              <div style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 500,
                fontSize: '18px', color: '#fff',
                letterSpacing: '-0.02em', marginBottom: 'auto',
              }}>
                {item.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                {item.links.map((lnk) => (
                  <a
                    key={lnk.label} href={lnk.href} aria-label={lnk.aria}
                    onClick={(e) => { e.stopPropagation(); closeMenu(); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      color: 'rgba(255,255,255,0.72)', textDecoration: 'none',
                      fontSize: '13px', fontWeight: 500, transition: 'color 0.18s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.72)')}
                  >
                    <ArrowUpRight />{lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <style>{`
        /* Stack cards vertically on small screens */
        @media (max-width: 639px) {
          .nav-cards-panel { flex-direction: column !important; }
          .nav-cta-wrapper { display: none !important; }
        }

        @keyframes logoSqueezeAnim {
          0% { 
            filter: drop-shadow(0 0 6px rgba(0, 191, 255, 0.7)); 
            transform: scale(1) rotate(0deg); 
          }
          33% { 
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8)); 
            transform: scale(1.1) rotate(120deg); 
          }
          66% { 
            filter: drop-shadow(0 0 10px rgba(255, 107, 107, 0.8)); 
            transform: scale(1.1) rotate(240deg); 
          }
          100% { 
            filter: drop-shadow(0 0 6px rgba(0, 191, 255, 0.7)); 
            transform: scale(1) rotate(360deg); 
          }
        }
      `}</style>
    </div>
  );
}
