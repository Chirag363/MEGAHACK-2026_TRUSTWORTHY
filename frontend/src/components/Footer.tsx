'use client';

import Link from 'next/link';
import InsightIcon from './InsightIcon';

const footerLinks = {
  Pages: [
    { label: 'Features',     href: '#features' },
    { label: 'How it Works', href: '#about' },
    { label: 'Dashboard',    href: '/dashboard' },
    { label: 'Contact',      href: '#contact' },
  ],
  Socials: [
    { label: 'GitHub',   href: '#' },
    { label: 'LinkedIn', href: '#' },
    { label: 'Instagram', href: '#' },
    { label: 'Email',    href: '#contact' },
  ],
  Project: [
    { label: 'Problem',         href: '#about' },
    { label: 'Solution',        href: '#features' },
    { label: 'Live Demo',       href: '/dashboard' },
    { label: 'Key Highlights',  href: '#about' },
  ],
  Company: [
    { label: 'About Team',       href: '#about' },
    { label: 'Hackathon Build',  href: '#' },
    { label: 'Built in 2026',    href: '#' },
    { label: 'Get in Touch',     href: '#contact' },
  ],
};

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '64px', position: 'relative', overflow: 'hidden' }}>

      {/* ── Animated gradient watermark ── */}
      <p className="footer-watermark">INSIGHT FORGE</p>

      {/* ── Links section ── */}
      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '56px', paddingBottom: '56px' }}>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1.3fr repeat(4, 1fr)', gap: '40px', alignItems: 'start' }}
          className="footer-grid"
        >
          {/* Brand + copyright */}
          <div>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
              <InsightIcon size={32} />
              <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '17px', color: 'var(--text-primary)' }}>
                Insight<span style={{ color: 'var(--text-secondary)' }}>Forge</span>
              </span>
            </Link>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: 1.75, maxWidth: '210px' }}>
              Built for MEGAHACK 2026 by Team InsightForge.<br />Project showcase build.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([cat, links]) => (
            <div key={cat}>
              <h4 style={{
                fontFamily: 'Outfit,sans-serif', fontSize: '13px', fontWeight: 700,
                marginBottom: '18px', color: 'var(--text-primary)', letterSpacing: '0.01em',
              }}>
                {cat}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes gradient-sweep {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .footer-watermark {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: 11.5vw;
          white-space: nowrap;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          margin: 0;
          padding: 0;
          line-height: 1;
          width: 100%;
          text-align: center;
          user-select: none;

          /* gradient animation */
          background-image: linear-gradient(
            to right,
            #ffffff, #9b7dff, #c4b5fd, #ffffff, #7c3aed, #ffffff
          );
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: gradient-sweep 6s ease-in-out infinite;
          opacity: 0.35;
        }

        html[data-theme='light'] .footer-watermark {
          background-image: linear-gradient(
            to right,
            #000000 0%, #000000 40%, #ffffff 50%, #000000 60%, #000000 100%
          );
          background-size: 260% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          opacity: 0.95;
        }

        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr 1fr !important; } }
        @media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 400px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
