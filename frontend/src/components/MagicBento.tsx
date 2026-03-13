'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface BentoCardData {
  icon?: React.ReactNode;
  label?: string;
  title?: string;
  description?: string;
  /** Extra JSX rendered inside the card (below title/desc) */
  content?: React.ReactNode;
  /** Span across two columns at lg breakpoint */
  wide?: boolean;
  /** Span across two rows at lg breakpoint */
  tall?: boolean;
}

interface MagicBentoProps {
  cards: BentoCardData[];
  glowColor?: string;          // RGB triple, e.g. "255,255,255"
  particleCount?: number;
  spotlightRadius?: number;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  enableStars?: boolean;
  disableAnimations?: boolean;
  className?: string;
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const DEFAULT_GLOW    = '255,255,255';
const DEFAULT_RADIUS  = 280;
const DEFAULT_PARTS   = 10;
const MOBILE_BP       = 768;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const mkParticle = (x: number, y: number, color: string): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute;width:3px;height:3px;border-radius:50%;
    background:rgba(${color},0.9);box-shadow:0 0 5px rgba(${color},0.5);
    pointer-events:none;z-index:100;left:${x}px;top:${y}px;
  `;
  return el;
};

const spotlightValues = (r: number) => ({ proximity: r * 0.5, fade: r * 0.75 });

const updateGlow = (el: HTMLElement, mx: number, my: number, intensity: number, radius: number) => {
  const r = el.getBoundingClientRect();
  el.style.setProperty('--glow-x', `${((mx - r.left) / r.width) * 100}%`);
  el.style.setProperty('--glow-y', `${((my - r.top) / r.height) * 100}%`);
  el.style.setProperty('--glow-intensity', intensity.toString());
  el.style.setProperty('--glow-radius', `${radius}px`);
};

/* ─────────────────────────────────────────────
   ParticleCard
───────────────────────────────────────────── */
const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glowColor?: string;
  particleCount?: number;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  disableAnimations?: boolean;
}> = ({
  children,
  className = '',
  style,
  glowColor = DEFAULT_GLOW,
  particleCount = DEFAULT_PARTS,
  enableTilt = false,
  clickEffect = true,
  enableMagnetism = false,
  disableAnimations = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hoveredRef   = useRef(false);
  const memoParticles = useRef<HTMLDivElement[]>([]);
  const initialized  = useRef(false);
  const magnetRef    = useRef<gsap.core.Tween | null>(null);

  const initParticles = useCallback(() => {
    if (initialized.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoParticles.current = Array.from({ length: particleCount }, () =>
      mkParticle(Math.random() * width, Math.random() * height, glowColor)
    );
    initialized.current = true;
  }, [particleCount, glowColor]);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetRef.current?.kill();
    particlesRef.current.forEach(p => {
      gsap.to(p, { scale: 0, opacity: 0, duration: 0.3, ease: 'back.in(1.7)', onComplete: () => { p.parentNode?.removeChild(p); } });
    });
    particlesRef.current = [];
  }, []);

  const spawnParticles = useCallback(() => {
    if (!cardRef.current || !hoveredRef.current) return;
    if (!initialized.current) initParticles();

    memoParticles.current.forEach((p, i) => {
      const tid = setTimeout(() => {
        if (!hoveredRef.current || !cardRef.current) return;
        const clone = p.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);
        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(clone, { x: (Math.random() - 0.5) * 90, y: (Math.random() - 0.5) * 90, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: 'none', repeat: -1, yoyo: true });
        gsap.to(clone, { opacity: 0.2, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
      }, i * 100);
      timeoutsRef.current.push(tid);
    });
  }, [initParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;
    const el = cardRef.current;

    const onEnter = () => {
      hoveredRef.current = true;
      spawnParticles();
      if (enableTilt) gsap.to(el, { rotateX: 5, rotateY: 5, duration: 0.3, ease: 'power2.out', transformPerspective: 1000 });
    };
    const onLeave = () => {
      hoveredRef.current = false;
      clearParticles();
      if (enableTilt) gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.3, ease: 'power2.out' });
      if (enableMagnetism) gsap.to(el, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
    };
    const onMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;
      const r = el.getBoundingClientRect();
      const cx = r.width / 2, cy = r.height / 2;
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (enableTilt) gsap.to(el, { rotateX: ((y - cy) / cy) * -10, rotateY: ((x - cx) / cx) * 10, duration: 0.1, ease: 'power2.out', transformPerspective: 1000 });
      if (enableMagnetism) magnetRef.current = gsap.to(el, { x: (x - cx) * 0.05, y: (y - cy) * 0.05, duration: 0.3, ease: 'power2.out' });
    };
    const onClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const d = Math.max(Math.hypot(x, y), Math.hypot(x - r.width, y), Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height));
      const rpl = document.createElement('div');
      rpl.style.cssText = `position:absolute;width:${d * 2}px;height:${d * 2}px;border-radius:50%;background:radial-gradient(circle,rgba(${glowColor},0.3) 0%,rgba(${glowColor},0.1) 30%,transparent 70%);left:${x - d}px;top:${y - d}px;pointer-events:none;z-index:1000;`;
      el.appendChild(rpl);
      gsap.fromTo(rpl, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => rpl.remove() });
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('click', onClick);

    return () => {
      hoveredRef.current = false;
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('click', onClick);
      clearParticles();
    };
  }, [spawnParticles, clearParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div ref={cardRef} className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────
   GlobalSpotlight
───────────────────────────────────────────── */
const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  enabled?: boolean;
  radius?: number;
  glowColor?: string;
  disableAnimations?: boolean;
}> = ({ gridRef, enabled = true, radius = DEFAULT_RADIUS, glowColor = DEFAULT_GLOW, disableAnimations = false }) => {
  const spotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disableAnimations || !enabled || !gridRef?.current) return;

    const spot = document.createElement('div');
    spot.style.cssText = `
      position:fixed;width:600px;height:600px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,rgba(${glowColor},0.12) 0%,rgba(${glowColor},0.06) 20%,rgba(${glowColor},0.02) 40%,transparent 70%);
      z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;
    `;
    document.body.appendChild(spot);
    spotRef.current = spot;

    const onMove = (e: MouseEvent) => {
      if (!spotRef.current || !gridRef.current) return;
      const section = gridRef.current.closest('.magic-bento-section');
      const rect = section?.getBoundingClientRect();
      const inside = rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      const cards = gridRef.current.querySelectorAll('.magic-bento-card');

      if (!inside) {
        gsap.to(spot, { opacity: 0, duration: 0.3 });
        cards.forEach(c => (c as HTMLElement).style.setProperty('--glow-intensity', '0'));
        return;
      }

      const { proximity, fade } = spotlightValues(radius);
      let minDist = Infinity;

      cards.forEach(c => {
        const el = c as HTMLElement;
        const cr = el.getBoundingClientRect();
        const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
        const dist = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(cr.width, cr.height) / 2);
        minDist = Math.min(minDist, dist);
        const intensity = dist <= proximity ? 1 : dist <= fade ? (fade - dist) / (fade - proximity) : 0;
        updateGlow(el, e.clientX, e.clientY, intensity, radius);
      });

      gsap.to(spot, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });
      const targetOp = minDist <= proximity ? 0.9 : minDist <= fade ? ((fade - minDist) / (fade - proximity)) * 0.9 : 0;
      gsap.to(spot, { opacity: targetOp, duration: targetOp > 0 ? 0.2 : 0.5 });
    };

    const onLeave = () => {
      gridRef.current?.querySelectorAll('.magic-bento-card').forEach(c => (c as HTMLElement).style.setProperty('--glow-intensity', '0'));
      gsap.to(spot, { opacity: 0, duration: 0.3 });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      spot.parentNode?.removeChild(spot);
    };
  }, [gridRef, enabled, radius, glowColor, disableAnimations]);

  return null;
};

/* ─────────────────────────────────────────────
   MagicBento
───────────────────────────────────────────── */
export default function MagicBento({
  cards,
  glowColor           = DEFAULT_GLOW,
  particleCount       = DEFAULT_PARTS,
  spotlightRadius     = DEFAULT_RADIUS,
  enableTilt          = false,
  clickEffect         = true,
  enableMagnetism     = false,
  enableSpotlight     = true,
  enableBorderGlow    = true,
  enableStars         = true,
  disableAnimations   = false,
  className           = '',
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BP);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const noAnim = disableAnimations || isMobile;

  const cardBase = `magic-bento-card ${enableBorderGlow ? 'magic-bento-glow' : ''}`;

  return (
    <>
      <style>{`
        .magic-bento-section {
          --glow-color: ${glowColor};
        }
        .magic-bento-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 520px) {
          .magic-bento-grid { grid-template-columns: 1fr; }
        }
        .magic-bento-card {
          --glow-x: 50%;
          --glow-y: 50%;
          --glow-intensity: 0;
          --glow-radius: 200px;
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 24px;
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
          cursor: default;
          color: var(--text-primary, #f5f5f5);
        }
        .magic-bento-card:hover {
          border-color: rgba(255,255,255,0.22);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }
        /* border glow via pseudo-element mask trick */
        .magic-bento-glow::after {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          background: radial-gradient(
            var(--glow-radius) circle at var(--glow-x) var(--glow-y),
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.85)) 0%,
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.4))  35%,
            transparent 65%
          );
          border-radius: inherit;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 1;
        }
        .magic-bento-wide { grid-column: span 2; }
        @media (max-width: 520px) { .magic-bento-wide { grid-column: span 1; } }
        .magic-bento-tall { grid-row: span 2; }
        .magic-bento-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 10px;
        }
        .magic-bento-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #f5f5f5;
          line-height: 1.3;
        }
        .magic-bento-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          line-height: 1.6;
        }
        .magic-bento-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          color: #ccc;
        }
      `}</style>

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          enabled={enableSpotlight}
          radius={spotlightRadius}
          glowColor={glowColor}
          disableAnimations={noAnim}
        />
      )}

      <div className={`magic-bento-section ${className}`}>
        <div className="magic-bento-grid" ref={gridRef}>
          {cards.map((card, i) => {
            const extraClass = [
              card.wide ? 'magic-bento-wide' : '',
              card.tall ? 'magic-bento-tall' : '',
            ].join(' ').trim();

            const inner = (
              <>
                {card.icon && <div className="magic-bento-icon">{card.icon}</div>}
                {card.label && <div className="magic-bento-label">{card.label}</div>}
                {card.title && <div className="magic-bento-title">{card.title}</div>}
                {card.description && <div className="magic-bento-desc">{card.description}</div>}
                {card.content}
              </>
            );

            return enableStars ? (
              <ParticleCard
                key={i}
                className={`${cardBase} ${extraClass}`}
                glowColor={glowColor}
                particleCount={particleCount}
                enableTilt={enableTilt}
                clickEffect={clickEffect}
                enableMagnetism={enableMagnetism}
                disableAnimations={noAnim}
              >
                {inner}
              </ParticleCard>
            ) : (
              <div key={i} className={`${cardBase} ${extraClass}`}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
