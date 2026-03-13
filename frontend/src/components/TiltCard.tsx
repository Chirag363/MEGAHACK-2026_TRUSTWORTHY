'use client';

import { useRef, useState, ReactNode } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxTilt?: number;   // degrees (default 14)
  glowColor?: string; // default cyan
}

export default function TiltCard({
  children,
  className = '',
  style = {},
  maxTilt = 14,
  glowColor = 'rgba(92, 103, 255, 0.55)',
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [hovered, setHovered] = useState(false);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;  // 0–1
    const py = (e.clientY - rect.top)  / rect.height; // 0–1
    setTilt({
      rx:  (0.5 - py) * maxTilt * 2,
      ry:  (px  - 0.5) * maxTilt * 2,
    });
    setGlare({ x: px * 100, y: py * 100, opacity: 1 });
  };

  const onMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
    setHovered(false);
  };

  const onMouseEnter = () => setHovered(true);

  return (
    <div
      ref={cardRef}
      className={`tilt-card ${className}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      style={{
        position: 'relative',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
        transition: hovered ? 'box-shadow 0.3s ease' : 'transform 0.5s ease, box-shadow 0.3s ease',
        transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${hovered ? 1.03 : 1})`,
        boxShadow: hovered
          ? `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${glowColor}`
          : '0 4px 20px rgba(0,0,0,0.25)',
        cursor: 'default',
        willChange: 'transform',
        ...style,
      }}
    >
      {/* ── Glare highlight ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.12) 0%, transparent 60%)`,
        opacity: glare.opacity,
        transition: 'opacity 0.3s ease',
        borderRadius: '16px',
      }} />

      {/* ── Corner brackets ── */}
      {['tl','tr','bl','br'].map((c) => (
        <span key={c} style={{
          position: 'absolute', width: '14px', height: '14px',
          border: `2px solid ${hovered ? 'rgba(92,103,255,0.8)' : 'rgba(92,103,255,0.25)'}`,
          boxShadow: hovered ? '0 0 8px rgba(92,103,255,0.5)' : 'none',
          transition: 'all 0.3s ease',
          ...(c === 'tl' ? { top: 8,  left: 8,  borderRight: 'none', borderBottom: 'none' } : {}),
          ...(c === 'tr' ? { top: 8,  right: 8, borderLeft: 'none',  borderBottom: 'none' } : {}),
          ...(c === 'bl' ? { bottom: 8, left: 8, borderRight: 'none', borderTop: 'none' }   : {}),
          ...(c === 'br' ? { bottom: 8, right: 8, borderLeft: 'none', borderTop: 'none' }   : {}),
          zIndex: 5,
        }} />
      ))}

      {/* ── Scan line ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
        background: 'linear-gradient(to bottom, transparent, rgba(92,103,255,0.08), transparent)',
        animation: 'tc-scan 2.5s linear infinite',
      }} />

      {/* ── Cyber horizontal lines ── */}
      {[20, 40, 60, 80].map((pct, i) => (
        <div key={pct} style={{
          position: 'absolute', left: 0, right: 0, height: '1px',
          top: `${pct}%`, pointerEvents: 'none', zIndex: 3,
          background: 'linear-gradient(90deg, transparent, rgba(92,103,255,0.18), transparent)',
          animation: `tc-line 3s linear infinite ${i * 0.75}s`,
        }} />
      ))}

      {/* ── Inner glow on hover ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: `radial-gradient(circle at center, ${glowColor.replace('0.55','0.08')} 0%, transparent 70%)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }} />

      {/* ── Card content ── */}
      <div style={{ position: 'relative', zIndex: 6 }}>
        {children}
      </div>

      <style>{`
        @keyframes tc-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(200%);  }
        }
        @keyframes tc-line {
          0%   { opacity: 0; transform: scaleX(0); transform-origin: left; }
          40%  { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(0); transform-origin: right; }
        }
      `}</style>
    </div>
  );
}
